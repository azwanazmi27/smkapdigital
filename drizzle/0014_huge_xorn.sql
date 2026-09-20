CREATE TABLE `staff_work_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `staff_work_user` ON `staff_work_assignments` (`user_id`);--> statement-breakpoint
CREATE INDEX `staff_work_document` ON `staff_work_assignments` (`document_id`);--> statement-breakpoint
CREATE TABLE `staff_work_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`filename` text NOT NULL,
	`file_key` text NOT NULL,
	`assignments_json` text DEFAULT '[]' NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
