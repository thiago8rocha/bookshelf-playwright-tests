import { test, expect } from '../../fixtures'
import { createBooks } from '../../helpers/api'
import type { Page } from '@playwright/test'

const PAGE_SIZE = 9
const cards = (page: Page) => page.locator('[data-testid^="book-item-"]')

test.describe('Books — Pagination', () => {
  test('does not render pagination when everything fits in one page', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    await createBooks(request, userToken, 3)
    await page.reload()

    await expect(cards(page)).toHaveCount(3)
    await expect(page.getByTestId('pagination')).toHaveCount(0)
  })

  test('splits the list into pages and navigates between them', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    await createBooks(request, userToken, PAGE_SIZE + 2)
    await page.reload()

    await expect(cards(page)).toHaveCount(PAGE_SIZE)
    await expect(page.getByTestId('pagination-info')).toContainText('Página 1 de 2')
    await expect(page.getByTestId('pagination-prev')).toBeDisabled()
    await expect(page.getByTestId('book-results-count')).toContainText(`${PAGE_SIZE + 2} livros encontrados`)

    await page.getByTestId('pagination-next').click()
    await expect(cards(page)).toHaveCount(2)
    await expect(page.getByTestId('pagination-info')).toContainText('Página 2 de 2')
    await expect(page.getByTestId('pagination-next')).toBeDisabled()

    await page.getByTestId('pagination-prev').click()
    await expect(cards(page)).toHaveCount(PAGE_SIZE)
    await expect(page.getByTestId('pagination-info')).toContainText('Página 1 de 2')
  })

  test('steps back a page when the last book of the last page is deleted', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    await createBooks(request, userToken, PAGE_SIZE + 1)
    await page.reload()

    await page.getByTestId('pagination-next').click()
    await expect(cards(page)).toHaveCount(1)

    await page.locator('[data-testid^="delete-book-"]').click()
    await page.getByTestId('confirm-delete-button').click()

    await expect(cards(page)).toHaveCount(PAGE_SIZE)
    await expect(page.getByTestId('pagination')).toHaveCount(0)
  })
})
