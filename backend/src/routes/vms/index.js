// VMS Routes Index
// Multi-tenant Visitor Management System with QR Self Check-in
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const companyRoutes = require('./company.routes');
const companySettingsRoutes = require('./company-settings.routes');
const checkinRoutes = require('./checkin.routes');
const visitorRoutes = require('./visitor.routes');
const gatepassRoutes = require('./gatepass.routes');
const blacklistRoutes = require('./blacklist.routes');
const preapprovedRoutes = require('./preapproved.routes');
const dashboardRoutes = require('./dashboard.routes');
const openRoutes = require('./open.routes');

// ================================
// PUBLIC ROUTES (No Auth Required)
// ================================

// Open access routes (no auth - public dashboard, pass verification, company portals)
router.use('/', openRoutes);

// Self check-in routes (QR code flow)
router.use('/checkin', checkinRoutes);

// ================================
// PROTECTED ROUTES
// ================================

// Authentication
router.use('/auth', authRoutes);

// Company management (multi-tenant)
router.use('/companies', companyRoutes);

// Company settings (approval settings, etc.)
router.use('/company-settings', companySettingsRoutes);

// Visitor management
router.use('/visitors', visitorRoutes);

// Gatepass management
router.use('/gatepasses', gatepassRoutes);

// Blacklist management
router.use('/blacklist', blacklistRoutes);

// Pre-approved visitors
router.use('/preapproved', preapprovedRoutes);

// Dashboard & analytics
router.use('/dashboard', dashboardRoutes);

// ================================
// HEALTH CHECK
// ================================
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    system: 'VMS', 
    version: '2.0.0',
    features: ['multi-tenant', 'qr-checkin', 'live-feed'],
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;
