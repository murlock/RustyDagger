import { test, expect, type Page } from '@playwright/test'

// Regression coverage for: "after exiting the current hero, the status bar
// still shows the last hero back on the hero-selection (arEntry) screen."
// Root cause was arFinish.vue's playAgain() calling nav.goto(ArEntry) with
// no options - nav.goto()'s `showStatus` defaults to true, and
// heroStore.hero was never cleared, so StatusBar (gated on both
// nav.showStatusBar in App.vue and heroStore.hero internally) rendered the
// exited hero's stale data. Fixed by clearing heroStore.hero and passing
// `{ showStatus: false }`, matching App.vue's own initial arEntry mount.
//
// A jsdom/Vitest component test can't catch this class of bug - mounting
// ArFinish or ArEntry in isolation never exercises App.vue's real
// `<component :is="nav.currentComponent">` routing/unmount cycle. Hence a
// real-browser Playwright test instead (same reasoning as every
// headless-Chromium verification step noted throughout CONVERSION_PLAN.md).

const STATUS_BAR = '.status-bar'

async function createHero(page: Page, name: string) {
  await page.goto('/')
  await page.fill('#hero-name', name)
  await page.click('button:has-text("Enter")')

  // Spend all 20 build points on Money so the Create screen's Enter enables
  // (BUILD_POOL - each stat/money delta must reach exactly 0).
  const moneyPlus = page.locator('.create__row').last().locator('button:has-text("+")')
  for (let i = 0; i < 20; i++) await moneyPlus.click()
  await page.click('button:has-text("Enter")')
  await expect(page.getByText('Welcome to Salamander Township')).toBeVisible()
}

test('status bar is gone after Play Again, via Tavern > Sleep on Floor', async ({ page }) => {
  await createHero(page, 'E2eTavern')
  await expect(page.locator(STATUS_BAR)).toBeVisible()

  await test.step('Tavern > Sleep on Floor > Continue > Play Again', async () => {
    await page.click('text=Tavern')
    await page.click('button:has-text("Sleep on Floor")')
    await page.click('button:has-text("Continue")')
    await expect(page.getByText('Time to Finally Rest')).toBeVisible()
    await page.click('button:has-text("Play Again")')
  })

  await expect(page.locator('#hero-name')).toBeVisible()
  await expect(page.locator(STATUS_BAR)).toHaveCount(0)
})

test('status bar is gone after Play Again, via Leave Town > Exit Game (the reported repro)', async ({ page }) => {
  await createHero(page, 'E2eField')
  await expect(page.locator(STATUS_BAR)).toBeVisible()

  await test.step('Leave Town > Exit Game > Continue > Play Again', async () => {
    await page.click('text=Leave Town')
    await expect(page.getByText('The Fields near Salamander Township')).toBeVisible()
    await page.click('text=Exit Game')
    await page.click('button:has-text("Continue")')
    await expect(page.getByText('Time to Finally Rest')).toBeVisible()
    await page.click('button:has-text("Play Again")')
  })

  await expect(page.locator('#hero-name')).toBeVisible()
  await expect(page.locator(STATUS_BAR)).toHaveCount(0)
})
