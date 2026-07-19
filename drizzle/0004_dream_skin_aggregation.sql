ALTER TABLE `submissions` ADD `engine` text DEFAULT 'dream-skin' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `capabilities` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `verified_in_codex` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_proposals` ADD `engine` text DEFAULT 'skindex-native' NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_proposals` ADD `capabilities` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_proposals` ADD `source_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `theme_proposals` ADD `verified_in_codex` integer DEFAULT false NOT NULL;