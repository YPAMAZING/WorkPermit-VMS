-- VMS Database Setup Script
-- Run this in workpermit_vms_db (the VMS database)

-- 1. Create VMS_ADMIN role if not exists
INSERT INTO roles (id, name, displayName, description, permissions, uiConfig, isSystem, isActive, createdAt, updatedAt)
SELECT 
  UUID(), 
  'VMS_ADMIN', 
  'VMS Administrator', 
  'Full VMS system access',
  '["vms.dashboard.view","vms.dashboard.stats","vms.visitors.view","vms.visitors.view_all","vms.visitors.create","vms.visitors.edit","vms.visitors.delete","vms.gatepasses.view","vms.gatepasses.create","vms.gatepasses.edit","vms.gatepasses.approve","vms.gatepasses.cancel","vms.checkin.view","vms.checkin.approve","vms.checkin.reject","vms.checkin.manage","vms.preapproved.view","vms.preapproved.create","vms.preapproved.edit","vms.preapproved.delete","vms.blacklist.view","vms.blacklist.manage","vms.companies.view","vms.companies.create","vms.companies.edit","vms.companies.delete","vms.users.view","vms.users.create","vms.users.edit","vms.users.delete","vms.roles.view","vms.roles.create","vms.roles.edit","vms.roles.delete","vms.settings.view","vms.settings.edit","vms.reports.view","vms.reports.export","vms.audit.view"]',
  '{"theme":"admin","primaryColor":"#3b82f6","showAllMenus":true}',
  1,
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'VMS_ADMIN');

-- Get VMS_ADMIN role ID
SET @vms_admin_role_id = (SELECT id FROM roles WHERE name = 'VMS_ADMIN' LIMIT 1);

-- 2. Create admin user in VMS database (same credentials as Work Permit)
-- Password: admin123 (bcrypt hash)
INSERT INTO users (id, email, password, firstName, lastName, roleId, isActive, isApproved, createdAt, updatedAt)
SELECT 
  UUID(),
  'admin@permitmanager.com',
  '$2a$10$8K1p/a0dL1LXMw.5AqZvXOgwC7ql7OWvjVuQ5LNpRFMVKrOXBBKCm',
  'System',
  'Administrator',
  @vms_admin_role_id,
  1,
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@permitmanager.com');

-- 3. If user exists, update to ensure they have VMS_ADMIN role and are active
UPDATE users 
SET roleId = @vms_admin_role_id, isActive = 1, isApproved = 1
WHERE email = 'admin@permitmanager.com';

-- 4. Verify
SELECT 'Roles:' as info;
SELECT id, name, displayName FROM roles;

SELECT 'Users:' as info;
SELECT id, email, firstName, lastName, roleId, isActive, isApproved FROM users;
