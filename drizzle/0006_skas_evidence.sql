CREATE TABLE IF NOT EXISTS `skas_years` (
	`school_year` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`prepared_from` integer,
	`activation_date` text,
	`closed_at` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `skas_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`school_year` integer NOT NULL,
	`domain` text NOT NULL,
	`unit_name` text NOT NULL,
	`evidence_type` text NOT NULL,
	`title` text NOT NULL,
	`standard_code` text DEFAULT '' NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`storage_key` text DEFAULT '' NOT NULL,
	`mime_type` text DEFAULT '' NOT NULL,
	`original_name` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_email` text NOT NULL,
	`submitted_by_name` text NOT NULL,
	`verified_by_email` text DEFAULT '' NOT NULL,
	`verified_by_name` text DEFAULT '' NOT NULL,
	`verified_at` text DEFAULT '' NOT NULL,
	`source_module` text DEFAULT '' NOT NULL,
	`source_record_id` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_skas_evidence_year_domain_status` ON `skas_evidence` (`school_year`,`domain`,`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_skas_evidence_source_record` ON `skas_evidence` (`source_module`,`source_record_id`) WHERE `source_record_id` != '';
