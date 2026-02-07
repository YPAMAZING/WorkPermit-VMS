const express = require('express');
const router = express.Router();
const companyController = require('../../controllers/vms/company.controller');
const { vmsAuth, vmsRequireRole } = require('../../middleware/vms-auth');

// ================================
// COMPANY MANAGEMENT ROUTES
// ================================

// Get all companies (super admin only)
router.get('/', vmsAuth, vmsRequireRole(['VMS_ADMIN', 'SUPER_ADMIN']), companyController.getAllCompanies);

// Get current user's company
router.get('/current', vmsAuth, companyController.getCurrentCompany);

// Get company by ID
router.get('/:id', vmsAuth, companyController.getCompanyById);

// Create new company (super admin only)
router.post('/', vmsAuth, vmsRequireRole(['SUPER_ADMIN']), companyController.createCompany);

// Update company
router.put('/:id', vmsAuth, vmsRequireRole(['VMS_ADMIN', 'SUPER_ADMIN']), companyController.updateCompany);

// Generate/Regenerate QR code for company
router.post('/:id/generate-qr', vmsAuth, vmsRequireRole(['VMS_ADMIN', 'SUPER_ADMIN']), companyController.generateCompanyQR);

// Get company QR code
router.get('/:id/qr-code', vmsAuth, companyController.getCompanyQRCode);

// Get company statistics
router.get('/:id/stats', vmsAuth, companyController.getCompanyStats);

// Manage departments
router.get('/:id/departments', vmsAuth, companyController.getDepartments);
router.post('/:id/departments', vmsAuth, vmsRequireRole(['VMS_ADMIN']), companyController.createDepartment);
router.put('/:id/departments/:deptId', vmsAuth, vmsRequireRole(['VMS_ADMIN']), companyController.updateDepartment);
router.delete('/:id/departments/:deptId', vmsAuth, vmsRequireRole(['VMS_ADMIN']), companyController.deleteDepartment);

module.exports = router;
