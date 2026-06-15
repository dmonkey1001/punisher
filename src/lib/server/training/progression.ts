/**
 * Progression logic for hypertrophy training.
 *
 * Model: double progression within a rep range at a target RIR (reps in
 * reserve). Each session you either add reps (until the top of the range) or,
 * once you hit the top at/under the target effort, add load and reset to the
 * bottom of the range. Load increases snap to the nearest achievable plate
 * combination (see plate-math). An optional readiness signal nudges effort and
 * load down on bad days (autoregulation).
 *
 * Pure functions — no DB access — so they're easy to unit test.
 */

import { nearestLoad, nextLoadAbove, nextLoadBelow } from './plate-math';

/** The heaviest working set from the most recent time an exercise was done. */
export interface LastTopSet {
	reps: number;
	weightLb: number | null;
	rir: number | null;
}

export interface Readiness {
	/** 1 (wrecked) .. 5 (fresh). */
	fatigue?: number | null;
	/** 0 (none) .. 3 (very sore) for the worked muscle. */
	soreness?: number | null;
}

export interface PrescriptionInput {
	repLow: number;
	repHigh: number;
	targetRir: number;
	/** Most recent top set, or null/undefined for a brand-new exercise. */
	last?: LastTopSet | null;
	/** Achievable loads for this movement (from plate-math), ascending. Empty for bodyweight. */
	loads?: { totalLb: number }[];
	readiness?: Readiness;
}

export interface Prescription {
	weightLb: number | null;
	repLow: number;
	repHigh: number;
	/** Suggested rep goal to aim for on the top set this session. */
	targetReps: number;
	rir: number;
	note: string;
}

/** Whether the readiness signal indicates a clearly bad day. */
function isLowReadiness(r?: Readiness): boolean {
	if (!r) return false;
	return (r.fatigue != null && r.fatigue <= 2) || (r.soreness != null && r.soreness >= 3);
}

function snap(loads: { totalLb: number }[] | undefined, target: number | null): number | null {
	if (target == null || !loads || loads.length === 0) return target;
	return nearestLoad(loads, target)?.totalLb ?? target;
}

export function prescribe(input: PrescriptionInput): Prescription {
	const { repLow, repHigh, targetRir, last, loads, readiness } = input;
	const lowReadiness = isLowReadiness(readiness);
	// On a bad day, leave one extra rep in the tank.
	const rir = lowReadiness ? targetRir + 1 : targetRir;

	// Bodyweight (no achievable loads) progresses by reps even with null weight.
	const canLoad = !!loads && loads.length > 0;

	// Brand-new exercise (no history), or a loaded movement we have no weight for.
	if (!last || (canLoad && last.weightLb == null)) {
		return {
			weightLb: null,
			repLow,
			repHigh,
			targetReps: repLow,
			rir: targetRir + 1,
			note: `First time — pick a weight you can do for ~${repLow} reps at ${targetRir + 1} RIR.`
		};
	}

	const lastWeight = last.weightLb;
	const hitTop = last.reps >= repHigh;
	const easyEnough = last.rir == null || last.rir >= targetRir;
	const belowRange = last.reps < repLow;

	if (lowReadiness) {
		// Hold load, back off effort and reps slightly.
		return {
			weightLb: snap(loads, lastWeight),
			repLow,
			repHigh,
			targetReps: Math.max(repLow, Math.min(last.reps, repHigh)),
			rir,
			note: 'Low readiness — holding load, leaving an extra rep in reserve.'
		};
	}

	if (hitTop && easyEnough && canLoad) {
		const next = nextLoadAbove(loads!, lastWeight ?? 0);
		if (next) {
			return {
				weightLb: next.totalLb,
				repLow,
				repHigh,
				targetReps: repLow,
				rir: targetRir,
				note: `Hit ${last.reps} reps last time — up to ${next.totalLb} lb, back to ${repLow} reps.`
			};
		}
		// No heavier load available (out of plates): push reps instead.
		return {
			weightLb: snap(loads, lastWeight),
			repLow,
			repHigh,
			targetReps: repHigh,
			rir: targetRir,
			note: `Maxed your plates at ${lastWeight} lb — keep adding reps (add 25/45 plates to progress load).`
		};
	}

	if (hitTop && easyEnough && !canLoad) {
		// Bodyweight at top of range — keep pushing reps past the top.
		return {
			weightLb: null,
			repLow,
			repHigh,
			targetReps: last.reps + 1,
			rir: targetRir,
			note: `Strong set — aim for ${last.reps + 1}+ reps.`
		};
	}

	if (belowRange) {
		// Couldn't reach the bottom of the range — ease the load if possible.
		const lower = canLoad ? nextLoadBelow(loads!, lastWeight ?? 0) : null;
		return {
			weightLb: lower ? lower.totalLb : canLoad ? snap(loads, lastWeight) : null,
			repLow,
			repHigh,
			targetReps: repLow,
			rir: targetRir,
			note: lower
				? `Last set fell short — drop to ${lower.totalLb} lb and rebuild.`
				: 'Last set fell short — repeat and aim for the bottom of the range.'
		};
	}

	// Within range: keep load, chase one more rep.
	const goal = Math.min(last.reps + 1, repHigh);
	return {
		weightLb: canLoad ? snap(loads, lastWeight) : null,
		repLow,
		repHigh,
		targetReps: goal,
		rir: targetRir,
		note: `Keep ${canLoad ? `${lastWeight} lb` : 'bodyweight'} — aim for ${goal} reps.`
	};
}
