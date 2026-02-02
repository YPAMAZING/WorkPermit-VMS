// VMS Gatepass Routes
const express = require('express');
const router = express.Router();
const gatepassController = require('../../controllers/vms/gatepass.controller');
const { vmsAuthMiddleware, vmsPermissionMiddleware } = require('../../middleware/vms-auth');

// Public route for QR code scanning
router.get('/verify/:gatepassNumber', gatepassController.getGatepassByNumber);

// All other routes require authentication
router.use(vmsAuthMiddleware);

// Get gatepasses (with search, pagination, filters)
router.get('/', vmsPermissionMiddleware('vms.gatepasses.view'), gatepassController.getGatepasses);

// Get today's summary
router.get('/today-summary', vmsPermissionMiddleware('vms.gatepasses.view'), gatepassController.getTodaySummary);

// Get gatepass statistics
router.get('/stats', vmsPermissionMiddleware('vms.gatepasses.view'), gatepassController.getGatepassStats);

// Get single gatepass
router.get('/:id', vmsPermissionMiddleware('vms.gatepasses.view'), gatepassController.getGatepass);

// Create gatepass
router.post('/', vmsPermissionMiddleware('vms.gatepasses.create'), gatepassController.createGatepass);

// Update gatepass
router.put('/:id', vmsPermissionMiddleware('vms.gatepasses.edit'), gatepassController.updateGatepass);

// Update gatepass status
router.patch('/:id/status', vmsPermissionMiddleware('vms.gatepasses.edit'), gatepassController.updateGatepassStatus);

// Cancel gatepass
router.patch('/:id/cancel', vmsPermissionMiddleware('vms.gatepasses.cancel'), gatepassController.cancelGatepass);

module.exports = router;
