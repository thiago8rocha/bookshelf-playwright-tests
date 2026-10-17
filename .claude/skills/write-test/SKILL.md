---
name: write-test
description: Use when adding a new test or scenario to this Playwright suite, so it follows the repo's fixtures, page objects, selectors and mocking rules.
---

# Write a test

1. Pick the area folder under `tests/` (`accounts`, `auth`, `books`, `catalog`, `dashboard`, `e2e`, `network`, `store`, `visual`).
   Add to an existing `tests/<area>/<area>-<topic>.spec.ts` when the topic matches; otherwise create one with that name.
2. Read one neighbouring spec first and copy its shape: `import { test, expect } from '../../fixtures'`, one
   `test.describe('Area — Topic')`, lowercase sentence titles. Put `@smoke` in the title only for critical-path tests.
3. Choose the fixture:
   - `authenticatedPage` (fresh user, already on the dashboard) for anything after login. Add `cleanupBooks` to the arguments when the test creates books.
   - plain `page` + `request` for login, register and session tests.
   - `visualPage` only for screenshot tests (see the `update-visual-snapshots` skill).
4. Set up preconditions through the API (`createBook`, `createBooks`, `registerWithRoles`, `adminSession`, `openAs`,
   `createCatalogBook`, `createListing`), not through the UI.
5. Drive the UI through the page objects in `helpers/pages.ts`. A new screen element goes there. Locate with `getByTestId`
   only. If the frontend lacks a `data-testid`, add it in `bookshelf-frontend` (kebab-case; list items `name-${id}`) and say so in the summary.
6. Data comes from `generateCredentials`, `generateBook`, `generateIsbn`, `generateCnpj` or a `Date.now()` suffix in titles, because specs run in parallel.
7. Mocks:
   - Google Books: always route `/googleapis\.com\/books\/v1\/volumes/` and send `access-control-allow-origin: *`; mock cover URLs too.
     Copy the pattern from `tests/books/books-import-cover.spec.ts`.
   - Book list: the request has a query string, so use `/\/api\/books(\?.*)?$/`.
   - Payments are simulated; never treat the Pix code as payable.
8. Wait on state, never on time: `await expect(locator).toBeVisible()`, `waitFor`, or `waitForSelector` on a `data-testid`.
9. Validate: `npx playwright test <file> --repeat-each=5 --project=chromium`, then `--project=firefox`. Fix any flake
   before finishing (see `debug-failing-test`).
