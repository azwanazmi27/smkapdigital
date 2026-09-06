ALTER TABLE `management_materials` ADD `deleted_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `management_materials` ADD `deleted_by` text DEFAULT '' NOT NULL;