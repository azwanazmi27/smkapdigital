CREATE TABLE `document_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`school_year` integer NOT NULL,
	`panel_id` text DEFAULT '' NOT NULL,
	`programme_id` text DEFAULT '' NOT NULL,
	`document_type` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`step` integer DEFAULT 1 NOT NULL,
	`owner_user_id` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_document_drafts_owner_updated` ON `document_drafts` (`owner_user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_document_drafts_year_panel` ON `document_drafts` (`school_year`,`panel_id`);