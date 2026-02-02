// VMS Pre-approved Visitors Routes
const express = require('express');
const router = express.Router();
const preapprovedController = require('../../controllers/vms/preapproved.controller');
const { vmsAuthMiddleware, vmsPermissionMiddleware } = require('../../middleware/vms-auth');

// All routes require authentication
router.use(vmsAuthMiddleware);

// Check if visitor is pre-approved
router.get('/check', vmsPermissionMiddleware('vms.preapproved.view'), preapprovedController.checkPreApproval);

// Get pre-approved visitors (with search, pagination, filters)
router.get('/', vmsPermissionMiddleware('vms.preapproved.view'), preapprovedController.getPreApprovedVisitors);

// Get pre-approval statistics
router.get('/stats', vmsPermissionMiddleware('vms.preapproved.view'), preapprovedController.getPreApprovalStats);

// Get single pre-approved visitor
router.get('/:id', vmsPermissionMiddleware('vms.preapproved.view'), preapprovedController.getPreApprovedVisitor);

// Create pre-approved visitor
router.post('/', vmsPermissionMiddleware('vms.preapproved.create'), preapprovedController.createPreApprovedVisitor);

// Update pre-approved visitor
router.put('/:id', vmsPermissionMiddleware('vms.preapproved.edit'), preapprovedController.updatePreApprovedVisitor);

// Use pre-approval (when visitor arrives)
router.patch('/:id/use', vmsPermissionMiddleware('vms.gatepasses.create'), preapprovedController.usePreApproval);

// Cancel pre-approval
router.patch('/:id/cancel', vmsPermissionMiddleware('vms.preapproved.edit'), preapprovedController.cancelPreApproval);

// Delete pre-approved visitor
router.delete('/:id', vmsPermissionMiddleware('vms.preapproved.delete'), preapprovedController.deletePreApprovedVisitor);

module.exports = router;
