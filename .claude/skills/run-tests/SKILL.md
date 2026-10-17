---
name: run-tests
description: Use when running this Playwright suite or part of it, locally against the BookShelf stack or through GitHub Actions, and when opening its reports.
---

# Run tests

## Local
1. Start the stack: `npm run dev` in `bookshelf-api` (needs PostgreSQL) and `npm run dev` in `bookshelf-frontend`.
   Expected: API on `http://localhost:3000`, frontend on `http://localhost:5173`; override with `API_URL` and `BASE_URL` in `.env`.
   Check `http://localhost:3000/health` before running.
2. Run:
   - all: `npm test`
   - area: `npm run test:auth|books|dashboard|e2e|network|visual`
   - one file: `npx playwright test tests/books/books-create.spec.ts`
   - one test: `npx playwright test -g "creates a book"`
   - one browser: add `--project=chromium|firefox|mobile-chrome`
   - tags: `npm run test:smoke`, `npm run test:a11y`
   - see the browser: `npm run test:headed`; step through: `npm run test:debug`; UI mode: `npx playwright test --ui`
3. Reports:
   - HTML: `npm run test:report`
   - Allure: `npm run allure:report`
   - traces and screenshots of failures are in `test-results/`

Visual tests compare against platform-specific baselines, so a Windows run only compares `*-win32.png`.

## CI
- Workflow "Playwright Tests" (`.github/workflows/playwright.yml`): push or pull request to `master`, or run it manually
  (Actions, Playwright Tests, Run workflow). It checks out and builds the API and frontend itself.
- The API and frontend repos have a "Run E2E Tests" workflow that dispatches this one (secret `E2E_DISPATCH_TOKEN`).
- Results: Allure on GitHub Pages (`/allure-report/`), plus the `allure-report` and `playwright-report` artifacts of the run.
