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
const pushRoutes = require('./routes/push.routes');
const vmsRoutes = require('./routes/vms');
const { errorHandler } = require('./middleware/error.middleware');
const { initializeRolesAndPermissions } = require('./controllers/role.controller');
const { checkPermitStatuses } = require('./controllers/approval.controller');
const { runAutoDelete, getAutoDeleteStats, RETENTION_DAYS } = require('./services/autoDelete.service');

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

// ================================
// WORK PERMIT SYSTEM ROUTES
// ================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/push', pushRoutes);

// ================================
// VMS (Visitor Management System) ROUTES
// Separate database for VMS
// ================================
app.use('/api/vms', vmsRoutes);

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
  console.log(`📦 Systems: Work Permit + VMS`);
  
  // Initialize roles and permissions
  await initializeRolesAndPermissions();
  
  // Run initial permit status check
  await checkPermitStatuses();
  
  // Set up periodic permit status check (every 5 minutes)
  setInterval(async () => {
    await checkPermitStatuses();
  }, 5 * 60 * 1000); // 5 minutes
  
  console.log('⏰ Auto-close scheduler started (checks every 5 minutes)');
  
  // ================================
  // AUTO-DELETE SCHEDULER (90 days)
  // Runs once daily at midnight
  // ================================
  const runDailyAutoDelete = async () => {
    try {
      // Get stats first
      const stats = await getAutoDeleteStats();
      if (stats.totalToDelete > 0) {
        console.log(`[AutoDelete] Found ${stats.totalToDelete} records older than ${RETENTION_DAYS} days to delete`);
        await runAutoDelete();
      } else {
        console.log(`[AutoDelete] No records older than ${RETENTION_DAYS} days found`);
      }
    } catch (error) {
      console.error('[AutoDelete] Scheduled cleanup failed:', error);
    }
  };
  
  // Run auto-delete check on startup
  console.log(`🗑️ Auto-delete scheduler initialized (${RETENTION_DAYS}-day retention policy)`);
  await runDailyAutoDelete();
  
  // Set up daily auto-delete (every 24 hours)
  setInterval(async () => {
    await runDailyAutoDelete();
  }, 24 * 60 * 60 * 1000); // 24 hours
  
  console.log('🗑️ Auto-delete scheduler started (checks daily, deletes data older than 90 days)');
});

module.exports = app;
