---
name: update-visual-snapshots
description: Use when a UI change makes the visual regression tests in tests/visual differ and the baselines may need updating, or when adding a new screenshot test.
---

# Update visual snapshots

Baselines live in `tests/visual/visual.spec.ts-snapshots/`, one file per name, browser project and platform
(`dashboard-empty-chromium-win32.png`, `dashboard-empty-chromium-linux.png`, ...).

- `*-win32.png` are produced by local runs on Windows.
- `*-linux.png` are produced by CI, which regenerates them and pushes `ci: update Linux visual snapshots [skip ci]`.
  Never overwrite or hand-edit Linux files from a Windows run.

Steps:
1. Run `npx playwright test tests/visual --project=chromium` and open the diff (`npm run test:report`). Confirm the difference
   is the intended UI change and not a layout bug, a missing book, or a `data-testid` that moved.
2. If intended, update the local baselines: `npm run snapshots:update` (all projects) or add `--project=<name>` to limit it.
3. Run `npx playwright test tests/visual` again; it must pass twice in a row.
4. Review the changed `*-win32.png` files; they are the only snapshot files to commit from a local run. CI refreshes the Linux ones.

New screenshot test: use `visualPage` (fixed user per browser, serial mode), wait for the content (`waitForSelector` on a
`data-testid`, `networkidle`), and call `toHaveScreenshot('<name>.png', ...)` with the options already used in
`tests/visual/visual.spec.ts`. Keep data deterministic: fixed titles and authors, no timestamps on screen.
