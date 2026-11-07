# Validation record

Date: **November 7, 2026**, America/Toronto. Environment observed: Node **v22.14.0**, npm **10.9.2**. Branch: `feat/coach-quality`, from docs-only baseline `9360e8a`.

## Current conclusion

User 3's coach adapter and delegated endpoint logic pass **25 mocked unit tests**. A small real request through the final adapter succeeded against existing local `llama3.2:latest`. This verifies the isolated coaching implementation, not the complete application. User 1's baseline/shared modules and User 2's UI are absent; the final application is not integrated or runnable yet.

## Automated unit checks actually run

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs --test tests/unit/coach.test.ts
```

Observed: exit **0**, **25 tests passed**, zero failed/skipped/cancelled. Node printed its expected experimental type-stripping warnings. No npm package, hosted service, scoring implementation, or live model is required for this command.

Coverage includes:

- Fixed rubric/flag-only payload, exclusion of name/reflection/receipt ID/share token and arbitrary check labels/rules/observations, and unchanged evaluation input.
- Existing-model configuration, loopback-only endpoint validation, redirect rejection, bounded configuration, safe offline/HTTP/missing-model errors.
- Deadline for fetch and stalled body reads, stream cancellation, actual streamed-byte cap without trusting Content-Length, malformed/empty/unfinished/oversized output.
- Approved exercise selections only, duplicate/irrelevant/markup rejection, fresh exercise on all-pass results. Tests inspect prompt data independently of the evaluator.
- Delegation to shared origin/owner helpers, 400 for request bodies/custom prompts, 404 when unauthorized, safe 500 for authorization/storage failure.
- Exact coach response shape and private/no-store policy, one pending request per receipt, global concurrency cap, cooldown and bounded/expiring entry count, safe deterministic fallback on 503.

The endpoint tests inject origin/authorization functions and a receipt fixture. They **do not** verify User 1's real session, persistence, origin implementation, a Next route running over HTTP, or the browser panel.

## Real local-model checks actually run

First, `GET http://127.0.0.1:11434/api/tags` succeeded outside the execution network sandbox. Observed installed models: `llama3.2:latest`, `gemma3:4b`, `deepseek-r1:8b`. No model was downloaded or replaced.

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs ./tests/helpers/coach-smoke.ts
```

The smoke uses a synthetic evaluation with failed `dates` and `total` flags; it sends no submitted artifact or personal information.

Two preliminary free-form generations completed but gave misleading advice: one implied required two-decimal padding; another suggested retaining missing-revenue order R008. They were **not accepted as evidence of useful coaching**. This prompted the final design: the model selects approved exercise identifiers, and the adapter rejects other selections and returns only fixed rubric-aligned exercise wording.

Observed with the **final implementation**: exit **0**, `llama3.2:latest`, approximately **1,136 ms** for this one request. Returned:

> 1. Practice converting month/day/year and named-month dates to YYYY-MM-DD while preserving each order's original date.
> 2. Practice converting CAD decimals to integer cents, summing valid rows, then expressing the reconciled total in CAD.

The smoke asserted the evaluation was deeply unchanged. This was an adapter smoke, not an HTTP endpoint, stored-receipt/fingerprint, browser, performance, or model-quality benchmark. Different model selections can occur; validation always restricts the result to allowed exercises.

## Syntax checks actually run

```bash
node --check tests/helpers/next-server.mjs
node --check tests/helpers/http-client.mjs
node --experimental-strip-types --check 'app/api/receipts/[id]/coach/route.ts'
node --experimental-strip-types --check tests/integration/receipts.test.ts
```

Observed: exit **0**. These are syntax checks, **not TypeScript typechecking**.

## HTTP acceptance: authored, prerequisite failure observed

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs --test tests/integration/receipts.test.ts
```

Observed: exit **1** at the explicit preflight: “HTTP integration requires User 1's runnable baseline, npm ci, and npm run build first. No test server or receipts were created.” No application HTTP assertions ran; no HTTP pass is claimed.

The suite is prepared to run against an isolated copy of a real Next production build with independent cookie jars and a local mock model. It covers scoring counterexamples and forged scores, owner read/list/download/share/coach separation, sharing/rotation/revocation, independent HTML evidence, actual JSON/CSV content, formula escaping, source CSV, validation limits, streamed oversized JSON, cross-origin mutation, coach privacy/failures, and persistence/revocation across server restarts.

See [INTEGRATION.md](INTEGRATION.md) for storage-variable coordination, temporary-directory/server lifecycle, and runner compatibility. These tests must still be run and adjusted to the actual baseline where its agreed configuration differs; changing the rubric to make them pass is not permitted.

## Remaining checks and limits

| Check | Observed status |
| --- | --- |
| `npm ci` | Not run: no package/lockfile from User 1 yet. |
| `npm run typecheck` | Not run: shared types/Next dependencies/config are absent. |
| Full team `npm test` | Not run: app/evaluator/storage tests and package scripts are absent. |
| `npm run build` / `npm start` | Not run: no application baseline or UI. |
| Real app HTTP integration | Not run beyond the failing prerequisite described above. |
| Browser desktop/mobile/keyboard QA | Not run: application pages are absent. Available browser tooling can be used after integration. |
| Screenshots | None captured; no rendered app exists on this branch. |
| Final integration | Pending explicit User 1/User 2 handoffs and a common runnable baseline. |

Known implementation limits: process-local cooldown/concurrency state resets on restart; no distributed rate limiting; no hosted-model fallback; local model is optional; generated advice is not evidence. UI safety and advice exclusion from real receipts/public evidence remain integration acceptance requirements. Local persistence, session lifetime, and fingerprint serialization must be documented from User 1's actual implementation.
