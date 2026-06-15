#!/usr/bin/env node
/**
 * Wipe training history from the database, keeping profiles, equipment, and the
 * exercise library. Useful while building.
 *
 *   node scripts/reset.cjs              # clears workouts/sets/cycles/soreness
 *   node scripts/reset.cjs --body       # also clears bodyweight + measurements
 *   DATABASE_URL=/data/punisher.db node scripts/reset.cjs   # target another db
 *
 * (For the deployed container, prefer the in-app reset under Gear → Danger zone.)
 */
const Database = require('better-sqlite3');

const url = process.env.DATABASE_URL || 'local.db';
const alsoBody = process.argv.includes('--body');

const db = new Database(url);
db.pragma('foreign_keys = ON');

const trainingTables = ['sets', 'workout_exercises', 'workouts', 'cycles', 'soreness_logs'];
const bodyTables = ['bodyweight_logs', 'measurements'];
const tables = alsoBody ? [...trainingTables, ...bodyTables] : trainingTables;

const tx = db.transaction(() => {
	for (const t of tables) {
		const n = db.prepare(`SELECT count(*) c FROM ${t}`).get().c;
		db.prepare(`DELETE FROM ${t}`).run();
		console.log(`  cleared ${t.padEnd(18)} (${n} rows)`);
	}
});
tx();

console.log(`\nReset complete on ${url}${alsoBody ? ' (including body logs)' : ''}.`);
db.close();
