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
          'mis-pages': [
            './src/pages/mis/MISDashboard.jsx',
            './src/pages/mis/MISAnalytics.jsx',
            './src/pages/mis/MISExport.jsx',
            './src/pages/mis/MISSettings.jsx',
          ],
          'workpermit-pages': [
            './src/pages/Permits.jsx',
            './src/pages/PermitDetail.jsx',
            './src/pages/CreatePermit.jsx',
            './src/pages/Approvals.jsx',
            './src/pages/ApprovalDetail.jsx',
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
