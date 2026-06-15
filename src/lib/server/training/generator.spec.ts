import { describe, it, expect } from 'vitest';
import { chooseSplit, generate, type GenExercise } from './generator';

let counter = 0;
function ex(partial: Partial<GenExercise> & { pattern: string; primaryMuscle: string }): GenExercise {
	return {
		id: `ex${counter++}`,
		name: partial.name ?? `Ex ${counter}`,
		equipment: partial.equipment ?? 'barbell',
		repLow: partial.repLow ?? 8,
		repHigh: partial.repHigh ?? 12,
		defaultRir: partial.defaultRir ?? 2,
		fatigueCost: partial.fatigueCost ?? 3,
		...partial
	} as GenExercise;
}

function pool(): GenExercise[] {
	counter = 0;
	return [
		ex({ name: 'Bench', pattern: 'horizontal-push', primaryMuscle: 'Chest' }),
		ex({ name: 'Incline', pattern: 'horizontal-push', primaryMuscle: 'Chest' }),
		ex({ name: 'Row', pattern: 'horizontal-pull', primaryMuscle: 'Back' }),
		ex({ name: 'Pulldown', pattern: 'vertical-pull', primaryMuscle: 'Back' }),
		ex({ name: 'OHP', pattern: 'vertical-push', primaryMuscle: 'Front Delts' }),
		ex({ name: 'Lat Raise', pattern: 'lateral-raise', primaryMuscle: 'Side Delts', equipment: 'dumbbell' }),
		ex({ name: 'Shrug', pattern: 'lateral-raise', primaryMuscle: 'Traps' }),
		ex({ name: 'Pushdown', pattern: 'elbow-extension', primaryMuscle: 'Triceps', equipment: 'cable-high' }),
		ex({ name: 'Curl', pattern: 'curl', primaryMuscle: 'Biceps', equipment: 'ezbar' }),
		ex({ name: 'Squat', pattern: 'squat', primaryMuscle: 'Quads' }),
		ex({ name: 'RDL', pattern: 'hinge', primaryMuscle: 'Hamstrings' }),
		ex({ name: 'Hip Thrust', pattern: 'hinge', primaryMuscle: 'Glutes' }),
		ex({ name: 'Bulgarian', pattern: 'lunge', primaryMuscle: 'Quads' }),
		ex({ name: 'Crunch', pattern: 'core', primaryMuscle: 'Abs', equipment: 'cable-high' })
		// deliberately no 'calf' exercise
	];
}

describe('chooseSplit', () => {
	it('alternates from the last label', () => {
		expect(chooseSplit('Upper')).toBe('lower');
		expect(chooseSplit('Lower A')).toBe('upper');
	});
	it('defaults to upper with no history', () => {
		expect(chooseSplit(null)).toBe('upper');
		expect(chooseSplit('Conditioning')).toBe('upper');
	});
});

describe('generate', () => {
	it('fills the upper slots with no duplicates', () => {
		const w = generate({ pool: pool() });
		expect(w.split).toBe('upper');
		expect(w.label).toBe('Upper');
		const ids = w.slots.map((s) => s.exercise.id);
		expect(new Set(ids).size).toBe(ids.length); // no dupes
		expect(w.slots.map((s) => s.slot)).toContain('Side Delts');
	});

	it('selects by muscle so Side Delts is not a shrug', () => {
		const w = generate({ pool: pool() });
		const side = w.slots.find((s) => s.slot === 'Side Delts')!;
		expect(side.exercise.primaryMuscle).toBe('Side Delts');
		expect(side.exercise.name).toBe('Lat Raise');
	});

	it('skips slots with no equipment-valid option (no calves)', () => {
		const w = generate({ pool: pool(), split: 'lower' });
		expect(w.slots.map((s) => s.slot)).not.toContain('Calves');
		expect(w.slots.map((s) => s.slot)).toEqual(
			expect.arrayContaining(['Squat', 'Hinge', 'Single-leg', 'Glutes', 'Core'])
		);
	});

	it('favors the least-recently-used exercise for variety', () => {
		const p = pool();
		const bench = p.find((e) => e.name === 'Bench')!;
		const incline = p.find((e) => e.name === 'Incline')!;
		// Bench used recently, Incline long ago → pick Incline.
		const w = generate({
			pool: p,
			lastUsedAt: { [bench.id]: '2026-06-10', [incline.id]: '2026-01-01' }
		});
		const press = w.slots.find((s) => s.slot === 'Horizontal Press')!;
		expect(press.exercise.name).toBe('Incline');
	});

	it('attaches a first-time prescription when there is no history', () => {
		const w = generate({ pool: pool() });
		expect(w.slots.every((s) => s.prescription.weightLb === null)).toBe(true);
	});

	it('trims a set per slot on a low-readiness day', () => {
		const normal = generate({ pool: pool() });
		const tired = generate({ pool: pool(), readiness: { fatigue: 2 } });
		const press = (g: typeof normal) => g.slots.find((s) => s.slot === 'Horizontal Press')!;
		expect(press(normal).targetSets).toBe(3);
		expect(press(tired).targetSets).toBe(2);
	});
});
