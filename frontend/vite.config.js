import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// See Vite configuration docs: https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    },
  // Proxy API requests to the backend during development to avoid CORS issues and 404s from Vite
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
  // preserve the /api prefix so backend routes (for example /api/ai/gpt) continue to match
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  define: {
    global: 'globalThis',
  },
})