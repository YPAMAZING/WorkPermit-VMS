-- CreateTable
CREATE TABLE IF NOT EXISTS `vms_push_subscriptions` (
    `id` VARCHAR(36) NOT NULL,
    `vmsUserId` VARCHAR(36) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `endpointHash` VARCHAR(64) NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` VARCHAR(100) NOT NULL,
    `userAgent` TEXT NULL,
    `deviceType` VARCHAR(20) NOT NULL DEFAULT 'unknown',
    `browser` VARCHAR(50) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsed` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vms_push_subscriptions_endpointHash_key`(`endpointHash`),
    INDEX `vms_push_subscriptions_vmsUserId_idx`(`vmsUserId`),
    INDEX `vms_push_subscriptions_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vms_push_subscriptions` ADD CONSTRAINT `vms_push_subscriptions_vmsUserId_fkey` FOREIGN KEY (`vmsUserId`) REFERENCES `vms_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
