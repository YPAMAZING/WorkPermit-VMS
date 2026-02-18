// VMS Employee Pass Routes
const express = require('express');
const router = express.Router();
const employeePassController = require('../../controllers/vms/employeepass.controller');
const { vmsAuthMiddleware, vmsPermissionMiddleware } = require('../../middleware/vms-auth');

// All routes require authentication
router.use(vmsAuthMiddleware);

// Get employee pass statistics
router.get('/stats', vmsPermissionMiddleware('vms.gatepasses.view'), employeePassController.getStats);

// Get all employee passes (with search, pagination, filters)
router.get('/', vmsPermissionMiddleware('vms.gatepasses.view'), employeePassController.getEmployeePasses);

// Get employee pass by pass number (for QR scan verification)
router.get('/verify/:passNumber', employeePassController.getByPassNumber);

// Get single employee pass
router.get('/:id', vmsPermissionMiddleware('vms.gatepasses.view'), employeePassController.getEmployeePass);

// Create employee pass
router.post('/', vmsPermissionMiddleware('vms.gatepasses.create'), employeePassController.createEmployeePass);

// Update employee pass
router.put('/:id', vmsPermissionMiddleware('vms.gatepasses.edit'), employeePassController.updateEmployeePass);

// Revoke employee pass
router.patch('/:id/revoke', vmsPermissionMiddleware('vms.gatepasses.edit'), employeePassController.revokeEmployeePass);

// Mark pass as shared
router.patch('/:id/shared', vmsPermissionMiddleware('vms.gatepasses.view'), employeePassController.markAsShared);

// Delete employee pass
router.delete('/:id', vmsPermissionMiddleware('vms.gatepasses.delete'), employeePassController.deleteEmployeePass);

module.exports = router;
