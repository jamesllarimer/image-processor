// nuxt.config.ts
import { pwaConfig } from './pwa.config'

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  modules: [
    '@vite-pwa/nuxt'
  ],

  pwa: pwaConfig,
  ssr: false,

  app: {
    head: {
      title: 'Image Renaming Tool',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width,initial-scale=1' },
        { name: 'description', content: 'A tool for batch renaming images using CSV data' },
        { name: 'theme-color', content: '#ffffff' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Image Rename' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/pwa-192x192.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' }  
      ]
    },
    buildAssetsDir: '/_nuxt/'
  },

  nitro: {
    preset: 'static',
    output: {
      publicDir: 'dist'
    }
  },

  experimental: {
    payloadExtraction: false
  },

  generate: {
    fallback: 'index.html'
  }
})