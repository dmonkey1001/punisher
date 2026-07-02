import { describe, it, expect } from 'vitest';
import { generateCycleSession, MAJORS, PAIRING, type GenExercise } from './generator';

let counter = 0;
function ex(p: Partial<GenExercise> & { pattern: string; primaryMuscle: string }): GenExercise {
	return {
		id: `ex${counter++}`,
		name: p.name ?? `Ex${counter}`,
		equipment: p.equipment ?? 'barbell',
		repLow: p.repLow ?? 8,
		repHigh: p.repHigh ?? 12,
		defaultRir: p.defaultRir ?? 2,
		fatigueCost: p.fatigueCost ?? 3,
		...p
	} as GenExercise;
}

function pool(): GenExercise[] {
	counter = 0;
	return [
		ex({ name: 'Bench', pattern: 'horizontal-push', primaryMuscle: 'Chest' }),
		ex({ name: 'Incline', pattern: 'horizontal-push', primaryMuscle: 'Chest' }),
		ex({ name: 'Pulldown', pattern: 'vertical-pull', primaryMuscle: 'Lats', equipment: 'cable-high' }),
		ex({ name: 'Pull-Up', pattern: 'vertical-pull', primaryMuscle: 'Lats', equipment: 'bodyweight' }),
		ex({ name: 'Row', pattern: 'horizontal-pull', primaryMuscle: 'Upper Back' }),
		ex({ name: 'OHP', pattern: 'vertical-push', primaryMuscle: 'Front Delts' }),
		ex({ name: 'Lat Raise', pattern: 'lateral-raise', primaryMuscle: 'Side Delts', equipment: 'dumbbell' }),
		ex({ name: 'Squat', pattern: 'squat', primaryMuscle: 'Quads' }),
		ex({ name: 'Bulgarian', pattern: 'lunge', primaryMuscle: 'Quads', equipment: 'bodyweight' }),
		ex({ name: 'RDL', pattern: 'hinge', primaryMuscle: 'Hamstrings' }),
		ex({ name: 'Hip Thrust', pattern: 'hinge', primaryMuscle: 'Glutes' }),
		// minors
		ex({ name: 'Pushdown', pattern: 'elbow-extension', primaryMuscle: 'Triceps', equipment: 'cable-high' }),
		ex({ name: 'Curl', pattern: 'curl', primaryMuscle: 'Biceps', equipment: 'cable-low' }),
		ex({ name: 'Face Pull', pattern: 'rear-delt', primaryMuscle: 'Rear Delts', equipment: 'cable-high' }),
		ex({ name: 'Shrug', pattern: 'lateral-raise', primaryMuscle: 'Traps' }),
		ex({ name: 'Back Ext', pattern: 'hinge', primaryMuscle: 'Lower Back', equipment: 'bodyweight' }),
		ex({ name: 'Crunch', pattern: 'core', primaryMuscle: 'Abs', equipment: 'cable-high' }),
		ex({ name: 'Calf Raise', pattern: 'calf', primaryMuscle: 'Calves' })
	];
}

describe('generateCycleSession', () => {
	it('opens a cycle with Chest + Triceps at stage 0 (1+1, 2 sets)', () => {
		const s = generateCycleSession({ coveredMajors: [], stage: 0, pool: pool() });
		expect(s.majorAnchor).toBe('Chest');
		expect(s.minorAnchor).toBe('Triceps');
		expect(s.label).toBe('Chest + Triceps');
		const majors = s.slots.filter((x) => x.role === 'major');
		const minors = s.slots.filter((x) => x.role === 'minor');
		expect(majors).toHaveLength(1);
		expect(minors).toHaveLength(1);
		expect(majors[0].targetSets).toBe(2);
	});

	it('uses the fixed pairing for every major', () => {
		for (const major of MAJORS) {
			const covered = MAJORS.filter((m) => m !== major); // force this major
			const s = generateCycleSession({ coveredMajors: covered, stage: 0, pool: pool() });
			expect(s.majorAnchor).toBe(major);
			expect(s.minorAnchor).toBe(PAIRING[major]);
		}
	});

	it('picks the most-rested uncovered major', () => {
		const recent = '2026-06-10';
		const s = generateCycleSession({
			coveredMajors: [],
			stage: 0,
			pool: pool(),
			lastTrainedAt: {
				Chest: recent,
				Lats: recent,
				'Upper Back': recent,
				'Side Delts': recent,
				Quads: '2026-01-01', // oldest → most rested
				Hamstrings: recent,
				Glutes: recent
			}
		});
		expect(s.majorAnchor).toBe('Quads');
		expect(s.minorAnchor).toBe('Calves');
	});

	it('gives two major exercises at full stage', () => {
		const s = generateCycleSession({ coveredMajors: [], stage: 2, pool: pool() });
		const majors = s.slots.filter((x) => x.role === 'major');
		expect(majors).toHaveLength(2);
		expect(majors.map((m) => m.exercise.name).sort()).toEqual(['Bench', 'Incline']);
		expect(majors[0].targetSets).toBe(3);
	});

	it('builds a Shoulders session as press + lateral', () => {
		const covered = MAJORS.filter((m) => m !== 'Shoulders');
		const s = generateCycleSession({ coveredMajors: covered, stage: 2, pool: pool() });
		expect(s.majorAnchor).toBe('Shoulders');
		const muscles = s.slots.filter((x) => x.role === 'major').map((m) => m.exercise.primaryMuscle);
		expect(muscles).toEqual(expect.arrayContaining(['Front Delts', 'Side Delts']));
		expect(s.minorAnchor).toBe('Traps');
	});

	it('flags the last session in a cycle', () => {
		const covered = MAJORS.filter((m) => m !== 'Glutes');
		const s = generateCycleSession({ coveredMajors: covered, stage: 0, pool: pool() });
		expect(s.lastInCycle).toBe(true);
		const notLast = generateCycleSession({ coveredMajors: [], stage: 0, pool: pool() });
		expect(notLast.lastInCycle).toBe(false);
	});

	it('pins the primary lift even when recently used', () => {
		const p = pool();
		// Real library names so the pin matches.
		const bench = ex({ name: 'Barbell Bench Press', pattern: 'horizontal-push', primaryMuscle: 'Chest' });
		p.push(bench);
		const w = generateCycleSession({
			coveredMajors: [],
			stage: 0,
			pool: p,
			// Bench used yesterday; fakes never used → LRU alone would avoid it.
			lastUsedAt: { [bench.id]: '2026-06-14' }
		});
		const major = w.slots.find((s) => s.role === 'major')!;
		expect(major.exercise.name).toBe('Barbell Bench Press');
	});

	it('rotates the second major slot while the first stays pinned', () => {
		const p = pool();
		const bench = ex({ name: 'Barbell Bench Press', pattern: 'horizontal-push', primaryMuscle: 'Chest' });
		p.push(bench);
		const incline = p.find((e) => e.name === 'Incline')!;
		const w = generateCycleSession({
			coveredMajors: [],
			stage: 2, // full volume → 2 major exercises
			pool: p,
			lastUsedAt: { [bench.id]: '2026-06-14', [incline.id]: '2026-06-01' }
		});
		const majors = w.slots.filter((s) => s.role === 'major').map((m) => m.exercise.name);
		expect(majors[0]).toBe('Barbell Bench Press'); // pinned
		expect(majors).toHaveLength(2);
		expect(majors[1]).not.toBe('Barbell Bench Press'); // accessory rotates (LRU)
	});

	it('falls back to LRU when the pinned lift is not in the pool', () => {
		// pool() has no real library names, so every anchor falls back.
		const w = generateCycleSession({ coveredMajors: [], stage: 0, pool: pool() });
		expect(w.slots.length).toBeGreaterThan(0);
	});

	it('reduces volume for a sore major muscle', () => {
		const s = generateCycleSession({
			coveredMajors: [],
			stage: 2,
			pool: pool(),
			sorenessByMuscle: { Chest: 3 }
		});
		const major = s.slots.find((x) => x.role === 'major')!;
		expect(major.targetSets).toBe(2); // 3 → 2 because Chest is sore
	});
});
