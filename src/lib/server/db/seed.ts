import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Seed a starter hardware inventory on first boot. Idempotent: only runs when
 * the bars table is empty. Everything here is editable in the Gear screen —
 * it's a sensible home-gym starting point, not a requirement.
 *
 * Profiles are NOT seeded: each deployment creates its own on first run via
 * the profile picker. The exercise library is handled by ensureLibrary().
 */
export function seedIfEmpty(db: DB): void {
	const existing = db.select({ c: sql<number>`count(*)` }).from(schema.bars).get();
	if (existing && existing.c > 0) return;

	db.insert(schema.bars).values([
		{ name: 'Olympic Barbell', kind: 'barbell', weightLb: 45 },
		{ name: 'Olympic EZ Curl Bar', kind: 'ezbar', weightLb: 25 },
		{ name: 'Hex / Trap Bar', kind: 'trapbar', weightLb: 45 }
	]).run();

	db.insert(schema.plates).values([
		{ weightLb: 2.5, quantity: 2 },
		{ weightLb: 5, quantity: 2 },
		{ weightLb: 10, quantity: 4 },
		{ weightLb: 35, quantity: 4 }
	]).run();

	db.insert(schema.dumbbells).values([
		{ weightLb: 2.5, pairs: 1 },
		{ weightLb: 15, pairs: 1 }
	]).run();
}
