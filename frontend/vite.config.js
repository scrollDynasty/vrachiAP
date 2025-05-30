import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Removing additionalData to avoid namespace conflicts
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    allowedHosts: ['a1e3-84-54-122-64.ngrok-free.app']
  }
})
