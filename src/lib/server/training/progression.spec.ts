import { describe, it, expect } from 'vitest';
import { prescribe } from './progression';
import { barLoads, nextLoadAbove, type PlateInventory } from './plate-math';

const INVENTORY: PlateInventory[] = [
	{ weightLb: 2.5, quantity: 2 },
	{ weightLb: 5, quantity: 2 },
	{ weightLb: 10, quantity: 4 },
	{ weightLb: 35, quantity: 4 }
];
const LOADS = barLoads(45, INVENTORY);
const RANGE = { repLow: 8, repHigh: 12, targetRir: 2 };

describe('prescribe', () => {
	it('gives a conservative first-time prescription with no history', () => {
		const p = prescribe({ ...RANGE, last: null, loads: LOADS });
		expect(p.weightLb).toBeNull();
		expect(p.targetReps).toBe(8);
		expect(p.rir).toBe(3); // one easier than target on the first exposure
	});

	it('treats a loaded movement with no recorded weight as first-time', () => {
		const p = prescribe({ ...RANGE, last: { reps: 10, weightLb: null, rir: 2 }, loads: LOADS });
		expect(p.weightLb).toBeNull();
	});

	it('adds load when the top of the range is hit at/under target effort', () => {
		const p = prescribe({ ...RANGE, last: { reps: 12, weightLb: 95, rir: 2 }, loads: LOADS });
		expect(p.weightLb).toBe(nextLoadAbove(LOADS, 95)?.totalLb); // 100
		expect(p.weightLb).toBe(100);
		expect(p.targetReps).toBe(8); // reset to bottom of range
	});

	it('holds load and chases a rep when inside the range', () => {
		const p = prescribe({ ...RANGE, last: { reps: 9, weightLb: 95, rir: 3 }, loads: LOADS });
		expect(p.weightLb).toBe(95);
		expect(p.targetReps).toBe(10);
	});

	it('backs off the load when the bottom of the range was missed', () => {
		const p = prescribe({ ...RANGE, last: { reps: 6, weightLb: 100, rir: 0 }, loads: LOADS });
		expect(p.weightLb).toBe(95); // next achievable load below 100
		expect(p.targetReps).toBe(8);
	});

	it('keeps load and pushes reps when out of plates at the top', () => {
		// 240 is the max achievable barbell load; rir 2 == target, so it's "easy enough" to progress.
		const p = prescribe({ ...RANGE, last: { reps: 12, weightLb: 240, rir: 2 }, loads: LOADS });
		expect(p.weightLb).toBe(240);
		expect(p.targetReps).toBe(12);
		expect(p.note).toMatch(/plates/i);
	});

	it('progresses bodyweight by reps (no loads)', () => {
		const p = prescribe({ repLow: 5, repHigh: 12, targetRir: 1, last: { reps: 12, weightLb: null, rir: 1 }, loads: [] });
		expect(p.weightLb).toBeNull();
		expect(p.targetReps).toBe(13); // push past the top
	});

	it('autoregulates down on low readiness (fatigue)', () => {
		const p = prescribe({
			...RANGE,
			last: { reps: 12, weightLb: 95, rir: 2 },
			loads: LOADS,
			readiness: { fatigue: 2 }
		});
		expect(p.weightLb).toBe(95); // does NOT add load despite hitting the top
		expect(p.rir).toBe(3); // leaves an extra rep in reserve
	});

	it('autoregulates down on high soreness', () => {
		const p = prescribe({
			...RANGE,
			last: { reps: 12, weightLb: 95, rir: 2 },
			loads: LOADS,
			readiness: { soreness: 3 }
		});
		expect(p.weightLb).toBe(95);
		expect(p.rir).toBe(3);
	});
});
