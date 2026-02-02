// VMS Blacklist Routes
const express = require('express');
const router = express.Router();
const blacklistController = require('../../controllers/vms/blacklist.controller');
const { vmsAuthMiddleware, vmsPermissionMiddleware } = require('../../middleware/vms-auth');

// All routes require authentication
router.use(vmsAuthMiddleware);

// Get blacklist reasons enum
router.get('/reasons', blacklistController.getBlacklistReasons);

// Check if person is blacklisted (public for gatepass creation)
router.get('/check', vmsPermissionMiddleware('vms.blacklist.view'), blacklistController.checkBlacklist);

// Get blacklist entries (with search, pagination, filters)
router.get('/', vmsPermissionMiddleware('vms.blacklist.view'), blacklistController.getBlacklist);

// Get blacklist statistics
router.get('/stats', vmsPermissionMiddleware('vms.blacklist.view'), blacklistController.getBlacklistStats);

// Get single blacklist entry
router.get('/:id', vmsPermissionMiddleware('vms.blacklist.view'), blacklistController.getBlacklistEntry);

// Add to blacklist
router.post('/', vmsPermissionMiddleware('vms.blacklist.create'), blacklistController.addToBlacklist);

// Update blacklist entry
router.put('/:id', vmsPermissionMiddleware('vms.blacklist.edit'), blacklistController.updateBlacklistEntry);

// Remove from blacklist (soft delete - deactivate)
router.patch('/:id/remove', vmsPermissionMiddleware('vms.blacklist.delete'), blacklistController.removeFromBlacklist);

// Delete blacklist entry (hard delete)
router.delete('/:id', vmsPermissionMiddleware('vms.blacklist.delete'), blacklistController.deleteBlacklistEntry);

module.exports = router;
