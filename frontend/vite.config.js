import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// ОПТИМИЗАЦИЯ: Конфигурация Vite с оптимизациями для production
export default defineConfig({
  plugins: [react()],
  
  // ОПТИМИЗАЦИЯ: Настройки сервера разработки
  server: {
    port: 3000,
    host: true,
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
    },
    // ОПТИМИЗАЦИЯ: Кеширование для разработки
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  
  // ОПТИМИЗАЦИЯ: Настройки сборки
  build: {
    // ОПТИМИЗАЦИЯ: Минификация и оптимизация
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Удаляем console.log в production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        toplevel: true
      }
    },
    
    // ОПТИМИЗАЦИЯ: Разделение бандла
    rollupOptions: {
      output: {
        // ОПТИМИЗАЦИЯ: Разделяем vendor и app код
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@nextui-org/react', 'framer-motion'],
          utils: ['axios', 'socket.io-client', 'zustand'],
          router: ['react-router-dom'],
          icons: ['@fortawesome/fontawesome-free']
        },
        
        // ОПТИМИЗАЦИЯ: Оптимизированные имена файлов
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // ОПТИМИЗАЦИЯ: Настройки для лучшей производительности
    target: 'es2015',
    sourcemap: false, // Отключаем source maps в production
    cssCodeSplit: true,
    reportCompressedSize: false, // Ускоряем сборку
    
    // ОПТИМИЗАЦИЯ: Размер чанков
    chunkSizeWarningLimit: 1000
  },
  
  // ОПТИМИЗАЦИЯ: Настройки сервера разработки
  server: {
    port: 3000,
    host: true,
    // ОПТИМИЗАЦИЯ: Кеширование для разработки
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  
  // ОПТИМИЗАЦИЯ: Предзагрузка модулей
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@nextui-org/react',
      'framer-motion',
      'axios',
      'socket.io-client',
      'zustand',
      '@fortawesome/fontawesome-free'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  
  // ОПТИМИЗАЦИЯ: Настройки CSS
  css: {
    preprocessorOptions: {
      scss: {
        // Removing additionalData to avoid namespace conflicts
      }
    }
  },
  
  // ОПТИМИЗАЦИЯ: Алиасы для быстрого импорта
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@services': resolve(__dirname, 'src/services'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@contexts': resolve(__dirname, 'src/contexts'),
      '@styles': resolve(__dirname, 'src/styles')
    }
  },
  
  // ОПТИМИЗАЦИЯ: Настройки для PWA
  define: {
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false
  },
  
  // ОПТИМИЗАЦИЯ: Настройки для изображений
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
  
  // ОПТИМИЗАЦИЯ: Настройки для worker'ов
  worker: {
    format: 'es'
  }
})
