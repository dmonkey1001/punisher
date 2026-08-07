/**
 * Canonical exercise library — the single source of truth for muscle groups and
 * the built-in exercises. Both the fresh-install seed and the on-boot
 * reconciler (ensureLibrary) build from this, so changing it here updates new
 * and existing databases alike.
 */
import type { EquipmentKind, MovementPattern } from './schema';

export interface MuscleGroupDef {
	name: string;
	mev: number;
	mav: number;
	mrv: number;
}

export interface ExerciseDef {
	name: string;
	pattern: MovementPattern;
	equipment: EquipmentKind;
	usesBench?: boolean;
	primary: string;
	secondary?: string[];
	repLow: number;
	repHigh: number;
	rir?: number;
	fatigue?: number;
	conditioning?: boolean;
	notes?: string;
}

export const MUSCLE_GROUPS: MuscleGroupDef[] = [
	{ name: 'Chest', mev: 8, mav: 16, mrv: 22 },
	{ name: 'Front Delts', mev: 6, mav: 12, mrv: 18 },
	{ name: 'Side Delts', mev: 8, mav: 18, mrv: 26 },
	{ name: 'Rear Delts', mev: 6, mav: 14, mrv: 22 },
	{ name: 'Upper Back', mev: 10, mav: 18, mrv: 25 },
	{ name: 'Lats', mev: 10, mav: 18, mrv: 25 },
	{ name: 'Lower Back', mev: 4, mav: 10, mrv: 16 },
	{ name: 'Traps', mev: 4, mav: 12, mrv: 20 },
	{ name: 'Biceps', mev: 8, mav: 16, mrv: 22 },
	{ name: 'Triceps', mev: 8, mav: 16, mrv: 22 },
	{ name: 'Forearms', mev: 4, mav: 10, mrv: 16 },
	{ name: 'Quads', mev: 8, mav: 16, mrv: 20 },
	{ name: 'Hamstrings', mev: 6, mav: 12, mrv: 18 },
	{ name: 'Glutes', mev: 4, mav: 12, mrv: 16 },
	{ name: 'Calves', mev: 6, mav: 12, mrv: 18 },
	{ name: 'Abs', mev: 6, mav: 16, mrv: 25 }
];

export const EXERCISES: ExerciseDef[] = [
	// Chest
	{ name: 'Barbell Bench Press', pattern: 'horizontal-push', equipment: 'barbell', usesBench: true, primary: 'Chest', secondary: ['Triceps', 'Front Delts'], repLow: 6, repHigh: 10, fatigue: 4 },
	{ name: 'Barbell Incline Bench Press', pattern: 'horizontal-push', equipment: 'barbell', usesBench: true, primary: 'Chest', secondary: ['Front Delts', 'Triceps'], repLow: 8, repHigh: 12, fatigue: 4, notes: 'Bench set to incline.' },
	{ name: 'Cable Chest Fly', pattern: 'horizontal-push', equipment: 'cable-high', primary: 'Chest', repLow: 12, repHigh: 20, fatigue: 1 },
	{ name: 'Cable Low-to-High Fly', pattern: 'horizontal-push', equipment: 'cable-low', primary: 'Chest', secondary: ['Front Delts'], repLow: 12, repHigh: 20, fatigue: 1, notes: 'From the low pulley, sweep up and across — upper-chest emphasis.' },
	{ name: 'Dip', pattern: 'horizontal-push', equipment: 'bodyweight', primary: 'Chest', secondary: ['Triceps', 'Front Delts'], repLow: 6, repHigh: 12, fatigue: 3, notes: 'Rack dip handles.' },
	{ name: 'Push-Up', pattern: 'horizontal-push', equipment: 'bodyweight', primary: 'Chest', secondary: ['Triceps'], repLow: 10, repHigh: 20, fatigue: 2 },
	{ name: 'Dumbbell Bench Press', pattern: 'horizontal-push', equipment: 'dumbbell', usesBench: true, primary: 'Chest', secondary: ['Triceps', 'Front Delts'], repLow: 8, repHigh: 12, fatigue: 3, notes: 'Load depends on your dumbbell inventory (Gear).' },

	// Shoulders — Front Delts (vertical press)
	{ name: 'Barbell Overhead Press', pattern: 'vertical-push', equipment: 'barbell', primary: 'Front Delts', secondary: ['Side Delts', 'Triceps'], repLow: 5, repHigh: 8, fatigue: 4 },
	{ name: 'Dumbbell Front Raise', pattern: 'lateral-raise', equipment: 'dumbbell', primary: 'Front Delts', repLow: 12, repHigh: 20, fatigue: 1, notes: 'Raise to shoulder height, palms down; alternate arms or both together.' },
	{ name: 'Dumbbell Shoulder Press', pattern: 'vertical-push', equipment: 'dumbbell', usesBench: true, primary: 'Front Delts', secondary: ['Side Delts', 'Triceps'], repLow: 8, repHigh: 12, fatigue: 3, notes: 'Seated or standing; load depends on your dumbbell inventory.' },
	// Side Delts
	{ name: 'Cable Lateral Raise', pattern: 'lateral-raise', equipment: 'cable-low', primary: 'Side Delts', repLow: 12, repHigh: 20, fatigue: 1 },
	{ name: 'Dumbbell Lateral Raise', pattern: 'lateral-raise', equipment: 'dumbbell', primary: 'Side Delts', repLow: 12, repHigh: 20, fatigue: 1 },
	{ name: 'EZ Bar Upright Row', pattern: 'lateral-raise', equipment: 'ezbar', primary: 'Side Delts', secondary: ['Traps'], repLow: 10, repHigh: 15, fatigue: 2, notes: 'Wider grip, pull to chest height — stop lower if shoulders complain.' },
	// Rear Delts
	{ name: 'Cable Face Pull', pattern: 'rear-delt', equipment: 'cable-high', primary: 'Rear Delts', secondary: ['Traps'], repLow: 12, repHigh: 20, fatigue: 1, notes: 'Great for shoulder health.' },
	{ name: 'Dumbbell Rear Delt Fly', pattern: 'rear-delt', equipment: 'dumbbell', primary: 'Rear Delts', repLow: 12, repHigh: 20, fatigue: 1, notes: 'Bent-over reverse fly; standing hinged or chest-supported on the incline bench.' },

	// Upper Back (rows)
	{ name: 'Barbell Row', pattern: 'horizontal-pull', equipment: 'barbell', primary: 'Upper Back', secondary: ['Lats', 'Biceps', 'Rear Delts'], repLow: 8, repHigh: 12, fatigue: 4 },
	{ name: 'Cable Seated Row', pattern: 'horizontal-pull', equipment: 'cable-low', primary: 'Upper Back', secondary: ['Lats', 'Biceps'], repLow: 10, repHigh: 15, fatigue: 2 },
	{ name: 'Inverted Row', pattern: 'horizontal-pull', equipment: 'bodyweight', primary: 'Upper Back', secondary: ['Lats', 'Biceps'], repLow: 8, repHigh: 15, fatigue: 2, notes: 'Bar racked at waist height in the J-hooks; body straight, pull chest to bar.' },
	{ name: 'One-Arm Dumbbell Row', pattern: 'horizontal-pull', equipment: 'dumbbell', usesBench: true, primary: 'Upper Back', secondary: ['Lats', 'Biceps'], repLow: 10, repHigh: 15, fatigue: 2, notes: 'Knee and hand braced on the bench; reps per arm.' },

	// Lats (vertical pulls)
	{ name: 'Cable Lat Pulldown', pattern: 'vertical-pull', equipment: 'cable-high', primary: 'Lats', secondary: ['Biceps', 'Upper Back'], repLow: 10, repHigh: 15, fatigue: 2 },
	{ name: 'Pull-Up', pattern: 'vertical-pull', equipment: 'bodyweight', primary: 'Lats', secondary: ['Biceps', 'Upper Back'], repLow: 5, repHigh: 12, fatigue: 3, notes: 'Rack pull-up handles.' },
	{ name: 'Chin-Up', pattern: 'vertical-pull', equipment: 'bodyweight', primary: 'Lats', secondary: ['Biceps'], repLow: 5, repHigh: 12, fatigue: 3 },
	{ name: 'Cable Straight-Arm Pulldown', pattern: 'vertical-pull', equipment: 'cable-high', primary: 'Lats', repLow: 12, repHigh: 15, fatigue: 1, notes: 'Arms straight, sweep the bar to your thighs — lat isolation, no biceps.' },

	// Lower Back
	{ name: 'Floor Back Extension', pattern: 'hinge', equipment: 'bodyweight', primary: 'Lower Back', secondary: ['Glutes'], repLow: 12, repHigh: 20, fatigue: 1, notes: 'Superman / prone extension.' },

	// Traps
	{ name: 'Barbell Shrug', pattern: 'lateral-raise', equipment: 'barbell', primary: 'Traps', repLow: 10, repHigh: 15, fatigue: 2 },
	{ name: 'Trap Bar Shrug', pattern: 'lateral-raise', equipment: 'trapbar', primary: 'Traps', repLow: 12, repHigh: 15, fatigue: 2 },

	// Biceps
	{ name: 'EZ Bar Curl', pattern: 'curl', equipment: 'ezbar', primary: 'Biceps', repLow: 8, repHigh: 12, fatigue: 2 },
	{ name: 'Cable Biceps Curl', pattern: 'curl', equipment: 'cable-low', primary: 'Biceps', repLow: 10, repHigh: 15, fatigue: 1 },
	{ name: 'Dumbbell Curl', pattern: 'curl', equipment: 'dumbbell', primary: 'Biceps', repLow: 12, repHigh: 15, fatigue: 1 },
	{ name: 'Dumbbell Hammer Curl', pattern: 'curl', equipment: 'dumbbell', primary: 'Biceps', secondary: ['Forearms'], repLow: 12, repHigh: 15, fatigue: 1, notes: 'Neutral grip — hits brachialis and forearms.' },
	{ name: 'EZ Bar Spider Curl', pattern: 'curl', equipment: 'ezbar', usesBench: true, primary: 'Biceps', repLow: 10, repHigh: 15, fatigue: 1, notes: 'Chest-down on the incline bench, arms hanging — the preacher-curl substitute.' },

	// Forearms
	{ name: 'EZ Bar Reverse Curl', pattern: 'curl', equipment: 'ezbar', primary: 'Forearms', secondary: ['Biceps'], repLow: 10, repHigh: 15, fatigue: 1, notes: 'Overhand grip.' },

	// Triceps
	{ name: 'Cable Triceps Pushdown', pattern: 'elbow-extension', equipment: 'cable-high', primary: 'Triceps', repLow: 10, repHigh: 15, fatigue: 1 },
	{ name: 'Cable Overhead Triceps Extension', pattern: 'elbow-extension', equipment: 'cable-low', primary: 'Triceps', repLow: 10, repHigh: 15, fatigue: 1 },
	{ name: 'EZ Bar Skullcrusher', pattern: 'elbow-extension', equipment: 'ezbar', usesBench: true, primary: 'Triceps', repLow: 8, repHigh: 12, fatigue: 2 },
	{ name: 'Close-Grip Bench Press', pattern: 'elbow-extension', equipment: 'barbell', usesBench: true, primary: 'Triceps', secondary: ['Chest', 'Front Delts'], repLow: 8, repHigh: 12, fatigue: 3, notes: 'Shoulder-width grip, elbows tucked.' },

	// Quads
	{ name: 'Barbell Back Squat', pattern: 'squat', equipment: 'barbell', primary: 'Quads', secondary: ['Glutes', 'Hamstrings'], repLow: 6, repHigh: 10, fatigue: 5, notes: 'Use rack safety arms.' },
	{ name: 'Barbell Front Squat', pattern: 'squat', equipment: 'barbell', primary: 'Quads', secondary: ['Glutes', 'Abs'], repLow: 6, repHigh: 10, fatigue: 4, notes: 'Clean grip or cross-arm; use rack safety arms.' },
	{ name: 'Bulgarian Split Squat', pattern: 'lunge', equipment: 'bodyweight', usesBench: true, primary: 'Quads', secondary: ['Glutes'], repLow: 8, repHigh: 15, fatigue: 3, notes: 'Rear foot on bench; hold the 15s for load.' },
	{ name: 'Barbell Reverse Lunge', pattern: 'lunge', equipment: 'barbell', primary: 'Quads', secondary: ['Glutes'], repLow: 8, repHigh: 12, fatigue: 3, notes: 'Step back, knee tracks over toes; reps per leg.' },
	{ name: 'Goblet Squat', pattern: 'squat', equipment: 'dumbbell', primary: 'Quads', secondary: ['Glutes'], repLow: 10, repHigh: 15, fatigue: 2, notes: 'Dumbbell held at your chest.' },
	{ name: 'Sissy Squat', pattern: 'leg-extension', equipment: 'bodyweight', primary: 'Quads', repLow: 8, repHigh: 15, fatigue: 2, notes: 'Quad isolation — hold a rack upright for balance, lean back and bend at the knees only.' },
	{ name: 'Cable Leg Extension', pattern: 'leg-extension', equipment: 'cable-low', primary: 'Quads', repLow: 12, repHigh: 20, fatigue: 1, notes: 'Ankle strap on the low pulley; seated on the bench facing away, extend the knee. Reps per leg.' },
	{ name: 'Machine Leg Press', pattern: 'leg-press', equipment: 'machine', primary: 'Quads', secondary: ['Glutes', 'Hamstrings'], repLow: 10, repHigh: 15, fatigue: 3, notes: 'Feet shoulder-width on the platform; lower under control, don’t lock out hard.' },
	{ name: 'Machine Leg Extension', pattern: 'leg-extension', equipment: 'machine', primary: 'Quads', repLow: 12, repHigh: 20, fatigue: 1 },

	// Hamstrings
	{ name: 'Barbell Romanian Deadlift', pattern: 'hinge', equipment: 'barbell', primary: 'Hamstrings', secondary: ['Glutes', 'Lower Back'], repLow: 8, repHigh: 12, fatigue: 4 },
	{ name: 'Barbell Good Morning', pattern: 'hinge', equipment: 'barbell', primary: 'Hamstrings', secondary: ['Lower Back', 'Glutes'], repLow: 8, repHigh: 12, fatigue: 3 },
	{ name: 'Dumbbell Romanian Deadlift', pattern: 'hinge', equipment: 'dumbbell', primary: 'Hamstrings', secondary: ['Glutes'], repLow: 10, repHigh: 15, fatigue: 2, notes: 'Load depends on your dumbbell inventory.' },
	{ name: 'Nordic Ham Curl', pattern: 'leg-curl', equipment: 'bodyweight', primary: 'Hamstrings', repLow: 3, repHigh: 8, fatigue: 3, notes: 'Kneel with ankles anchored under a loaded bar in the rack; lower as slowly as you can, push back up. Very hard — expect few reps at first.' },
	{ name: 'Cable Leg Curl', pattern: 'leg-curl', equipment: 'cable-low', primary: 'Hamstrings', repLow: 12, repHigh: 20, fatigue: 1, notes: 'Ankle strap on the low pulley; standing, curl the heel toward your glutes. Reps per leg.' },
	{ name: 'Machine Leg Curl', pattern: 'leg-curl', equipment: 'machine', primary: 'Hamstrings', repLow: 12, repHigh: 20, fatigue: 1 },

	// Glutes
	{ name: 'Barbell Hip Thrust', pattern: 'hinge', equipment: 'barbell', usesBench: true, primary: 'Glutes', secondary: ['Hamstrings'], repLow: 8, repHigh: 12, fatigue: 3, notes: 'Upper back on the bench.' },
	{ name: 'Trap Bar Deadlift', pattern: 'hinge', equipment: 'trapbar', primary: 'Glutes', secondary: ['Hamstrings', 'Quads', 'Upper Back'], repLow: 5, repHigh: 8, fatigue: 5, notes: 'Joint-friendly pull.' },
	{ name: 'Cable Pull-Through', pattern: 'hinge', equipment: 'cable-low', primary: 'Glutes', secondary: ['Hamstrings'], repLow: 12, repHigh: 15, fatigue: 2 },

	// Calves
	{ name: 'Standing Barbell Calf Raise', pattern: 'calf', equipment: 'barbell', primary: 'Calves', repLow: 10, repHigh: 15, fatigue: 1, notes: 'Bar on back; balls of feet on a plate.' },
	{ name: 'Single-Leg Calf Raise', pattern: 'calf', equipment: 'bodyweight', primary: 'Calves', repLow: 12, repHigh: 20, fatigue: 1, notes: 'Hold a dumbbell for load.' },
	{ name: 'Barbell Seated Calf Raise', pattern: 'calf', equipment: 'barbell', usesBench: true, primary: 'Calves', repLow: 12, repHigh: 20, fatigue: 1, notes: 'Seated on the bench, padded bar across your knees, toes on a plate — hits the soleus.' },

	// Abs
	{ name: 'Cable Crunch', pattern: 'core', equipment: 'cable-high', primary: 'Abs', repLow: 12, repHigh: 20, fatigue: 1 },
	{ name: 'Hanging Leg Raise', pattern: 'core', equipment: 'bodyweight', primary: 'Abs', repLow: 8, repHigh: 15, fatigue: 2 },
	{ name: 'Cable Pallof Press', pattern: 'core', equipment: 'cable-low', primary: 'Abs', repLow: 10, repHigh: 15, fatigue: 1, notes: 'Anti-rotation: press out and hold; reps per side.' },
	{ name: 'Cable Woodchopper', pattern: 'core', equipment: 'cable-high', primary: 'Abs', repLow: 10, repHigh: 15, fatigue: 1, notes: 'High-to-low diagonal chop; reps per side.' },

	// Conditioning
	{ name: 'Trap Bar Carry', pattern: 'carry', equipment: 'trapbar', primary: 'Traps', secondary: ['Forearms', 'Abs'], repLow: 1, repHigh: 1, fatigue: 3, conditioning: true, notes: 'Time/distance based.' },
	{ name: 'Dumbbell Farmer Carry', pattern: 'carry', equipment: 'dumbbell', primary: 'Forearms', secondary: ['Traps', 'Abs'], repLow: 1, repHigh: 1, fatigue: 2, conditioning: true },
	{ name: 'Burpees', pattern: 'conditioning', equipment: 'bodyweight', primary: 'Abs', repLow: 10, repHigh: 20, fatigue: 3, conditioning: true },
	{ name: 'Mountain Climbers', pattern: 'conditioning', equipment: 'bodyweight', primary: 'Abs', repLow: 20, repHigh: 40, fatigue: 2, conditioning: true },
	{ name: 'Bodyweight Conditioning Circuit', pattern: 'conditioning', equipment: 'bodyweight', primary: 'Abs', repLow: 1, repHigh: 1, fatigue: 3, conditioning: true, notes: 'Rounds for time.' }
];
