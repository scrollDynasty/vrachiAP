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
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://healzy.uz',
        changeOrigin: true,
        secure: true
      },
      '/ws': {
        target: 'wss://healzy.uz',
        changeOrigin: true,
        secure: true,
        ws: true
      }
    }
  }
})
