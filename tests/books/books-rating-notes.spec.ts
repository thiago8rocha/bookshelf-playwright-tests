import { test, expect } from '../../fixtures'
import { DashboardPage, BookModal } from '../../helpers/pages'
import { createBook, generateBook } from '../../helpers/api'

test.describe('Books — Rating and notes', () => {
  test('creates a book with a rating and personal notes', async ({
    authenticatedPage: page,
    cleanupBooks,
  }) => {
    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)
    const book = generateBook()

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.titleInput.fill(book.title)
    await modal.authorInput.fill(book.author)
    await page.getByTestId('book-rating-input').selectOption('4')
    await page.getByTestId('book-notes-input').fill('Vale a pena reler')
    await modal.submit()
    await modal.waitForClose()

    const card = page.locator('[data-testid^="book-item-"]', { hasText: book.title })
    await expect(card.locator('[data-testid^="book-rating-"]')).toHaveAttribute('data-rating', '4')
    await expect(card.locator('[data-testid^="book-notes-"]')).toContainText('Vale a pena reler')
  })

  test('the edit form is pre-filled with the rating and notes', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)
    const book = await createBook(request, userToken, { rating: 3, notes: 'Minha nota' })
    await page.reload()

    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()

    await expect(page.getByTestId('book-rating-input')).toHaveValue('3')
    await expect(page.getByTestId('book-notes-input')).toHaveValue('Minha nota')
  })

  test('clearing the rating and notes while editing removes them', async ({
    authenticatedPage: page,
    request,
    userToken,
    cleanupBooks,
  }) => {
    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)
    const book = await createBook(request, userToken, { rating: 5, notes: 'Para apagar' })
    await page.reload()
    await expect(page.getByTestId(`book-rating-${book.id}`)).toBeVisible()

    await dashboard.editButton(book.id).click()
    await modal.waitForOpen()
    await page.getByTestId('book-rating-input').selectOption('')
    await page.getByTestId('book-notes-input').fill('')
    await modal.submit()
    await modal.waitForClose()

    await expect(page.getByTestId(`book-rating-${book.id}`)).toHaveCount(0)
    await expect(page.getByTestId(`book-notes-${book.id}`)).toHaveCount(0)
  })
})
