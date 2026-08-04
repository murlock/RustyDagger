import { defineConfig, devices } from '@playwright/test'

// Real-browser regression tests, distinct from Vitest's jsdom component
// tests (`src/**/*.test.ts`) - for bugs like the status-bar-after-Play-Again
// one these exist for, that only show up in App.vue's real routing/mount
// lifecycle, not a component mounted in isolation (see CONVERSION_PLAN.md's
// Phase 4 notes for the class of bug this catches).
//
// Run with `npm run test:e2e` (headless) or `npm run test:e2e -- --headed`
// / `--ui` to watch it drive a real browser. `webServer` below starts Vite
// for you - no need to have `npm run dev` already running. These specs
// don't touch arPeer/arPackage/arPostal/arClanHall, so the `server/` CGI
// backend isn't needed here; a future e2e test that does would need it
// started separately (or added as a second `webServer` entry).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5183',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 5183',
    url: 'http://localhost:5183',
    reuseExistingServer: !process.env.CI,
  },
})
