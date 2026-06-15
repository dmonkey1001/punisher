import { describe, it, expect } from 'vitest';
import {
	barLoads,
	cableLoads,
	nearestLoad,
	nextLoadAbove,
	nextLoadBelow,
	describeBarLoad,
	formatPlates,
	type PlateInventory
} from './plate-math';

// Derek & Tai's actual inventory.
const INVENTORY: PlateInventory[] = [
	{ weightLb: 2.5, quantity: 2 },
	{ weightLb: 5, quantity: 2 },
	{ weightLb: 10, quantity: 4 },
	{ weightLb: 35, quantity: 4 }
];
const BAR = 45;

describe('barLoads', () => {
	const loads = barLoads(BAR, INVENTORY);
	const totals = loads.map((l) => l.totalLb);

	it('includes the empty bar', () => {
		expect(totals).toContain(45);
	});

	it('smallest jump above the bar is +5 lb (one 2.5 per side)', () => {
		const above = nextLoadAbove(loads, BAR);
		expect(above?.totalLb).toBe(50);
		expect(above?.perSide).toEqual([{ weightLb: 2.5, count: 1 }]);
	});

	it('maxes out at 240 lb with all plates balanced', () => {
		const max = Math.max(...totals);
		expect(max).toBe(240);
		const top = loads.find((l) => l.totalLb === 240)!;
		expect(top.perSide).toEqual([
			{ weightLb: 35, count: 2 },
			{ weightLb: 10, count: 2 },
			{ weightLb: 5, count: 1 },
			{ weightLb: 2.5, count: 1 }
		]);
	});

	it('returns ascending, unique totals', () => {
		const sorted = [...totals].sort((a, b) => a - b);
		expect(totals).toEqual(sorted);
		expect(new Set(totals).size).toBe(totals.length);
	});

	it('builds 100 lb from 2×10, 1×5, 1×2.5 per side', () => {
		const load = loads.find((l) => l.totalLb === 100)!;
		expect(load).toBeTruthy();
		// side sum = 27.5 → 100 total
		expect(load.perSide).toEqual([
			{ weightLb: 10, count: 2 },
			{ weightLb: 5, count: 1 },
			{ weightLb: 2.5, count: 1 }
		]);
	});
});

describe('snapping helpers', () => {
	const loads = barLoads(BAR, INVENTORY);

	it('nearestLoad clamps a too-heavy target to the max load', () => {
		expect(nearestLoad(loads, 1000)?.totalLb).toBe(240);
	});

	it('nearestLoad picks the closest achievable load', () => {
		// 98 is closer to 100 than to 95
		expect(nearestLoad(loads, 98)?.totalLb).toBe(100);
	});

	it('nearestLoad breaks ties toward the lower load', () => {
		// 47.5 is equidistant between 45 and 50 → choose 45
		expect(nearestLoad(loads, 47.5)?.totalLb).toBe(45);
	});

	it('nextLoadBelow steps down to the previous achievable load', () => {
		expect(nextLoadBelow(loads, 100)?.totalLb).toBe(95);
	});

	it('returns null when stepping past the ends', () => {
		expect(nextLoadAbove(loads, 240)).toBeNull();
		expect(nextLoadBelow(loads, 45)).toBeNull();
	});
});

describe('cableLoads', () => {
	it('uses individual plates (not pairs) and tops out at 195 lb at 1:1', () => {
		const loads = cableLoads(INVENTORY, 1);
		expect(Math.max(...loads.map((l) => l.totalLb))).toBe(195);
		// smallest non-zero is a single 2.5
		const first = loads.filter((l) => l.totalLb > 0).sort((a, b) => a.totalLb - b.totalLb)[0];
		expect(first.totalLb).toBe(2.5);
	});

	it('applies the pulley ratio to felt resistance', () => {
		const loads = cableLoads(INVENTORY, 0.5);
		expect(Math.max(...loads.map((l) => l.totalLb))).toBe(97.5);
		const ten = loads.find((l) => l.rawLb === 10);
		expect(ten?.totalLb).toBe(5);
	});
});

describe('formatting', () => {
	it('formats a per-side plate list heaviest-first', () => {
		expect(formatPlates([{ weightLb: 2.5, count: 1 }, { weightLb: 35, count: 2 }])).toBe(
			'2×35, 1×2.5'
		);
	});

	it('describes a full barbell load', () => {
		const load = barLoads(BAR, INVENTORY).find((l) => l.totalLb === 135)!;
		expect(describeBarLoad(BAR, load)).toContain('45 bar +');
		expect(describeBarLoad(BAR, load)).toContain('per side');
	});
});
