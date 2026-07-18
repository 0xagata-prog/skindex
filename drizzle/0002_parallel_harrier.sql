CREATE TABLE `theme_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text NOT NULL,
	`action` text NOT NULL,
	`snapshot` text NOT NULL,
	`editor_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
