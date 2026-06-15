import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { exercises, muscleGroups, workouts, type EquipmentKind, type User } from '../db/schema';
import { loadingHelper } from './loading';
import { generate, type GenExercise, type GeneratedWorkout, type SplitType } from './generator';
import type { LastTopSet } from './progression';

const LOAD_KINDS: EquipmentKind[] = [
	'barbell',
	'ezbar',
	'trapbar',
	'cable-high',
	'cable-low',
	'dumbbell'
];

/**
 * Gather everything the pure generator needs from the DB and produce the next
 * prescribed workout for a user.
 */
export function generateForUser(user: User, split: 'auto' | SplitType = 'auto'): GeneratedWorkout {
	// Equipment-valid, non-conditioning exercises with their primary muscle name.
	const pool: GenExercise[] = db
		.select({
			id: exercises.id,
			name: exercises.name,
			pattern: exercises.pattern,
			equipment: exercises.equipment,
			primaryMuscle: muscleGroups.name,
			repLow: exercises.repLow,
			repHigh: exercises.repHigh,
			defaultRir: exercises.defaultRir,
			fatigueCost: exercises.fatigueCost
		})
		.from(exercises)
		.innerJoin(muscleGroups, eq(exercises.primaryMuscleId, muscleGroups.id))
		.where(eq(exercises.isConditioning, false))
		.all();

	// Last lifting label, for auto split alternation.
	const lastLifting = db
		.select({ label: workouts.label })
		.from(workouts)
		.where(and(eq(workouts.userId, user.id), eq(workouts.kind, 'lifting')))
		.orderBy(desc(workouts.date), desc(workouts.startedAt))
		.get();

	// All completed working sets, newest first, for variety + progression.
	const rows = db.all<{
		eid: string;
		date: string;
		weight: number | null;
		reps: number | null;
		rir: number | null;
	}>(sql`
		SELECT we.exercise_id AS eid, w.date AS date,
			s.actual_weight_lb AS weight, s.actual_reps AS reps, s.rir AS rir
		FROM sets s
		JOIN workout_exercises we ON we.id = s.workout_exercise_id
		JOIN workouts w ON w.id = we.workout_id
		WHERE w.user_id = ${user.id} AND s.completed_at IS NOT NULL AND s.is_warmup = 0
		ORDER BY w.date DESC
	`);

	const lastUsedAt: Record<string, string | null> = {};
	const lastTopSet: Record<string, LastTopSet | null> = {};
	for (const r of rows) {
		// First row per exercise is the most recent date (rows are date-desc).
		if (!(r.eid in lastUsedAt)) lastUsedAt[r.eid] = r.date;
		// Top set = heaviest (then most reps) set from that most-recent date.
		if (r.date !== lastUsedAt[r.eid]) continue;
		const cur = lastTopSet[r.eid];
		const better =
			!cur ||
			(r.weight ?? 0) > (cur.weightLb ?? 0) ||
			((r.weight ?? 0) === (cur.weightLb ?? 0) && (r.reps ?? 0) > (cur.reps ?? 0));
		if (better && r.reps != null) {
			lastTopSet[r.eid] = { reps: r.reps, weightLb: r.weight, rir: r.rir };
		}
	}

	const helper = loadingHelper(user);
	const loadsByEquipment: Record<string, { totalLb: number }[]> = {};
	for (const k of LOAD_KINDS) loadsByEquipment[k] = helper.choicesFor(k);

	return generate({
		split,
		lastLiftingLabel: lastLifting?.label ?? null,
		pool,
		lastUsedAt,
		lastTopSet,
		loadsByEquipment
	});
}
