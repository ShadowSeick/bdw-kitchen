CREATE TABLE `calendar` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `day` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendar`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_day_calendar` ON `day` (`calendar_id`);--> statement-breakpoint
CREATE TABLE `ingridient` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meal_slot` (
	`day_id` text NOT NULL,
	`meal_name` text NOT NULL,
	`recipe_id` text NOT NULL,
	PRIMARY KEY(`day_id`, `meal_name`),
	FOREIGN KEY (`day_id`) REFERENCES `day`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_meal_slot_recipe` ON `meal_slot` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipe` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
