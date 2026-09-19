import { test, expect } from '../../fixtures'
import { DashboardPage } from '../../helpers/pages'
import { createBook } from '../../helpers/api'

test.describe('Books — Reading status', () => {
  test('a new book starts as "to read"', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()

    await expect(page.getByTestId(`book-status-${book.id}`)).toHaveValue('to_read')
  })

  test('changing the status updates the select and the stats counters', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    const dashboard = new DashboardPage(page)
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    await expect(dashboard.statsToRead).toContainText('1')
    await expect(dashboard.statsReading).toContainText('0')

    await page.getByTestId(`book-status-${book.id}`).selectOption('reading')

    await expect(page.getByTestId(`book-status-${book.id}`)).toHaveValue('reading')
    await expect(dashboard.statsReading).toContainText('1')
    await expect(dashboard.statsToRead).toContainText('0')
  })

  test('the new status persists after reloading the page', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    await page.waitForSelector(`[data-testid="book-item-${book.id}"]`)

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes(`/books/${book.id}/status`) && response.ok(),
    )
    await page.getByTestId(`book-status-${book.id}`).selectOption('read')
    await responsePromise

    await page.reload()
    await expect(page.getByTestId(`book-status-${book.id}`)).toHaveValue('read')
    await expect(new DashboardPage(page).statsRead).toContainText('1')
  })

  test('a book can move back to "to read"', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const book = await createBook(request, userToken)
    await page.reload()
    const select = page.getByTestId(`book-status-${book.id}`)

    await select.selectOption('reading')
    await expect(select).toHaveValue('reading')
    await select.selectOption('to_read')
    await expect(select).toHaveValue('to_read')
  })
})
