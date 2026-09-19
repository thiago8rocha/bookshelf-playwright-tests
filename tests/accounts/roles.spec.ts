import { test, expect } from '@playwright/test'
import { generateCredentials } from '../../helpers/api'
import { RegisterPage } from '../../helpers/pages'
import { openAs, registerWithRoles } from '../../helpers/accounts'

test.describe('Accounts — roles at sign-up', () => {
  test('the sign-up form offers the three uses, library selected by default', async ({ page }) => {
    await new RegisterPage(page).goto()

    await expect(page.getByTestId('register-role-reader')).toBeChecked()
    await expect(page.getByTestId('register-role-buyer')).not.toBeChecked()
    await expect(page.getByTestId('register-role-seller')).not.toBeChecked()
  })

  test('cannot sign up without choosing any use', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()
    const credentials = generateCredentials()
    await page.getByTestId('register-role-reader').uncheck()

    await registerPage.register(credentials.name, credentials.email, credentials.password)

    await expect(registerPage.errorMessage).toContainText('Escolha pelo menos uma opção')
    await expect(page).toHaveURL(/\/register/)
  })

  test('a library-only sign-up lands on the library', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()
    const credentials = generateCredentials()

    await registerPage.register(credentials.name, credentials.email, credentials.password)

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('a buyer-only sign-up lands on the account page, without a library', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    await registerPage.goto()
    const credentials = generateCredentials()
    await page.getByTestId('register-role-reader').uncheck()
    await page.getByTestId('register-role-buyer').check()

    await registerPage.register(credentials.name, credentials.email, credentials.password)

    await expect(page).toHaveURL(/\/account/)
    await expect(page.getByTestId('library-off-notice')).toBeVisible()
    await expect(page.getByTestId('nav-library')).toHaveCount(0)
  })
})

test.describe('Accounts — access by role', () => {
  test('an account without the library is redirected away from the dashboard', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['buyer'])

    await openAs(page, session, '/dashboard')

    await expect(page).toHaveURL(/\/account/)
  })

  test('only sellers can open the company form', async ({ page, request }) => {
    const reader = await registerWithRoles(request, ['reader'])

    await openAs(page, reader, '/companies/new')

    await expect(page).toHaveURL(/\/account/)
    await expect(page.getByTestId('companies-seller-only')).toBeVisible()
  })

  test('only admins can open the company verification page', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['reader', 'seller'])

    await openAs(page, seller, '/admin/companies')

    await expect(page).toHaveURL(/\/account/)
  })

  test('the library API answers 403 to an account without the reader role', async ({ request }) => {
    const buyer = await registerWithRoles(request, ['buyer'])

    const response = await request.get(`${process.env.API_URL || 'http://localhost:3000'}/api/books`, {
      headers: { Authorization: `Bearer ${buyer.token}` },
    })

    expect(response.status()).toBe(403)
    expect((await response.json()).code).toBe('ROLE_REQUIRED')
  })
})

test.describe('Accounts — changing roles', () => {
  test('a buyer turns the library on and gets access to it', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['buyer'])
    await openAs(page, session, '/account')
    await expect(page.getByTestId('save-roles-button')).toBeDisabled()

    await page.getByTestId('account-role-reader').check()
    await page.getByTestId('save-roles-button').click()

    await expect(page.getByTestId('account-saved')).toBeVisible()
    await expect(page.getByTestId('library-off-notice')).toHaveCount(0)
    await expect(page.getByTestId('nav-library')).toBeVisible()

    await page.getByTestId('nav-library').click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('turning on selling unlocks the company registration', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['reader'])
    await openAs(page, session, '/account')
    await expect(page.getByTestId('add-company-link')).toHaveCount(0)

    await page.getByTestId('account-role-seller').check()
    await page.getByTestId('save-roles-button').click()

    await expect(page.getByTestId('account-saved')).toBeVisible()
    await expect(page.getByTestId('add-company-link')).toBeVisible()
  })

  test('the new roles survive a reload', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['reader'])
    await openAs(page, session, '/account')
    await page.getByTestId('account-role-buyer').check()
    await page.getByTestId('save-roles-button').click()
    await expect(page.getByTestId('account-saved')).toBeVisible()

    await page.reload()

    await expect(page.getByTestId('account-role-buyer')).toBeChecked()
  })

  test('the last remaining use cannot be turned off', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['reader'])
    await openAs(page, session, '/account')

    await page.getByTestId('account-role-reader').uncheck()

    await expect(page.getByTestId('save-roles-button')).toBeDisabled()
  })
})
