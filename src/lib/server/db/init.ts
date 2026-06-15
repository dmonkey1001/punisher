import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index';
import { seedIfEmpty } from './seed';

let initialized = false;

/**
 * Bring the database up to date and seed defaults on first boot.
 * Idempotent and cheap after the first call, so it's safe to invoke from
 * hooks.server.ts on every server start (including inside the container).
 */
export function ensureDb(): void {
	if (initialized) return;
	initialized = true;
	migrate(db, { migrationsFolder: path.resolve('drizzle') });
	seedIfEmpty(db);
}
