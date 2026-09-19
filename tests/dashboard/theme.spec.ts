import { test, expect } from '../../fixtures'

test.describe('Dashboard — Dark mode', () => {
  test('toggles between light and dark and remembers the choice', async ({ authenticatedPage: page }) => {
    const html = page.locator('html')
    const toggle = page.getByTestId('theme-toggle')

    await expect(html).not.toHaveClass(/dark/)

    await toggle.click()
    await expect(html).toHaveClass(/dark/)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await expect(html).toHaveClass(/dark/)

    await page.getByTestId('theme-toggle').click()
    await expect(html).not.toHaveClass(/dark/)
  })

  test('follows the OS preference when nothing was chosen', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', locale: 'pt-BR' })
    const page = await context.newPage()

    await page.goto('/login')
    await expect(page.locator('html')).toHaveClass(/dark/)

    await context.close()
  })
})
