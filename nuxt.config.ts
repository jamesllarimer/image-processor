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
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true }
})