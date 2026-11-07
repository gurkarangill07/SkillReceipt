# User 3 integration notes

## Current state

Work is on local branch `feat/coach-quality`, descending from shared docs commit `9360e8a`. The lead confirmed on November 7, 2026 that Users 1 and 2 had not started. Their application baseline, UI, and explicit handoffs are still pending. No broad edits to another owner's files or final merge have occurred.

## Delivered interfaces

`lib/server/coach.ts` exports the required `getPracticeAdvice(evaluation: Evaluation): Promise<{ advice: string; model: string }>` and testable factory functions. It imports only shared types plus the `server-only` boundary. It does not implement an evaluator or storage layer.

`POST /api/receipts/[id]/coach` uses User 1's `getRequestReceipt(request, id)` and `assertSameOrigin(request)` through a small endpoint adapter. It awaits Next route params and uses the Node runtime. The shared HTTP contract is unchanged.

The production route requires User 1 to supply `lib/contracts.ts`, `lib/server/auth.ts`, and `lib/server/http.ts`. These are intentionally not mocked or replaced in application source.

## Request to User 1

- Supply the documented shared modules and compatible Next/TypeScript configuration, including the `server-only` package/boundary.
- Add agreed scripts to `package.json` and its lockfile. User 3 added no packages and did not create configuration or a substitute app.
- Coach unit tests use built-in `node:test` and work on the observed Node 22.14.0 with the command below. If the team's primary runner is Vitest, exclude these node:test files from Vitest discovery and provide a separate script, or coordinate an explicit runner migration. Do not run node:test cases as Vitest suites.
- Decide the storage-directory environment variable together. The HTTP helper proposes `SKILLRECEIPT_DATA_DIR`; if the baseline uses another name, pass its name as `SKILLRECEIPT_TEST_DATA_ENV` to the test process. No storage variable has been added to application configuration by User 3.
- Ensure the store resolves default paths from the running server's working directory, not an absolute developer directory. The HTTP harness copies the production build into a temporary working directory and does not copy `.env.local`.
- Agree exact field/total length bounds and complete the master-required evaluator/storage/validation unit tests. Independent HTTP fixtures use the master's suggested ID/date/region/revenue bounds (40/60/60/40).

## Request to User 2

Call the coach with **no body**:

```ts
const response = await fetch(`/api/receipts/${id}/coach`, {
  method: 'POST',
  credentials: 'same-origin',
});
```

Do not send `{}`, an artifact, a score, or a custom prompt. Owner authorization returns 404 when unavailable; origin errors return 400; cooldown/global bounds return 429 with `Retry-After`; model errors return 503; unexpected authorization/storage errors return a safe 500. Every response uses private/no-store.

Success is exactly `{ advice, model, assessed: false }`. Render `advice` as text with preserved line breaks. Use the master label “AI-generated practice advice · not assessed,” loading/error/live-region states, and a 30-second retry explanation. Keep deterministic check feedback visible before/after any coach request. Do not persist advice or include it in public evidence/exports.

The model chooses up to three approved exercises for failed checks; all-pass receipts can only receive a fresh-exercise suggestion. The server returns approved wording, never arbitrary model instructions. This design was chosen after real model testing produced incorrect free-form advice. It leaves the frontend/API contract unchanged.

## Local coach behavior

- Server-only `OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`; `OLLAMA_MODEL` defaults to existing `llama3.2:latest`.
- Only loopback URLs are accepted; credentials, query strings, extra paths, and redirects are rejected. There is no cloud fallback or model download.
- Prompt data comes from fixed assessment/rule/exercise descriptions and boolean flags. Submitted values, observations, labels, names, reflections, receipt IDs, session/share tokens, and files are excluded.
- Generation uses a structured JSON schema containing only allowed exercise identifiers. Unknown, duplicate, markup, or irrelevant selections fail safely. Approved plain-text advice is transient.
- Deadline: 45 seconds covering fetch and body reads; output envelope: 32,768 actual streamed bytes; at most three approved exercises; generation budget: 80 tokens.
- Per-process policy: one pending request per receipt, 30-second cooldown after completion or failure, two global in-flight generations, at most 256 cooldown entries with expired entries removed.
- Rate state resets on server restart and is not a distributed rate limiter. Existing master single-process/local-persistence limits still apply.

## Commands

Run now, without npm dependencies or a model:

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs --test tests/unit/coach.test.ts
```

The test-only loader strips TypeScript via Node, resolves extensionless local imports, and substitutes an empty `server-only` marker only inside that explicit test process. It does not supply missing contracts, auth, storage, Next, scoring, or UI. Type stripping is **not** typechecking. Never load this test helper into the application or use it to bypass a Next production build.

Optional explicit real-model smoke (not part of automated unit tests):

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs ./tests/helpers/coach-smoke.ts
```

After the baseline and UI are combined and a production build exists:

```bash
npm ci
npm run typecheck
npm test
npm run build
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs --test tests/integration/receipts.test.ts
```

User 1 should provide the final `npm run test:e2e` equivalent for the last command. The harness starts/stops a real Next production server, creates independent cookie jars, uses temporary storage/working directories and a local mock Ollama listener, restarts the server on the same directory to check persistence, then cleans up. It does not target an existing app URL or actual user receipts. It needs permission to bind loopback listeners and reach them.

Its build/config copying assumes the baseline's production config is self-contained. Adjust only this owned helper after inspecting User 1's actual configuration if it needs extra non-secret local files. Never copy a real `.env.local` or runtime receipt directory to make tests pass.

## Final integration gate

Wait for explicit User 1 and User 2 handoffs and verify their common baseline. Then preserve all commits on a clean `integration/skillreceipt` branch, apply minimum coordinated fixes, and run the full checks plus [browser acceptance](../tests/browser/README.md). Record exact outcomes in [VALIDATION.md](VALIDATION.md) and complete [the User 3 handoff](handoffs/USER_3.md). Final app integration is not complete on this preparatory branch.
