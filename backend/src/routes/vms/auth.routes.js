// VMS Authentication Routes
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/vms/auth.controller');
const { vmsAuthMiddleware } = require('../../middleware/vms-auth');

// ================================
// SSO ROUTES (Work Permit → VMS)
// ================================

// SSO Login from Work Permit (redirect with token)
router.get('/sso', authController.ssoLogin);

// ================================
// PUBLIC ROUTES
// ================================

// Regular VMS Login
router.post('/login', authController.login);

// Register new VMS user
router.post('/register', authController.register);

// ================================
// PROTECTED ROUTES
// ================================

// Get current user
router.get('/me', vmsAuthMiddleware, authController.me);

// Update profile
router.put('/profile', vmsAuthMiddleware, authController.updateProfile);

// Change password
router.put('/password', vmsAuthMiddleware, authController.changePassword);

module.exports = router;
