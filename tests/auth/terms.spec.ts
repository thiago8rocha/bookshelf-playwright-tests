import { test, expect } from '@playwright/test'
import { generateCredentials } from '../../helpers/api'
import { RegisterPage } from '../../helpers/pages'

const API_URL = process.env.API_URL || 'http://localhost:3000'

test.describe('Auth — terms of service', () => {
  test('the API refuses a sign-up that does not accept the terms', async ({ request }) => {
    const creds = generateCredentials()

    const missing = await request.post(`${API_URL}/api/auth/register`, {
      data: { name: creds.name, email: creds.email, password: creds.password },
    })
    const declined = await request.post(`${API_URL}/api/auth/register`, {
      data: { name: creds.name, email: creds.email, password: creds.password, acceptTerms: false },
    })

    expect(missing.status()).toBe(400)
    expect(declined.status()).toBe(400)
  })

  test('the API records the accepted terms on sign-up', async ({ request }) => {
    const creds = generateCredentials()

    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: { name: creds.name, email: creds.email, password: creds.password, acceptTerms: true },
    })

    expect(response.status()).toBe(201)
  })

  test('the terms page lists every section and is public @smoke', async ({ page }) => {
    await page.goto('/terms')

    await expect(page.getByTestId('terms-page')).toBeVisible()
    await expect(page.getByTestId('terms-notice')).toBeVisible()
    await expect(page.locator('[data-testid^="terms-section-"]')).toHaveCount(19)
  })

  test('the terms page goes back to the sign-up form', async ({ page }) => {
    await page.goto('/terms')

    await page.getByTestId('terms-back-link').click()

    await expect(page).toHaveURL(/\/register/)
    await expect(new RegisterPage(page).nextButton).toBeVisible()
  })

  test('the sign-up form shows the test project notice', async ({ page }) => {
    await new RegisterPage(page).goto()

    await expect(page.getByTestId('register-test-notice')).toContainText('dados fictícios')
  })
})
