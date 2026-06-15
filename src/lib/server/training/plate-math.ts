/**
 * Plate math for a home gym where the barbell and the plate-loaded cables draw
 * from one shared plate inventory.
 *
 * Two loading models:
 *  - BARBELL (symmetric): plates load in equal pairs on each side.
 *        total = barWeight + 2 * (sum of one side's plates)
 *    Only pairs are usable, so the usable count of each denomination is
 *    floor(quantityOwned / 2).
 *  - CABLE (single carriage): plates stack on one loading horn (no pairing),
 *    and the *felt* resistance is scaled by the pulley ratio.
 *        feltResistance = (carriageWeight + sum of plates) * pulleyRatio
 *
 * Everything is in pounds. All arithmetic is rounded to 0.01 lb to avoid
 * floating-point drift from denominations like 2.5.
 */

export interface PlateInventory {
	weightLb: number;
	/** Total plates of this denomination owned (not pairs). */
	quantity: number;
}

export interface PlateCount {
	weightLb: number;
	count: number;
}

export interface BarLoad {
	/** Loaded total: bar + both sides of plates. */
	totalLb: number;
	/** Plates on a single side (mirror on the other side). */
	perSide: PlateCount[];
}

export interface CableLoad {
	/** Felt resistance after applying the pulley ratio. */
	totalLb: number;
	/** Actual plates hung on the carriage. */
	plates: PlateCount[];
	/** Raw weight hung (carriage + plates) before the ratio. */
	rawLb: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Bounded reachable-sum solver. Given denominations with usable counts, returns
 * a map from every achievable plate-sum to a concrete per-denomination count.
 * The first combination found for a sum wins (built greedily from the heaviest
 * denomination first, so breakdowns prefer fewer, heavier plates).
 */
function reachableSums(items: PlateCount[]): Map<number, number[]> {
	// Heaviest first → breakdowns naturally favor fewer plates.
	const denoms = [...items].sort((a, b) => b.weightLb - a.weightLb);
	let map = new Map<number, number[]>();
	map.set(0, denoms.map(() => 0));

	denoms.forEach((denom, idx) => {
		const next = new Map(map);
		for (const [sum, counts] of map) {
			for (let k = 1; k <= denom.count; k++) {
				const ns = round2(sum + denom.weightLb * k);
				if (!next.has(ns)) {
					const nc = counts.slice();
					nc[idx] = k;
					next.set(ns, nc);
				}
			}
		}
		map = next;
	});

	// Re-key the per-denom counts back to PlateCount[] using the sorted denoms.
	const remapped = new Map<number, number[]>();
	for (const [sum, counts] of map) remapped.set(sum, counts);
	// Stash the denomination order on the map via a closure helper instead of a
	// side channel: callers use `countsToPlates` below with the same sort.
	(remapped as ReachableMap).__denoms = denoms;
	return remapped;
}

type ReachableMap = Map<number, number[]> & { __denoms?: PlateCount[] };

function countsToPlates(map: ReachableMap, counts: number[]): PlateCount[] {
	const denoms = map.__denoms ?? [];
	const out: PlateCount[] = [];
	counts.forEach((c, i) => {
		if (c > 0) out.push({ weightLb: denoms[i].weightLb, count: c });
	});
	return out;
}

function usablePairs(inventory: PlateInventory[]): PlateCount[] {
	return inventory
		.filter((p) => p.quantity >= 2 && p.weightLb > 0)
		.map((p) => ({ weightLb: p.weightLb, count: Math.floor(p.quantity / 2) }));
}

function usablePlates(inventory: PlateInventory[]): PlateCount[] {
	return inventory
		.filter((p) => p.quantity >= 1 && p.weightLb > 0)
		.map((p) => ({ weightLb: p.weightLb, count: p.quantity }));
}

/** Every achievable barbell load (bar + balanced plates), ascending. */
export function barLoads(barWeightLb: number, inventory: PlateInventory[]): BarLoad[] {
	const map = reachableSums(usablePairs(inventory)) as ReachableMap;
	const loads: BarLoad[] = [];
	for (const [sideSum, counts] of map) {
		loads.push({
			totalLb: round2(barWeightLb + 2 * sideSum),
			perSide: countsToPlates(map, counts)
		});
	}
	return loads.sort((a, b) => a.totalLb - b.totalLb);
}

/** Every achievable cable resistance, ascending (felt resistance after ratio). */
export function cableLoads(
	inventory: PlateInventory[],
	pulleyRatio = 1,
	carriageWeightLb = 0
): CableLoad[] {
	const map = reachableSums(usablePlates(inventory)) as ReachableMap;
	const loads: CableLoad[] = [];
	for (const [plateSum, counts] of map) {
		const raw = round2(carriageWeightLb + plateSum);
		loads.push({
			totalLb: round2(raw * pulleyRatio),
			rawLb: raw,
			plates: countsToPlates(map, counts)
		});
	}
	return loads.sort((a, b) => a.totalLb - b.totalLb);
}

/** Pick the achievable load nearest a target; ties resolve to the lower load. */
export function nearestLoad<T extends { totalLb: number }>(loads: T[], targetLb: number): T | null {
	if (loads.length === 0) return null;
	let best = loads[0];
	let bestDelta = Math.abs(best.totalLb - targetLb);
	for (const load of loads) {
		const delta = Math.abs(load.totalLb - targetLb);
		if (delta < bestDelta || (delta === bestDelta && load.totalLb < best.totalLb)) {
			best = load;
			bestDelta = delta;
		}
	}
	return best;
}

/** Smallest achievable load strictly greater than `currentLb`, or null. */
export function nextLoadAbove<T extends { totalLb: number }>(
	loads: T[],
	currentLb: number
): T | null {
	const above = loads.filter((l) => l.totalLb > round2(currentLb));
	return above.length ? above.reduce((a, b) => (a.totalLb < b.totalLb ? a : b)) : null;
}

/** Largest achievable load strictly less than `currentLb`, or null. */
export function nextLoadBelow<T extends { totalLb: number }>(
	loads: T[],
	currentLb: number
): T | null {
	const below = loads.filter((l) => l.totalLb < round2(currentLb));
	return below.length ? below.reduce((a, b) => (a.totalLb > b.totalLb ? a : b)) : null;
}

/** "1×35, 1×10" — compact per-side / per-carriage plate description. */
export function formatPlates(plates: PlateCount[]): string {
	if (plates.length === 0) return 'empty bar';
	return [...plates]
		.sort((a, b) => b.weightLb - a.weightLb)
		.map((p) => `${p.count}×${formatLb(p.weightLb)}`)
		.join(', ');
}

/** "45 + 35,10 per side" — full human hint for loading a barbell. */
export function describeBarLoad(bar: number, load: BarLoad): string {
	if (load.perSide.length === 0) return `${formatLb(bar)} (empty bar)`;
	return `${formatLb(bar)} bar + ${formatPlates(load.perSide)} per side`;
}

function formatLb(n: number): string {
	return Number.isInteger(n) ? `${n}` : `${n}`.replace(/\.0+$/, '');
}
