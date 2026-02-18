// VMS Employee Pass Routes
const express = require('express');
const router = express.Router();
const employeePassController = require('../../controllers/vms/employeepass.controller');
const { vmsAuthMiddleware, vmsPermissionMiddleware } = require('../../middleware/vms-auth');

// All routes require authentication
router.use(vmsAuthMiddleware);

// Custom middleware: Allow company users to manage their own employee passes
const canManageEmployeePasses = (req, res, next) => {
  // Admin has all permissions
  if (req.user.isAdmin) {
    return next();
  }
  
  // Check if user has explicit permission
  if (req.user.permissions && req.user.permissions.includes('vms.gatepasses.create')) {
    return next();
  }
  
  // Company users can create passes for their own company
  if (req.user.companyId) {
    return next();
  }
  
  // Reception and Security roles can create passes
  const role = req.user.role?.toLowerCase() || '';
  if (role.includes('reception') || role.includes('security') || role.includes('guard')) {
    return next();
  }
  
  return res.status(403).json({ 
    message: 'Permission denied. You need to be associated with a company to create employee passes.',
  });
};

// Custom middleware: Allow company users to view their own employee passes
const canViewEmployeePasses = (req, res, next) => {
  // Admin has all permissions
  if (req.user.isAdmin) {
    return next();
  }
  
  // Check if user has explicit permission
  if (req.user.permissions && req.user.permissions.includes('vms.gatepasses.view')) {
    return next();
  }
  
  // Company users can view passes for their own company
  if (req.user.companyId) {
    return next();
  }
  
  // Reception and Security roles can view all passes
  const role = req.user.role?.toLowerCase() || '';
  if (role.includes('reception') || role.includes('security') || role.includes('guard')) {
    return next();
  }
  
  return res.status(403).json({ 
    message: 'Permission denied.',
  });
};

// Get employee pass statistics
router.get('/stats', canViewEmployeePasses, employeePassController.getStats);

// Get all employee passes (with search, pagination, filters)
router.get('/', canViewEmployeePasses, employeePassController.getEmployeePasses);

// Get employee pass by pass number (for QR scan verification)
router.get('/verify/:passNumber', employeePassController.getByPassNumber);

// Get single employee pass
router.get('/:id', canViewEmployeePasses, employeePassController.getEmployeePass);

// Create employee pass - Use custom middleware to allow company users
router.post('/', canManageEmployeePasses, employeePassController.createEmployeePass);

// Update employee pass
router.put('/:id', vmsPermissionMiddleware('vms.gatepasses.edit'), employeePassController.updateEmployeePass);

// Revoke employee pass
router.patch('/:id/revoke', vmsPermissionMiddleware('vms.gatepasses.edit'), employeePassController.revokeEmployeePass);

// Mark pass as shared
router.patch('/:id/shared', vmsPermissionMiddleware('vms.gatepasses.view'), employeePassController.markAsShared);

// Delete employee pass
router.delete('/:id', vmsPermissionMiddleware('vms.gatepasses.delete'), employeePassController.deleteEmployeePass);

module.exports = router;
