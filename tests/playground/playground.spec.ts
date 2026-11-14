import { test, expect } from '../../fixtures'
import { createBook, createUser } from '../../helpers/api'
import { openUserMenu } from '../../helpers/navigation'

const API_URL = process.env.API_URL || 'http://localhost:3000'

const authorization = (token: string) => ({ Authorization: `Bearer ${token}` })

async function enableBugs(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  ...enabled: string[]
) {
  const response = await request.put(`${API_URL}/api/playground/bugs`, {
    data: { enabled },
    headers: authorization(token),
  })
  expect(response.status()).toBe(200)
}

test.describe('Playground — bugs a user switches on', () => {
  test('lists the catalog with every bug off by default @smoke', async ({ request, userToken }) => {
    const response = await request.get(`${API_URL}/api/playground/bugs`, { headers: authorization(userToken) })

    expect(response.status()).toBe(200)
    const { bugs } = await response.json()
    expect(bugs.length).toBeGreaterThan(0)
    expect(bugs.every((bug: { enabled: boolean }) => !bug.enabled)).toBe(true)
  })

  test('requires a token and refuses unknown bugs', async ({ request, userToken }) => {
    expect((await request.get(`${API_URL}/api/playground/bugs`)).status()).toBe(401)

    const unknown = await request.put(`${API_URL}/api/playground/bugs`, {
      data: { enabled: ['does-not-exist'] },
      headers: authorization(userToken),
    })
    expect(unknown.status()).toBe(400)
  })

  test('the page switches a bug on, shows the banner and switches everything off', async ({ authenticatedPage: page }) => {
    await page.goto('/playground')

    await expect(page.getByTestId('playground-list')).toBeVisible()
    await expect(page.getByTestId('bugs-banner')).toHaveCount(0)

    await page.getByTestId('bug-toggle-api-slow-book-list').check()
    await expect(page.getByTestId('bugs-banner')).toBeVisible()
    await expect(page.getByTestId('playground-active-count')).toContainText('1')

    await page.reload()
    await expect(page.getByTestId('bug-toggle-api-slow-book-list')).toBeChecked()

    await page.getByTestId('playground-clear').click()
    await expect(page.getByTestId('bugs-banner')).toHaveCount(0)
  })

  test('the playground is reachable from the header', async ({ authenticatedPage: page }) => {
    await openUserMenu(page)
    await page.getByTestId('nav-playground').click()

    await expect(page).toHaveURL(/\/playground/)
    await expect(page.getByTestId('playground-page')).toBeVisible()
  })

  test('creating a book answers 200 instead of 201 while that bug is on', async ({ request, userToken }) => {
    const create = () =>
      request.post(`${API_URL}/api/books`, {
        data: { title: 'Bug Book', author: 'Tester' },
        headers: authorization(userToken),
      })

    expect((await create()).status()).toBe(201)
    await enableBugs(request, userToken, 'api-create-book-status-200')
    expect((await create()).status()).toBe(200)
    await enableBugs(request, userToken)
    expect((await create()).status()).toBe(201)
  })

  test('the stats total is one too high while that bug is on', async ({ request, userToken }) => {
    await createBook(request, userToken)
    const stats = async () =>
      (await (await request.get(`${API_URL}/api/stats`, { headers: authorization(userToken) })).json()).stats.total

    const real = await stats()
    await enableBugs(request, userToken, 'api-stats-total-off-by-one')

    expect(await stats()).toBe(real + 1)
  })

  test('the dashboard heading is misspelled while that bug is on', async ({ request, authenticatedPage: page, userToken }) => {
    await createBook(request, userToken)
    await enableBugs(request, userToken, 'ui-dashboard-title-typo')

    await page.goto('/dashboard')

    await expect(page.getByTestId('book-list-heading')).toHaveText('Meus Lviros')
  })

  test('the covers lose their alt text while that bug is on', async ({ request, authenticatedPage: page, userToken }) => {
    await page.route('https://placehold.co/**', (route) =>
      route.fulfill({
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
      }),
    )
    const book = await createBook(request, userToken, { coverUrl: 'https://placehold.co/cover.png' })
    await enableBugs(request, userToken, 'ui-cover-without-alt')

    await page.goto('/dashboard')

    await expect(page.getByTestId(`book-cover-${book.id}`)).toHaveAttribute('alt', '')
  })

  test('a bug never reaches another account', async ({ request, userToken }) => {
    await enableBugs(request, userToken, 'api-create-book-status-200', 'api-stats-total-off-by-one')
    const other = await createUser(request)

    const response = await request.post(`${API_URL}/api/books`, {
      data: { title: 'Other Book', author: 'Tester' },
      headers: authorization(other.token!),
    })

    expect(response.status()).toBe(201)
  })
})
