import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

function gitSha(): string {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim() } catch { return 'dev' }
}

export default defineConfig({
  define: {
    __COMMIT_SHA__: JSON.stringify(gitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Admin',
        short_name: 'Admin',
        description: 'Admin console',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 6040,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
