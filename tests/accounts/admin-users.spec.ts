import { test, expect } from '@playwright/test'
import { LoginPage } from '../../helpers/pages'
import { adminSession, openAs, registerWithRoles } from '../../helpers/accounts'

test.describe('Admin — user management', () => {
  test('only admins can open the user management page', async ({ page, request }) => {
    const reader = await registerWithRoles(request, ['reader'])

    await openAs(page, reader, '/admin/users')

    await expect(page).toHaveURL(/\/account/)
  })

  test('an admin finds a user by email and sees their roles and status', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const admin = await adminSession(request)

    await openAs(page, admin, '/admin/users')
    await page.getByTestId('admin-users-search').fill(seller.user.email)

    const row = page.getByTestId(`admin-user-${seller.user.id}`)
    await expect(row).toBeVisible()
    await expect(row).toContainText('Vender no sebo')
    await expect(page.getByTestId(`admin-user-status-${seller.user.id}`)).toContainText('Ativo')
    await expect(page.getByTestId('admin-users-count')).toContainText('1 usuário')
  })

  test('an admin edits the name of a user', async ({ page, request }) => {
    const target = await registerWithRoles(request, ['reader'])
    const admin = await adminSession(request)
    await openAs(page, admin, '/admin/users')
    await page.getByTestId('admin-users-search').fill(target.user.email)

    await page.getByTestId(`admin-user-edit-${target.user.id}`).click()
    await expect(page.getByTestId('edit-user-dialog')).toBeVisible()
    await page.getByTestId('edit-user-name').fill('Nome Corrigido')
    await page.getByTestId('edit-user-save').click()

    await expect(page.getByTestId('edit-user-dialog')).toHaveCount(0)
    await expect(page.getByTestId(`admin-user-${target.user.id}`)).toContainText('Nome Corrigido')
  })

  test('a suspended user cannot sign in until an admin reactivates the account', async ({ page, request }) => {
    const target = await registerWithRoles(request, ['reader'])
    const admin = await adminSession(request)
    await openAs(page, admin, '/admin/users')
    await page.getByTestId('admin-users-search').fill(target.user.email)

    await page.getByTestId(`admin-user-edit-${target.user.id}`).click()
    await page.getByTestId('edit-user-status').selectOption('suspended')
    await page.getByTestId('edit-user-save').click()
    await expect(page.getByTestId(`admin-user-status-${target.user.id}`)).toContainText('Suspenso')

    // Signing in through the login form is refused with a clear message.
    await page.evaluate(() => localStorage.clear())
    const login = new LoginPage(page)
    await login.goto()
    await login.login(target.user.email, target.password)
    await expect(login.errorMessage).toContainText('Esta conta está suspensa')

    // Reactivating lets the same credentials in again.
    await openAs(page, admin, '/admin/users')
    await page.getByTestId('admin-users-search').fill(target.user.email)
    await page.getByTestId(`admin-user-edit-${target.user.id}`).click()
    await page.getByTestId('edit-user-status').selectOption('active')
    await page.getByTestId('edit-user-save').click()
    await expect(page.getByTestId(`admin-user-status-${target.user.id}`)).toContainText('Ativo')

    await page.evaluate(() => localStorage.clear())
    await login.goto()
    await login.login(target.user.email, target.password)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('the status filter narrows the list to suspended accounts', async ({ page, request }) => {
    const target = await registerWithRoles(request, ['reader'])
    const admin = await adminSession(request)
    await openAs(page, admin, '/admin/users')
    await page.getByTestId('admin-users-search').fill(target.user.email)
    await page.getByTestId(`admin-user-edit-${target.user.id}`).click()
    await page.getByTestId('edit-user-status').selectOption('suspended')
    await page.getByTestId('edit-user-save').click()
    await expect(page.getByTestId(`admin-user-status-${target.user.id}`)).toContainText('Suspenso')

    await page.getByTestId('admin-users-status').selectOption('active')

    await expect(page.getByTestId('admin-users-empty')).toBeVisible()
    await page.getByTestId('admin-users-status').selectOption('suspended')
    await expect(page.getByTestId(`admin-user-${target.user.id}`)).toBeVisible()
  })
})
