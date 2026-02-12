-- Fix VMS permissions column size
-- Run this in workpermit_vms_db

-- Increase permissions column size to LONGTEXT
ALTER TABLE roles MODIFY COLUMN permissions LONGTEXT;

-- Verify
DESCRIBE roles;
