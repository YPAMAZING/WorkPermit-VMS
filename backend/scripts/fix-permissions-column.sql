-- Fix permissions column to LONGTEXT
-- Run: mysql -u root -p workpermit_db < scripts/fix-permissions-column.sql

ALTER TABLE `vms_roles` MODIFY COLUMN `permissions` LONGTEXT NOT NULL;

-- Show result
SELECT 'vms_roles.permissions column changed to LONGTEXT' as result;
DESCRIBE vms_roles;
