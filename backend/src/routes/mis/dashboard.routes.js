// MIS Dashboard Routes
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/mis/dashboard.controller');
const { misAuthMiddleware, misPermissionMiddleware } = require('../../middleware/mis-auth');

// All dashboard routes require authentication
router.use(misAuthMiddleware);

// Dashboard stats
router.get('/stats', misPermissionMiddleware('mis.dashboard.view'), dashboardController.getStats);

// Analytics
router.get('/analytics', misPermissionMiddleware('mis.analytics.view'), dashboardController.getAnalytics);

module.exports = router;
