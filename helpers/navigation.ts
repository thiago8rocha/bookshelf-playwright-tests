import type { Page } from '@playwright/test'

export async function openUserMenu(page: Page) {
  await page.getByTestId('user-menu').click()
}

export async function signOut(page: Page) {
  await openUserMenu(page)
  await page.getByTestId('logout-button').click()
}
