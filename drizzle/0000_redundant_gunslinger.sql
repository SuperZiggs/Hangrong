CREATE TABLE `game_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`create_request_id` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`state_json` text NOT NULL,
	`created_at_ms` integer NOT NULL,
	`expires_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_rooms_code_unique` ON `game_rooms` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_rooms_create_request_id_unique` ON `game_rooms` (`create_request_id`);--> statement-breakpoint
CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start_ms` integer NOT NULL,
	`hits` integer NOT NULL
);
