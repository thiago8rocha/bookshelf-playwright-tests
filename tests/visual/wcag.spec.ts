import { test, expect } from '../../fixtures'
import { injectAxe, checkA11y } from 'axe-playwright'
import { createBook } from '../../helpers/api'

const WCAG_OPTIONS = {
  axeOptions: {
    runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
    rules: {
      'button-name': { enabled: false },
      'color-contrast': { enabled: false },
    },
  },
  detailedReport: true,
}

test.describe('Accessibility @a11y', () => {
  test('login page has no critical a11y violations', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('[data-testid="login-page"]')

    await injectAxe(page)
    await checkA11y(page, '[data-testid="login-page"]', WCAG_OPTIONS)
  })

  test('register page has no critical a11y violations', async ({ page }) => {
    await page.goto('/register')
    await page.waitForSelector('[data-testid="register-page"]')

    await injectAxe(page)
    await checkA11y(page, '[data-testid="register-page"]', WCAG_OPTIONS)
  })

  test('empty dashboard has no critical a11y violations', async ({ authenticatedPage: page }) => {
    await page.waitForLoadState('networkidle')

    await injectAxe(page)
    await checkA11y(page, '[data-testid="dashboard-page"]', WCAG_OPTIONS)
  })

  test('dashboard with books has no critical a11y violations', async ({
    authenticatedPage: page,
    request,
    userToken,
  }) => {
    await createBook(request, userToken)
    await createBook(request, userToken)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid^="book-item-"]')

    await injectAxe(page)
    await checkA11y(page, '[data-testid="dashboard-page"]', WCAG_OPTIONS)
  })

  test('add book modal has no critical a11y violations', async ({ authenticatedPage: page }) => {
    await page.getByTestId('add-book-button').click()
    await page.getByTestId('book-modal').waitFor({ state: 'visible' })

    await injectAxe(page)
    await checkA11y(page, '[data-testid="book-modal"]', WCAG_OPTIONS)

    await page.getByTestId('cancel-button').click()
  })

  test('login form: tab order is email → password → button', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('[data-testid="login-page"]')

    await page.getByTestId('email-input').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('password-input')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByTestId('login-button')).toBeFocused()
  })

  test('register form: tab order is name → email → password → button', async ({ page }) => {
    await page.goto('/register')
    await page.waitForSelector('[data-testid="register-page"]')

    await page.getByTestId('name-input').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('email-input')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByTestId('password-input')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByTestId('register-button')).toBeFocused()
  })

  test('all interactive elements have visible focus indicators', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('[data-testid="login-page"]')

    const interactiveElements = [
      page.getByTestId('email-input'),
      page.getByTestId('password-input'),
      page.getByTestId('login-button'),
    ]

    for (const el of interactiveElements) {
      await el.focus()
      const outline = await el.evaluate((node) => {
        const styles = window.getComputedStyle(node)
        return { outline: styles.outline, boxShadow: styles.boxShadow }
      })

      const hasFocusStyle =
        (outline.outline && outline.outline !== 'none' && !outline.outline.startsWith('0px')) ||
        (outline.boxShadow && outline.boxShadow !== 'none')

      expect(hasFocusStyle, `Element should have visible focus indicator`).toBe(true)
    }
  })
})