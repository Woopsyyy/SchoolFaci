import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Bind 0.0.0.0, not 127.0.0.1: WSL2's localhost forwarding is unreliable, and
  // Windows browsers need the WSL IP (printed on startup) to reach the dev server.
  server: {
    host: true,
    strictPort: true,
  },
  preview: {
    host: true,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // recharts is the bulk of the bundle; splitting it keeps the entry chunk small
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router)/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-)/ },
          ],
        },
      },
    },
  },
})