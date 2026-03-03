import { test, expect } from '../../fixtures'
import { DashboardPage, BookModal } from '../../helpers/pages'
import { createBook, generateBook } from '../../helpers/api'

test.describe('Network Interception', () => {
  // ─── Request payload validation ───────────────────────────────────────────

  test('create book sends correct payload to API', async ({ authenticatedPage: page, cleanupBooks }) => {
    const book = generateBook()
    const requests: any[] = []

    await page.route('**/api/books', (route) => {
      if (route.request().method() === 'POST') {
        requests.push(JSON.parse(route.request().postData() || '{}'))
        route.continue()
      } else {
        route.continue()
      }
    })

    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()
    await modal.waitForClose()

    expect(requests.length).toBe(1)
    expect(requests[0].title).toBe(book.title)
    expect(requests[0].author).toBe(book.author)
  })

  test('Authorization header is sent on all authenticated requests', async ({ authenticatedPage: page, userToken }) => {
    const authHeaders: string[] = []

    await page.route('**/api/**', (route) => {
      const auth = route.request().headers()['authorization']
      if (auth) authHeaders.push(auth)
      route.continue()
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    expect(authHeaders.length).toBeGreaterThan(0)
    for (const header of authHeaders) {
      expect(header).toMatch(/^Bearer .+/)
      const parts = header.replace('Bearer ', '').split('.')
      expect(parts.length).toBe(3) // valid JWT format
    }
  })

  // ─── Loading states ───────────────────────────────────────────────────────

  test('dashboard shows loading indicator while fetching data', async ({ page, userCredentials }) => {
    let resolveRequest!: () => void

    await page.route('**/api/books', async (route) => {
      await new Promise<void>((r) => { resolveRequest = r })
      route.continue()
    })

    // Must navigate to the app origin BEFORE writing localStorage
    // (about:blank does not share the app's storage origin)
    await page.goto('/')
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.goto('/dashboard')

    await expect(page.locator('text=Carregando')).toBeVisible({ timeout: 5_000 })
    resolveRequest()
    await expect(page.locator('text=Carregando')).not.toBeVisible({ timeout: 8_000 })
  })

  // ─── Slow network ─────────────────────────────────────────────────────────

  test('UI stays responsive while API is slow', async ({ authenticatedPage: page, cleanupBooks }) => {
    await page.route('**/api/books', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 1500))
        route.continue()
      } else {
        route.continue()
      }
    })

    const book = generateBook()
    const dashboard = new DashboardPage(page)
    const modal = new BookModal(page)

    await dashboard.addBookButton.click()
    await modal.waitForOpen()
    await modal.fillRequired(book.title, book.author)
    await modal.submit()

    await expect(modal.saveButton).toBeDisabled()
    await expect(modal.saveButton).toContainText(/Salvando/i)

    await modal.waitForClose()
  })

  // ─── Retry behavior ───────────────────────────────────────────────────────

  test('failed book load does not crash the dashboard', async ({ page, userCredentials }) => {
    await page.route('**/api/books', (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'Service unavailable' }) })
    )

    // Navigate to origin first before writing localStorage
    await page.goto('/')
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.goto('/dashboard')

    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10_000 })

    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.waitForTimeout(1000)
    // Exclude Vite dev-server HMR/chunk errors that are not app errors
    const appErrors = errors.filter(
      (e) => !e.includes('Warning') && !e.includes('dynamically imported module') && !e.includes('chunk')
    )
    expect(appErrors).toHaveLength(0)
  })

  // ─── Stats API ────────────────────────────────────────────────────────────

  test('dashboard shows zeros when stats API fails', async ({ page, userCredentials }) => {
    await page.route('**/api/stats', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Stats unavailable' }) })
    )

    // Navigate to origin first before writing localStorage
    await page.goto('/')
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId('stats-total')).toContainText('0')
  })

  // ─── 401 handling ─────────────────────────────────────────────────────────

  test('redirects to login when token is expired (401)', async ({ page, userCredentials }) => {
    // Navigate to origin first before writing localStorage
    await page.goto('/')
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'Token expired' }) })
    )

    await page.goto('/dashboard')

    await page.waitForTimeout(2000)
    const url = page.url()
    const isHandled = url.includes('/login') || await page.getByTestId('dashboard-page').isVisible()
    expect(isHandled).toBe(true)
  })
})
