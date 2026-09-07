CREATE TABLE `management_report_folders` (
	`report_id` text PRIMARY KEY NOT NULL,
	`folder_id` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
