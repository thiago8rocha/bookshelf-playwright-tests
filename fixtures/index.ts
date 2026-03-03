/**
 * Custom Playwright fixtures.
 *
 * Provides:
 *  - authenticatedPage  : page logged in with a fresh random user
 *  - visualPage         : page logged in with a FIXED user per-browser (deterministic screenshots)
 *  - userCredentials    : the credentials used for authenticatedPage
 *  - userToken          : JWT token for the logged-in user
 *  - cleanupBooks       : auto-cleans books created during the test
 */

import { test as base, expect, Page } from '@playwright/test'
import {
  createUser,
  loginViaApi,
  deleteAllBooks,
  UserCredentials,
} from '../helpers/api'

// Each browser project gets its own isolated fixed user so that parallel
// browser runs never share state and cannot interfere with each other.
// The username must be unique per browser to keep the header deterministic.
const VISUAL_USERS: Record<string, UserCredentials> = {
  chromium: {
    name: 'Visual User',
    email: 'visual-chromium@test.com',
    password: 'Test@123456',
  },
  firefox: {
    name: 'Visual User',
    email: 'visual-firefox@test.com',
    password: 'Test@123456',
  },
  'mobile-chrome': {
    name: 'Visual User',
    email: 'visual-mobile@test.com',
    password: 'Test@123456',
  },
}

// Fallback for any unlisted browser project
const VISUAL_USER_DEFAULT: UserCredentials = {
  name: 'Visual User',
  email: 'visual-default@test.com',
  password: 'Test@123456',
}

type BookshelfFixtures = {
  authenticatedPage: Page
  visualPage: Page
  userCredentials: UserCredentials
  userToken: string
  cleanupBooks: void
}

async function injectAuth(page: Page, token: string, name: string, email: string) {
  await page.goto('/')
  await page.evaluate(
    ({ user, token }) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, user: { name, email } }
  )
  await page.goto('/dashboard')
  await page.waitForSelector('[data-testid="dashboard-page"]', { timeout: 15_000 })
}

export const test = base.extend<BookshelfFixtures>({
  userCredentials: async ({ request }, use) => {
    const credentials = await createUser(request)
    await use(credentials)
  },

  userToken: async ({ userCredentials }, use) => {
    await use(userCredentials.token!)
  },

  authenticatedPage: async ({ page, userCredentials }, use) => {
    await injectAuth(page, userCredentials.token!, userCredentials.name, userCredentials.email)
    await use(page)
  },

  // Each browser uses its own isolated fixed user so parallel browser runs
  // cannot interfere with each other via deleteAllBooks.
  // Within each browser, tests run serially (see visual.spec.ts describe.configure).
  visualPage: async ({ page, request, browserName }, use) => {
    const visualUser = VISUAL_USERS[browserName] ?? VISUAL_USER_DEFAULT

    let token: string
    try {
      const creds = await createUser(request, visualUser)
      token = creds.token!
    } catch {
      token = await loginViaApi(request, visualUser.email, visualUser.password)
    }

    // Clean slate: remove any books left over from a previous crashed run
    await deleteAllBooks(request, token)

    await injectAuth(page, token, visualUser.name, visualUser.email)
    await use(page)

    await deleteAllBooks(request, token)
  },

  cleanupBooks: [
    async ({ request, userToken }, use) => {
      await use()
      await deleteAllBooks(request, userToken)
    },
    { auto: false },
  ],
})

export { expect }