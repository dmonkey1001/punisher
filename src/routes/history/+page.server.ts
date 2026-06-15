import { sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requireUser } from '$lib/server/session';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);

	const workouts = db.all<{
		id: string;
		date: string;
		label: string | null;
		kind: string;
		status: string;
		exercises: number;
		sets: number;
		volume: number;
	}>(sql`
		SELECT w.id, w.date, w.label, w.kind, w.status,
			COUNT(DISTINCT we.id) AS exercises,
			COUNT(s.id) FILTER (WHERE s.completed_at IS NOT NULL AND s.is_warmup = 0) AS sets,
			COALESCE(SUM(CASE WHEN s.completed_at IS NOT NULL AND s.is_warmup = 0
				THEN s.actual_reps * s.actual_weight_lb END), 0) AS volume
		FROM workouts w
		LEFT JOIN workout_exercises we ON we.workout_id = w.id
		LEFT JOIN sets s ON s.workout_exercise_id = we.id
		WHERE w.user_id = ${user.id}
		GROUP BY w.id
		ORDER BY w.date DESC, w.started_at DESC
	`);

	return { user, workouts };
};
