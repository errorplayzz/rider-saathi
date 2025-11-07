import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    },
    // Proxy API requests to backend during development to avoid CORS and 404 from Vite
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // keep /api prefix so backend routes like /api/ai/gpt still match
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  define: {
    global: 'globalThis',
  },
})