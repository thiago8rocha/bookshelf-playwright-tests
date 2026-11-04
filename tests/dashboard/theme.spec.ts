import { test, expect } from '../../fixtures'

const bodyBackground = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test.describe('Theme', () => {
  test('lets the user pick light, dark or system and remembers the choice', async ({ authenticatedPage: page }) => {
    const html = page.locator('html')
    const select = page.getByTestId('theme-select')

    await expect(select).toHaveValue('system')
    await expect(html).not.toHaveAttribute('data-theme', /.*/)

    await select.selectOption('dark')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByTestId('theme-select')).toHaveValue('dark')

    await page.getByTestId('theme-select').selectOption('system')
    await expect(html).not.toHaveAttribute('data-theme', /.*/)
  })

  test('follows the OS preference when nothing was chosen', async ({ browser }) => {
    const darkContext = await browser.newContext({ colorScheme: 'dark', locale: 'pt-BR' })
    const darkPage = await darkContext.newPage()
    await darkPage.goto('/login')
    const dark = await bodyBackground(darkPage)
    await darkContext.close()

    const lightContext = await browser.newContext({ colorScheme: 'light', locale: 'pt-BR' })
    const lightPage = await lightContext.newPage()
    await lightPage.goto('/login')
    const light = await bodyBackground(lightPage)
    await lightContext.close()

    expect(dark).not.toBe(light)
  })

  test('an explicit choice wins over the OS preference', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', locale: 'pt-BR' })
    const page = await context.newPage()
    await page.goto('/login')
    const system = await bodyBackground(page)

    await page.getByTestId('theme-select').selectOption('light')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await bodyBackground(page)).not.toBe(system)

    await context.close()
  })
})
