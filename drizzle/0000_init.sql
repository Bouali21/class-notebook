CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`max_score` real NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assessments_class_idx` ON `assessments` (`class_id`);--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`participation` integer,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_once_idx` ON `attendance` (`student_id`,`date`);--> statement-breakpoint
CREATE INDEX `attendance_class_date_idx` ON `attendance` (`class_id`,`date`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`grade` text DEFAULT '' NOT NULL,
	`school_year` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `classes_owner_idx` ON `classes` (`owner_id`);--> statement-breakpoint
CREATE TABLE `family_links` (
	`student_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`pin_hash` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`first_viewed_at` text,
	`last_viewed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_links_token_idx` ON `family_links` (`token`);--> statement-breakpoint
CREATE TABLE `lesson_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`class_id` text,
	`date` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`topic` text NOT NULL,
	`duration_minutes` integer DEFAULT 45 NOT NULL,
	`objectives` text DEFAULT '' NOT NULL,
	`strategies` text DEFAULT '' NOT NULL,
	`stages` text DEFAULT '[]' NOT NULL,
	`materials` text DEFAULT '' NOT NULL,
	`assessment` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plans_owner_date_idx` ON `lesson_plans` (`owner_id`,`date`);--> statement-breakpoint
CREATE TABLE `marks` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`score` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marks_once_idx` ON `marks` (`assessment_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `marks_student_idx` ON `marks` (`student_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	`access_code` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_code_idx` ON `students` (`access_code`);--> statement-breakpoint
CREATE INDEX `students_class_idx` ON `students` (`class_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`worksheet_id` text NOT NULL,
	`student_id` text NOT NULL,
	`answers` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`max_score` real DEFAULT 0 NOT NULL,
	`pending` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_once_idx` ON `submissions` (`worksheet_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `submissions_student_idx` ON `submissions` (`student_id`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worksheets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`class_id` text,
	`title` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`level` text DEFAULT 'core' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `worksheets_owner_idx` ON `worksheets` (`owner_id`);--> statement-breakpoint
CREATE INDEX `worksheets_class_idx` ON `worksheets` (`class_id`);