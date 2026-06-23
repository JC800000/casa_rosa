import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['@apollo/client', '@apollo/client/react'],
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/graphql': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        xfwd: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        xfwd: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        xfwd: true,
      },
      '/accounts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        xfwd: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
})
