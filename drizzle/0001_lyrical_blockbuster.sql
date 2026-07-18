CREATE TABLE `theme_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_name` text NOT NULL,
	`author_name` text NOT NULL,
	`platform` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`palette` text NOT NULL,
	`preview_key` text NOT NULL,
	`preview_mime` text NOT NULL,
	`source_type` text DEFAULT 'skill-generated' NOT NULL,
	`consent_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
