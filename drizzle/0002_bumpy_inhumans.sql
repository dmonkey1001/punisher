CREATE TABLE `exercise_blacklist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_blacklist_user_exercise` ON `exercise_blacklist` (`user_id`,`exercise_id`);