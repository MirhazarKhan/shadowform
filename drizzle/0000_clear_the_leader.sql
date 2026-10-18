CREATE TABLE `spirit_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`room` text NOT NULL,
	`actor` text NOT NULL,
	`payload` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `spirit_rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spirit_event_once` ON `spirit_events` (`room`,`actor`,`event_id`);--> statement-breakpoint
CREATE INDEX `spirit_event_room_seq` ON `spirit_events` (`room`,`seq`);--> statement-breakpoint
CREATE TABLE `spirit_players` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`token_hash` text NOT NULL,
	`slot` integer NOT NULL,
	`name` text NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	`available` integer DEFAULT 1 NOT NULL,
	`joined` integer NOT NULL,
	`seen` integer NOT NULL,
	`state` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `spirit_rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spirit_player_slot` ON `spirit_players` (`room`,`slot`);--> statement-breakpoint
CREATE TABLE `spirit_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`epoch` integer DEFAULT 1 NOT NULL,
	`phase` text DEFAULT 'lobby' NOT NULL,
	`world` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spirit_signals` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`signal_id` text NOT NULL,
	`room` text NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`payload` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `spirit_rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spirit_signal_once` ON `spirit_signals` (`sender`,`signal_id`);--> statement-breakpoint
CREATE INDEX `spirit_signal_recipient_seq` ON `spirit_signals` (`room`,`recipient`,`seq`);