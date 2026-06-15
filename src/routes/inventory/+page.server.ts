import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	bars,
	bodyweightLogs,
	cycles,
	dumbbells,
	measurements,
	plates,
	sorenessLogs,
	users,
	workouts
} from '$lib/server/db/schema';
import { requireUser } from '$lib/server/session';
import { barLoads, cableLoads, nextLoadAbove, type PlateInventory } from '$lib/server/training/plate-math';

function num(v: FormDataEntryValue | null): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

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

	return { user, bars: barRows, plates: plateRows, dumbbells: dbRows, feedback };
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
