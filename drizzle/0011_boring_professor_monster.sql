CREATE TABLE `document_mapping_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`document_type` text NOT NULL,
	`epanitia_category_id` text DEFAULT '' NOT NULL,
	`management_folder_id` text DEFAULT '' NOT NULL,
	`skas_standard_id` text DEFAULT '' NOT NULL,
	`mapping_mode` text DEFAULT 'confirm' NOT NULL,
	`minimum_status` text DEFAULT 'approved' NOT NULL,
	`version_policy` text DEFAULT 'latest_approved' NOT NULL,
	`approver_roles` text DEFAULT 'admin,super_admin' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_mapping_rules_type` ON `document_mapping_rules` (`document_type`);--> statement-breakpoint
CREATE TABLE `document_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`document_version_id` text DEFAULT '' NOT NULL,
	`destination_module` text NOT NULL,
	`destination_category_id` text DEFAULT '' NOT NULL,
	`destination_standard_id` text DEFAULT '' NOT NULL,
	`mapping_status` text DEFAULT 'pending' NOT NULL,
	`mapped_by` text NOT NULL,
	`mapped_at` text NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_mapping_destination` ON `document_mappings` (`document_id`,`destination_module`,`destination_category_id`,`destination_standard_id`);--> statement-breakpoint
CREATE INDEX `idx_document_mappings_review` ON `document_mappings` (`destination_module`,`mapping_status`);--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`template_version_id` text DEFAULT '' NOT NULL,
	`drive_file_id` text NOT NULL,
	`drive_folder_id` text DEFAULT '' NOT NULL,
	`drive_url` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`checksum` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`approval_status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_versions_number` ON `document_versions` (`document_id`,`version_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_versions_drive_file` ON `document_versions` (`drive_file_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text DEFAULT 'CRA8001' NOT NULL,
	`academic_year_id` integer NOT NULL,
	`panel_id` text DEFAULT '' NOT NULL,
	`programme_id` text DEFAULT '' NOT NULL,
	`source_module` text NOT NULL,
	`document_type` text NOT NULL,
	`title` text NOT NULL,
	`reference_number` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`current_version_id` text DEFAULT '' NOT NULL,
	`owner_user_id` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_documents_year_panel` ON `documents` (`academic_year_id`,`panel_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_programme` ON `documents` (`programme_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_status` ON `documents` (`status`);--> statement-breakpoint
CREATE TABLE `programme_documents` (
	`programme_id` text NOT NULL,
	`document_id` text NOT NULL,
	`relationship_type` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_programme_documents_link` ON `programme_documents` (`programme_id`,`document_id`);--> statement-breakpoint
CREATE TABLE `programmes` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text DEFAULT 'CRA8001' NOT NULL,
	`academic_year_id` integer NOT NULL,
	`panel_id` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`venue` text DEFAULT '' NOT NULL,
	`target_group` text DEFAULT '' NOT NULL,
	`coordinator_user_id` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_programmes_year_panel` ON `programmes` (`academic_year_id`,`panel_id`);--> statement-breakpoint
CREATE TABLE `school_document_identity` (
	`id` text PRIMARY KEY NOT NULL,
	`version_number` integer NOT NULL,
	`payload_json` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_school_document_identity_version` ON `school_document_identity` (`version_number`);