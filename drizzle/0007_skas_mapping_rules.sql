CREATE TABLE IF NOT EXISTS `skas_mapping_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`signal_profile` text DEFAULT 'regular' NOT NULL,
	`domain` text NOT NULL,
	`unit_name` text NOT NULL,
	`evidence_type` text NOT NULL,
	`standard_code` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`updated_by_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_skas_mapping_rules_category_signal` ON `skas_mapping_rules` (`category`,`signal_profile`);
