import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from process.env, .env, and .env.local
  const env = loadEnv(mode, process.cwd(), '');

  // Backend target for API proxy in development (defaults to local backend on port 5000)
  const backendTarget = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://localhost:5000';
  const port = parseInt(env.VITE_PORT || env.PORT || '5173', 10);
  const host = env.VITE_HOST || '0.0.0.0'; // Default 0.0.0.0 allows mobile phone testing on Wi-Fi

  return {
    plugins: [react()],
    server: {
      port,
      host,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('axios')) {
                return 'vendor-axios';
              }
            }
          }
        }
      }
    }
  };
});
