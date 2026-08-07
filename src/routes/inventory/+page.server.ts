import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	bars,
	bodyweightLogs,
	cycles,
	dumbbells,
	exerciseBlacklist,
	exercises,
	measurements,
	muscleGroups,
	plates,
	sorenessLogs,
	users,
	workouts
} from '$lib/server/db/schema';
import { clearUser, requireUser } from '$lib/server/session';
import { num } from '$lib/server/forms';
import { barLoads, cableLoads, nextLoadAbove, type PlateInventory } from '$lib/server/training/plate-math';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	const barRows = db.select().from(bars).orderBy(asc(bars.weightLb)).all();
	const plateRows = db.select().from(plates).orderBy(asc(plates.weightLb)).all();
	const dbRows = db.select().from(dumbbells).orderBy(asc(dumbbells.weightLb)).all();

	const inventory: PlateInventory[] = plateRows.map((p) => ({
		weightLb: p.weightLb,
		quantity: p.quantity
	}));

	// Plate-math feedback for the Olympic barbell.
	const olympic = barRows.find((b) => b.kind === 'barbell')?.weightLb ?? 45;
	const bLoads = barLoads(olympic, inventory);
	const cLoads = cableLoads(inventory, user.cablePulleyRatio);

	const feedback = {
		barbellMax: bLoads.length ? bLoads[bLoads.length - 1].totalLb : olympic,
		barbellSmallestJump:
			bLoads.length > 1 ? (nextLoadAbove(bLoads, olympic)?.totalLb ?? olympic) - olympic : null,
		barbellSteps: bLoads.length,
		cableMax: cLoads.length ? cLoads[cLoads.length - 1].totalLb : 0
	};

	// Rotation blacklist: non-conditioning library with this user's blocks.
	const exerciseRows = db
		.select({ id: exercises.id, name: exercises.name, muscle: muscleGroups.name })
		.from(exercises)
		.innerJoin(muscleGroups, eq(exercises.primaryMuscleId, muscleGroups.id))
		.where(eq(exercises.isConditioning, false))
		.orderBy(asc(exercises.name))
		.all();
	const blockedIds = db
		.select({ exerciseId: exerciseBlacklist.exerciseId })
		.from(exerciseBlacklist)
		.where(eq(exerciseBlacklist.userId, user.id))
		.all()
		.map((r) => r.exerciseId);

	return {
		user,
		bars: barRows,
		plates: plateRows,
		dumbbells: dbRows,
		feedback,
		exercises: exerciseRows,
		blockedIds
	};
};

export const actions: Actions = {
	updateBar: async (event) => {
		requireUser(event);
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const weight = num(form.get('weight'));
		if (weight == null || weight < 0) return fail(400, { message: 'Invalid weight' });
		db.update(bars).set({ weightLb: weight }).where(eq(bars.id, id)).run();
		return { ok: true };
	},

	updatePlate: async (event) => {
		requireUser(event);
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const quantity = num(form.get('quantity'));
		if (quantity == null || quantity < 0) return fail(400, { message: 'Invalid quantity' });
		db.update(plates).set({ quantity: Math.round(quantity) }).where(eq(plates.id, id)).run();
		return { ok: true };
	},

	addPlate: async (event) => {
		requireUser(event);
		const form = await event.request.formData();
		const weight = num(form.get('weight'));
		const quantity = num(form.get('quantity')) ?? 0;
		if (weight == null || weight <= 0) return fail(400, { message: 'Invalid weight' });
		db.insert(plates)
			.values({ id: crypto.randomUUID(), weightLb: weight, quantity: Math.round(quantity) })
			.run();
		return { ok: true };
	},

	deletePlate: async (event) => {
		requireUser(event);
		const form = await event.request.formData();
		db.delete(plates).where(eq(plates.id, String(form.get('id') ?? ''))).run();
		return { ok: true };
	},

	updateDumbbell: async (event) => {
		requireUser(event);
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const pairs = num(form.get('pairs'));
		if (pairs == null || pairs < 0) return fail(400, { message: 'Invalid' });
		db.update(dumbbells).set({ pairs: Math.round(pairs) }).where(eq(dumbbells.id, id)).run();
		return { ok: true };
	},

	addDumbbell: async (event) => {
		requireUser(event);
		const form = await event.request.formData();
		const weight = num(form.get('weight'));
		if (weight == null || weight <= 0) return fail(400, { message: 'Invalid weight' });
		db.insert(dumbbells)
			.values({ id: crypto.randomUUID(), weightLb: weight, pairs: Math.round(num(form.get('pairs')) ?? 1) })
			.run();
		return { ok: true };
	},

	deleteDumbbell: async (event) => {
		requireUser(event);
		const form = await event.request.formData();
		db.delete(dumbbells).where(eq(dumbbells.id, String(form.get('id') ?? ''))).run();
		return { ok: true };
	},

	updateRatio: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const ratio = num(form.get('ratio'));
		if (ratio == null || ratio <= 0) return fail(400, { message: 'Invalid ratio' });
		db.update(users).set({ cablePulleyRatio: ratio }).where(eq(users.id, user.id)).run();
		return { ok: true };
	},

	toggleBlock: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const exerciseId = String(form.get('exerciseId') ?? '');
		if (!exerciseId) return fail(400, { message: 'Missing exercise' });
		const existing = db
			.select()
			.from(exerciseBlacklist)
			.where(
				and(eq(exerciseBlacklist.userId, user.id), eq(exerciseBlacklist.exerciseId, exerciseId))
			)
			.get();
		if (existing) {
			db.delete(exerciseBlacklist).where(eq(exerciseBlacklist.id, existing.id)).run();
		} else {
			db.insert(exerciseBlacklist)
				.values({ id: crypto.randomUUID(), userId: user.id, exerciseId })
				.run();
		}
		return { ok: true };
	},

	updateProfile: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name || name.length > 30) return fail(400, { message: 'Name required (max 30 chars)' });
		const rawColor = String(form.get('color') ?? user.color);
		const color = /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : user.color;
		db.update(users).set({ name, color }).where(eq(users.id, user.id)).run();
		return { ok: true };
	},

	deleteProfile: async (event) => {
		const user = requireUser(event);
		// Full wipe of this profile's data, then the profile itself.
		// (Workout deletion cascades to workout_exercises + sets.)
		db.delete(workouts).where(eq(workouts.userId, user.id)).run();
		db.delete(cycles).where(eq(cycles.userId, user.id)).run();
		db.delete(sorenessLogs).where(eq(sorenessLogs.userId, user.id)).run();
		db.delete(bodyweightLogs).where(eq(bodyweightLogs.userId, user.id)).run();
		db.delete(measurements).where(eq(measurements.userId, user.id)).run();
		db.delete(exerciseBlacklist).where(eq(exerciseBlacklist.userId, user.id)).run();
		db.delete(users).where(eq(users.id, user.id)).run();
		clearUser(event.cookies);
		throw redirect(303, '/');
	},

	resetTraining: async (event) => {
		const user = requireUser(event);
		// Deleting workouts cascades to workout_exercises + sets (FK pragma on).
		db.delete(workouts).where(eq(workouts.userId, user.id)).run();
		db.delete(cycles).where(eq(cycles.userId, user.id)).run();
		db.delete(sorenessLogs).where(eq(sorenessLogs.userId, user.id)).run();
		return { reset: 'training' };
	},

	resetBody: async (event) => {
		const user = requireUser(event);
		db.delete(bodyweightLogs).where(eq(bodyweightLogs.userId, user.id)).run();
		db.delete(measurements).where(eq(measurements.userId, user.id)).run();
		return { reset: 'body' };
	}
};
