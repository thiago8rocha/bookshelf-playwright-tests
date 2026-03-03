import { test, expect } from '../../fixtures'
import { DashboardPage, BookModal } from '../../helpers/pages'
import { generateBook } from '../../helpers/api'

test.describe('Books — Create', () => {
  let dashboard: DashboardPage
  let modal: BookModal

  test.beforeEach(async ({ authenticatedPage: page }) => {
    dashboard = new DashboardPage(page)
    modal = new BookModal(page)
  })

  // ─── Positive ────────────────────────────────────────────────────────────

  test('creates a book with required fields @smoke', async ({ authenticatedPage: page, cleanupBooks }) => {
    const book = generateBook()
    const before = await dashboard.getTotalBooks()

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()
    await modal.waitForClose()

    await expect(page.locator('body')).toContainText(book.title)
    expect(await dashboard.getTotalBooks()).toBe(before + 1)
  })

  test('creates a book with all fields', async ({ authenticatedPage: page, cleanupBooks }) => {
    const book = generateBook()

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    // Fill optional text fields (not ISBN — backend has strict validation)
    await page.getByLabel('Editora').fill('Test Publisher')
    await page.getByLabel('Idioma').fill('Português')
    await page.getByLabel('Descrição').fill('A test description for this book')
    await modal.submit()
    await modal.waitForClose()

    await expect(page.locator('body')).toContainText(book.title)
  })

  test('stats counter increments after creating a book', async ({ authenticatedPage: page, cleanupBooks }) => {
    const before = await dashboard.getTotalBooks()

    const book = generateBook()
    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()
    await modal.waitForClose()

    expect(await dashboard.getTotalBooks()).toBe(before + 1)
  })

  test('can create multiple books sequentially', async ({ authenticatedPage: page, cleanupBooks }) => {
    const books = [generateBook(), generateBook(), generateBook()]

    for (const book of books) {
      await dashboard.addBookButton.click()
      await modal.waitForOpen()
      await modal.fillRequired(book.title, book.author)
      await modal.submit()
      await modal.waitForClose()
    }

    for (const book of books) {
      await expect(page.locator('body')).toContainText(book.title)
    }
  })

  // ─── Negative ────────────────────────────────────────────────────────────

  test('cannot save without title — modal stays open', async ({ authenticatedPage: page }) => {
    const before = await dashboard.getTotalBooks()

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.authorInput.fill('Some Author')
    await modal.submit()

    await expect(modal.modal).toBeVisible()
    await modal.cancel()

    expect(await dashboard.getTotalBooks()).toBe(before)
  })

  test('cannot save without author — modal stays open', async ({ authenticatedPage: page }) => {
    const before = await dashboard.getTotalBooks()

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.titleInput.fill('Some Title')
    await modal.submit()

    await expect(modal.modal).toBeVisible()
    await modal.cancel()

    expect(await dashboard.getTotalBooks()).toBe(before)
  })

  test('cancel discards the filled form', async ({ authenticatedPage: page }) => {
    const title = `Discarded Book ${Date.now()}`

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.titleInput.fill(title)
    await modal.cancel()
    await modal.waitForClose()

    await expect(page.locator('body')).not.toContainText(title)
  })

  test('close button (X) discards the form', async ({ authenticatedPage: page }) => {
    const title = `Closed Book ${Date.now()}`

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.titleInput.fill(title)
    await modal.closeButton.click()
    await modal.waitForClose()

    await expect(page.locator('body')).not.toContainText(title)
  })

  // ─── Network interception (Playwright-only) ───────────────────────────────

  test('shows error when API fails on save', async ({ authenticatedPage: page }) => {
    await page.route('**/api/books', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal server error' }) })
      } else {
        route.continue()
      }
    })

    const book = generateBook()
    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()

    await expect(modal.modal).toBeVisible()
    await expect(modal.errorMessage).toBeVisible()
  })

  test('disables save button while request is in flight', async ({ authenticatedPage: page, cleanupBooks }) => {
    await page.route('**/api/books', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 600))
        await route.continue()
      } else {
        await route.continue()
      }
    })

    const book = generateBook()
    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()

    await expect(modal.saveButton).toBeDisabled()
  })
})
