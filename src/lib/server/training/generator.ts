/**
 * Cycle-based workout generator.
 *
 * A *cycle* is a set of sessions that together cover every muscle group once.
 * Each session is one MAJOR anchor + its paired MINOR (fixed pairings below).
 * The generator picks the most-rested uncovered major, pairs its minor, and
 * fills exercises (equipment-valid, least-recently-used for variety). Volume is
 * driven by a `stage` (the ramp): exercises-per-major and sets grow as the
 * lifter progresses. Cycle lifecycle (coverage + stage advancement) is managed
 * by the caller; this module is pure.
 */

import { prescribe, type LastTopSet, type Prescription, type Readiness } from './progression';

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

interface Selector {
	patterns: string[];
	muscle?: string;
}

/** Major anchors, in tie-break priority order. */
export const MAJORS = ['Chest', 'Lats', 'Upper Back', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes'];

/** Fixed major → minor pairings (1:1, so a cycle is exactly 7 sessions). */
export const PAIRING: Record<string, string> = {
	Chest: 'Triceps',
	Lats: 'Biceps',
	'Upper Back': 'Rear Delts',
	Shoulders: 'Traps',
	Quads: 'Calves',
	Hamstrings: 'Lower Back',
	Glutes: 'Abs'
};

/** Exercise selectors per anchor (ordered; multi-entry = distinct movements). */
const SELECTORS: Record<string, Selector[]> = {
	// Majors
	Chest: [{ patterns: ['horizontal-push'], muscle: 'Chest' }],
	Lats: [{ patterns: ['vertical-pull'], muscle: 'Lats' }],
	'Upper Back': [{ patterns: ['horizontal-pull'], muscle: 'Upper Back' }],
	Shoulders: [
		{ patterns: ['vertical-push'], muscle: 'Front Delts' },
		{ patterns: ['lateral-raise'], muscle: 'Side Delts' }
	],
	Quads: [{ patterns: ['squat', 'lunge'], muscle: 'Quads' }],
	Hamstrings: [{ patterns: ['hinge'], muscle: 'Hamstrings' }],
	Glutes: [{ patterns: ['hinge'], muscle: 'Glutes' }],
	// Minors
	Triceps: [{ patterns: ['elbow-extension'], muscle: 'Triceps' }],
	Biceps: [{ patterns: ['curl'], muscle: 'Biceps' }],
	'Rear Delts': [{ patterns: ['rear-delt'], muscle: 'Rear Delts' }],
	Traps: [{ patterns: ['lateral-raise'], muscle: 'Traps' }],
	'Lower Back': [{ patterns: ['hinge'], muscle: 'Lower Back' }],
	Abs: [{ patterns: ['core'], muscle: 'Abs' }],
	Calves: [{ patterns: ['calf'], muscle: 'Calves' }]
};

/** Muscle used to judge "most rested" for recovery ordering of a major anchor. */
const ANCHOR_MUSCLE: Record<string, string> = { Shoulders: 'Side Delts' };

/**
 * Pinned primary lift per anchor. The first exercise of every anchor is always
 * this movement (when it exists in the pool), so the big lifts recur every
 * cycle — giving steady double-progression and a remembered working weight.
 * Additional exercises (2nd major slot at full volume, Shoulders' lateral
 * slot) still rotate least-recently-used for variety.
 */
export const PRIMARY_LIFTS: Record<string, string> = {
	Chest: 'Barbell Bench Press',
	Lats: 'Cable Lat Pulldown',
	'Upper Back': 'Barbell Row',
	Shoulders: 'Barbell Overhead Press',
	Quads: 'Barbell Back Squat',
	Hamstrings: 'Barbell Romanian Deadlift',
	Glutes: 'Barbell Hip Thrust',
	Triceps: 'Cable Triceps Pushdown',
	Biceps: 'EZ Bar Curl',
	'Rear Delts': 'Cable Face Pull',
	Traps: 'Barbell Shrug',
	'Lower Back': 'Floor Back Extension',
	Abs: 'Cable Crunch',
	Calves: 'Standing Barbell Calf Raise'
};

/** Volume ramp stages. Index = cycle stage; clamped to the last (full) stage. */
export const STAGES = [
	{ majorCount: 1, setsMajor: 2, setsMinor: 2, rirOffset: 1 }, // easy reentry
	{ majorCount: 1, setsMajor: 3, setsMinor: 2, rirOffset: 1 },
	{ majorCount: 2, setsMajor: 3, setsMinor: 3, rirOffset: 0 } // full
];
export const MAX_STAGE = STAGES.length - 1;

export interface CycleGenInput {
	/** Major anchors already covered in the current cycle. */
	coveredMajors: string[];
	/** Volume ramp stage (0..MAX_STAGE). */
	stage: number;
	pool: GenExercise[];
	lastUsedAt?: Record<string, string | null>;
	/** Muscle name -> ISO date last trained, for recovery ordering. */
	lastTrainedAt?: Record<string, string | null>;
	lastTopSet?: Record<string, LastTopSet | null>;
	loadsByEquipment?: Record<string, { totalLb: number }[]>;
	readiness?: Readiness;
	sorenessByMuscle?: Record<string, number>;
}

export interface CycleSlot {
	role: 'major' | 'minor';
	anchor: string;
	exercise: GenExercise;
	targetSets: number;
	prescription: Prescription;
}

export interface GeneratedSession {
	majorAnchor: string;
	minorAnchor: string;
	label: string;
	stage: number;
	slots: CycleSlot[];
	/** True if this session covers the last uncovered major (closes the cycle). */
	lastInCycle: boolean;
}

function stageParams(stage: number) {
	return STAGES[Math.max(0, Math.min(stage, MAX_STAGE))];
}

function lowReadiness(r?: Readiness): boolean {
	return !!r && r.fatigue != null && r.fatigue <= 2;
}

function pickForSelector(
	sel: Selector,
	pool: GenExercise[],
	used: Set<string>,
	lastUsedAt: Record<string, string | null>
): GenExercise | null {
	const candidates = pool.filter(
		(e) =>
			!used.has(e.id) &&
			sel.patterns.includes(e.pattern) &&
			(!sel.muscle || e.primaryMuscle === sel.muscle)
	);
	if (candidates.length === 0) return null;
	candidates.sort((a, b) => {
		const ua = lastUsedAt[a.id] ?? '';
		const ub = lastUsedAt[b.id] ?? '';
		if (ua !== ub) return ua < ub ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
	return candidates[0];
}

/**
 * Fill an anchor with up to `count` distinct exercises. The first slot is the
 * anchor's pinned primary lift (consistent across cycles → steady progression
 * and remembered weights); remaining slots rotate least-recently-used.
 */
function fillAnchor(
	anchor: string,
	count: number,
	pool: GenExercise[],
	used: Set<string>,
	lastUsedAt: Record<string, string | null>
): GenExercise[] {
	const selectors = SELECTORS[anchor] ?? [];
	const out: GenExercise[] = [];
	for (let i = 0; i < count && selectors.length; i++) {
		const sel = selectors[Math.min(i, selectors.length - 1)];
		let ex: GenExercise | null = null;
		if (i === 0) {
			// Pinned primary — must still match the slot's selector so the
			// Shoulders press slot never pins a lateral raise, etc.
			const pinned = pool.find(
				(e) =>
					e.name === PRIMARY_LIFTS[anchor] &&
					!used.has(e.id) &&
					sel.patterns.includes(e.pattern) &&
					(!sel.muscle || e.primaryMuscle === sel.muscle)
			);
			ex = pinned ?? null;
		}
		// Fallback (pinned lift missing/renamed) and all later slots: LRU rotation.
		ex ??= pickForSelector(sel, pool, used, lastUsedAt);
		if (ex) {
			used.add(ex.id);
			out.push(ex);
		}
	}
	return out;
}

export function generateCycleSession(input: CycleGenInput): GeneratedSession {
	const lastUsedAt = input.lastUsedAt ?? {};
	const lastTrainedAt = input.lastTrainedAt ?? {};
	const lastTopSet = input.lastTopSet ?? {};
	const loadsByEquipment = input.loadsByEquipment ?? {};
	const soreness = input.sorenessByMuscle ?? {};
	const params = stageParams(input.stage);
	const easyDay = lowReadiness(input.readiness);

	const uncovered = MAJORS.filter((m) => !input.coveredMajors.includes(m));
	const choices = uncovered.length ? uncovered : [...MAJORS];

	// Most-rested major first: oldest last-trained date (never-trained = oldest),
	// tie-break by MAJORS priority order.
	choices.sort((a, b) => {
		const ta = lastTrainedAt[ANCHOR_MUSCLE[a] ?? a] ?? '';
		const tb = lastTrainedAt[ANCHOR_MUSCLE[b] ?? b] ?? '';
		if (ta !== tb) return ta < tb ? -1 : 1;
		return MAJORS.indexOf(a) - MAJORS.indexOf(b);
	});

	const major = choices[0];
	const minor = PAIRING[major];

	const used = new Set<string>();
	const majorEx = fillAnchor(major, params.majorCount, input.pool, used, lastUsedAt);
	const minorEx = fillAnchor(minor, 1, input.pool, used, lastUsedAt);

	const build = (ex: GenExercise, role: 'major' | 'minor', baseSets: number): CycleSlot => {
		const prescription = prescribe({
			repLow: ex.repLow,
			repHigh: ex.repHigh,
			targetRir: ex.defaultRir + params.rirOffset,
			last: lastTopSet[ex.id] ?? null,
			loads: loadsByEquipment[ex.equipment] ?? [],
			readiness: {
				fatigue: input.readiness?.fatigue ?? null,
				soreness: soreness[ex.primaryMuscle] ?? null
			}
		});
		let targetSets = baseSets;
		if (easyDay) targetSets = Math.max(1, targetSets - 1);
		if ((soreness[ex.primaryMuscle] ?? 0) >= 3) targetSets = Math.max(1, targetSets - 1);
		return { role, anchor: role === 'major' ? major : minor, exercise: ex, targetSets, prescription };
	};

	const slots: CycleSlot[] = [
		...majorEx.map((e) => build(e, 'major', params.setsMajor)),
		...minorEx.map((e) => build(e, 'minor', params.setsMinor))
	];

	return {
		majorAnchor: major,
		minorAnchor: minor,
		label: `${major} + ${minor}`,
		stage: input.stage,
		slots,
		lastInCycle: uncovered.length === 1
	};
}
