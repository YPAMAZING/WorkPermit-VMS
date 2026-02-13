// VMS Company Settings Routes
// Handles company-specific settings including approval-based visitor feature
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/vms/company-settings.controller');
const { vmsAuthMiddleware } = require('../../middleware/vms-auth');

// Public routes (for visitor registration to check company settings)
router.get('/by-name/:name', controller.getCompanyByName);
router.get('/dropdown', controller.getCompaniesForDropdown);  // Public dropdown list

// Protected routes (require authentication)
router.use(vmsAuthMiddleware);

// Get all companies
router.get('/', controller.getAllCompanies);

// Get companies with approval settings (admin view)
router.get('/approval-settings', controller.getCompaniesWithApprovalSettings);

// Get company by ID
router.get('/:id', controller.getCompanyById);

// Create new company
router.post('/', controller.createCompany);

// Update company
router.put('/:id', controller.updateCompany);

// Toggle approval requirement (main feature)
// POST /api/vms/company-settings/:id/toggle-approval
router.post('/:id/toggle-approval', controller.toggleApprovalRequirement);

// Bulk update approval settings
router.post('/bulk-update-approval', controller.bulkUpdateApprovalSettings);

// Sync companies from frontend list
router.post('/sync', controller.syncCompanies);

// Seed default companies (adds all predefined companies)
router.post('/seed-defaults', controller.seedDefaultCompanies);

// Delete company
router.delete('/:id', controller.deleteCompany);

module.exports = router;
