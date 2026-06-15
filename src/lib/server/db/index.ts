import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);
// Enable cascading deletes (off by default in better-sqlite3) and use WAL for
// better concurrent read/write behavior.
client.pragma('foreign_keys = ON');
client.pragma('journal_mode = WAL');

export const db = drizzle(client, { schema });
