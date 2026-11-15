import { test, expect } from '../../fixtures'
import { LoginPage } from '../../helpers/pages'
import { createUser } from '../../helpers/api'

test.describe('Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('redirects to dashboard if already authenticated', async ({ page, userCredentials }) => {
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  // ─── Keyboard ────────────────────────────────────────────────────────────

  test('submits form with Enter key on password field', async ({ page, request }) => {
    const user = await createUser(request)
    await loginPage.emailInput.fill(user.email)
    await loginPage.passwordInput.fill(user.password)
    await loginPage.passwordInput.press('Enter')

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('tab order: email → password → button', async ({ page }) => {
    await loginPage.emailInput.focus()
    await page.keyboard.press('Tab')
    await expect(loginPage.passwordInput).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(loginPage.loginButton).toBeFocused()
  })

  // ─── Network interception (Playwright-only) ───────────────────────────────

  test('shows error when API is unreachable', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.abort('failed')
    )

    await loginPage.login('user@test.com', 'Password123!')

    await expect(loginPage.errorMessage).toBeVisible({ timeout: 8_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows error on 500 server response', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    )

    await loginPage.login('user@test.com', 'Password123!')

    await expect(loginPage.errorMessage).toBeVisible({ timeout: 8_000 })
  })

  test('disables login button while request is in flight', async ({ page, request }) => {
    const user = await createUser(request)

    await page.route('**/api/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 600))
      await route.continue()
    })

    await loginPage.emailInput.fill(user.email)
    await loginPage.passwordInput.fill(user.password)
    await loginPage.loginButton.click()

    await expect(loginPage.loginButton).toBeDisabled()
  })
})
