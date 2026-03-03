import { test, expect } from '../../fixtures'
import { RegisterPage } from '../../helpers/pages'
import { createUser, generateCredentials } from '../../helpers/api'

test.describe('Register', () => {
  let registerPage: RegisterPage

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page)
    await registerPage.goto()
  })

  // ─── Positive ────────────────────────────────────────────────────────────

  test('registers and redirects to dashboard @smoke', async ({ page }) => {
    const creds = generateCredentials()
    await registerPage.register(creds.name, creds.email, creds.password)

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 })
    await expect(page.getByTestId('dashboard-page')).toBeVisible()
  })

  test('stores token in localStorage after register', async ({ page }) => {
    const creds = generateCredentials()
    await registerPage.register(creds.name, creds.email, creds.password)

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 })

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()
    expect(token!.split('.').length).toBe(3) // JWT format
  })

  test('redirects to dashboard if already authenticated', async ({ page, userCredentials }) => {
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      { token: userCredentials.token!, user: { name: userCredentials.name, email: userCredentials.email } }
    )

    await page.goto('/register')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  // ─── Negative ────────────────────────────────────────────────────────────

  test('shows error on duplicate email', async ({ page, request }) => {
    const existing = await createUser(request)
    await registerPage.register('Other User', existing.email, existing.password)

    await expect(registerPage.errorMessage).toBeVisible({ timeout: 8_000 })
    await expect(registerPage.errorMessage).toContainText(/cadastrado|já existe|taken/i)
    await expect(page).toHaveURL(/\/register/)
  })

  test('blocks submit with short password', async ({ page }) => {
    const creds = generateCredentials()
    await registerPage.register(creds.name, creds.email, '123')

    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
  })

  test('blocks submit with empty fields', async ({ page }) => {
    await registerPage.registerButton.click()

    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
  })

  // ─── Network interception (Playwright-only) ───────────────────────────────

  test('shows error when API is unreachable', async ({ page }) => {
    await page.route('**/api/auth/register', (route) => route.abort('failed'))

    const creds = generateCredentials()
    await registerPage.register(creds.name, creds.email, creds.password)

    await expect(registerPage.errorMessage).toBeVisible({ timeout: 8_000 })
    await expect(page).toHaveURL(/\/register/)
  })

  test('disables register button while request is in flight', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      await new Promise((r) => setTimeout(r, 600))
      await route.continue()
    })

    const creds = generateCredentials()
    await registerPage.nameInput.fill(creds.name)
    await registerPage.emailInput.fill(creds.email)
    await registerPage.passwordInput.fill(creds.password)
    await registerPage.registerButton.click()

    await expect(registerPage.registerButton).toBeDisabled()
  })
})
