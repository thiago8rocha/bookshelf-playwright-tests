import { test, expect } from '../../fixtures'
import { LoginPage } from '../../helpers/pages'
import { createUser, generateCredentials } from '../../helpers/api'

test.describe('Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  // ─── Positive ────────────────────────────────────────────────────────────

  test('logs in with valid credentials @smoke', async ({ page, request }) => {
    const user = await createUser(request)
    await loginPage.login(user.email, user.password)

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByTestId('dashboard-page')).toBeVisible()
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

  // ─── Negative ────────────────────────────────────────────────────────────

  // NOTE: these tests verify the app stays on /login after a failed attempt.
  // The frontend does not render a visible error-message element for auth errors
  // with the real backend — that behavior is covered via mocked API in network tests.
  test('stays on /login with wrong email', async ({ page, request }) => {
    const user = await createUser(request)

    await Promise.all([
      page.waitForResponse('**/api/auth/login'),
      loginPage.login('wrong@test.com', user.password),
    ])

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
  })

  test('stays on /login with wrong password', async ({ page, request }) => {
    const user = await createUser(request)

    await Promise.all([
      page.waitForResponse('**/api/auth/login'),
      loginPage.login(user.email, 'WrongPassword!'),
    ])

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
  })

  test('blocks submit with empty email — stays on login', async ({ page }) => {
    await loginPage.passwordInput.fill('Password123!')
    await loginPage.loginButton.click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
  })

  test('blocks submit with empty password — stays on login', async ({ page }) => {
    await loginPage.emailInput.fill('user@test.com')
    await loginPage.loginButton.click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
  })

  test('blocks submit with invalid email format', async ({ page }) => {
    await loginPage.emailInput.fill('not-an-email')
    await loginPage.passwordInput.fill('Password123!')
    await loginPage.loginButton.click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
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
