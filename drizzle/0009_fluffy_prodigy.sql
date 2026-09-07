CREATE TABLE `staff_portfolio` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`issuer` text DEFAULT '' NOT NULL,
	`award_date` text DEFAULT '' NOT NULL,
	`featured` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_portfolio_user` ON `staff_portfolio` (`user_id`);