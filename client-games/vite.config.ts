import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'
import devPorts from '@repo/config/dev-ports.json' with { type: 'json' }

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
        name: 'Games',
        short_name: 'Games',
        description: 'Casual games',
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
    rollupOptions: {
      external: ['phaser'],
    },
  },
  server: {
    // Both overridable so a second, throwaway instance can run beside the one
    // the developer keeps open — see docs/dev-second-instance.md. Defaults are
    // the normal dev setup, so nothing changes unless the vars are set.
    port: Number(process.env.VITE_DEV_PORT ?? devPorts.games),
    allowedHosts: true,
    proxy: {
      '/api': process.env.VITE_API_TARGET ?? 'http://localhost:3000',
    },
  },
})
