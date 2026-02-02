// VMS Routes Index
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const visitorRoutes = require('./visitor.routes');
const gatepassRoutes = require('./gatepass.routes');
const blacklistRoutes = require('./blacklist.routes');
const preapprovedRoutes = require('./preapproved.routes');
const dashboardRoutes = require('./dashboard.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/visitors', visitorRoutes);
router.use('/gatepasses', gatepassRoutes);
router.use('/blacklist', blacklistRoutes);
router.use('/preapproved', preapprovedRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', system: 'VMS', timestamp: new Date().toISOString() });
});

module.exports = router;
