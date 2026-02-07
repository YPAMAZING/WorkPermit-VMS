// ================================================================
// PM2 Ecosystem Configuration for WorkPermit-VMS
// Work Permit + VMS Systems
// ================================================================

module.exports = {
  apps: [
    // ================================
    // Backend API Server
    // ================================
    {
      name: 'workpermit-vms-api',
      cwd: './backend',
      script: 'src/index.js',
      instances: 1,              // Single instance for development
      exec_mode: 'fork',         // Fork mode for simplicity
      watch: false,
      max_memory_restart: '500M',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
    },

    // ================================
    // Frontend Server (Production)
    // ================================
    {
      name: 'workpermit-vms-frontend',
      cwd: './frontend',
      script: 'server.cjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        API_URL: 'http://localhost:5000'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        API_URL: 'http://localhost:5000'
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
    },
  ],

  // ================================
  // Deployment Configuration
  // ================================
  deploy: {
    production: {
      user: 'user',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'https://github.com/YPAMAZING/WorkPermit-VMS.git',
      path: '/home/user/WorkPermit-VMS',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && cd ../frontend && npm install && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
    },
  },
}
