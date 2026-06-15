import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Punisher — Phase 1 schema.
 *
 * Conventions:
 *  - Primary keys are UUID strings.
 *  - Dates are stored as ISO-8601 text ("2026-06-14" for days, full timestamps for events).
 *  - All weights are stored in pounds (lb). Body measurements are in inches.
 *  - Booleans use SQLite integer 0/1 via `{ mode: 'boolean' }`.
 *  - JSON-ish lists (e.g. secondary muscles) are stored as JSON text.
 */

const uuid = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
	text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = sqliteTable('users', {
	id: uuid(),
	name: text('name').notNull(),
	// Display accent color for the profile picker (hex).
	color: text('color').notNull().default('#0ea5e9'),
	units: text('units', { enum: ['lb', 'kg'] })
		.notNull()
		.default('lb'),
	/**
	 * Effective resistance multiplier for the plate-loaded cables.
	 * 1.0 = the cable resists with the full plate weight you hang.
	 * 0.5 = a 2:1 pulley (felt resistance is half the hung plates), etc.
	 * Per-user so each profile can calibrate to feel.
	 */
	cablePulleyRatio: real('cable_pulley_ratio').notNull().default(1.0),
	createdAt: createdAt()
});

// ---------------------------------------------------------------------------
// Equipment & loading inventory
// ---------------------------------------------------------------------------

/** Bars available to load (Olympic bar, EZ curl bar, trap/hex bar). */
export const bars = sqliteTable('bars', {
	id: uuid(),
	name: text('name').notNull(),
	kind: text('kind', { enum: ['barbell', 'ezbar', 'trapbar'] }).notNull(),
	weightLb: real('weight_lb').notNull(),
	createdAt: createdAt()
});

/**
 * Plate inventory, shared between the barbell and the plate-loaded cables.
 * One row per distinct plate denomination, with how many are owned.
 */
export const plates = sqliteTable('plates', {
	id: uuid(),
	weightLb: real('weight_lb').notNull(),
	quantity: integer('quantity').notNull().default(0),
	createdAt: createdAt()
});

/** Fixed-weight dumbbell pairs (e.g. a 15 lb pair). */
export const dumbbells = sqliteTable('dumbbells', {
	id: uuid(),
	weightLb: real('weight_lb').notNull(),
	// number of pairs owned at this weight
	pairs: integer('pairs').notNull().default(1),
	createdAt: createdAt()
});

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

export const muscleGroups = sqliteTable('muscle_groups', {
	id: uuid(),
	name: text('name').notNull().unique(),
	// Weekly volume landmarks (sets/week) used by the future engine.
	mevSets: integer('mev_sets').notNull().default(8),
	mavSets: integer('mav_sets').notNull().default(14),
	mrvSets: integer('mrv_sets').notNull().default(20),
	createdAt: createdAt()
});

/**
 * Equipment a movement requires. Drives equipment-aware selection and which
 * loading model (bar plate-math vs cable plate-math vs fixed dumbbell) applies.
 */
export const EQUIPMENT_KINDS = [
	'barbell',
	'ezbar',
	'trapbar',
	'cable-high',
	'cable-low',
	'dumbbell',
	'bodyweight',
	'bench'
] as const;
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export const MOVEMENT_PATTERNS = [
	'horizontal-push',
	'vertical-push',
	'horizontal-pull',
	'vertical-pull',
	'squat',
	'hinge',
	'lunge',
	'elbow-flexion',
	'elbow-extension',
	'lateral-raise',
	'rear-delt',
	'curl',
	'calf',
	'core',
	'carry',
	'conditioning'
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const exercises = sqliteTable('exercises', {
	id: uuid(),
	name: text('name').notNull(),
	pattern: text('pattern', { enum: MOVEMENT_PATTERNS }).notNull(),
	/** Primary equipment this movement loads with. */
	equipment: text('equipment', { enum: EQUIPMENT_KINDS }).notNull(),
	/** Whether it also requires the bench (incline/flat). */
	usesBench: integer('uses_bench', { mode: 'boolean' }).notNull().default(false),
	primaryMuscleId: text('primary_muscle_id')
		.notNull()
		.references(() => muscleGroups.id),
	/** JSON array of muscleGroups.id strings. */
	secondaryMuscleIds: text('secondary_muscle_ids', { mode: 'json' })
		.$type<string[]>()
		.notNull()
		.default(sql`'[]'`),
	repLow: integer('rep_low').notNull().default(8),
	repHigh: integer('rep_high').notNull().default(12),
	defaultRir: integer('default_rir').notNull().default(2),
	/** Relative systemic fatigue cost, 1 (isolation) .. 5 (heavy compound). */
	fatigueCost: integer('fatigue_cost').notNull().default(2),
	isConditioning: integer('is_conditioning', { mode: 'boolean' }).notNull().default(false),
	isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
	notes: text('notes'),
	createdAt: createdAt()
});

// ---------------------------------------------------------------------------
// Workouts & logging
// ---------------------------------------------------------------------------

export const workouts = sqliteTable('workouts', {
	id: uuid(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	/** ISO day (YYYY-MM-DD). */
	date: text('date').notNull(),
	/** Optional label, e.g. "Upper A" or "Conditioning". */
	label: text('label'),
	kind: text('kind', { enum: ['lifting', 'conditioning'] })
		.notNull()
		.default('lifting'),
	// Pre-session readiness snapshot (1 = poor .. 5 = great). Nullable until logged.
	fatigue: integer('fatigue'),
	sleep: integer('sleep'),
	status: text('status', { enum: ['in_progress', 'completed'] })
		.notNull()
		.default('in_progress'),
	notes: text('notes'),
	startedAt: text('started_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	completedAt: text('completed_at')
});

/** Per-muscle soreness check-in (independent of a workout). 0 none .. 3 very sore. */
export const sorenessLogs = sqliteTable('soreness_logs', {
	id: uuid(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	date: text('date').notNull(),
	muscleGroupId: text('muscle_group_id')
		.notNull()
		.references(() => muscleGroups.id),
	level: integer('level').notNull().default(0),
	createdAt: createdAt()
});

export const workoutExercises = sqliteTable('workout_exercises', {
	id: uuid(),
	workoutId: text('workout_id')
		.notNull()
		.references(() => workouts.id, { onDelete: 'cascade' }),
	exerciseId: text('exercise_id')
		.notNull()
		.references(() => exercises.id),
	orderIndex: integer('order_index').notNull().default(0),
	// Prescription targets for the session (nullable when free-logged).
	targetSets: integer('target_sets'),
	targetRepLow: integer('target_rep_low'),
	targetRepHigh: integer('target_rep_high'),
	targetWeightLb: real('target_weight_lb'),
	targetRir: integer('target_rir'),
	notes: text('notes')
});

export const sets = sqliteTable('sets', {
	id: uuid(),
	workoutExerciseId: text('workout_exercise_id')
		.notNull()
		.references(() => workoutExercises.id, { onDelete: 'cascade' }),
	setNumber: integer('set_number').notNull(),
	isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
	targetReps: integer('target_reps'),
	targetWeightLb: real('target_weight_lb'),
	actualReps: integer('actual_reps'),
	actualWeightLb: real('actual_weight_lb'),
	/** Reps in reserve logged for the set (lower = harder). */
	rir: integer('rir'),
	completedAt: text('completed_at')
});

// ---------------------------------------------------------------------------
// Body tracking
// ---------------------------------------------------------------------------

export const bodyweightLogs = sqliteTable('bodyweight_logs', {
	id: uuid(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	date: text('date').notNull(),
	weightLb: real('weight_lb').notNull(),
	note: text('note'),
	createdAt: createdAt()
});

export const MEASUREMENT_SITES = [
	'neck',
	'shoulders',
	'chest',
	'left-arm',
	'right-arm',
	'forearm',
	'waist',
	'hips',
	'left-thigh',
	'right-thigh',
	'calf'
] as const;
export type MeasurementSite = (typeof MEASUREMENT_SITES)[number];

export const measurements = sqliteTable('measurements', {
	id: uuid(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	date: text('date').notNull(),
	site: text('site', { enum: MEASUREMENT_SITES }).notNull(),
	/** Circumference in inches. */
	valueIn: real('value_in').notNull(),
	note: text('note'),
	createdAt: createdAt()
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Bar = typeof bars.$inferSelect;
export type Plate = typeof plates.$inferSelect;
export type Dumbbell = typeof dumbbells.$inferSelect;
export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSet = typeof sets.$inferSelect;
export type BodyweightLog = typeof bodyweightLogs.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
export type SorenessLog = typeof sorenessLogs.$inferSelect;
