import { test, expect } from '../../fixtures'
import { LoginPage } from '../../helpers/pages'

test.describe('Session', () => {
  // ─── Persistence ─────────────────────────────────────────────────────────

  test('session persists after page reload', async ({ authenticatedPage: page }) => {
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByTestId('dashboard-page')).toBeVisible()
  })

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  // ─── Logout ───────────────────────────────────────────────────────────────

  test('logout clears session and redirects to login', async ({ authenticatedPage: page }) => {
    await page.click('text=Sair')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('login-page')).toBeVisible()
  })

  test('token is removed from localStorage after logout', async ({ authenticatedPage: page }) => {
    await page.click('text=Sair')

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeNull()

    const user = await page.evaluate(() => localStorage.getItem('user'))
    expect(user).toBeNull()
  })

  test('back button after logout does not restore session', async ({ authenticatedPage: page }) => {
    await page.click('text=Sair')
    await expect(page).toHaveURL(/\/login/)

    await page.goBack()
    await page.waitForLoadState('networkidle')

    // Must not be on dashboard — redirect should kick in
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('dashboard not accessible after logout via direct URL', async ({ authenticatedPage: page }) => {
    await page.click('text=Sair')
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  // ─── Multi-context (Playwright-only) ──────────────────────────────────────

  test('session is isolated between browser contexts', async ({ browser, userCredentials }) => {
    // Context A — authenticated
    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    await pageA.goto('/')
    await pageA.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )
    await pageA.goto('/dashboard')
    await expect(pageA.getByTestId('dashboard-page')).toBeVisible()

    // Context B — unauthenticated
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()
    await pageB.goto('/dashboard')
    await expect(pageB).toHaveURL(/\/login/)

    await contextA.close()
    await contextB.close()
  })
})
