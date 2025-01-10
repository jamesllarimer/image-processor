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
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    display: 'standalone',
    start_url: '/',
    orientation: 'portrait'
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ],
    navigateFallback: null
  },
  devOptions: {
    enabled: true,
    type: 'module'
  }
}