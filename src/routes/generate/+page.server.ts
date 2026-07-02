import { redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { muscleGroups, sets, sorenessLogs, workoutExercises, workouts } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/session';
import { today } from '$lib/server/date';
import { num } from '$lib/server/forms';
import { generateForUser, getCycleStatus } from '$lib/server/training/plan';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const groups = db
		.select({ id: muscleGroups.id, name: muscleGroups.name })
		.from(muscleGroups)
		.orderBy(asc(muscleGroups.name))
		.all();
	return { user, muscleGroups: groups, cycle: getCycleStatus(user) };
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const fatigue = num(form.get('fatigue'));
		const sleep = num(form.get('sleep'));

		// Soreness submitted as JSON { muscleGroupId: level(0..3) }.
		let soreRaw: Record<string, number> = {};
		try {
			soreRaw = JSON.parse(String(form.get('soreness') || '{}'));
		} catch {
			soreRaw = {};
		}

		// Map ids -> names for the generator, and persist non-zero logs.
		const groups = db.select().from(muscleGroups).all();
		const nameById = new Map(groups.map((g) => [g.id, g.name]));
		const sorenessByMuscle: Record<string, number> = {};
		const day = today();
		for (const [id, level] of Object.entries(soreRaw)) {
			if (!nameById.has(id) || !level || level <= 0) continue;
			sorenessByMuscle[nameById.get(id)!] = level;
			db.insert(sorenessLogs)
				.values({ id: crypto.randomUUID(), userId: user.id, date: day, muscleGroupId: id, level })
				.run();
		}

		const { session, cycle } = generateForUser(user, { fatigue, sorenessByMuscle });

		const workoutId = crypto.randomUUID();
		db.insert(workouts)
			.values({
				id: workoutId,
				userId: user.id,
				date: day,
				kind: 'lifting',
				label: session.label,
				cycleId: cycle.id,
				majorAnchor: session.majorAnchor,
				minorAnchor: session.minorAnchor,
				fatigue,
				sleep,
				status: 'in_progress'
			})
			.run();

		session.slots.forEach((slot, i) => {
			const weId = crypto.randomUUID();
			db.insert(workoutExercises)
				.values({
					id: weId,
					workoutId,
					exerciseId: slot.exercise.id,
					orderIndex: i,
					targetSets: slot.targetSets,
					targetRepLow: slot.prescription.repLow,
					targetRepHigh: slot.prescription.repHigh,
					targetWeightLb: slot.prescription.weightLb,
					targetRir: slot.prescription.rir,
					notes: slot.prescription.note
				})
				.run();
			for (let n = 1; n <= slot.targetSets; n++) {
				db.insert(sets)
					.values({
						id: crypto.randomUUID(),
						workoutExerciseId: weId,
						setNumber: n,
						targetReps: slot.prescription.targetReps,
						targetWeightLb: slot.prescription.weightLb
					})
					.run();
			}
		});

		throw redirect(303, `/workout/${workoutId}`);
	}
};
