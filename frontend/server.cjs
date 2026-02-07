const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:5000';

// API proxy - must be before static files
// In http-proxy-middleware v3.x, we need to use pathFilter for more control
app.use(createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  pathFilter: '/api',
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log(`[Proxy] ${req.method} ${req.originalUrl} -> ${API_URL}${req.originalUrl}`);
    },
    error: (err, req, res) => {
      console.error('[Proxy Error]', err.message);
    }
  }
}));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - serve index.html for all routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying /api to ${API_URL}`);
});
