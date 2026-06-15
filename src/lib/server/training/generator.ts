/**
 * Workout generator. Given the exercise pool, recent history, achievable loads,
 * and (optionally) today's readiness, it picks a split, fills movement slots
 * with equipment-valid exercises (favoring variety), and attaches a progression
 * target to each via {@link prescribe}.
 *
 * Pure: all DB access happens in the caller, which passes plain data in. The
 * "let the app decide" split simply alternates Upper/Lower from the last
 * lifting session — predictable and well-suited to a variable schedule.
 */

import { prescribe, type LastTopSet, type Prescription, type Readiness } from './progression';

export type SplitType = 'upper' | 'lower';

export interface GenExercise {
	id: string;
	name: string;
	pattern: string;
	equipment: string;
	primaryMuscle: string;
	repLow: number;
	repHigh: number;
	defaultRir: number;
	fatigueCost: number;
}

export interface GenInput {
	/** 'auto' alternates from lastLiftingLabel; or force a split. */
	split?: 'auto' | SplitType;
	lastLiftingLabel?: string | null;
	/** Equipment-valid, non-conditioning exercises. */
	pool: GenExercise[];
	/** exerciseId -> ISO date last performed (null/absent = never). */
	lastUsedAt?: Record<string, string | null>;
	/** exerciseId -> most recent top set. */
	lastTopSet?: Record<string, LastTopSet | null>;
	/** equipment kind -> achievable loads ascending. */
	loadsByEquipment?: Record<string, { totalLb: number }[]>;
	readiness?: Readiness;
	/** muscle name -> soreness 0..3. */
	sorenessByMuscle?: Record<string, number>;
}

export interface GeneratedSlot {
	slot: string;
	exercise: GenExercise;
	targetSets: number;
	prescription: Prescription;
}

export interface GeneratedWorkout {
	split: SplitType;
	label: string;
	slots: GeneratedSlot[];
}

interface SlotDef {
	name: string;
	patterns: string[];
	/** Optional primary-muscle filter (e.g. distinguish side delts from traps). */
	muscle?: string;
	sets: number;
}

const SLOTS: Record<SplitType, SlotDef[]> = {
	upper: [
		{ name: 'Horizontal Press', patterns: ['horizontal-push'], muscle: 'Chest', sets: 3 },
		{ name: 'Horizontal Pull', patterns: ['horizontal-pull'], sets: 3 },
		{ name: 'Vertical Pull', patterns: ['vertical-pull'], sets: 3 },
		{ name: 'Vertical Press', patterns: ['vertical-push'], sets: 2 },
		{ name: 'Side Delts', patterns: ['lateral-raise'], muscle: 'Side Delts', sets: 3 },
		{ name: 'Triceps', patterns: ['elbow-extension'], sets: 2 },
		{ name: 'Biceps', patterns: ['curl'], sets: 2 }
	],
	lower: [
		{ name: 'Squat', patterns: ['squat'], sets: 3 },
		{ name: 'Hinge', patterns: ['hinge'], muscle: 'Hamstrings', sets: 3 },
		{ name: 'Single-leg', patterns: ['lunge'], sets: 3 },
		{ name: 'Glutes', patterns: ['hinge'], muscle: 'Glutes', sets: 3 },
		{ name: 'Calves', patterns: ['calf'], sets: 3 },
		{ name: 'Core', patterns: ['core'], sets: 3 }
	]
};

export function chooseSplit(lastLabel?: string | null): SplitType {
	if (lastLabel && /lower/i.test(lastLabel)) return 'upper';
	if (lastLabel && /upper/i.test(lastLabel)) return 'lower';
	// No usable history → start with Upper.
	return 'upper';
}

function lowReadiness(r?: Readiness): boolean {
	return !!r && r.fatigue != null && r.fatigue <= 2;
}

/**
 * Pick the best exercise for a slot: equipment-valid candidates matching the
 * slot's patterns (and muscle, if set), excluding already-used exercises,
 * preferring the least-recently-used (variety). Deterministic.
 */
function pickForSlot(
	slot: SlotDef,
	pool: GenExercise[],
	used: Set<string>,
	lastUsedAt: Record<string, string | null>
): GenExercise | null {
	const candidates = pool.filter(
		(e) =>
			!used.has(e.id) &&
			slot.patterns.includes(e.pattern) &&
			(!slot.muscle || e.primaryMuscle === slot.muscle)
	);
	if (candidates.length === 0) return null;

	// Sort: never-used first, then oldest last-used, then name for stability.
	candidates.sort((a, b) => {
		const ua = lastUsedAt[a.id] ?? '';
		const ub = lastUsedAt[b.id] ?? '';
		if (ua !== ub) return ua < ub ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
	return candidates[0];
}

export function generate(input: GenInput): GeneratedWorkout {
	const lastUsedAt = input.lastUsedAt ?? {};
	const lastTopSet = input.lastTopSet ?? {};
	const loadsByEquipment = input.loadsByEquipment ?? {};
	const soreness = input.sorenessByMuscle ?? {};

	const split: SplitType = input.split && input.split !== 'auto' ? input.split : chooseSplit(input.lastLiftingLabel);
	const easyDay = lowReadiness(input.readiness);

	const used = new Set<string>();
	const slots: GeneratedSlot[] = [];

	for (const def of SLOTS[split]) {
		const exercise = pickForSlot(def, input.pool, used, lastUsedAt);
		if (!exercise) continue; // no equipment-valid option (e.g. no calf machine) — skip
		used.add(exercise.id);

		const prescription = prescribe({
			repLow: exercise.repLow,
			repHigh: exercise.repHigh,
			targetRir: exercise.defaultRir,
			last: lastTopSet[exercise.id] ?? null,
			loads: loadsByEquipment[exercise.equipment] ?? [],
			readiness: {
				fatigue: input.readiness?.fatigue ?? null,
				soreness: soreness[exercise.primaryMuscle] ?? null
			}
		});

		// Trim a set on a low-readiness day (min 2).
		const targetSets = easyDay ? Math.max(2, def.sets - 1) : def.sets;
		slots.push({ slot: def.name, exercise, targetSets, prescription });
	}

	return { split, label: split === 'upper' ? 'Upper' : 'Lower', slots };
}
