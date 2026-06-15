import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Seed defaults for Derek & Tai's home gym. Idempotent: only runs when the
 * users table is empty, so it's safe to call on every server start.
 *
 * Bar weights are best-effort defaults — they're editable in the Inventory
 * screen, and the plate-math depends on them, so confirm/adjust there.
 */
export function seedIfEmpty(db: DB): void {
	const existing = db.select({ c: sql<number>`count(*)` }).from(schema.users).get();
	if (existing && existing.c > 0) return;

	// --- Users -------------------------------------------------------------
	db.insert(schema.users).values([
		{ name: 'Derek', color: '#0ea5e9' },
		{ name: 'Tai', color: '#ec4899' }
	]).run();

	// --- Bars (weights editable in Inventory) ------------------------------
	db.insert(schema.bars).values([
		{ name: 'Olympic Barbell', kind: 'barbell', weightLb: 45 },
		{ name: 'Olympic EZ Curl Bar', kind: 'ezbar', weightLb: 25 },
		{ name: 'Hex / Trap Bar', kind: 'trapbar', weightLb: 45 }
	]).run();

	// --- Plate inventory (shared bar + cables) -----------------------------
	db.insert(schema.plates).values([
		{ weightLb: 2.5, quantity: 2 },
		{ weightLb: 5, quantity: 2 },
		{ weightLb: 10, quantity: 4 },
		{ weightLb: 35, quantity: 4 }
	]).run();

	// --- Dumbbells ---------------------------------------------------------
	db.insert(schema.dumbbells).values([
		{ weightLb: 2.5, pairs: 1 },
		{ weightLb: 15, pairs: 1 }
	]).run();

	// --- Muscle groups (sets/week landmarks for the future engine) ---------
	const muscleSeed: Array<{ name: string; mev: number; mav: number; mrv: number }> = [
		{ name: 'Chest', mev: 8, mav: 16, mrv: 22 },
		{ name: 'Back', mev: 10, mav: 18, mrv: 25 },
		{ name: 'Traps', mev: 4, mav: 12, mrv: 20 },
		{ name: 'Front Delts', mev: 6, mav: 12, mrv: 18 },
		{ name: 'Side Delts', mev: 8, mav: 18, mrv: 26 },
		{ name: 'Rear Delts', mev: 6, mav: 14, mrv: 22 },
		{ name: 'Biceps', mev: 8, mav: 16, mrv: 22 },
		{ name: 'Triceps', mev: 8, mav: 16, mrv: 22 },
		{ name: 'Forearms', mev: 4, mav: 10, mrv: 16 },
		{ name: 'Quads', mev: 8, mav: 16, mrv: 20 },
		{ name: 'Hamstrings', mev: 6, mav: 12, mrv: 18 },
		{ name: 'Glutes', mev: 4, mav: 12, mrv: 16 },
		{ name: 'Calves', mev: 6, mav: 12, mrv: 18 },
		{ name: 'Abs', mev: 6, mav: 16, mrv: 25 }
	];
	db.insert(schema.muscleGroups)
		.values(muscleSeed.map((m) => ({ name: m.name, mevSets: m.mev, mavSets: m.mav, mrvSets: m.mrv })))
		.run();

	// Map muscle name -> id for exercise references.
	const groups = db.select().from(schema.muscleGroups).all();
	const M: Record<string, string> = {};
	for (const g of groups) M[g.name] = g.id;

	// --- Exercise library --------------------------------------------------
	type Ex = {
		name: string;
		pattern: schema.MovementPattern;
		equipment: schema.EquipmentKind;
		usesBench?: boolean;
		primary: string;
		secondary?: string[];
		repLow: number;
		repHigh: number;
		rir?: number;
		fatigue?: number;
		conditioning?: boolean;
		notes?: string;
	};

	const ex: Ex[] = [
		// Barbell
		{ name: 'Barbell Back Squat', pattern: 'squat', equipment: 'barbell', primary: 'Quads', secondary: ['Glutes', 'Hamstrings'], repLow: 6, repHigh: 10, fatigue: 5, notes: 'Use rack safety arms.' },
		{ name: 'Barbell Bench Press', pattern: 'horizontal-push', equipment: 'barbell', usesBench: true, primary: 'Chest', secondary: ['Triceps', 'Front Delts'], repLow: 6, repHigh: 10, fatigue: 4 },
		{ name: 'Barbell Incline Bench Press', pattern: 'horizontal-push', equipment: 'barbell', usesBench: true, primary: 'Chest', secondary: ['Front Delts', 'Triceps'], repLow: 8, repHigh: 12, fatigue: 4, notes: 'Bench set to incline.' },
		{ name: 'Barbell Overhead Press', pattern: 'vertical-push', equipment: 'barbell', primary: 'Front Delts', secondary: ['Side Delts', 'Triceps'], repLow: 5, repHigh: 8, fatigue: 4 },
		{ name: 'Barbell Row', pattern: 'horizontal-pull', equipment: 'barbell', primary: 'Back', secondary: ['Biceps', 'Rear Delts'], repLow: 8, repHigh: 12, fatigue: 4 },
		{ name: 'Barbell Romanian Deadlift', pattern: 'hinge', equipment: 'barbell', primary: 'Hamstrings', secondary: ['Glutes', 'Back'], repLow: 8, repHigh: 12, fatigue: 4 },
		{ name: 'Barbell Hip Thrust', pattern: 'hinge', equipment: 'barbell', usesBench: true, primary: 'Glutes', secondary: ['Hamstrings'], repLow: 8, repHigh: 12, fatigue: 3, notes: 'Upper back on the bench.' },
		{ name: 'Barbell Shrug', pattern: 'lateral-raise', equipment: 'barbell', primary: 'Traps', repLow: 10, repHigh: 15, fatigue: 2 },

		// Trap bar
		{ name: 'Trap Bar Deadlift', pattern: 'hinge', equipment: 'trapbar', primary: 'Glutes', secondary: ['Hamstrings', 'Quads', 'Back'], repLow: 5, repHigh: 8, fatigue: 5, notes: 'Joint-friendly pull.' },
		{ name: 'Trap Bar Shrug', pattern: 'lateral-raise', equipment: 'trapbar', primary: 'Traps', repLow: 12, repHigh: 15, fatigue: 2 },

		// EZ curl bar
		{ name: 'EZ Bar Curl', pattern: 'curl', equipment: 'ezbar', primary: 'Biceps', repLow: 8, repHigh: 12, fatigue: 2 },
		{ name: 'EZ Bar Skullcrusher', pattern: 'elbow-extension', equipment: 'ezbar', usesBench: true, primary: 'Triceps', repLow: 8, repHigh: 12, fatigue: 2 },

		// Cables
		{ name: 'Cable Lat Pulldown', pattern: 'vertical-pull', equipment: 'cable-high', primary: 'Back', secondary: ['Biceps'], repLow: 10, repHigh: 15, fatigue: 2 },
		{ name: 'Cable Seated Row', pattern: 'horizontal-pull', equipment: 'cable-low', primary: 'Back', secondary: ['Biceps', 'Rear Delts'], repLow: 10, repHigh: 15, fatigue: 2 },
		{ name: 'Cable Chest Fly', pattern: 'horizontal-push', equipment: 'cable-high', primary: 'Chest', repLow: 12, repHigh: 20, fatigue: 1 },
		{ name: 'Cable Triceps Pushdown', pattern: 'elbow-extension', equipment: 'cable-high', primary: 'Triceps', repLow: 10, repHigh: 15, fatigue: 1 },
		{ name: 'Cable Overhead Triceps Extension', pattern: 'elbow-extension', equipment: 'cable-low', primary: 'Triceps', repLow: 10, repHigh: 15, fatigue: 1 },
		{ name: 'Cable Biceps Curl', pattern: 'curl', equipment: 'cable-low', primary: 'Biceps', repLow: 10, repHigh: 15, fatigue: 1 },
		{ name: 'Cable Face Pull', pattern: 'rear-delt', equipment: 'cable-high', primary: 'Rear Delts', secondary: ['Traps'], repLow: 12, repHigh: 20, fatigue: 1, notes: 'Great for shoulder health.' },
		{ name: 'Cable Lateral Raise', pattern: 'lateral-raise', equipment: 'cable-low', primary: 'Side Delts', repLow: 12, repHigh: 20, fatigue: 1 },
		{ name: 'Cable Pull-Through', pattern: 'hinge', equipment: 'cable-low', primary: 'Glutes', secondary: ['Hamstrings'], repLow: 12, repHigh: 15, fatigue: 2 },
		{ name: 'Cable Crunch', pattern: 'core', equipment: 'cable-high', primary: 'Abs', repLow: 12, repHigh: 20, fatigue: 1 },

		// Dumbbell (light 2.5 / 15 lb only — high-rep accessory work)
		{ name: 'Dumbbell Lateral Raise', pattern: 'lateral-raise', equipment: 'dumbbell', primary: 'Side Delts', repLow: 12, repHigh: 20, fatigue: 1 },
		{ name: 'Dumbbell Rear Delt Fly', pattern: 'rear-delt', equipment: 'dumbbell', usesBench: true, primary: 'Rear Delts', repLow: 12, repHigh: 20, fatigue: 1 },
		{ name: 'Dumbbell Curl', pattern: 'curl', equipment: 'dumbbell', primary: 'Biceps', repLow: 12, repHigh: 15, fatigue: 1 },

		// Bodyweight on the rack
		{ name: 'Pull-Up', pattern: 'vertical-pull', equipment: 'bodyweight', primary: 'Back', secondary: ['Biceps'], repLow: 5, repHigh: 12, fatigue: 3, notes: 'Rack pull-up handles.' },
		{ name: 'Chin-Up', pattern: 'vertical-pull', equipment: 'bodyweight', primary: 'Back', secondary: ['Biceps'], repLow: 5, repHigh: 12, fatigue: 3 },
		{ name: 'Dip', pattern: 'horizontal-push', equipment: 'bodyweight', primary: 'Chest', secondary: ['Triceps', 'Front Delts'], repLow: 6, repHigh: 12, fatigue: 3, notes: 'Rack dip handles.' },
		{ name: 'Bulgarian Split Squat', pattern: 'lunge', equipment: 'bodyweight', usesBench: true, primary: 'Quads', secondary: ['Glutes'], repLow: 8, repHigh: 15, fatigue: 3, notes: 'Rear foot on bench; hold the 15s for load.' },
		{ name: 'Hanging Leg Raise', pattern: 'core', equipment: 'bodyweight', primary: 'Abs', repLow: 8, repHigh: 15, fatigue: 2 },

		// Conditioning
		{ name: 'Trap Bar Carry', pattern: 'carry', equipment: 'trapbar', primary: 'Traps', secondary: ['Forearms', 'Abs'], repLow: 1, repHigh: 1, fatigue: 3, conditioning: true, notes: 'Time/distance based.' },
		{ name: 'Dumbbell Farmer Carry', pattern: 'carry', equipment: 'dumbbell', primary: 'Forearms', secondary: ['Traps', 'Abs'], repLow: 1, repHigh: 1, fatigue: 2, conditioning: true },
		{ name: 'Burpees', pattern: 'conditioning', equipment: 'bodyweight', primary: 'Abs', repLow: 10, repHigh: 20, fatigue: 3, conditioning: true },
		{ name: 'Mountain Climbers', pattern: 'conditioning', equipment: 'bodyweight', primary: 'Abs', repLow: 20, repHigh: 40, fatigue: 2, conditioning: true },
		{ name: 'Bodyweight Conditioning Circuit', pattern: 'conditioning', equipment: 'bodyweight', primary: 'Abs', repLow: 1, repHigh: 1, fatigue: 3, conditioning: true, notes: 'Rounds for time.' }
	];

	db.insert(schema.exercises)
		.values(
			ex.map((e) => ({
				name: e.name,
				pattern: e.pattern,
				equipment: e.equipment,
				usesBench: e.usesBench ?? false,
				primaryMuscleId: M[e.primary],
				secondaryMuscleIds: (e.secondary ?? []).map((n) => M[n]),
				repLow: e.repLow,
				repHigh: e.repHigh,
				defaultRir: e.rir ?? 2,
				fatigueCost: e.fatigue ?? 2,
				isConditioning: e.conditioning ?? false,
				notes: e.notes ?? null
			}))
		)
		.run();
}
