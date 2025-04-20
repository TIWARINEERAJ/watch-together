import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3003',
        ws: true,
        secure: false,
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      'process': 'process/browser',
      'stream': 'stream-browserify',
      'zlib': 'browserify-zlib',
      'util': 'util'
    }
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  }
})
