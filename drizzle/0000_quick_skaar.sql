CREATE TABLE `absences` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`teacher_name` text NOT NULL,
	`category` text NOT NULL,
	`absence_date` text NOT NULL,
	`end_date` text,
	`reason` text NOT NULL,
	`duration` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`note` text DEFAULT '' NOT NULL,
	`relief_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`created_at` text NOT NULL
);
