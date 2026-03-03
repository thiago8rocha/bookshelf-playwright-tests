/**
 * Visual regression tests — Playwright exclusive.
 *
 * Uses toHaveScreenshot() to detect unintended UI changes.
 * Baselines are generated on first run and committed to the repo.
 *
 * Uses the `visualPage` fixture (fixed "Visual User") so the header
 * username is always identical across runs.
 *
 * After any UI change, regenerate baselines with:
 *   npm run snapshots:update
 */

import { test, expect } from '../../fixtures'
import { createBook, updateBookStatus } from '../../helpers/api'

test.use({ actionTimeout: 15_000 })

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  })
})

const SCREENSHOT_OPTS = {
  fullPage: true,
  animations: 'disabled' as const,
}

// For modals: screenshot only the modal element, not the full scrollable page.
// fullPage:true on mobile captures the entire scroll height including the dashboard
// behind the overlay, which shifts between screenshots causing instability.
const MODAL_SCREENSHOT_OPTS = {
  animations: 'disabled' as const,
}

test.describe('Visual Regression', () => {
  // ─── Auth pages — no shared state, safe to run in parallel ───────────────

  test('login page matches snapshot', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('[data-testid="login-page"]')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('login-page.png', SCREENSHOT_OPTS)
  })

  test('register page matches snapshot', async ({ page }) => {
    await page.goto('/register')
    await page.waitForSelector('[data-testid="register-page"]')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('register-page.png', SCREENSHOT_OPTS)
  })

  test('login page after failed attempt matches snapshot', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('[data-testid="login-page"]')
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Credenciais inválidas' }),
      })
    )
    await page.getByTestId('email-input').fill('wrong@test.com')
    await page.getByTestId('password-input').fill('wrongpass')
    await Promise.all([
      page.waitForResponse('**/api/auth/login'),
      page.getByTestId('login-button').click(),
    ])
    await expect(page).toHaveURL(/\/login/)
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('login-failed-attempt.png', SCREENSHOT_OPTS)
  })

  test('login page on mobile viewport matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.waitForSelector('[data-testid="login-page"]')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('login-mobile.png', SCREENSHOT_OPTS)
  })

  // ─── Dashboard & modal tests — SERIAL ────────────────────────────────────
  // All tests below share the same fixed "Visual User" account via visualPage.
  // They MUST run serially to avoid race conditions: deleteAllBooks() in one
  // test's fixture setup would otherwise wipe books created by a concurrent test.

  test.describe('dashboard and modal snapshots', () => {
    test.describe.configure({ mode: 'serial' })

    test('empty dashboard matches snapshot', async ({ visualPage: page }) => {
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot('dashboard-empty.png', SCREENSHOT_OPTS)
    })

    test('dashboard with books matches snapshot', async ({ visualPage: page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('token') ?? '')
      await createBook(request, token, { title: 'Livro Alpha', author: 'Autor Alpha' })
      await createBook(request, token, { title: 'Livro Beta', author: 'Autor Beta' })
      await createBook(request, token, { title: 'Livro Gamma', author: 'Autor Gamma' })
      await page.reload()
      await page.waitForSelector('[data-testid^="book-item-"]', { timeout: 30_000 })
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot('dashboard-with-books.png', SCREENSHOT_OPTS)
    })

    test('dashboard with mixed book statuses matches snapshot', async ({ visualPage: page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('token') ?? '')
      const b1 = await createBook(request, token, { title: 'Livro Para Ler', author: 'Autor Um' })
      const b2 = await createBook(request, token, { title: 'Livro Lendo', author: 'Autor Dois' })
      const b3 = await createBook(request, token, { title: 'Livro Lido', author: 'Autor Tres' })
      await updateBookStatus(request, token, b2.id, 'reading')
      await updateBookStatus(request, token, b3.id, 'read')
      await page.reload()
      await page.waitForSelector('[data-testid^="book-item-"]', { timeout: 30_000 })
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot('dashboard-mixed-status.png', SCREENSHOT_OPTS)
    })

    test('add book modal matches snapshot', async ({ visualPage: page }) => {
      await page.getByTestId('add-book-button').click()
      await page.getByTestId('book-modal').waitFor({ state: 'visible' })
      await page.waitForTimeout(300)
      await expect(page.getByTestId('book-modal')).toHaveScreenshot('modal-add-book.png', MODAL_SCREENSHOT_OPTS)
      await page.getByTestId('cancel-button').click()
    })

    test('edit book modal matches snapshot', async ({ visualPage: page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('token') ?? '')
      const book = await createBook(request, token, { title: 'Visual Test Book', author: 'Visual Author' })
      await page.reload()
      // Wait for any book to appear (list loaded), then confirm our specific book is there
      await page.waitForSelector('[data-testid^="book-item-"]', { timeout: 30_000 })
      await page.waitForLoadState('networkidle')
      await page.waitForSelector(`[data-testid="book-item-${book.id}"]`, { timeout: 10_000 })
      await page.getByTestId(`edit-book-${book.id}`).click()
      await page.getByTestId('book-modal').waitFor({ state: 'visible' })
      await page.waitForTimeout(300)
      await expect(page.getByTestId('book-modal')).toHaveScreenshot('modal-edit-book.png', MODAL_SCREENSHOT_OPTS)
      await page.getByTestId('cancel-button').click()
    })

    test('delete confirmation modal matches snapshot', async ({ visualPage: page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('token') ?? '')
      const book = await createBook(request, token, { title: 'Book To Delete', author: 'Delete Author' })
      await page.reload()
      // Wait for any book to appear (list loaded), then confirm our specific book is there
      await page.waitForSelector('[data-testid^="book-item-"]', { timeout: 30_000 })
      await page.waitForLoadState('networkidle')
      await page.waitForSelector(`[data-testid="book-item-${book.id}"]`, { timeout: 10_000 })
      await page.getByTestId(`delete-book-${book.id}`).click()
      await page.getByTestId('delete-confirm-modal').waitFor({ state: 'visible' })
      await page.waitForTimeout(200)
      await expect(page.getByTestId('delete-confirm-modal')).toHaveScreenshot('modal-delete-confirm.png', MODAL_SCREENSHOT_OPTS)
      // cleanup
      await page.getByTestId('cancel-delete-button').click()
      await page.getByTestId(`delete-book-${book.id}`).click()
      await page.getByTestId('delete-confirm-modal').waitFor({ state: 'visible' })
      await page.getByTestId('confirm-delete-button').click()
    })

    test('dashboard on mobile viewport matches snapshot', async ({ visualPage: page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot('dashboard-mobile.png', SCREENSHOT_OPTS)
    })

    test('dashboard on tablet viewport matches snapshot', async ({ visualPage: page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot('dashboard-tablet.png', SCREENSHOT_OPTS)
    })
  })
})