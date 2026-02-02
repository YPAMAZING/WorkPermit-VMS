// VMS Authentication Routes
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/vms/auth.controller');
const { vmsAuthMiddleware } = require('../../middleware/vms-auth');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.get('/me', vmsAuthMiddleware, authController.me);
router.put('/profile', vmsAuthMiddleware, authController.updateProfile);
router.put('/password', vmsAuthMiddleware, authController.changePassword);

module.exports = router;
