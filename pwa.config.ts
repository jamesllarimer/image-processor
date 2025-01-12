import type { VitePWAOptions } from 'vite-plugin-pwa'

export const pwaConfig: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  includeManifestIcons: true,
  manifest: {
    id: '/',
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
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    cleanupOutdatedCaches: true
  },
  devOptions: {
    enabled: true,
    type: 'module'
  }
}