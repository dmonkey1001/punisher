import { redirect } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { workouts, bodyweightLogs } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/session';
import { today } from '$lib/server/date';
import { getCycleStatus } from '$lib/server/training/plan';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	const active = db
		.select()
		.from(workouts)
		.where(and(eq(workouts.userId, user.id), eq(workouts.status, 'in_progress')))
		.orderBy(desc(workouts.startedAt))
		.get();

	const recent = db.all<{
		id: string;
		date: string;
		label: string | null;
		kind: string;
		status: string;
		sets: number;
		volume: number;
	}>(sql`
		SELECT w.id, w.date, w.label, w.kind, w.status,
			COUNT(s.id) FILTER (WHERE s.completed_at IS NOT NULL AND s.is_warmup = 0) AS sets,
			COALESCE(SUM(CASE WHEN s.completed_at IS NOT NULL AND s.is_warmup = 0
				THEN s.actual_reps * s.actual_weight_lb END), 0) AS volume
		FROM workouts w
		LEFT JOIN workout_exercises we ON we.workout_id = w.id
		LEFT JOIN sets s ON s.workout_exercise_id = we.id
		WHERE w.user_id = ${user.id}
		GROUP BY w.id
		ORDER BY w.date DESC, w.started_at DESC
		LIMIT 8
	`);

	const latestBw = db
		.select()
		.from(bodyweightLogs)
		.where(eq(bodyweightLogs.userId, user.id))
		.orderBy(desc(bodyweightLogs.date))
		.get();

	return { user, active, recent, latestBw, cycle: getCycleStatus(user) };
};

export const actions: Actions = {
	start: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const kind = form.get('kind') === 'conditioning' ? 'conditioning' : 'lifting';

		const id = crypto.randomUUID();
		db.insert(workouts)
			.values({
				id,
				userId: user.id,
				date: today(),
				kind,
				label: kind === 'conditioning' ? 'Conditioning' : null,
				status: 'in_progress'
			})
			.run();
		throw redirect(303, `/workout/${id}`);
	}
};
