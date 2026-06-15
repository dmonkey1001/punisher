import { fail } from '@sveltejs/kit';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { bodyweightLogs, measurements, MEASUREMENT_SITES } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/session';
import { today } from '$lib/server/date';

function num(v: FormDataEntryValue | null): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	const bw = db
		.select()
		.from(bodyweightLogs)
		.where(eq(bodyweightLogs.userId, user.id))
		.orderBy(asc(bodyweightLogs.date))
		.all();

	const allMeasurements = db
		.select()
		.from(measurements)
		.where(eq(measurements.userId, user.id))
		.orderBy(desc(measurements.date))
		.all();

	// Latest value per site.
	const latestBySite: Record<string, { valueIn: number; date: string }> = {};
	for (const m of allMeasurements) {
		if (!latestBySite[m.site]) latestBySite[m.site] = { valueIn: m.valueIn, date: m.date };
	}

	return {
		user,
		bodyweight: bw,
		measurements: allMeasurements,
		latestBySite,
		sites: MEASUREMENT_SITES
	};
};

export const actions: Actions = {
	logBodyweight: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const weight = num(form.get('weight'));
		if (weight == null) return fail(400, { message: 'Weight required' });
		db.insert(bodyweightLogs)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				date: String(form.get('date') || today()),
				weightLb: weight,
				note: String(form.get('note') ?? '').trim() || null
			})
			.run();
		return { ok: true };
	},

	deleteBodyweight: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		db.delete(bodyweightLogs)
			.where(
				and(eq(bodyweightLogs.id, String(form.get('id') ?? '')), eq(bodyweightLogs.userId, user.id))
			)
			.run();
		return { ok: true };
	},

	logMeasurement: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const value = num(form.get('value'));
		const site = String(form.get('site') ?? '');
		if (value == null || !MEASUREMENT_SITES.includes(site as never))
			return fail(400, { message: 'Site and value required' });
		db.insert(measurements)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				date: String(form.get('date') || today()),
				site: site as never,
				valueIn: value,
				note: String(form.get('note') ?? '').trim() || null
			})
			.run();
		return { ok: true };
	},

	deleteMeasurement: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		db.delete(measurements)
			.where(and(eq(measurements.id, String(form.get('id') ?? '')), eq(measurements.userId, user.id)))
			.run();
		return { ok: true };
	}
};
