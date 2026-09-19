import { test, expect } from '../../fixtures'
import { DashboardPage, BookModal } from '../../helpers/pages'
import { createBook } from '../../helpers/api'
import type { Page } from '@playwright/test'

// 1x1 transparent PNG, served for every fake cover URL.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

// The real service answers cross-origin requests with CORS headers; the mock must too,
// otherwise the browser discards the response.
const CORS = { 'access-control-allow-origin': '*' }

async function mockCovers(page: Page) {
  await page.route('https://covers.test/**', (route) =>
    route.fulfill({ body: PIXEL, contentType: 'image/png', headers: CORS }),
  )
}

test.describe('Books — Google Books import and covers', () => {
  test('imports a book from Google Books and saves it with its cover', async ({
    authenticatedPage: page,
    cleanupBooks,
  }) => {
    const tag = Date.now()
    const title = `Imported ${tag}`
    await mockCovers(page)
    // Mocked so the suite never depends on the real Google Books service.
    await page.route('**/googleapis.com/books/v1/volumes**', (route) =>
      route.fulfill({
        headers: CORS,
        json: {
          items: [
            {
              id: `vol-${tag}`,
              volumeInfo: {
                title,
                authors: ['Autora de Teste'],
                publisher: 'Editora Teste',
                publishedDate: '2020-05-01',
                pageCount: 321,
                language: 'pt',
                industryIdentifiers: [{ type: 'ISBN_13', identifier: `978${tag}`.slice(0, 13) }],
                imageLinks: { thumbnail: 'http://covers.test/cover.png' },
              },
            },
          ],
        },
      }),
    )

    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)
    await dashboard.addBookButton.click()
    await modal.waitForOpen()

    await page.getByTestId('google-books-query').fill('imported')
    await page.getByTestId('google-books-search-button').click()
    await page.getByTestId('google-books-result-0').click()

    await expect(modal.titleInput).toHaveValue(title)
    await expect(modal.authorInput).toHaveValue('Autora de Teste')
    await expect(page.locator('#pages')).toHaveValue('321')
    await expect(page.getByTestId('book-cover-input')).toHaveValue('https://covers.test/cover.png')

    await modal.submit()
    await modal.waitForClose()

    const card = page.locator('[data-testid^="book-item-"]', { hasText: title })
    await expect(card).toBeVisible()
    await expect(card.locator('[data-testid^="book-cover-"]')).toBeVisible()
  })

  test('shows a message when Google Books finds nothing', async ({ authenticatedPage: page }) => {
    await page.route('**/googleapis.com/books/v1/volumes**', (route) =>
      route.fulfill({ headers: CORS, json: { totalItems: 0 } }),
    )

    await new DashboardPage(page).addBookButton.click()
    await new BookModal(page).waitForOpen()
    await page.getByTestId('google-books-query').fill('zzz')
    await page.getByTestId('google-books-search-button').click()

    await expect(page.getByTestId('google-books-empty')).toBeVisible()
  })

  test('shows the cover of a book saved with a cover URL', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    await mockCovers(page)
    const book = await createBook(request, userToken, { coverUrl: 'https://covers.test/mine.png' })
    await page.reload()

    await expect(page.getByTestId(`book-cover-${book.id}`)).toBeVisible()
  })

  test('falls back to a placeholder when the cover cannot be loaded', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    await page.route('https://covers.test/**', (route) => route.abort())
    const book = await createBook(request, userToken, { coverUrl: 'https://covers.test/broken.png' })
    await page.reload()

    await expect(page.getByTestId(`book-item-${book.id}`)).toBeVisible()
    await expect(page.getByTestId(`book-cover-${book.id}`)).toHaveCount(0)
  })

  test('the book form can be filled manually with a cover URL and previews it', async ({
    authenticatedPage: page,
    cleanupBooks,
  }) => {
    await mockCovers(page)
    const modal = new BookModal(page)
    await new DashboardPage(page).addBookButton.click()
    await modal.waitForOpen()

    await page.getByTestId('book-cover-input').fill('https://covers.test/manual.png')

    await expect(modal.modal.locator('img[alt="Pré-visualização da capa"]')).toBeVisible()
  })
})
