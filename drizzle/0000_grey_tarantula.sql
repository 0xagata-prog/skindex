CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_name` text NOT NULL,
	`author_name` text NOT NULL,
	`repo_url` text NOT NULL,
	`platform` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_repo_url_unique` ON `submissions` (`repo_url`);--> statement-breakpoint
CREATE TABLE `themes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`author` text NOT NULL,
	`author_url` text NOT NULL,
	`platform` text NOT NULL,
	`mode` text NOT NULL,
	`description` text NOT NULL,
	`tags` text NOT NULL,
	`palette` text NOT NULL,
	`preview_url` text NOT NULL,
	`source_url` text NOT NULL,
	`download_url` text NOT NULL,
	`source_name` text NOT NULL,
	`source_repo` text NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`license` text DEFAULT '未声明' NOT NULL,
	`verified_version` text DEFAULT '来源已核验' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
