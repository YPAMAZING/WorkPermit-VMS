import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    // Improve build performance
    target: 'esnext',
    minify: 'esbuild',
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-axios': ['axios'],
          'vendor-icons': ['lucide-react'],
          // Feature chunks
          'workpermit-pages': [
            './src/pages/Permits.jsx',
            './src/pages/PermitDetail.jsx',
            './src/pages/CreatePermit.jsx',
            './src/pages/Approvals.jsx',
            './src/pages/ApprovalDetail.jsx',
          ],
          'vms-pages': [
            './src/pages/vms/VMSDashboard.jsx',
            './src/pages/vms/VMSVisitors.jsx',
            './src/pages/vms/VMSGatepasses.jsx',
            './src/pages/vms/VMSLogin.jsx',
            './src/pages/vms/PublicCheckIn.jsx',
            './src/pages/vms/CheckInConfirmation.jsx',
            './src/pages/vms/GuardDashboard.jsx',
          ],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'lucide-react'],
  },
})
