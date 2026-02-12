-- Create VMS tables manually (MySQL compatible)
-- Run this in MySQL: mysql -u root -p workpermit_db < scripts/create-vms-tables.sql

-- VMS Roles table (no default on TEXT column)
CREATE TABLE IF NOT EXISTS `vms_roles` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `displayName` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `permissions` TEXT NOT NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vms_roles_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VMS Users table
CREATE TABLE IF NOT EXISTS `vms_users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `profilePicture` TEXT NULL,
  `department` VARCHAR(100) NULL,
  `vmsRoleId` VARCHAR(36) NULL,
  `companyId` VARCHAR(36) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isApproved` BOOLEAN NOT NULL DEFAULT true,
  `workPermitUserId` VARCHAR(36) NULL,
  `isFromWorkPermit` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vms_users_email_key` (`email`),
  UNIQUE KEY `vms_users_workPermitUserId_key` (`workPermitUserId`),
  KEY `vms_users_email_idx` (`email`),
  KEY `vms_users_companyId_idx` (`companyId`),
  KEY `vms_users_workPermitUserId_idx` (`workPermitUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign keys separately (in case tables were created before)
-- ALTER TABLE `vms_users` ADD CONSTRAINT `vms_users_vmsRoleId_fkey` FOREIGN KEY (`vmsRoleId`) REFERENCES `vms_roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default VMS roles
INSERT INTO `vms_roles` (`id`, `name`, `displayName`, `description`, `permissions`, `isSystem`) VALUES
(UUID(), 'VMS_ADMIN', 'VMS Administrator', 'Full VMS system access', '["vms.dashboard.view","vms.dashboard.stats","vms.visitors.view","vms.visitors.create","vms.visitors.edit","vms.visitors.delete","vms.visitors.approve","vms.gatepasses.view","vms.gatepasses.create","vms.gatepasses.approve","vms.companies.view","vms.companies.create","vms.companies.edit","vms.users.view","vms.users.create","vms.users.edit","vms.roles.view","vms.roles.edit","vms.settings.view","vms.settings.edit","vms.reports.view"]', true)
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`);

INSERT INTO `vms_roles` (`id`, `name`, `displayName`, `description`, `permissions`, `isSystem`) VALUES
(UUID(), 'VMS_USER', 'VMS User', 'Basic VMS access', '["vms.dashboard.view","vms.visitors.view","vms.visitors.create","vms.gatepasses.view"]', true)
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`);

INSERT INTO `vms_roles` (`id`, `name`, `displayName`, `description`, `permissions`, `isSystem`) VALUES
(UUID(), 'VMS_SECURITY', 'Security Guard', 'Check-in/check-out visitors', '["vms.dashboard.view","vms.visitors.view","vms.visitors.create","vms.gatepasses.view","vms.gatepasses.create"]', true)
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`);

-- Create VMS admin user linked to Work Permit admin
INSERT INTO `vms_users` (`id`, `email`, `password`, `firstName`, `lastName`, `vmsRoleId`, `workPermitUserId`, `isFromWorkPermit`, `isActive`, `isApproved`)
SELECT 
  UUID(), 
  u.email, 
  u.password, 
  u.firstName, 
  u.lastName, 
  (SELECT id FROM vms_roles WHERE name = 'VMS_ADMIN' LIMIT 1),
  u.id,
  true,
  true,
  true
FROM users u
WHERE u.email = 'admin@permitmanager.com'
AND NOT EXISTS (SELECT 1 FROM vms_users WHERE email = 'admin@permitmanager.com');

-- Show results
SELECT 'VMS tables created successfully!' as result;
SELECT COUNT(*) as vms_roles_count FROM vms_roles;
SELECT COUNT(*) as vms_users_count FROM vms_users;
SELECT email, firstName, lastName, isFromWorkPermit FROM vms_users;
