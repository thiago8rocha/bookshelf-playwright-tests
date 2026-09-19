import { test, expect } from '../../fixtures'
import { createBook, updateBookStatus } from '../../helpers/api'
import type { Page } from '@playwright/test'

const cards = (page: Page) => page.locator('[data-testid^="book-item-"]')

test.describe('Books — Search, filters and sorting', () => {
  test('searching narrows the list by title or author', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    const tag = Date.now()
    await createBook(request, userToken, { title: `Dune ${tag}`, author: 'Frank Herbert' })
    await createBook(request, userToken, { title: `Emma ${tag}`, author: 'Jane Austen' })
    await page.reload()
    await expect(cards(page)).toHaveCount(2)

    await page.getByTestId('book-search-input').fill('herbert')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(`Dune ${tag}`)
    await expect(page.getByTestId('book-results-count')).toContainText('1 livro encontrado')
  })

  test('filters by reading status', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const reading = await createBook(request, userToken)
    await createBook(request, userToken)
    await updateBookStatus(request, userToken, reading.id, 'reading')
    await page.reload()
    await expect(cards(page)).toHaveCount(2)

    await page.getByTestId('book-filter-status').selectOption('reading')

    await expect(cards(page)).toHaveCount(1)
    await expect(page.getByTestId(`book-item-${reading.id}`)).toBeVisible()
  })

  test('filters by rating', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const rated = await createBook(request, userToken, { rating: 5 })
    await createBook(request, userToken, { rating: 2 })
    await page.reload()
    await expect(cards(page)).toHaveCount(2)

    await page.getByTestId('book-filter-rating').selectOption('5')

    await expect(cards(page)).toHaveCount(1)
    await expect(page.getByTestId(`book-item-${rated.id}`)).toBeVisible()
  })

  test('shows a no-results message and clearing the filters restores the list', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    await createBook(request, userToken)
    await page.reload()
    await expect(cards(page)).toHaveCount(1)

    await page.getByTestId('book-search-input').fill('zzz-no-such-book')
    await expect(page.getByTestId('book-no-results')).toBeVisible()
    await expect(cards(page)).toHaveCount(0)

    await page.getByTestId('book-filters-clear').click()
    await expect(page.getByTestId('book-no-results')).toHaveCount(0)
    await expect(cards(page)).toHaveCount(1)
    await expect(page.getByTestId('book-search-input')).toHaveValue('')
  })

  test('sorts by title', async ({ authenticatedPage: page, request, userToken, cleanupBooks }) => {
    const tag = Date.now()
    await createBook(request, userToken, { title: `B-book ${tag}` })
    await createBook(request, userToken, { title: `A-book ${tag}` })
    await createBook(request, userToken, { title: `C-book ${tag}` })
    await page.reload()
    await expect(cards(page)).toHaveCount(3)

    await page.getByTestId('book-sort').selectOption('title')

    await expect(cards(page).first()).toContainText(`A-book ${tag}`)
    await expect(cards(page).last()).toContainText(`C-book ${tag}`)
  })
})
