const express = require('express');
const { getDashboardStats, getActivityFeed } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get activity feed
router.get('/activity', getActivityFeed);

module.exports = router;
