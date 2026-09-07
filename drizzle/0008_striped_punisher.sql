CREATE TABLE `relief_teacher_review` (
	`name_key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`schedule_id` text NOT NULL,
	`source_label` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`teacher_id` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
