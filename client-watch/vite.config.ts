import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Watch',
        short_name: 'Watch',
        description: 'Watch party coordinator',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
      },
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
