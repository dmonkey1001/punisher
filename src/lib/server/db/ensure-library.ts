import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { EXERCISES, MUSCLE_GROUPS } from './library';

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Reconcile the muscle-group and exercise tables to the canonical library.
 * Idempotent and safe to run on every boot — this is how an existing (deployed)
 * database picks up library changes (new groups, re-tagged exercises, new
 * movements) without losing user data. User-created exercises (isCustom) are
 * left untouched.
 */
export function ensureLibrary(db: DB): void {
	// 1. Ensure muscle groups exist (don't clobber landmarks the user may tweak).
	const existingGroups = db.select().from(schema.muscleGroups).all();
	const groupId = new Map(existingGroups.map((g) => [g.name, g.id]));
	for (const g of MUSCLE_GROUPS) {
		if (!groupId.has(g.name)) {
			const id = crypto.randomUUID();
			db.insert(schema.muscleGroups)
				.values({ id, name: g.name, mevSets: g.mev, mavSets: g.mav, mrvSets: g.mrv })
				.run();
			groupId.set(g.name, id);
		}
	}

	// 2. Upsert exercises to match the library (re-tagging primary/secondary).
	const existingExercises = db.select().from(schema.exercises).all();
	const byName = new Map(existingExercises.map((e) => [e.name, e]));

	for (const def of EXERCISES) {
		const primaryMuscleId = groupId.get(def.primary);
		if (!primaryMuscleId) continue; // unknown muscle — skip defensively
		const secondaryMuscleIds = (def.secondary ?? [])
			.map((n) => groupId.get(n))
			.filter((id): id is string => !!id);

		const fields = {
			pattern: def.pattern,
			equipment: def.equipment,
			usesBench: def.usesBench ?? false,
			primaryMuscleId,
			secondaryMuscleIds,
			repLow: def.repLow,
			repHigh: def.repHigh,
			defaultRir: def.rir ?? 2,
			fatigueCost: def.fatigue ?? 2,
			isConditioning: def.conditioning ?? false,
			notes: def.notes ?? null
		};

		const existing = byName.get(def.name);
		if (!existing) {
			db.insert(schema.exercises)
				.values({ id: crypto.randomUUID(), name: def.name, isCustom: false, ...fields })
				.run();
		} else if (!existing.isCustom) {
			db.update(schema.exercises).set(fields).where(eq(schema.exercises.id, existing.id)).run();
		}
	}
}
