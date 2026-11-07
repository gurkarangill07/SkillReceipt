# Integrated validation record

Date: **November 7, 2026**, America/Toronto. Environment: **Node 22.14.0**, **npm 10.9.2**. Integration inputs: User 1 `963dc1d`, User 2 `2d73d59`, User 3 `0fc6009`, plus the targeted fixes in [INTEGRATION.md](INTEGRATION.md). This supersedes the earlier preparatory User 3 status; earlier role handoffs remain historical.

## Commands actually run on combined source

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

| Check | Actual outcome |
| --- | --- |
| Locked installation | Exit 0; installed pinned packages successfully. npm reported zero audit findings at installation time. |
| Strict TypeScript / Next route types | Exit 0. |
| Combined unit tests | Exit 0; **55 passed**, zero failed/skipped/cancelled. |
| Production build | Exit 0; all pages and routes compiled/generated successfully. |
| Real-server HTTP acceptance | Exit 0; **all 10 nested scenarios passed**. Node reports 11 tests including the parent; zero failed/skipped/cancelled. |

## Unit coverage

28 backend tests cover exact cents/zero/invalid forms and bounds, source immutability, correct 100, uncleaned/empty/invented/partial/duplicate behavior, canonical-value fidelity, reconciliation, determinism/metadata independence, envelope/coercion/privilege stripping, malformed JSON/UTF-8, actual streamed 64 KiB cap, fingerprint invariants, CSV protection, owner separation, atomic storage/permissions, sharing lifecycle, serialized concurrency, corruption refusal, origin checks and safe errors.

27 coach/endpoint tests cover fixed-rule/flag-only outbound payload, exclusion of arbitrary strings and personal/owner data, local-only URL/config and redirects, offline/missing/HTTP failures, deadline and stalled body cancellation, streamed response cap, malformed/unknown/duplicate/markup selection rejection, fresh-exercise all-pass behavior, owner/origin delegation, body rejection, Next-style empty request streams, unfinished request-body timeout, transient safe JSON, duplicate/global/cooldown/entry bounds, deterministic fallback and unchanged fixture data. Mocks are identified as mocks; they do not claim browser interaction.

## HTTP acceptance

The normal npm script starts a **real Next production server** from an isolated copied build, a local mock model listener, temporary working/storage directories and independent cookie jars, then stops servers and cleans up. It does not use a real user data directory or a manually running app.

All ten scenarios passed:

1. Server-authoritative evaluation despite forged score/evaluation/time/owner fields; cookie issuance/attributes, owner reads/list and cross-session denial for reads/downloads/share/coach.
2. Independent scoring counterexamples through the actual API: reference, partial, unknown/blank/R008 IDs, duplicates, incorrect canonical values, invalid money forms, and dishonest claimed score.
3. Repeat attempts, metadata, row order and immutable previous receipts/fingerprints.
4. Explicit share, independent HTML evidence, check breakdown/artifact, real JSON/CSV exports, no private fields, revoke and token rotation.
5. CSV of actual submitted cells, quoting/escaping and spreadsheet formula neutralization.
6. Exact synthetic source CSV, duplicate rows, intentional whitespace and blank revenue.
7. Malformed/coerced/oversized envelopes, malformed JSON/type, actual chunked size limit, no receipt or cookie after invalid submission.
8. Origin rejection and safe unavailable private/public paths.
9. Optional coach success, privacy, malformed/offline/markup handling, cooldown/duplicates, unaltered receipts and usable sharing/export while coaching is unavailable.
10. Owner receipt and sharing persistence across real process restart, and revoked link still unavailable after another restart.

## Real local model: separate observed result

Existing Ollama models were rechecked earlier in this session: `llama3.2:latest`, `gemma3:4b`, `deepseek-r1:8b`. No model was downloaded/replaced and no cloud service was used.

For the integrated smoke, a one-off Node script used the production app at **http://127.0.0.1:3210** with an isolated temporary store. It created a synthetic demo submission through POST /api/receipts using CookieClient, sent a bodyless owner POST to its coach route, then fetched the owner receipt and asserted deep equality with the original.

Observed: **HTTP 200**, model **llama3.2:latest**, about **3,309 ms** for this single request; advice was the approved fresh synthetic exercise; original score remained **100** and the full receipt was deeply unchanged. This is an endpoint smoke, not a performance or general model-quality benchmark. Mock HTTP coverage above separately verifies offline/malformed behavior.

Two preliminary free-form generations during initial development suggested incorrect rubric guidance (decimal padding / retaining R008). That unsafe output path was replaced before integration: the model now selects approved identifiers and the server returns only fixed rubric-aligned practice wording. Unknown suggestions fail safely.

## Browser evidence and gap

The browser access host reported unavailable. A native Chrome attempt timed out; native Brave access subsequently worked. A new tab opened the actual production app's landing page. Its screenshot was visually inspected in this conversation: warm background/forest-green hierarchy, receipt preview clearly labeled illustrative, readable primary action and no visible desktop overflow. Page title, navigation and evidence boundary were present in the accessibility snapshot.

Activating the challenge reached the real assessment page. A fresh native accessibility snapshot showed the proper page title, synthetic brief, explicit month/day/year convention, full-rubric disclosure, all twelve source rows, editable labels/values, blank missing revenue, remove controls, draft-save status, demo/reset, total, optional context and acknowledgment/submit controls.

Further native cell interaction reported that the user changed the app; the next state request timed out/reset. Consequently **successful manual editing/submission, keyboard/focus flow, full share/coach UI, mobile sizing/overflow and browser-console checks are not claimed**. The desktop screenshot is an in-chat inspection artifact; no local PNG screenshot files were saved. User 2's earlier fixture-browser checks remain documented in that role's handoff and are not substituted for integrated browser acceptance. See [the remaining checklist](../tests/browser/README.md).

## Earlier failures and resolution

User 1's earlier HTTP attempt exposed Next's normalized internal hostname; origin matching was fixed against the incoming Host/protocol and regression-tested. The initial coach non-null-body check rejected valid empty Next POST streams; it now examines actual bytes with a bounded deadline. Test clients lacked per-request deadlines and an earlier run hit its 180-second parent timeout; the normal helper now bounds requests and the full unmodified assertions pass. A temporary build's sandbox-denied Tailwind worker error was resolved by clearing that generated cache and rebuilding with normal execution permission. No disabled grading rule, weakened authorization, new cloud service or fixture backend was used to pass tests.

## Material limitations

This is a local single-process filesystem prototype with in-process locking/rate limits, linear lookups and no recovery service; it is not suitable for ephemeral/multi-instance hosting. No public deployment or external-employer reachability is claimed. Full interactive/mobile browser acceptance remains outstanding. No identity, independent authorship, credentials, broad competence or hiring suitability is verified. Actual tracked source excludes runtime receipts, dependency/build output, local secrets and capability values.
