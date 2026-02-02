const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const permitRoutes = require('./routes/permit.routes');
const approvalRoutes = require('./routes/approval.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const workerRoutes = require('./routes/worker.routes');
const roleRoutes = require('./routes/role.routes');
const ssoRoutes = require('./routes/sso.routes');
const meterRoutes = require('./routes/meter.routes');
const vmsRoutes = require('./routes/vms');
const misRoutes = require('./routes/mis');
const { errorHandler } = require('./middleware/error.middleware');
const { initializeRolesAndPermissions } = require('./controllers/role.controller');
const { checkPermitStatuses } = require('./controllers/approval.controller');

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
// Increase body size limit to handle worker ID proof images (base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/meters', meterRoutes);

// VMS (Visitor Management System) Routes - Separate database
app.use('/api/vms', vmsRoutes);

// MIS (Meter Information System) Routes - Separate database (for Hostinger MIS-only deployment)
app.use('/api/mis', misRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(config.port, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  
  // Initialize roles and permissions
  await initializeRolesAndPermissions();
  
  // Run initial permit status check
  await checkPermitStatuses();
  
  // Set up periodic permit status check (every 5 minutes)
  setInterval(async () => {
    await checkPermitStatuses();
  }, 5 * 60 * 1000); // 5 minutes
  
  console.log('⏰ Auto-close scheduler started (checks every 5 minutes)');
});

module.exports = app;
