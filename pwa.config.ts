// pwa.config.ts
import type { VitePWAOptions } from 'vite-plugin-pwa'

export const pwaConfig: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico'],
  manifest: {
    name: 'Image Renaming Tool',
    short_name: 'Image Rename',
    description: 'A tool for batch renaming images using CSV data',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  },
  workbox: {
    navigateFallback: '/',
    globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  },
  devOptions: {
    enabled: true,
    type: 'module'
  },
  strategies: 'generateSW'
}