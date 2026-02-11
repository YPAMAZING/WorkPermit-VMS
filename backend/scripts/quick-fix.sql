-- QUICK FIX: Add missing columns to users table
-- Run this in MySQL: mysql -u workpermit_user -p workpermit_db < scripts/quick-fix.sql

-- Add isApproved column
ALTER TABLE users ADD COLUMN IF NOT EXISTS isApproved BOOLEAN DEFAULT TRUE;

-- Add roleId column  
ALTER TABLE users ADD COLUMN IF NOT EXISTS roleId VARCHAR(36) NULL;

-- Add phone column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL;

-- Add profilePicture column
ALTER TABLE users ADD COLUMN IF NOT EXISTS profilePicture TEXT NULL;

-- Add requestedRole column
ALTER TABLE users ADD COLUMN IF NOT EXISTS requestedRole VARCHAR(50) NULL;

-- Add approvedBy column
ALTER TABLE users ADD COLUMN IF NOT EXISTS approvedBy VARCHAR(36) NULL;

-- Add approvedAt column
ALTER TABLE users ADD COLUMN IF NOT EXISTS approvedAt DATETIME NULL;

-- Add rejectionReason column
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejectionReason TEXT NULL;

-- Add companyName column (for VMS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS companyName VARCHAR(255) NULL;

-- Add hasVMSAccess column (for VMS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS hasVMSAccess BOOLEAN DEFAULT FALSE;

-- Set all existing users as approved
UPDATE users SET isApproved = TRUE WHERE isApproved IS NULL;

-- Create roles table if not exists
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  displayName VARCHAR(100) NOT NULL,
  description TEXT NULL,
  permissions TEXT DEFAULT '[]',
  uiConfig TEXT DEFAULT '{}',
  isSystem BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create permissions table if not exists
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Database fix completed!' as status;
