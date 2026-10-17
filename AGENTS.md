# AGENTS.md

## What this is

Playwright + TypeScript E2E, visual-regression and accessibility (axe-playwright) suite for BookShelf
(React/Vite frontend + Express/PostgreSQL API). It is a public portfolio project; reports are published
with Allure on GitHub Pages. The sister suite in Robot Framework lives in `bookshelf-robotframework-tests`.

## Layout

- `tests/<area>/*.spec.ts`: areas are `accounts`, `auth`, `books`, `catalog`, `dashboard`, `e2e`, `network`,
  `store` and `visual`. Accessibility specs are in `tests/visual/wcag.spec.ts` (tag `@a11y`).
- `fixtures/index.ts`: custom fixtures (`authenticatedPage`, `visualPage`, `userCredentials`, `userToken`, `cleanupBooks`).
- `helpers/api.ts`: users and books through the API. `helpers/accounts.ts`: roles, admin session, `openAs`,
  `generateCnpj`. `helpers/store.ts`: catalog books and listings. `helpers/pages.ts`: page objects
  (`LoginPage`, `RegisterPage`, `DashboardPage`, `BookModal`, `DeleteModal`).
- `playwright.config.ts`: projects `chromium`, `firefox` and `mobile-chrome` (the last one only runs `auth`, `dashboard`, `visual`).

## Commands

- Install: `npm ci`, then `npx playwright install --with-deps chromium firefox`, then `cp .env.example .env`.
- Everything: `npm test`. By area: `npm run test:auth|books|dashboard|e2e|network|visual`.
- One file: `npx playwright test tests/books/books-create.spec.ts`. One project: `--project=chromium`.
  One test: `-g "creates a book"`.
- By tag: `npm run test:smoke`, `npm run test:a11y`.
- Headed, debugger, UI mode: `npm run test:headed`, `npm run test:debug`, `npx playwright test --ui`.
- Reports: `npm run test:report` (HTML), `npm run allure:report` (generate and open Allure).
- Visual baselines: `npm run snapshots:update`.
- There is no lint or type-check script.

## How to run against the app

The suite needs the API at `API_URL` (default `http://localhost:3000`) and the frontend at `BASE_URL`
(default `http://localhost:5173`); both come from `.env` (see `.env.example`).

Start them from the app repos: `npm run dev` in `bookshelf-api` (needs PostgreSQL, see its `.env.example`) and
`npm run dev` in `bookshelf-frontend`. The frontend is served at `/` in dev and E2E; the `/bookshelf-frontend/`
base only applies to the GitHub Pages deploy. The admin account `admin@bookshelf.test` used by `helpers/accounts.ts`
must be listed in the API's `ADMIN_EMAILS`.

## Conventions

- Selectors: `getByTestId(...)` only. `data-testid` values are kebab-case and are a public contract of the frontend;
  list items use `name-${id}` (for example `book-item-${id}`). If a test id is missing, add it in `bookshelf-frontend`;
  do not fall back to CSS, XPath or text selectors.
- Imports are relative (`../../fixtures`, `../../helpers/pages`), as in the existing specs. Put UI structure in
  `helpers/pages.ts` and API setup in `helpers/*.ts`.
- Use `authenticatedPage` (a fresh user per test). Add `cleanupBooks` to the test arguments to delete the books the test
  created; it is opt-in. `visualPage` uses one fixed user per browser and runs in serial mode.
- Names: `test.describe('Area — Topic')`, lowercase sentence titles, tags inside the title (`@smoke`, `@a11y`).
- Data: `generateCredentials`, `generateBook`, `generateIsbn` and `generateCnpj` return unique values. Tests run in parallel,
  so never share data between them.
- Prefer API calls for preconditions and teardown; drive the UI only for what the test is about.
- Waits: web-first assertions, or `waitFor`/`waitForSelector` on a `data-testid`. Do not add `waitForTimeout`; the existing
  ones in `books-delete`, `network` and `visual` specs are legacy.

## CI

`.github/workflows/playwright.yml` runs on push and pull request to `master` and on manual dispatch. It checks out
`bookshelf-web/bookshelf-api` and `bookshelf-web/bookshelf-frontend` (default branch), builds both against Postgres 15,
runs the non-visual suites, regenerates and commits the Linux visual snapshots, runs visual and accessibility tests, then
publishes Allure to the `gh-pages` branch.

Artifacts: `allure-report` (30 days), `playwright-report` (14 days), `visual-snapshots-diff` on failure.
The "Run E2E Tests" workflow in the API and frontend repos can dispatch this one (secret `E2E_DISPATCH_TOKEN`).

## Git

History follows Conventional Commits in lowercase imperative: `test: ...`, `ci: ...`, optional scope such as `test(a11y): ...`.
Do not commit or push unless asked. Do not add AI-attribution trailers to commits or pull requests.

## Gotchas

- The suites assert pt-BR copy; `locale: 'pt-BR'` is set in the config.
- Google Books is called directly by the browser, so it is always mocked: route
  `/googleapis\.com\/books\/v1\/volumes/` and answer with `access-control-allow-origin: *`
  (see `tests/books/books-import-cover.spec.ts`). No test may depend on the real service.
- The book list request carries a query string (`page`, `limit`, `sortBy`...). Mock it with a regex such as
  `/\/api\/books(\?.*)?$/`, never an exact glob like `**/api/books`.
- The service worker is not registered when `navigator.webdriver` is set, so tests never see it.
- Payments are simulated and the Pix code is not payable. Use `simulate-pix-button` as `tests/store/store.spec.ts` does.
- Visual snapshots are per platform. `*-win32.png` come from local runs; `*-linux.png` are written by CI and committed as
  `ci: update Linux visual snapshots [skip ci]`. Do not overwrite Linux files from Windows.
  They live in `tests/visual/visual.spec.ts-snapshots/` (the README path is outdated).
- The CI accessibility step runs `tests/accessibility`, which does not exist; the accessibility specs are in
  `tests/visual/wcag.spec.ts`. `npm run test:ui` greps `@ui`, a tag no test uses.
- Locally `retries` is 0 and traces are `on-first-retry`, so pass `--trace on` to get one.

## Definition of done

- The new or changed spec passes with `npx playwright test <file> --repeat-each=5` on chromium and firefox, without flakiness.
- The related area still passes.
- No fixed sleeps, no real third-party calls, no selectors outside `data-testid`.
