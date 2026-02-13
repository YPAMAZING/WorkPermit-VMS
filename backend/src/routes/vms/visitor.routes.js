// VMS Visitor Routes
const express = require('express');
const router = express.Router();
const visitorController = require('../../controllers/vms/visitor.controller');
const { vmsAuthMiddleware, vmsPermissionMiddleware } = require('../../middleware/vms-auth');

// All routes require authentication
router.use(vmsAuthMiddleware);

// Get visitors (with search, pagination, filters)
router.get('/', vmsPermissionMiddleware('vms.visitors.view'), visitorController.getVisitors);

// Get visitor statistics
router.get('/stats', vmsPermissionMiddleware('vms.visitors.view'), visitorController.getVisitorStats);

// Search visitor by phone
router.get('/search', vmsPermissionMiddleware('vms.visitors.view'), visitorController.searchByPhone);

// Get single visitor
router.get('/:id', vmsPermissionMiddleware('vms.visitors.view'), visitorController.getVisitor);

// Create visitor
router.post('/', vmsPermissionMiddleware('vms.visitors.create'), visitorController.createVisitor);

// Update visitor
router.put('/:id', vmsPermissionMiddleware('vms.visitors.edit'), visitorController.updateVisitor);

// Approve visitor
router.post('/:id/approve', vmsPermissionMiddleware('vms.visitors.approve'), visitorController.approveVisitor);

// Reject visitor
router.post('/:id/reject', vmsPermissionMiddleware('vms.visitors.approve'), visitorController.rejectVisitor);

// Check-in visitor
router.post('/:id/checkin', vmsPermissionMiddleware('vms.visitors.edit'), visitorController.checkInVisitor);

// Check-out visitor
router.post('/:id/checkout', vmsPermissionMiddleware('vms.visitors.edit'), visitorController.checkOutVisitor);

// Delete visitor
router.delete('/:id', vmsPermissionMiddleware('vms.visitors.delete'), visitorController.deleteVisitor);

module.exports = router;
