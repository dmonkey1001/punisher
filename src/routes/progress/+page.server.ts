import { asc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { bodyweightLogs, measurements } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/session';

/** Epley estimated 1-rep max. */
function epley(weight: number, reps: number): number {
	return Math.round(weight * (1 + reps / 30));
}

export interface StrengthSeries {
	id: string;
	name: string;
	metric: 'e1rm' | 'reps';
	points: { label: string; value: number; date: string }[];
	latest: number;
	best: number;
	bestDate: string;
	changePct: number | null;
}

function shortDate(iso: string): string {
	const d = new Date(iso + 'T00:00:00');
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	// All completed working sets with their exercise + date.
	const rows = db.all<{
		eid: string;
		name: string;
		date: string;
		weight: number | null;
		reps: number | null;
	}>(sql`
		SELECT e.id AS eid, e.name AS name, w.date AS date,
			s.actual_weight_lb AS weight, s.actual_reps AS reps
		FROM sets s
		JOIN workout_exercises we ON we.id = s.workout_exercise_id
		JOIN workouts w ON w.id = we.workout_id
		JOIN exercises e ON e.id = we.exercise_id
		WHERE w.user_id = ${user.id} AND s.completed_at IS NOT NULL
			AND s.is_warmup = 0 AND s.actual_reps IS NOT NULL
		ORDER BY w.date ASC
	`);

	// Group by exercise → best value per date.
	type Acc = { name: string; loaded: boolean; byDate: Map<string, number> };
	const acc = new Map<string, Acc>();
	for (const r of rows) {
		const loaded = r.weight != null && r.weight > 0;
		const value = loaded ? epley(r.weight!, r.reps!) : (r.reps ?? 0);
		let a = acc.get(r.eid);
		if (!a) {
			a = { name: r.name, loaded, byDate: new Map() };
			acc.set(r.eid, a);
		}
		a.loaded ||= loaded;
		a.byDate.set(r.date, Math.max(a.byDate.get(r.date) ?? 0, value));
	}

	const strength: StrengthSeries[] = [];
	for (const [id, a] of acc) {
		const points = [...a.byDate.entries()]
			.sort((x, y) => (x[0] < y[0] ? -1 : 1))
			.slice(-50)
			.map(([date, value]) => ({ label: shortDate(date), value, date }));
		if (points.length === 0) continue;
		const latest = points.at(-1)!.value;
		const first = points[0].value;
		let best = points[0];
		for (const p of points) if (p.value > best.value) best = p;
		strength.push({
			id,
			name: a.name,
			metric: a.loaded ? 'e1rm' : 'reps',
			points,
			latest,
			best: best.value,
			bestDate: best.date,
			changePct: first > 0 ? Math.round(((latest - first) / first) * 100) : null
		});
	}
	// Most recently trained first (the last point's date).
	strength.sort((x, y) => (x.points.at(-1)!.date < y.points.at(-1)!.date ? 1 : -1));

	const bw = db
		.select()
		.from(bodyweightLogs)
		.where(eq(bodyweightLogs.userId, user.id))
		.orderBy(asc(bodyweightLogs.date))
		.all()
		.map((b) => ({ label: shortDate(b.date), value: b.weightLb, date: b.date }));

	const mRows = db
		.select()
		.from(measurements)
		.where(eq(measurements.userId, user.id))
		.orderBy(asc(measurements.date))
		.all();
	const measurementsBySite: Record<string, { label: string; value: number; date: string }[]> = {};
	for (const m of mRows) {
		(measurementsBySite[m.site] ??= []).push({ label: shortDate(m.date), value: m.valueIn, date: m.date });
	}

	return { user, strength, bodyweight: bw, measurements: measurementsBySite };
};
