const express = require('express');
const router = express.Router();
const openController = require('../../controllers/vms/open.controller');

// ================================
// OPEN ACCESS ROUTES (NO AUTH REQUIRED)
// ================================

// Get all recent visitors (public dashboard)
router.get('/visitors', openController.getAllVisitors);

// Get visitor statistics
router.get('/stats', openController.getVisitorStats);

// Get pass by pass number or ID
router.get('/pass/:passId', openController.getPassByNumber);

// Verify pass (for guards to check)
router.get('/verify/:passId', openController.verifyPass);

// ================================
// COMPANY PORTAL ROUTES (WITH PORTAL ID)
// ================================

// Get company portal data (validates subscription)
router.get('/portal/:portalId', openController.getCompanyPortal);

// Get company portal visitors
router.get('/portal/:portalId/visitors', openController.getCompanyVisitors);

// ================================
// ADMIN ROUTES FOR SUBSCRIPTION MANAGEMENT
// ================================

// These routes require admin authentication
const { vmsAuth, vmsRequireRole } = require('../../middleware/vms-auth');

// Toggle company subscription (on/off)
router.post('/admin/company/:companyId/subscription', 
  vmsAuth, 
  vmsRequireRole(['ADMIN', 'SUPER_ADMIN', 'VMS_ADMIN']), 
  openController.toggleCompanySubscription
);

// Get all companies with subscription status
router.get('/admin/companies', 
  vmsAuth, 
  vmsRequireRole(['ADMIN', 'SUPER_ADMIN', 'VMS_ADMIN']), 
  openController.getAllCompaniesAdmin
);

// Generate portal ID for company
router.post('/admin/company/:companyId/portal-id', 
  vmsAuth, 
  vmsRequireRole(['ADMIN', 'SUPER_ADMIN', 'VMS_ADMIN']), 
  openController.generatePortalId
);

// Update company settings
router.put('/admin/company/:companyId', 
  vmsAuth, 
  vmsRequireRole(['ADMIN', 'SUPER_ADMIN', 'VMS_ADMIN']), 
  openController.updateCompanySettings
);

module.exports = router;
