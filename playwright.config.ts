import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import { defineBddConfig } from 'playwright-bdd'
dotenv.config()

const bddDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['steps/**/*.ts', 'fixtures/index.ts'],
  outputDir: 'tests/_bdd',
})

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    // The suites assert pt-BR copy; the app follows the browser language.
    locale: 'pt-BR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: '**/_bdd/**' },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: '**/_bdd/**' },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/auth/**', '**/dashboard/**', '**/visual/**'],
      testIgnore: '**/_bdd/**',
    },
    { name: 'chromium-bdd', testDir: bddDir, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-bdd', testDir: bddDir, use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome-bdd', testDir: bddDir, use: { ...devices['Pixel 5'] } },
  ],
  expect: {
    // Visual regression threshold — 0.2% pixel difference allowed
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
})