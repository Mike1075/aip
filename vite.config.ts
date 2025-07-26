import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    proxy: {
      '/api/n8n': {
        target: 'https://n8n.aifunbox.com',
        changeOrigin: true,
        rewrite: (path) => {
          console.log('代理重写:', path, '->', path.replace(/^\/api\/n8n/, ''))
          return path.replace(/^\/api\/n8n/, '')
        }
      }
    }
  },
}) 