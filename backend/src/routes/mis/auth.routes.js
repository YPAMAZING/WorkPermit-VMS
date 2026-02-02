// MIS Auth Routes
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/mis/auth.controller');
const { misAuthMiddleware } = require('../../middleware/mis-auth');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/me', misAuthMiddleware, authController.me);
router.post('/change-password', misAuthMiddleware, authController.changePassword);
router.post('/logout', misAuthMiddleware, authController.logout);

module.exports = router;
