import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { cycles, exercises, muscleGroups, workouts, type Cycle, type EquipmentKind, type User } from '../db/schema';
import { loadingHelper } from './loading';
import {
	generateCycleSession,
	MAJORS,
	MAX_STAGE,
	type GenExercise,
	type GeneratedSession
} from './generator';
import type { LastTopSet } from './progression';

const LOAD_KINDS: EquipmentKind[] = [
	'barbell',
	'ezbar',
	'trapbar',
	'cable-high',
	'cable-low',
	'dumbbell'
];

const now = () => new Date().toISOString();

export interface GenerateOptions {
	fatigue?: number | null;
	sorenessByMuscle?: Record<string, number>;
}

export interface GeneratedPlan {
	session: GeneratedSession;
	cycle: Cycle;
	/** Majors already covered in this cycle (before this session). */
	coveredMajors: string[];
}

function createCycle(userId: string, number: number, stage: number): Cycle {
	const id = crypto.randomUUID();
	db.insert(cycles).values({ id, userId, number, stage, status: 'active' }).run();
	return db.select().from(cycles).where(eq(cycles.id, id)).get()!;
}

/** Distinct major anchors covered by workouts in a cycle. */
function coveredMajorsOf(cycleId: string): string[] {
	const rows = db
		.selectDistinct({ m: workouts.majorAnchor })
		.from(workouts)
		.where(eq(workouts.cycleId, cycleId))
		.all();
	return rows.map((r) => r.m).filter((m): m is string => !!m);
}

/** Did the completed cycle leave enough in the tank to add volume next cycle? */
function cyclePerformedWell(cycleId: string): boolean {
	const row = db.get<{ avg_rir: number | null; n: number }>(sql`
		SELECT AVG(s.rir) AS avg_rir, COUNT(s.rir) AS n
		FROM sets s
		JOIN workout_exercises we ON we.id = s.workout_exercise_id
		JOIN workouts w ON w.id = we.workout_id
		WHERE w.cycle_id = ${cycleId} AND s.completed_at IS NOT NULL
			AND s.is_warmup = 0 AND s.rir IS NOT NULL
	`);
	if (!row || !row.n) return false; // no evidence → hold the ramp
	return (row.avg_rir ?? 0) >= 1; // had reps in reserve → recovery OK, add volume
}

/** Resolve the active cycle, rolling over to a fresh one when the last completed. */
function resolveActiveCycle(user: User): { cycle: Cycle; coveredMajors: string[] } {
	let cycle =
		db
			.select()
			.from(cycles)
			.where(and(eq(cycles.userId, user.id), eq(cycles.status, 'active')))
			.orderBy(desc(cycles.number))
			.get() ?? createCycle(user.id, 1, 0);

	let covered = coveredMajorsOf(cycle.id);
	if (MAJORS.every((m) => covered.includes(m))) {
		// Cycle complete → close it and start the next (performance-gated ramp).
		db.update(cycles)
			.set({ status: 'complete', completedAt: now() })
			.where(eq(cycles.id, cycle.id))
			.run();
		const nextStage = Math.min(MAX_STAGE, cycle.stage + (cyclePerformedWell(cycle.id) ? 1 : 0));
		cycle = createCycle(user.id, cycle.number + 1, nextStage);
		covered = [];
	}
	return { cycle, coveredMajors: covered };
}

export interface CycleStatus {
	number: number;
	stage: number;
	maxStage: number;
	coveredMajors: string[];
	remainingMajors: string[];
	total: number;
	complete: boolean;
}

/** Read-only snapshot of the user's current cycle for display (no side effects). */
export function getCycleStatus(user: User): CycleStatus {
	const cycle = db
		.select()
		.from(cycles)
		.where(and(eq(cycles.userId, user.id), eq(cycles.status, 'active')))
		.orderBy(desc(cycles.number))
		.get();

	const covered = cycle ? coveredMajorsOf(cycle.id) : [];
	const remaining = MAJORS.filter((m) => !covered.includes(m));
	return {
		number: cycle?.number ?? 1,
		stage: cycle?.stage ?? 0,
		maxStage: MAX_STAGE,
		coveredMajors: covered,
		remainingMajors: remaining,
		total: MAJORS.length,
		complete: remaining.length === 0 && covered.length > 0
	};
}

export function generateForUser(user: User, opts: GenerateOptions = {}): GeneratedPlan {
	const { cycle, coveredMajors } = resolveActiveCycle(user);

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
	const muscleByExercise = new Map(pool.map((e) => [e.id, e.primaryMuscle]));

	// All completed working sets, newest first → variety, progression, recovery.
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
	const lastTrainedAt: Record<string, string | null> = {};
	for (const r of rows) {
		if (!(r.eid in lastUsedAt)) lastUsedAt[r.eid] = r.date;
		const muscle = muscleByExercise.get(r.eid);
		if (muscle && !(muscle in lastTrainedAt)) lastTrainedAt[muscle] = r.date;

		if (r.date === lastUsedAt[r.eid]) {
			const cur = lastTopSet[r.eid];
			const better =
				!cur ||
				(r.weight ?? 0) > (cur.weightLb ?? 0) ||
				((r.weight ?? 0) === (cur.weightLb ?? 0) && (r.reps ?? 0) > (cur.reps ?? 0));
			if (better && r.reps != null) lastTopSet[r.eid] = { reps: r.reps, weightLb: r.weight, rir: r.rir };
		}
	}

	const helper = loadingHelper(user);
	const loadsByEquipment: Record<string, { totalLb: number }[]> = {};
	for (const k of LOAD_KINDS) loadsByEquipment[k] = helper.choicesFor(k);

	const session = generateCycleSession({
		coveredMajors,
		stage: cycle.stage,
		pool,
		lastUsedAt,
		lastTrainedAt,
		lastTopSet,
		loadsByEquipment,
		readiness: { fatigue: opts.fatigue ?? null },
		sorenessByMuscle: opts.sorenessByMuscle
	});

	return { session, cycle, coveredMajors };
}
