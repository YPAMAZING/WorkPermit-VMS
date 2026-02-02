// MIS Routes Index
const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const metersRoutes = require('./meters.routes');
const usersRoutes = require('./users.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/meters', metersRoutes);
router.use('/users', usersRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    system: 'MIS',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
