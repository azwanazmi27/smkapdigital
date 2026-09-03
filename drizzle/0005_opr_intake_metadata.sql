CREATE TABLE IF NOT EXISTS `opr_intake_metadata` (
	`report_id` text PRIMARY KEY NOT NULL,
	`created_by_email` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`competition_status` text DEFAULT '0' NOT NULL,
	`external_involvement_status` text DEFAULT '0' NOT NULL,
	`suggested_skas_json` text DEFAULT '[]' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_opr_intake_review_status` ON `opr_intake_metadata` (`review_status`);
