import { db } from '../db';
import { bars, plates, dumbbells, type User } from '../db/schema';
import type { EquipmentKind } from '../db/schema';
import {
	barLoads,
	cableLoads,
	describeBarLoad,
	formatPlates,
	nearestLoad,
	type PlateInventory
} from './plate-math';

export interface LoadChoice {
	totalLb: number;
	/** Human hint for how to load it. */
	hint: string;
}

const BAR_KIND: Partial<Record<EquipmentKind, 'barbell' | 'ezbar' | 'trapbar'>> = {
	barbell: 'barbell',
	ezbar: 'ezbar',
	trapbar: 'trapbar'
};

/**
 * Reads the current equipment inventory and returns helpers to enumerate
 * achievable loads and produce loading hints for a given movement.
 */
export function loadingHelper(user: User) {
	const inventory: PlateInventory[] = db
		.select()
		.from(plates)
		.all()
		.map((p) => ({ weightLb: p.weightLb, quantity: p.quantity }));

	const barRows = db.select().from(bars).all();
	const barWeight = (kind: 'barbell' | 'ezbar' | 'trapbar'): number =>
		barRows.find((b) => b.kind === kind)?.weightLb ?? 45;

	const dbRows = db
		.select()
		.from(dumbbells)
		.all()
		.sort((a, b) => a.weightLb - b.weightLb);

	function choicesFor(equipment: EquipmentKind): LoadChoice[] {
		const barKind = BAR_KIND[equipment];
		if (barKind) {
			const w = barWeight(barKind);
			return barLoads(w, inventory).map((l) => ({
				totalLb: l.totalLb,
				hint: describeBarLoad(w, l)
			}));
		}
		if (equipment === 'cable-high' || equipment === 'cable-low') {
			return cableLoads(inventory, user.cablePulleyRatio).map((l) => ({
				totalLb: l.totalLb,
				hint:
					l.plates.length === 0
						? 'no plates'
						: `${formatPlates(l.plates)} on the carriage` +
							(user.cablePulleyRatio !== 1 ? ` (felt ${l.totalLb} lb)` : '')
			}));
		}
		if (equipment === 'dumbbell') {
			return dbRows.map((d) => ({ totalLb: d.weightLb, hint: `${d.weightLb} lb dumbbell` }));
		}
		// bodyweight
		return [];
	}

	/** Snap a target to the nearest achievable load and describe it. */
	function hintFor(equipment: EquipmentKind, targetLb: number | null | undefined): string | null {
		if (targetLb == null) return null;
		const choices = choicesFor(equipment);
		if (choices.length === 0) return null;
		const best = nearestLoad(choices, targetLb);
		return best ? best.hint : null;
	}

	return { choicesFor, hintFor };
}
