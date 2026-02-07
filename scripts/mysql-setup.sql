-- ================================================================
-- MySQL Database Setup Script for WorkPermit-VMS
-- Run this manually if automatic setup fails
-- ================================================================

-- Step 1: Create Databases
CREATE DATABASE IF NOT EXISTS workpermit_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS vms_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Step 2: Create User (Replace 'YourStrongPassword123!' with your password)
-- DROP USER IF EXISTS 'workpermit_user'@'localhost';
-- DROP USER IF EXISTS 'workpermit_user'@'%';

CREATE USER IF NOT EXISTS 'workpermit_user'@'localhost' 
  IDENTIFIED BY 'YourStrongPassword123!';

CREATE USER IF NOT EXISTS 'workpermit_user'@'%' 
  IDENTIFIED BY 'YourStrongPassword123!';

-- Step 3: Grant Privileges
GRANT ALL PRIVILEGES ON workpermit_db.* TO 'workpermit_user'@'localhost';
GRANT ALL PRIVILEGES ON workpermit_db.* TO 'workpermit_user'@'%';
GRANT ALL PRIVILEGES ON vms_db.* TO 'workpermit_user'@'localhost';
GRANT ALL PRIVILEGES ON vms_db.* TO 'workpermit_user'@'%';

-- Step 4: Flush Privileges
FLUSH PRIVILEGES;

-- Step 5: Verify Setup
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'workpermit_user';

-- ================================================================
-- Optional: Allow Remote Access (for phpMyAdmin/DBeaver from your PC)
-- ================================================================
-- Edit MySQL config: sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
-- Change: bind-address = 0.0.0.0
-- Restart: sudo systemctl restart mysql

-- ================================================================
-- Useful Commands:
-- ================================================================
-- Connect to MySQL: mysql -u workpermit_user -p
-- Use database: USE workpermit_db;
-- Show tables: SHOW TABLES;
-- Describe table: DESCRIBE users;
-- Count records: SELECT COUNT(*) FROM users;
