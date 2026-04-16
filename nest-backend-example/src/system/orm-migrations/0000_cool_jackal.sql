CREATE TABLE `accounts` (
	`id` varchar(50) NOT NULL,
	`login` varchar(20) NOT NULL,
	`password` varchar(60) NOT NULL,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(50) NOT NULL,
	`account_id` varchar(50) NOT NULL,
	`refresh_token` text NOT NULL,
	`ua` text,
	`ip` varchar(15),
	`browser_data` text,
	`cpu_architecture` text,
	`device_data` text,
	`os_data` text,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;