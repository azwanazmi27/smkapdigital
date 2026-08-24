CREATE TABLE `opr_duty_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`report_date` text NOT NULL,
	`week_number` integer NOT NULL,
	`school_year` integer NOT NULL,
	`day_name` text NOT NULL,
	`teachers` text NOT NULL,
	`teacher_total` integer DEFAULT 0 NOT NULL,
	`teacher_present` integer DEFAULT 0 NOT NULL,
	`teacher_absent` integer DEFAULT 0 NOT NULL,
	`cleanliness_status` text NOT NULL,
	`discipline_status` text NOT NULL,
	`safety_status` text NOT NULL,
	`health_status` text NOT NULL,
	`canteen_status` text NOT NULL,
	`activity_note` text DEFAULT '' NOT NULL,
	`general_note` text DEFAULT '' NOT NULL,
	`prepared_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_opr_duty_report_date` ON `opr_duty_reports` (`report_date`);
--> statement-breakpoint
CREATE INDEX `idx_opr_duty_week` ON `opr_duty_reports` (`school_year`,`week_number`);
