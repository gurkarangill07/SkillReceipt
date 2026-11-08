# Browser checks

Two Playwright/Chromium scripts exercise the working app:

| Script | Scope |
| --- | --- |
| `demo-smoke.mjs` | Résumé upload/sample, recommendations, assessment results, candidate publication, employer search and detailed reports, downloads/sharing, example labels, and desktop/mobile layouts |
| `session-smoke.mjs` | Explicit camera consent, local preview, pause/resume, camera interruption/reconnect, paste observations, optional fullscreen exit, practice fallback and media cleanup |

Session automation uses a **fake media device**, injected focus/paste events where headless browsers need them, and simulated permission errors. It does not verify a physical camera or establish that the assessment is cheating-proof. See [docs/VALIDATION.md](../../docs/VALIDATION.md) for observed results and remaining limits.

## Run

Use an installed Playwright package and Chromium. If Playwright is outside this checkout, set `PLAYWRIGHT_MODULE` to its package directory; an existing Chromium binary can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Build first, then run the candidate/employer checks:

```powershell
npm.cmd run build
node --import tsx tests/browser/demo-smoke.mjs
```

By default, `demo-smoke.mjs` starts an isolated production server with temporary profiles/receipts and removes its runtime directory afterward. Set `SKILLRECEIPT_BROWSER_URL` to target an existing server instead.

After building, run the dedicated camera checks:

```powershell
node tests/browser/session-smoke.mjs
```

`session-smoke.mjs` also starts an isolated production server by default. Set `SKILLRECEIPT_BROWSER_URL` only when targeting an existing server; that mode creates results under the test browser’s private cookie in that server’s store.

Screenshots go to ignored `test-results/`. These scripts fail on uncaught page errors. They cover representative interactions and responsive layouts, not every assistive-technology or hardware combination.
