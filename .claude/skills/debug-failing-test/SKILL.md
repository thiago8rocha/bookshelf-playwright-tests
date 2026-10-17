---
name: debug-failing-test
description: Use when a Playwright test in this repo fails or is flaky, to find whether the app or the test is wrong and fix the cause without sleeps or retries.
---

# Debug a failing or flaky test

1. Reproduce one test, one project: `npx playwright test <file> -g "<title>" --project=chromium --trace on`.
   For flakiness add `--repeat-each=10`. Locally `retries` is 0 and traces are only on first retry, hence `--trace on`.
2. Look at the evidence before changing anything:
   - `npx playwright show-trace test-results/<test-folder>/trace.zip`: actions, network calls, console, DOM at each step.
   - `npm run test:report` for screenshots and videos; `npx playwright test --ui` or `npm run test:debug` to step through.
   - The API console output for the failing request (status and message).
3. Decide whose bug it is:
   - Request returned 4xx/5xx or the UI shows the wrong thing for a valid flow: app bug. Report it for the right repo
     (`bookshelf-api` or `bookshelf-frontend`) and do not weaken the assertion.
   - Missing or renamed `data-testid`: fix the frontend, then the page object.
   - Shared data (same title, same user, the shared admin account, the shared catalog) under parallel workers: make the data unique per test.
   - Mock does not match: the list URL has a query string and Google Books needs CORS headers; see AGENTS.md gotchas.
   - Visual diff: check whether the change is intended before touching baselines (`update-visual-snapshots`).
4. Fix the cause: wait on the state the test needs (`expect(...).toBeVisible()`, a response, a `data-testid`).
   Never add `waitForTimeout`, bigger timeouts or retries to hide it.
5. Prove it: `npx playwright test <file> --repeat-each=10` on chromium and firefox, then the whole area.
