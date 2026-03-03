import { test, expect } from '../../fixtures'
import { DashboardPage, DeleteModal } from '../../helpers/pages'
import { createBook, createBooks } from '../../helpers/api'

test.describe('Books — Delete', () => {
  let dashboard: DashboardPage
  let deleteModal: DeleteModal

  test.beforeEach(async ({ authenticatedPage: page }) => {
    dashboard = new DashboardPage(page)
    deleteModal = new DeleteModal(page)
  })

  // ─── Positive ────────────────────────────────────────────────────────────

  test('deletes a book and removes it from list', async ({ authenticatedPage: page, request, userToken }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.deleteButton(book.id).click()
    await deleteModal.waitForOpen()
    await deleteModal.confirm()

    await expect(page.getByTestId(`book-item-${book.id}`)).not.toBeVisible()
    await expect(page.locator('body')).not.toContainText(book.title)
  })

  test('stats counter decrements after deleting a book', async ({ authenticatedPage: page, request, userToken }) => {
    const book = await createBook(request, userToken)
    await page.reload()

    const before = await dashboard.getTotalBooks()

    await dashboard.deleteButton(book.id).click()
    await deleteModal.waitForOpen()
    await deleteModal.confirm()

    await expect(page.getByTestId(`book-item-${book.id}`)).not.toBeVisible()
    expect(await dashboard.getTotalBooks()).toBe(before - 1)
  })

  test('shows empty state after deleting all books', async ({ authenticatedPage: page, request, userToken }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.deleteButton(book.id).click()
    await deleteModal.waitForOpen()
    await deleteModal.confirm()

    await expect(page.locator('body')).toContainText(/Nenhum livro ainda/i)
    expect(await dashboard.getTotalBooks()).toBe(0)
  })

  // ─── Negative ────────────────────────────────────────────────────────────

  test('cancel deletion keeps the book in list', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.deleteButton(book.id).click()
    await deleteModal.waitForOpen()
    await deleteModal.cancel()

    await expect(page.getByTestId(`book-item-${book.id}`)).toBeVisible()
    await expect(page.locator('body')).toContainText(book.title)
  })

  test('confirmation modal shows book title', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await dashboard.deleteButton(book.id).click()
    await deleteModal.waitForOpen()

    await expect(deleteModal.modal).toContainText(book.title)
    await expect(deleteModal.modal).toContainText('Tem certeza')

    await deleteModal.cancel()
  })

  // ─── Network interception (Playwright-only) ───────────────────────────────

  test('shows loading state on confirm button while deleting', async ({ authenticatedPage: page, request, userToken }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await page.route(`**/api/books/${book.id}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await new Promise((r) => setTimeout(r, 600))
        await route.continue()
      } else {
        await route.continue()
      }
    })

    await dashboard.deleteButton(book.id).click()
    await deleteModal.waitForOpen()
    await deleteModal.confirmButton.click()

    await expect(deleteModal.confirmButton).toBeDisabled()
    await expect(deleteModal.confirmButton).toContainText(/Excluindo/i)
  })

  test('handles delete API failure gracefully', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await page.route(`**/api/books/${book.id}`, (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Delete failed' }) })
      } else {
        route.continue()
      }
    })

    await dashboard.deleteButton(book.id).click()
    await deleteModal.waitForOpen()
    await deleteModal.confirmButton.click()

    // Book should still be in the list — delete failed
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toContainText(book.title)
  })
})
