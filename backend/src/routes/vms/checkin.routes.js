const express = require('express');
const router = express.Router();
const checkinController = require('../../controllers/vms/checkin.controller');
const { vmsAuth, vmsRequireRole } = require('../../middleware/vms-auth');

// ================================
// PUBLIC ROUTES (No Auth Required)
// For visitor self check-in via QR code
// ================================

// Get all active companies (for single QR check-in with company selection)
router.get('/companies', checkinController.getAllActiveCompanies);

// Get company info by code (for QR form)
router.get('/company/:companyCode', checkinController.getCompanyByCode);

// Submit self check-in request (public)
router.post('/submit', checkinController.submitCheckInRequest);

// Get check-in request status (public, by request number)
router.get('/status/:requestNumber', checkinController.getCheckInStatus);

// ================================
// PROTECTED ROUTES (Guard/Reception)
// ================================

// Get all pending check-in requests for company
router.get('/pending', vmsAuth, checkinController.getPendingRequests);

// Get all check-in requests (with filters)
router.get('/requests', vmsAuth, checkinController.getAllRequests);

// Get live feed of check-in requests (for guard dashboard)
router.get('/live', vmsAuth, checkinController.getLiveFeed);

// Get single check-in request details
router.get('/requests/:id', vmsAuth, checkinController.getRequestById);

// Approve check-in request (Company users can approve their own company's visitors)
router.post('/requests/:id/approve', vmsAuth, vmsRequireRole(['VMS_ADMIN', 'COMPANY_USER', 'company_user']), checkinController.approveRequest);

// Reject check-in request (Company users can reject their own company's visitors)
router.post('/requests/:id/reject', vmsAuth, vmsRequireRole(['VMS_ADMIN', 'COMPANY_USER', 'company_user']), checkinController.rejectRequest);

// Mark visitor as checked in (Reception, Guard, Admin)
router.post('/requests/:id/checkin', vmsAuth, vmsRequireRole(['VMS_ADMIN', 'SECURITY_GUARD', 'SECURITY_SUPERVISOR', 'RECEPTIONIST', 'RECEPTION', 'reception']), checkinController.markCheckedIn);

// Mark visitor as checked out (Reception, Guard, Admin)
router.post('/requests/:id/checkout', vmsAuth, vmsRequireRole(['VMS_ADMIN', 'SECURITY_GUARD', 'SECURITY_SUPERVISOR', 'RECEPTIONIST', 'RECEPTION', 'reception']), checkinController.markCheckedOut);

// Get check-in statistics
router.get('/stats', vmsAuth, checkinController.getCheckInStats);

// Search by phone/name (to check if visitor exists)
router.get('/search', vmsAuth, checkinController.searchVisitor);

// Debug endpoint - check user and company setup
router.get('/debug', vmsAuth, checkinController.debugUserCompany);

module.exports = router;
