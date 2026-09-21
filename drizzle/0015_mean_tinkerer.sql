CREATE TABLE `staff_relief_links` (
	`user_id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_relief_teacher` ON `staff_relief_links` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `staff_task_state` (
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`dismissed` integer DEFAULT 0 NOT NULL,
	`seen_at` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_task_state_user_task` ON `staff_task_state` (`user_id`,`task_id`);--> statement-breakpoint
CREATE INDEX `staff_task_state_user` ON `staff_task_state` (`user_id`);--> statement-breakpoint
ALTER TABLE `staff_work_assignments` ADD `task_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `staff_work_task_key` ON `staff_work_assignments` (`task_key`) WHERE "staff_work_assignments"."task_key" != '';--> statement-breakpoint
ALTER TABLE `staff_work_documents` ADD `content_hash` text DEFAULT '' NOT NULL;