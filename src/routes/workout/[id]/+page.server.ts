import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	exercises,
	muscleGroups,
	sets,
	workoutExercises,
	workouts,
	type EquipmentKind
} from '$lib/server/db/schema';
import { requireUser } from '$lib/server/session';
import { loadingHelper, type LoadChoice } from '$lib/server/training/loading';

const now = () => new Date().toISOString();

function num(v: FormDataEntryValue | null): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function getWorkout(id: string, userId: string) {
	const w = db
		.select()
		.from(workouts)
		.where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
		.get();
	if (!w) throw error(404, 'Workout not found');
	return w;
}

/** Most recent completed performance of an exercise, for prefilling. */
function lastPerformance(userId: string, exerciseId: string) {
	return db.get<{ weight: number | null; reps: number | null }>(sql`
		SELECT s.actual_weight_lb AS weight, s.actual_reps AS reps
		FROM sets s
		JOIN workout_exercises we ON we.id = s.workout_exercise_id
		JOIN workouts w ON w.id = we.workout_id
		WHERE w.user_id = ${userId} AND we.exercise_id = ${exerciseId}
			AND s.completed_at IS NOT NULL AND s.is_warmup = 0
		ORDER BY w.date DESC, s.completed_at DESC
		LIMIT 1
	`);
}

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const workout = getWorkout(event.params.id, user.id);

	const items = db
		.select({
			weId: workoutExercises.id,
			orderIndex: workoutExercises.orderIndex,
			targetSets: workoutExercises.targetSets,
			targetRepLow: workoutExercises.targetRepLow,
			targetRepHigh: workoutExercises.targetRepHigh,
			targetWeightLb: workoutExercises.targetWeightLb,
			targetRir: workoutExercises.targetRir,
			weNotes: workoutExercises.notes,
			exId: exercises.id,
			name: exercises.name,
			equipment: exercises.equipment,
			pattern: exercises.pattern,
			repLow: exercises.repLow,
			repHigh: exercises.repHigh,
			defaultRir: exercises.defaultRir,
			isConditioning: exercises.isConditioning,
			exNotes: exercises.notes,
			muscle: muscleGroups.name
		})
		.from(workoutExercises)
		.innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
		.innerJoin(muscleGroups, eq(exercises.primaryMuscleId, muscleGroups.id))
		.where(eq(workoutExercises.workoutId, workout.id))
		.orderBy(asc(workoutExercises.orderIndex))
		.all();

	const weIds = items.map((i) => i.weId);
	const allSets = weIds.length
		? db
				.select()
				.from(sets)
				.where(inArray(sets.workoutExerciseId, weIds))
				.orderBy(asc(sets.setNumber))
				.all()
		: [];

	const itemsWithSets = items.map((i) => ({
		...i,
		sets: allSets.filter((s) => s.workoutExerciseId === i.weId)
	}));

	// Library for the add-exercise picker.
	const library = db
		.select({
			id: exercises.id,
			name: exercises.name,
			equipment: exercises.equipment,
			pattern: exercises.pattern,
			isConditioning: exercises.isConditioning,
			muscle: muscleGroups.name
		})
		.from(exercises)
		.innerJoin(muscleGroups, eq(exercises.primaryMuscleId, muscleGroups.id))
		.orderBy(asc(exercises.name))
		.all();

	// Precompute achievable loads per equipment kind for live plate hints.
	const helper = loadingHelper(user);
	const kinds: EquipmentKind[] = [
		'barbell',
		'ezbar',
		'trapbar',
		'cable-high',
		'cable-low',
		'dumbbell'
	];
	const loadChoices: Record<string, LoadChoice[]> = {};
	for (const k of kinds) loadChoices[k] = helper.choicesFor(k);

	return { user, workout, items: itemsWithSets, library, loadChoices };
};

export const actions: Actions = {
	addExercise: async (event) => {
		const user = requireUser(event);
		const workout = getWorkout(event.params.id, user.id);
		const form = await event.request.formData();
		const exerciseId = String(form.get('exerciseId') ?? '');
		const ex = db.select().from(exercises).where(eq(exercises.id, exerciseId)).get();
		if (!ex) return fail(400, { message: 'Unknown exercise' });

		const count = db
			.select({ c: sql<number>`count(*)` })
			.from(workoutExercises)
			.where(eq(workoutExercises.workoutId, workout.id))
			.get();
		const orderIndex = count?.c ?? 0;
		const last = lastPerformance(user.id, exerciseId);

		const weId = crypto.randomUUID();
		db.insert(workoutExercises)
			.values({
				id: weId,
				workoutId: workout.id,
				exerciseId,
				orderIndex,
				targetSets: 3,
				targetRepLow: ex.repLow,
				targetRepHigh: ex.repHigh,
				targetWeightLb: last?.weight ?? null,
				targetRir: ex.defaultRir
			})
			.run();

		// Pre-create a first set, prefilled from last performance.
		db.insert(sets)
			.values({
				id: crypto.randomUUID(),
				workoutExerciseId: weId,
				setNumber: 1,
				targetReps: last?.reps ?? ex.repLow,
				targetWeightLb: last?.weight ?? null
			})
			.run();

		return { ok: true };
	},

	addSet: async (event) => {
		const user = requireUser(event);
		getWorkout(event.params.id, user.id);
		const form = await event.request.formData();
		const weId = String(form.get('weId') ?? '');

		const existing = db
			.select()
			.from(sets)
			.where(eq(sets.workoutExerciseId, weId))
			.orderBy(asc(sets.setNumber))
			.all();
		const lastSet = existing.at(-1);
		const setNumber = (lastSet?.setNumber ?? 0) + 1;

		db.insert(sets)
			.values({
				id: crypto.randomUUID(),
				workoutExerciseId: weId,
				setNumber,
				targetReps: lastSet?.actualReps ?? lastSet?.targetReps ?? null,
				targetWeightLb: lastSet?.actualWeightLb ?? lastSet?.targetWeightLb ?? null
			})
			.run();
		return { ok: true };
	},

	saveSet: async (event) => {
		const user = requireUser(event);
		getWorkout(event.params.id, user.id);
		const form = await event.request.formData();
		const setId = String(form.get('setId') ?? '');
		const reps = num(form.get('reps'));
		const weight = num(form.get('weight'));
		const rir = num(form.get('rir'));
		const isWarmup = form.get('isWarmup') === 'on' || form.get('isWarmup') === 'true';

		db.update(sets)
			.set({
				actualReps: reps,
				actualWeightLb: weight,
				rir,
				isWarmup,
				completedAt: reps != null ? now() : null
			})
			.where(eq(sets.id, setId))
			.run();
		return { ok: true };
	},

	deleteSet: async (event) => {
		const user = requireUser(event);
		getWorkout(event.params.id, user.id);
		const form = await event.request.formData();
		db.delete(sets).where(eq(sets.id, String(form.get('setId') ?? ''))).run();
		return { ok: true };
	},

	removeExercise: async (event) => {
		const user = requireUser(event);
		getWorkout(event.params.id, user.id);
		const form = await event.request.formData();
		db.delete(workoutExercises)
			.where(eq(workoutExercises.id, String(form.get('weId') ?? '')))
			.run();
		return { ok: true };
	},

	updateReadiness: async (event) => {
		const user = requireUser(event);
		const workout = getWorkout(event.params.id, user.id);
		const form = await event.request.formData();
		db.update(workouts)
			.set({ fatigue: num(form.get('fatigue')), sleep: num(form.get('sleep')) })
			.where(eq(workouts.id, workout.id))
			.run();
		return { ok: true };
	},

	updateMeta: async (event) => {
		const user = requireUser(event);
		const workout = getWorkout(event.params.id, user.id);
		const form = await event.request.formData();
		const label = String(form.get('label') ?? '').trim();
		db.update(workouts)
			.set({ label: label || null, notes: String(form.get('notes') ?? '').trim() || null })
			.where(eq(workouts.id, workout.id))
			.run();
		return { ok: true };
	},

	finish: async (event) => {
		const user = requireUser(event);
		const workout = getWorkout(event.params.id, user.id);
		db.update(workouts)
			.set({ status: 'completed', completedAt: now() })
			.where(eq(workouts.id, workout.id))
			.run();
		throw redirect(303, '/history');
	},

	reopen: async (event) => {
		const user = requireUser(event);
		const workout = getWorkout(event.params.id, user.id);
		db.update(workouts)
			.set({ status: 'in_progress', completedAt: null })
			.where(eq(workouts.id, workout.id))
			.run();
		return { ok: true };
	},

	deleteWorkout: async (event) => {
		const user = requireUser(event);
		const workout = getWorkout(event.params.id, user.id);
		// Cascade removes workout_exercises + sets (FK pragma on).
		db.delete(workouts).where(eq(workouts.id, workout.id)).run();
		throw redirect(303, '/home');
	}
};
