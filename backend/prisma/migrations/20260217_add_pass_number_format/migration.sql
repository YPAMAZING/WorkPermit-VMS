-- Add passNumber field to VMSPreApproval for RGDGTLGP format
-- This migration adds the new pass number format: RGDGTLGP FEB 2026 - 0001

ALTER TABLE `vms_pre_approvals` 
ADD COLUMN `passNumber` VARCHAR(50) NULL AFTER `id`;

-- Add unique index on passNumber
CREATE UNIQUE INDEX `vms_pre_approvals_passNumber_key` ON `vms_pre_approvals`(`passNumber`);
