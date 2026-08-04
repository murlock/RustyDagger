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
    // e2e/ holds real-browser Playwright specs (`npm run test:e2e`), not
    // Vitest ones - both use a `*.spec.ts` name Vitest's default include
    // pattern would otherwise match. Vitest's own default `exclude` list is
    // repeated here since setting this option replaces it rather than
    // adding to it.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'e2e/**',
    ],
  },
})
