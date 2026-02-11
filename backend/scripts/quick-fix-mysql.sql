-- QUICK FIX for MySQL (compatible syntax)
-- Run: source scripts/quick-fix-mysql.sql;

-- First check and add columns one by one (ignore errors if they exist)

-- Disable strict mode temporarily
SET SQL_MODE = '';

-- Try to add each column - will fail silently if exists
ALTER TABLE users ADD COLUMN isApproved BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN roleId VARCHAR(36) NULL;
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN profilePicture TEXT NULL;
ALTER TABLE users ADD COLUMN requestedRole VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN approvedBy VARCHAR(36) NULL;
ALTER TABLE users ADD COLUMN approvedAt DATETIME NULL;
ALTER TABLE users ADD COLUMN rejectionReason TEXT NULL;
ALTER TABLE users ADD COLUMN companyName VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN hasVMSAccess BOOLEAN DEFAULT FALSE;

-- Update existing users to be approved
UPDATE users SET isApproved = 1 WHERE isApproved IS NULL OR isApproved = 0;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  displayName VARCHAR(100) NOT NULL,
  description TEXT NULL,
  permissions TEXT,
  uiConfig TEXT,
  isSystem BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create permissions table
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

SELECT 'Fix completed!' as result;
