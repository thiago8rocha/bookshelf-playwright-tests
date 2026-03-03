import { test, expect } from '../../fixtures'
import { DashboardPage, BookModal } from '../../helpers/pages'
import { createBook, createBooks, createUser, updateBookStatus, generateBook } from '../../helpers/api'

test.describe('Dashboard', () => {
  let dashboard: DashboardPage

  test.beforeEach(async ({ authenticatedPage: page }) => {
    dashboard = new DashboardPage(page)
  })

  // ─── Stats — initial state ────────────────────────────────────────────────

  test('new user sees all stats at zero @smoke', async ({ authenticatedPage: page }) => {
    await expect(dashboard.statsTotal).toContainText('0')
    await expect(dashboard.statsReading).toContainText('0')
    await expect(dashboard.statsRead).toContainText('0')
    await expect(dashboard.statsToRead).toContainText('0')
  })

  test('shows username in header', async ({ authenticatedPage: page, userCredentials }) => {
    await expect(page.locator('header')).toContainText(userCredentials.name)
  })

  // ─── Stats reflect real data ──────────────────────────────────────────────

  test('stats total reflects number of books', async ({ authenticatedPage: page, request, userToken }) => {
    await createBooks(request, userToken, 3)
    await page.reload()

    expect(await dashboard.getTotalBooks()).toBe(3)
  })

  test('stats by-status reflect book statuses', async ({ authenticatedPage: page, request, userToken }) => {
    const [b1, b2, b3] = await createBooks(request, userToken, 3)
    await updateBookStatus(request, userToken, b1.id, 'reading')
    await updateBookStatus(request, userToken, b2.id, 'read')
    // b3 stays to_read

    await page.reload()

    const toReadText = await dashboard.statsToRead.textContent()
    const readingText = await dashboard.statsReading.textContent()
    const readText = await dashboard.statsRead.textContent()

    expect(toReadText).toContain('1')
    expect(readingText).toContain('1')
    expect(readText).toContain('1')
  })

  test('stats are user-specific', async ({ authenticatedPage: page, request }) => {
    // Another user creates books — should not affect current user's stats
    const otherUser = await createUser(request)
    await createBooks(request, otherUser.token!, 5)

    // Current user has 0 books
    await page.reload()
    expect(await dashboard.getTotalBooks()).toBe(0)
  })

  // ─── Empty state ──────────────────────────────────────────────────────────

  test('shows empty state message when no books', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toContainText(/Nenhum livro ainda/i)
  })

  // ─── Stats update in real time ────────────────────────────────────────────

  test('stats update immediately after creating a book — no reload needed', async ({ authenticatedPage: page, cleanupBooks }) => {
    const before = await dashboard.getTotalBooks()

    const book = generateBook()
    await dashboard.addBookButton.click()
    const modal = new BookModal(page)
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()
    await modal.waitForClose()

    expect(await dashboard.getTotalBooks()).toBe(before + 1)
  })

  test('stats update immediately after deleting a book — no reload needed', async ({ authenticatedPage: page, request, userToken }) => {
    const book = await createBook(request, userToken)
    await page.reload()

    const before = await dashboard.getTotalBooks()

    await dashboard.deleteButton(book.id).click()
    const { DeleteModal } = await import('../../helpers/pages')
    const deleteModal = new DeleteModal(page)
    await deleteModal.confirm()

    expect(await dashboard.getTotalBooks()).toBe(before - 1)
  })

  // ─── Network interception (Playwright-only) ───────────────────────────────

  test('shows loading state while fetching books', async ({ page, userCredentials }) => {
    let resolveBooks!: () => void

    await page.route('**/api/books', async (route) => {
      await new Promise<void>((resolve) => { resolveBooks = resolve })
      await route.continue()
    })

    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.goto('/dashboard')

    // Loading text visible while request is pending
    await expect(page.locator('text=Carregando')).toBeVisible()

    resolveBooks()
    await expect(page.locator('text=Carregando')).not.toBeVisible({ timeout: 5_000 })
  })

  test('handles books API error gracefully', async ({ page, userCredentials }) => {
    await page.route('**/api/books', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) })
    )

    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.goto('/dashboard')

    // Page renders without crashing
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10_000 })
  })
})
