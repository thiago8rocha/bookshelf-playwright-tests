import { createBdd } from 'playwright-bdd'
import { test } from '../fixtures'
import { generateCredentials } from '../helpers/api'
import { expectDashboard, expectStillOnLoginPage, openLoginPage, signIn, submitOnly } from '../actions/login'

const { Given, When, Then } = createBdd(test)

Given('the login page is open', async ({ page }) => openLoginPage(page))

Given('a registered user', async ({ userCredentials }) => {
  void userCredentials
})

When('the user signs in with the right credentials', async ({ page, userCredentials }) =>
  signIn(page, userCredentials.email, userCredentials.password))

When('the user signs in with an unregistered email', async ({ page }) =>
  signIn(page, generateCredentials().email, 'Test@123456'))

When('the user signs in with a wrong password', async ({ page, userCredentials }) =>
  signIn(page, userCredentials.email, 'WrongPassword!'))

When('the user submits only a password', async ({ page }) => submitOnly(page, 'password', 'Password123!'))

When('the user submits only an email', async ({ page }) => submitOnly(page, 'email', 'user@test.com'))

When('the user submits a malformed email', async ({ page }) => {
  await signIn(page, 'not-an-email', 'Password123!')
})

Then('the dashboard is shown', async ({ page }) => expectDashboard(page))

Then('the user stays on the login page', async ({ page }) => expectStillOnLoginPage(page))
