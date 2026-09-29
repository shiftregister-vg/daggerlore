CREATE TABLE `character_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`from_character_id` text NOT NULL,
	`to_character_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`revert_requested_by` text,
	`sender_state` text NOT NULL,
	`recipient_state` text NOT NULL,
	`sender_applied` text DEFAULT '[]' NOT NULL,
	`recipient_applied` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `character_requests_to_character_idx` ON `character_requests` (`to_character_id`,`status`);
--> statement-breakpoint
CREATE INDEX `character_requests_from_character_idx` ON `character_requests` (`from_character_id`,`status`);
--> statement-breakpoint
CREATE INDEX `character_requests_campaign_idx` ON `character_requests` (`campaign_id`);
