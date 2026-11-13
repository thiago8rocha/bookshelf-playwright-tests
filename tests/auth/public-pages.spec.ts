import { test, expect } from '../../fixtures'

test.describe('Auth — public pages around the sign-in', () => {
  test('login shows the brand panel, the About link and the footer @smoke', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByTestId('auth-brand-panel')).toBeVisible()
    await expect(page.getByTestId('auth-tagline')).toBeVisible()
    await expect(page.getByTestId('about-link')).toBeVisible()
    await expect(page.getByTestId('public-footer')).toContainText('Todos os dados são fictícios')
  })

  test('the brand items show on a wide screen and stay out of the way on a phone', async ({ browser }) => {
    const wide = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'pt-BR' })
    await wide.goto('/login')
    await expect(wide.getByTestId('auth-brand-items')).toBeVisible()
    await expect(wide.getByTestId('auth-why-link')).toBeVisible()
    await wide.close()

    const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, locale: 'pt-BR' })
    await phone.goto('/login')
    await expect(phone.getByTestId('auth-tagline')).toBeVisible()
    await expect(phone.getByTestId('auth-brand-items')).toBeHidden()
    await expect(phone.getByTestId('login-button')).toBeVisible()
    await phone.close()
  })

  test('registration uses the same layout', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByTestId('auth-brand-panel')).toBeVisible()
    await expect(page.getByTestId('public-footer')).toBeVisible()
  })

  test('the About link opens the About page without signing in', async ({ page }) => {
    await page.goto('/login')

    await page.getByTestId('about-link').click()

    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByTestId('about-title')).toBeVisible()
    await expect(page.getByTestId('about-link')).toBeVisible()
    await expect(page.getByTestId('public-footer')).toBeVisible()
  })

  test('the About page invites a visitor to create an account', async ({ page }) => {
    await page.goto('/about')

    await expect(page.locator('[data-testid^="about-section-"]')).toHaveCount(5)
    await page.getByTestId('about-register-button').click()

    await expect(page).toHaveURL(/\/register/)
  })

  test('the About page has no sign-up call for someone already signed in', async ({ authenticatedPage: page }) => {
    await page.goto('/about')

    await expect(page.getByTestId('about-title')).toBeVisible()
    await expect(page.getByTestId('about-cta')).toHaveCount(0)
  })

  test('the footer links go to the About and Terms pages', async ({ page }) => {
    await page.goto('/login')

    await page.getByTestId('footer-terms-link').click()
    await expect(page).toHaveURL(/\/terms/)

    await page.goto('/login')
    await page.getByTestId('footer-about-link').click()
    await expect(page).toHaveURL(/\/about/)
  })
})
