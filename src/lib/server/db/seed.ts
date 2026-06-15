import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Seed the per-gym essentials (profiles + hardware inventory) on first boot.
 * Idempotent: only runs when the users table is empty. The exercise library is
 * handled separately by ensureLibrary() so it stays current on every boot.
 *
 * Bar weights are best-effort defaults — editable in the Inventory screen, and
 * the plate-math depends on them, so confirm/adjust there.
 */
export function seedIfEmpty(db: DB): void {
	const existing = db.select({ c: sql<number>`count(*)` }).from(schema.users).get();
	if (existing && existing.c > 0) return;

	db.insert(schema.users).values([
		{ name: 'Derek', color: '#0ea5e9' },
		{ name: 'Tai', color: '#ec4899' }
	]).run();

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
