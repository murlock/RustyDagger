/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // The small CGI-equivalent server in `server/` runs standalone (see its
  // own README) - proxied here so client fetch('/api/...') calls don't need
  // CORS handling or a hardcoded port during `npm run dev`.
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    environment: 'jsdom',
  },
})
