-- =====================================================
-- FIX DATABASE SCHEMA
-- Run this on your production MySQL database
-- This adds missing columns and tables to match schema
-- =====================================================

-- IMPORTANT: This script is idempotent - it checks before adding

-- =====================================================
-- 1. FIX USERS TABLE - Add missing columns
-- =====================================================

-- Add roleId column if not exists
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'roleId';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(36) NULL AFTER lastName')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add phone column if not exists
SET @columnname = 'phone';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add profilePicture column if not exists
SET @columnname = 'profilePicture';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add isApproved column if not exists
SET @columnname = 'isApproved';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' BOOLEAN DEFAULT TRUE')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add requestedRole column if not exists
SET @columnname = 'requestedRole';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(50) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add approvedBy column if not exists
SET @columnname = 'approvedBy';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(36) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add approvedAt column if not exists
SET @columnname = 'approvedAt';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATETIME NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add rejectionReason column if not exists
SET @columnname = 'rejectionReason';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add companyName column if not exists
SET @columnname = 'companyName';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add hasVMSAccess column if not exists
SET @columnname = 'hasVMSAccess';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' BOOLEAN DEFAULT FALSE')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- 2. CREATE ROLES TABLE IF NOT EXISTS
-- =====================================================
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

-- =====================================================
-- 3. CREATE PERMISSIONS TABLE IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_module (module)
);

-- =====================================================
-- 4. CREATE VMS TABLES IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS vms_companies (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  displayName VARCHAR(255) NOT NULL,
  description TEXT NULL,
  logo LONGTEXT NULL,
  contactPerson VARCHAR(255) NULL,
  contactEmail VARCHAR(255) NULL,
  contactPhone VARCHAR(20) NULL,
  address TEXT NULL,
  requireApproval BOOLEAN DEFAULT TRUE,
  autoApproveVisitors BOOLEAN DEFAULT FALSE,
  notifyOnVisitor BOOLEAN DEFAULT TRUE,
  notificationEmails TEXT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

CREATE TABLE IF NOT EXISTS vms_company_users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  companyId VARCHAR(36) NOT NULL,
  role VARCHAR(50) DEFAULT 'VIEWER',
  canApprove BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_company (userId, companyId),
  INDEX idx_userId (userId),
  INDEX idx_companyId (companyId),
  FOREIGN KEY (companyId) REFERENCES vms_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vms_visitors (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  visitorName VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  companyFrom VARCHAR(255) NULL,
  companyToVisit VARCHAR(255) NOT NULL,
  companyId VARCHAR(36) NULL,
  personToMeet VARCHAR(255) NULL,
  purpose VARCHAR(100) NOT NULL,
  idProofType VARCHAR(50) NOT NULL,
  idProofNumber VARCHAR(100) NOT NULL,
  idDocumentImage LONGTEXT NULL,
  photo LONGTEXT NULL,
  vehicleNumber VARCHAR(50) NULL,
  numberOfVisitors INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'PENDING',
  approvedBy VARCHAR(36) NULL,
  approvedAt DATETIME NULL,
  rejectionReason TEXT NULL,
  checkInTime DATETIME NULL,
  checkOutTime DATETIME NULL,
  entryType VARCHAR(20) DEFAULT 'WALK_IN',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_companyId (companyId),
  INDEX idx_status (status),
  INDEX idx_createdAt (createdAt),
  FOREIGN KEY (companyId) REFERENCES vms_companies(id)
);

CREATE TABLE IF NOT EXISTS vms_gatepasses (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  gatepassNumber VARCHAR(50) NOT NULL UNIQUE,
  visitorId VARCHAR(36) NOT NULL UNIQUE,
  companyId VARCHAR(36) NULL,
  validFrom DATETIME DEFAULT CURRENT_TIMESTAMP,
  validUntil DATETIME NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  usedAt DATETIME NULL,
  cancelledAt DATETIME NULL,
  cancelledBy VARCHAR(36) NULL,
  cancellationReason TEXT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gatepassNumber (gatepassNumber),
  INDEX idx_companyId (companyId),
  INDEX idx_status (status),
  FOREIGN KEY (visitorId) REFERENCES vms_visitors(id) ON DELETE CASCADE,
  FOREIGN KEY (companyId) REFERENCES vms_companies(id)
);

CREATE TABLE IF NOT EXISTS vms_pre_approvals (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  visitorName VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  companyFrom VARCHAR(255) NULL,
  companyId VARCHAR(36) NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  validFrom DATETIME NOT NULL,
  validUntil DATETIME NOT NULL,
  createdBy VARCHAR(36) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  usedAt DATETIME NULL,
  sharedVia VARCHAR(50) NULL,
  sharedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_companyId (companyId),
  INDEX idx_phone (phone),
  INDEX idx_status (status)
);

-- =====================================================
-- 5. CREATE OTHER MISSING TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS sso_tokens (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  userId VARCHAR(36) NOT NULL,
  externalUserId VARCHAR(36) NULL,
  externalSystem VARCHAR(50) DEFAULT 'VMS',
  expiresAt DATETIME NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_expiresAt (expiresAt)
);

CREATE TABLE IF NOT EXISTS analytics_cache (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  reportType VARCHAR(50) NOT NULL,
  reportName VARCHAR(255) NOT NULL,
  data LONGTEXT NOT NULL,
  filters TEXT NULL,
  generatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME NOT NULL,
  createdBy VARCHAR(36) NULL,
  INDEX idx_reportType (reportType),
  INDEX idx_expiresAt (expiresAt)
);

CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  company VARCHAR(255) NULL,
  trade VARCHAR(100) NULL,
  badgeNumber VARCHAR(50) NULL,
  photo LONGTEXT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_badgeNumber (badgeNumber)
);

-- =====================================================
-- 6. Add indexes to users table if missing
-- =====================================================
-- Note: These may fail if index exists, that's OK

-- =====================================================
-- 7. Update existing users to have isApproved = TRUE
-- =====================================================
UPDATE users SET isApproved = TRUE WHERE isApproved IS NULL OR isApproved = FALSE;

-- =====================================================
-- 8. Give ADMIN users VMS access
-- =====================================================
UPDATE users SET hasVMSAccess = TRUE WHERE roleId IN (SELECT id FROM roles WHERE name = 'ADMIN');

-- Done!
SELECT 'Database schema fix completed!' as status;
