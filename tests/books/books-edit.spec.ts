import { test, expect } from '../../fixtures'
import { DashboardPage, BookModal } from '../../helpers/pages'
import { createBook, generateBook } from '../../helpers/api'

test.describe('Books — Edit', () => {
  let dashboard: DashboardPage
  let modal: BookModal

  test.beforeEach(async ({ authenticatedPage: page }) => {
    dashboard = new DashboardPage(page)
    modal = new BookModal(page)
  })

  // ─── Positive ────────────────────────────────────────────────────────────

  test('edits a book title', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    const newTitle = `Updated Title ${Date.now()}`
    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()
    await modal.titleInput.clear()
    await modal.titleInput.fill(newTitle)
    await modal.submit()
    await modal.waitForClose()

    await expect(page.locator('body')).toContainText(newTitle)
    await expect(page.locator('body')).not.toContainText(book.title)
  })

  test('edit modal opens pre-filled with existing data', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()

    await expect(modal.titleInput).toHaveValue(book.title)
    await expect(modal.authorInput).toHaveValue(book.author)

    // Modal title shows "Editar Livro"
    await expect(modal.modal).toContainText('Editar Livro')
    await expect(modal.modal).not.toContainText('Adicionar Livro')

    await modal.cancel()
  })

  test('cancelling edit does not change the book', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()
    await modal.titleInput.fill('Changed Title That Should Not Persist')
    await modal.cancel()
    await modal.waitForClose()

    await expect(page.locator('body')).toContainText(book.title)
    await expect(page.locator('body')).not.toContainText('Changed Title That Should Not Persist')
  })

  // ─── Negative ────────────────────────────────────────────────────────────

  test('cannot save edit with empty title — modal stays open', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()
    await modal.titleInput.clear()
    await modal.submit()

    await expect(modal.modal).toBeVisible()
    await modal.cancel()

    await expect(page.locator('body')).toContainText(book.title)
  })

  test('cannot save edit with empty author — modal stays open', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()
    await modal.authorInput.clear()
    await modal.submit()

    await expect(modal.modal).toBeVisible()
    await modal.cancel()
  })

  // ─── Network interception (Playwright-only) ───────────────────────────────

  test('shows error when update API fails', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await page.route(`**/api/books/${book.id}`, (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Update failed' }) })
      } else {
        route.continue()
      }
    })

    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()
    await modal.titleInput.fill('New Title')
    await modal.submit()

    await expect(modal.modal).toBeVisible()
    await expect(modal.errorMessage).toBeVisible()
  })
})
