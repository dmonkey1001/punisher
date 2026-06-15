CREATE TABLE `cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`number` integer DEFAULT 1 NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `workouts` ADD `cycle_id` text REFERENCES cycles(id);--> statement-breakpoint
ALTER TABLE `workouts` ADD `major_anchor` text;--> statement-breakpoint
ALTER TABLE `workouts` ADD `minor_anchor` text;