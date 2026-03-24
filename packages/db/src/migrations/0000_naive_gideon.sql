CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `connection` (
	`id` text PRIMARY KEY NOT NULL,
	`source_app_id` text NOT NULL,
	`target_app_id` text NOT NULL,
	`falcon_subject_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`status` text NOT NULL,
	`target_data_api_base_url` text NOT NULL,
	`revocation_reason` text,
	`activated_at` integer,
	`paused_at` integer,
	`revoked_at` integer,
	`last_verified_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`source_app_id`) REFERENCES `trusted_app`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_app_id`) REFERENCES `trusted_app`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connection_directional_unique_idx` ON `connection` (`source_app_id`,`target_app_id`,`falcon_subject_id`,`organization_id`);--> statement-breakpoint
CREATE INDEX `connection_status_idx` ON `connection` (`status`);--> statement-breakpoint
CREATE TABLE `connection_audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text,
	`install_intent_id` text,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`payload_json` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `connection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`install_intent_id`) REFERENCES `install_intent`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `connection_audit_event_connection_id_idx` ON `connection_audit_event` (`connection_id`);--> statement-breakpoint
CREATE INDEX `connection_audit_event_install_intent_id_idx` ON `connection_audit_event` (`install_intent_id`);--> statement-breakpoint
CREATE TABLE `connection_scope_grant` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`scope_name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`system` integer DEFAULT false NOT NULL,
	`granted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `connection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connection_scope_grant_connection_id_scope_name_idx` ON `connection_scope_grant` (`connection_id`,`scope_name`);--> statement-breakpoint
CREATE TABLE `install_intent` (
	`id` text PRIMARY KEY NOT NULL,
	`source_app_id` text NOT NULL,
	`target_app_id` text NOT NULL,
	`falcon_subject_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`requested_scopes_json` text NOT NULL,
	`source_return_url` text NOT NULL,
	`status` text NOT NULL,
	`denied_reason` text,
	`expires_at` integer NOT NULL,
	`decided_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`source_app_id`) REFERENCES `trusted_app`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_app_id`) REFERENCES `trusted_app`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `install_intent_source_target_idx` ON `install_intent` (`source_app_id`,`target_app_id`);--> statement-breakpoint
CREATE INDEX `install_intent_status_idx` ON `install_intent` (`status`);--> statement-breakpoint
CREATE TABLE `trusted_app` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text NOT NULL,
	`connect_request_url` text NOT NULL,
	`data_api_base_url` text NOT NULL,
	`allowed_redirect_urls_json` text NOT NULL,
	`support_email` text,
	`support_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_app_slug_unique` ON `trusted_app` (`slug`);--> statement-breakpoint
CREATE INDEX `trusted_app_slug_idx` ON `trusted_app` (`slug`);--> statement-breakpoint
CREATE TABLE `trusted_app_key` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`key_id` text NOT NULL,
	`algorithm` text NOT NULL,
	`public_jwk_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`rotated_at` integer,
	FOREIGN KEY (`app_id`) REFERENCES `trusted_app`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_app_key_app_id_key_id_idx` ON `trusted_app_key` (`app_id`,`key_id`);--> statement-breakpoint
CREATE INDEX `trusted_app_key_status_idx` ON `trusted_app_key` (`status`);--> statement-breakpoint
CREATE TABLE `trusted_app_request_nonce` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`key_id` text NOT NULL,
	`nonce` text NOT NULL,
	`request_path` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `trusted_app`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_app_request_nonce_app_id_nonce_idx` ON `trusted_app_request_nonce` (`app_id`,`nonce`);--> statement-breakpoint
CREATE INDEX `trusted_app_request_nonce_expires_at_idx` ON `trusted_app_request_nonce` (`expires_at`);--> statement-breakpoint
CREATE TABLE `trusted_app_scope` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`scope_name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text NOT NULL,
	`required_by_default` integer DEFAULT false NOT NULL,
	`system_scope` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `trusted_app`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_app_scope_app_id_scope_name_idx` ON `trusted_app_scope` (`app_id`,`scope_name`);