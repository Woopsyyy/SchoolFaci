import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Bind on all interfaces so Windows can reach Vite through WSL2 port forwarding.
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: false,
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
