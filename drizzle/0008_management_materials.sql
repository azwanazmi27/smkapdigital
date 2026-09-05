CREATE TABLE `management_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`school_year` integer NOT NULL,
	`folder_id` text NOT NULL,
	`title` text NOT NULL,
	`document_type` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`storage_key` text DEFAULT '' NOT NULL,
	`mime_type` text DEFAULT '' NOT NULL,
	`original_name` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`owner_email` text NOT NULL,
	`owner_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_management_year_folder` ON `management_materials` (`school_year`,`folder_id`);
