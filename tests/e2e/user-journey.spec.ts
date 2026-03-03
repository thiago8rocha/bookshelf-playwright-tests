import { test, expect } from '../../fixtures'
import { LoginPage, RegisterPage, DashboardPage, BookModal, DeleteModal } from '../../helpers/pages'
import { generateCredentials, generateBook, createUser } from '../../helpers/api'

test.describe('E2E — User Journeys', () => {
  // ─── Full journey ─────────────────────────────────────────────────────────

  test('complete journey: register → create → edit → delete → logout @smoke', async ({ page, request }) => {
    // 1. Register
    const creds = generateCredentials()
    const register = new RegisterPage(page)
    await register.goto()
    await register.register(creds.name, creds.email, creds.password)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 })

    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)
    const deleteModal = new DeleteModal(page)

    // 2. Dashboard starts empty
    expect(await dashboard.getTotalBooks()).toBe(0)

    // 3. Create book
    const book = generateBook()
    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()
    await modal.waitForClose()
    await expect(page.locator('body')).toContainText(book.title)
    expect(await dashboard.getTotalBooks()).toBe(1)

    // 4. Edit book — get ID from DOM
    const bookItem = page.locator('[data-testid^="book-item-"]').first()
    const itemId = (await bookItem.getAttribute('data-testid'))!.replace('book-item-', '')
    const editBtn = dashboard.editButton(itemId)

    const newTitle = `Edited: ${book.title}`
    await editBtn.click()
    await modal.waitForOpen()
    await modal.titleInput.clear()
    await modal.titleInput.fill(newTitle)
    await modal.submit()
    await modal.waitForClose()
    await expect(page.locator('body')).toContainText(newTitle)

    // 5. Delete book
    const deleteBtn = dashboard.deleteButton(itemId)
    await deleteBtn.click()
    await deleteModal.waitForOpen()
    await deleteModal.confirm()
    await expect(page.locator('body')).toContainText(/Nenhum livro ainda/i)
    expect(await dashboard.getTotalBooks()).toBe(0)

    // 6. Logout
    await page.click('text=Sair')
    await expect(page).toHaveURL(/\/login/)
  })

  // ─── Data isolation ───────────────────────────────────────────────────────

  test('users have isolated data @smoke', async ({ page, request, browser }) => {
    // User A creates a book
    const userA = await createUser(request)
    const bookTitle = `UserA Book ${Date.now()}`

    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await pageA.goto('/')
    await pageA.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userA.token!, user: { name: userA.name, email: userA.email } }
    )
    await pageA.goto('/dashboard')

    const dashA = new DashboardPage(pageA)
    const modalA = new BookModal(pageA)
    await dashA.addBookButton.click()
    await modalA.waitForOpen()
    await modalA.fillRequired(bookTitle, 'Author A')
    await modalA.submit()
    await modalA.waitForClose()

    await ctxA.close()

    // User B registers and should NOT see User A's book
    const creds = generateCredentials()
    const register = new RegisterPage(page)
    await register.goto()
    await register.register(creds.name, creds.email, creds.password)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 })

    await expect(page.locator('body')).not.toContainText(bookTitle)
    expect(await new DashboardPage(page).getTotalBooks()).toBe(0)
  })

  // ─── Session persistence ──────────────────────────────────────────────────

  test('data persists across login sessions', async ({ page, request }) => {
    const user = await createUser(request)
    const login = new LoginPage(page)
    const bookTitle = `Persistent Book ${Date.now()}`

    // Session 1 — create book
    await login.goto()
    await login.login(user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 })

    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)
    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(bookTitle, 'Persistent Author')
    await modal.submit()
    await modal.waitForClose()

    // Logout
    await page.click('text=Sair')
    await expect(page).toHaveURL(/\/login/)

    // Session 2 — book should still be there
    await login.login(user.email, user.password)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 })
    await expect(page.locator('body')).toContainText(bookTitle)
    expect(await dashboard.getTotalBooks()).toBe(1)
  })
})
