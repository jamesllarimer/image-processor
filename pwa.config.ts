
import type { VitePWAOptions } from 'vite-plugin-pwa'

export const pwaConfig: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  manifest: {
    name: 'Image Renaming Tool',
    short_name: 'Image Rename',
    description: 'A tool for batch renaming images using CSV data',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    "icons": [
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/pwa-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
    display: 'standalone',
    start_url: '/'
  },
  workbox: {
    navigateFallback: '/',
    globPatterns: ['**/*.{js,css,html,png,svg,ico}']
  },
  includeAssets: [
    'ImageResizeLogo-192.png',
    'ImageResizeLogo-512.png',
    'favicon.ico'
  ],
  devOptions: {
    enabled: true,
    type: 'module'
  }
}