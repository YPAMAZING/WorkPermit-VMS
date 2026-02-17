-- Make idProofType and idProofNumber optional in VMSVisitor
-- This allows visitor registration without ID proof requirement

ALTER TABLE `vms_visitors` MODIFY COLUMN `idProofType` VARCHAR(50) NULL;
ALTER TABLE `vms_visitors` MODIFY COLUMN `idProofNumber` VARCHAR(100) NULL;
