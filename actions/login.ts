import { Page, expect } from '@playwright/test'
import { LoginPage } from '../helpers/pages'

export async function openLoginPage(page: Page) {
  await new LoginPage(page).goto()
}

export async function signIn(page: Page, email: string, password: string) {
  await new LoginPage(page).login(email, password)
}

export async function submitOnly(page: Page, field: 'email' | 'password', value: string) {
  const login = new LoginPage(page)
  await (field === 'email' ? login.emailInput : login.passwordInput).fill(value)
  await login.loginButton.click()
}

export async function expectDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByTestId('dashboard-page')).toBeVisible()
}

export async function expectStillOnLoginPage(page: Page) {
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId('dashboard-page')).not.toBeVisible()
}
