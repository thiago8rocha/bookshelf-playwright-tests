import { test, expect } from '@playwright/test'
import { openAs, registerWithRoles } from '../../helpers/accounts'

const API_URL = process.env.API_URL || 'http://localhost:3000'

test.describe('Profile — name and password', () => {
  test('changing the name updates the header', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['reader'])
    await openAs(page, session, '/account')
    await expect(page.getByTestId('profile-name-save')).toBeDisabled()

    await page.getByTestId('profile-name-input').fill('Nome Atualizado')
    await page.getByTestId('profile-name-save').click()

    await expect(page.getByTestId('profile-name-saved')).toBeVisible()
    await expect(page.getByTestId('app-header')).toContainText('Nome Atualizado')
  })

  test('changing the password lets the user sign in with the new one only', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['reader'])
    await openAs(page, session, '/account')

    await page.getByTestId('profile-current-password').fill(session.password)
    await page.getByTestId('profile-new-password').fill('Nova@123456')
    await page.getByTestId('profile-password-save').click()
    await expect(page.getByTestId('profile-password-saved')).toBeVisible()

    const withOld = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: session.user.email, password: session.password },
    })
    const withNew = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: session.user.email, password: 'Nova@123456' },
    })
    expect(withOld.status()).toBe(401)
    expect(withNew.status()).toBe(200)
  })

  test('a wrong current password is refused with a clear message', async ({ page, request }) => {
    const session = await registerWithRoles(request, ['reader'])
    await openAs(page, session, '/account')

    await page.getByTestId('profile-current-password').fill('senha-errada')
    await page.getByTestId('profile-new-password').fill('Nova@123456')
    await page.getByTestId('profile-password-save').click()

    await expect(page.getByTestId('profile-password-error')).toContainText('A senha atual está incorreta.')
  })
})
