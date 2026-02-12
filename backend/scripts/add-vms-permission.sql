-- Add vms.admin permission to Work Permit database
-- Run this in workpermit_db

-- Add vms.admin permission
INSERT INTO permissions (id, `key`, name, module, action, isActive, createdAt)
VALUES (UUID(), 'vms.admin', 'VMS Administrator Access', 'vms', 'admin', 1, NOW())
ON DUPLICATE KEY UPDATE name = 'VMS Administrator Access';

-- Verify it was added
SELECT * FROM permissions WHERE `key` = 'vms.admin';

-- Show all permissions
SELECT `key`, name, module FROM permissions ORDER BY module, `key`;
