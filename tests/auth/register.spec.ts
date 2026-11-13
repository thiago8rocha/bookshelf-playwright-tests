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
    await registerPage.fillAccount(creds.name, creds.email, '123')
    await registerPage.nextButton.click()

    await expect(page).toHaveURL(/\/register/)
    await expect(registerPage.acceptTermsCheckbox).toHaveCount(0)
  })

  test('blocks the next step with empty fields', async ({ page }) => {
    await registerPage.nextButton.click()

    await expect(page).toHaveURL(/\/register/)
    await expect(registerPage.acceptTermsCheckbox).toHaveCount(0)
  })

  test('keeps the submit button disabled until the terms are accepted', async () => {
    const creds = generateCredentials()
    await registerPage.continueToUsage(creds.name, creds.email, creds.password)

    await expect(registerPage.registerButton).toBeDisabled()
    await registerPage.acceptTermsCheckbox.check()
    await expect(registerPage.registerButton).toBeEnabled()
  })

  test('goes back to the account step keeping what was typed', async () => {
    const creds = generateCredentials()
    await registerPage.continueToUsage(creds.name, creds.email, creds.password)

    await registerPage.backButton.click()

    await expect(registerPage.nameInput).toHaveValue(creds.name)
    await expect(registerPage.emailInput).toHaveValue(creds.email)
    await expect(registerPage.nextButton).toBeVisible()
  })

  test('opens the terms of service from the sign-up form', async ({ page }) => {
    const creds = generateCredentials()
    await registerPage.continueToUsage(creds.name, creds.email, creds.password)

    const popup = page.waitForEvent('popup')
    await page.getByTestId('terms-link').click()

    const terms = await popup
    await expect(terms.getByTestId('terms-page')).toBeVisible()
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
    await registerPage.continueToUsage(creds.name, creds.email, creds.password)
    await registerPage.submit()

    await expect(registerPage.registerButton).toBeDisabled()
  })
})
