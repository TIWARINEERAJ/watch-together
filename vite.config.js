import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174
  },
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'process': 'process/browser',
      'events': 'events/'
    }
  },
  define: {
    'process.env': {},
    'global': {}
  },
  optimizeDeps: {
    include: ['buffer', 'process', 'events']
  }
}) 