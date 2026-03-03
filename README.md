# Bookshelf — Playwright Test Suite

E2E and visual regression test suite for the Bookshelf application, built with [Playwright](https://playwright.dev/).

## Stack

- **Playwright** — browser automation (Chromium, Firefox, Mobile Chrome)
- **TypeScript** — type-safe tests
- **axe-playwright** — automated accessibility (WCAG 2.1 AA)
- **GitHub Actions** — CI pipeline

## Structure

```
tests/
├── auth/           # Login, register, session, logout
├── books/          # Create, edit, delete
├── dashboard/      # Stats, empty state, real-time updates
├── e2e/            # Full user journeys
├── network/        # Network interception (mock API, loading states, errors)
└── visual/         # Screenshot regression + accessibility (axe-core)

helpers/
├── api.ts          # API helpers for test setup/teardown
└── pages.ts        # Page Object Model

fixtures/
└── index.ts        # Custom fixtures (authenticatedPage, cleanupBooks, etc.)
```

## Prerequisites

- Node.js 20+
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`

## Setup

```bash
npm install
npx playwright install --with-deps chromium firefox
cp .env.example .env
```

## Running Tests

```bash
# All tests
npm test

# Specific suites
npm run test:auth
npm run test:books
npm run test:dashboard
npm run test:e2e
npm run test:network
npm run test:visual

# By tag
npm run test:smoke      # Critical path only
npm run test:a11y       # Accessibility only

# Debug
npm run test:headed     # With browser visible
npm run test:debug      # Step-by-step debugger
npm run test:report     # Open HTML report
```

## Visual Regression

On first run, baseline screenshots are generated and saved to `tests/visual/__snapshots__/`.
Commit them to the repository so CI can compare against them.

To update baselines after intentional UI changes:
```bash
npm run snapshots:update
```

## What Playwright Adds Beyond Robot Framework

| Feature | Robot | Playwright |
|---|---|---|
| Network interception | ❌ | ✅ Mock any API response |
| Visual regression | ❌ | ✅ toHaveScreenshot() |
| axe-core a11y engine | ❌ | ✅ Full WCAG scan |
| Request payload assertion | ❌ | ✅ Inspect what was sent |
| Loading state testing | ❌ | ✅ Delay/abort requests |
| Multi-context isolation | ❌ | ✅ Parallel browser contexts |
| localStorage inspection | ❌ | ✅ page.evaluate() |
| Video on failure | ❌ | ✅ Built-in |
| Trace viewer | ❌ | ✅ Full action trace |

## CI

Tests run automatically on push and pull request via GitHub Actions.
The HTML report is uploaded as an artifact and retained for 14 days.
