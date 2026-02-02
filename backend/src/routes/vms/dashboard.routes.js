// VMS Dashboard Routes
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/vms/dashboard.controller');
const { vmsAuthMiddleware, vmsPermissionMiddleware } = require('../../middleware/vms-auth');

// All routes require authentication
router.use(vmsAuthMiddleware);

// Get dashboard overview
router.get('/overview', vmsPermissionMiddleware('vms.dashboard.view'), dashboardController.getDashboardOverview);

// Get weekly statistics
router.get('/weekly-stats', vmsPermissionMiddleware('vms.dashboard.view'), dashboardController.getWeeklyStats);

// Get today's expected visitors
router.get('/today-expected', vmsPermissionMiddleware('vms.dashboard.view'), dashboardController.getTodayExpectedVisitors);

// Get alerts
router.get('/alerts', vmsPermissionMiddleware('vms.dashboard.view'), dashboardController.getAlerts);

module.exports = router;
