# resume-to-employer revision — November 7, 2026

This record describes the current app. Earlier guest-catalog and account-portal results below are historical.

## Verification completed

- Type checking passed.
- Unit tests: **95 passed, 0 failed**.
- Production build: passed.
- Real HTTP integration: **31 passed, 0 failed**, including the new resume/profile → assessed work → employer publication/search/report → revocation journey, owner isolation and process-restart persistence.
- Full Chromium production browser journey: actual TXT upload and keyword extraction; resume-based ranking; six-exercise browsing and empty search; consented simulated-camera QA attempt scoring 90/100; feedback; candidate opt-in; employer skill search and detailed report; private-plan exclusion; separate-context public link; link and directory revocation. All six worked examples submitted successfully. Desktop and 390px mobile layouts had no horizontal overflow or uncaught page errors.
- Dedicated camera production browser checks: consent before access; video-only constraints with no audio track; rendered preview with nonzero video width; tab/focus pause and answer blocking; resume; paste count without clipboard data; camera mute and reconnect; fullscreen-exit pause; camera cleanup after submission/navigation; denied-permission practice fallback; and late permission resolution after navigation.
- Visually inspected the actual desktop resume form, employer report, camera screen and phone resume form. Screenshots are in ignored `test-results/`.
- Diff whitespace check: passed.

## Evidence and scope

Camera tests use Chromium's fake video device and simulated permission/focus events where needed. They do not verify the PC's physical camera or establish independent authorship. The UI reports observations rather than a cheating verdict, and never calls the result a certification.

No raw resume bytes/text, video, audio or clipboard contents are persisted. Candidate profile publication starts private. Public reports include actual assessed work and disclosed session context, while private receipt capabilities and owner secrets remain excluded. Example answers are requested explicitly and the normal UI preserves their label; this local, anonymous prototype is not resistant to a determined caller altering requests or browser-reported signals.

The app remains local, with a single-process file repository. Durable shared storage is required before a Vercel deployment. No deployment is claimed.

---

## Earlier revisions

# Guest hackathon revision — November 7, 2026

Current product scope: [HACKATHON.md](HACKATHON.md). Older portal/account records below are historical and do not describe the current interface.

## Verified in this workspace

- `npm run typecheck`: passed.
- `npm test`: **81 passed, 0 failed**, including every new domain's full and partial scores, invalid input, versioned persistence, fingerprints, owner separation, sharing and revocation.
- `npm run build`: passed with the committed dependency lockfile and installed Node 24.
- `npm run test:e2e`: **24 passed, 0 failed** against real isolated Next production servers. Covers unauthenticated challenge pages, disabled registration/login, actual JavaScript execution, server-owned scoring, scenario owner/shared pages, CSV/JSON exports, access control, revocation and process-restart persistence. Existing sales, parser and compatibility-coach checks also pass.
- Playwright/Chromium desktop and mobile smoke: passed across all six challenge types. Verified catalog filtering, an actual imperfect QA attempt (90), all four scenario examples (100), engineering example (80), sales example (100), public share in a separate browser context, revocation, source-material visibility on mobile and no page-level horizontal overflow. No uncaught page errors.
- Visually inspected desktop home/catalog and mobile Product Analytics exercise screenshots. Captures are under ignored `test-results/`.
- `git diff --check`: passed.

## Fixes found during verification

The Windows HTTP harness now skips `.next/dev` and cache files, dereferences build-time dependency links, and uses a junction for the temporary server's node_modules. Product fixes include preserving source visibility on phone layouts, removing old sign-in instructions from unavailable receipts, and consistent role titles in shared views.

## Remaining scope

The app is local and uses a single-process file store. Durable shared storage is still required before Vercel deployment. Browser smoke is not an exhaustive accessibility audit. Real camera/proctoring checks are irrelevant to this revision because that interface has been removed. No public deployment is claimed.

---

## Historical validation records

# Dark portals and coding revision: actual validation

Date: November 7, 2026. Local branch `feat/dark-portals-coding`, based on `d9b5662`. Scope: [DARK_PORTALS_SPEC.md](DARK_PORTALS_SPEC.md). This section supersedes earlier status below.

## Checks completed

- `npm ci`: exit 0; pinned installation, zero reported audit findings at that time.
- `npm run typecheck`: exit 0, including new account and employer API routes.
- `npm test`: **71 passed**, zero failed/skipped/cancelled.
- `npm run build -- --webpack`: exit 0; all pages and API routes compiled. Default Turbopack compilation hit the host's local-port restriction (`Operation not permitted`) in its CSS worker. The supported Webpack build succeeds; no application dependency or assertion was removed.
- `npm run test:e2e`: exit 0 with the normal parallel runner. **19 nested HTTP scenarios passed** across three real production-server suites; Node reports **22 tests** including parents. Temporary directories and independent cookie jars are used.
- `git diff --check`: clean.

New account checks cover salted password hashes, hashed/expiring/revoked sessions, stable candidate IDs and ownership after login, duplicate/wrong-role rejection, one-account ownership binding, candidate-only uploads, employer-only lookup, private defaults, explicit opt-in and resume access revocation. HTTP checks additionally exercise same-origin rejection, protected workspaces, forbidden employer submissions, private resume persistence/download, excluded ownership/account secrets, real restart/login recovery, and denial with revoked account cookies or an old ownership cookie alone.

Coding checks execute the actual QuickJS WASM VM: reference function passes all four cases; starter returns zero and passes two; malformed code, wrong return types, unavailable host/network APIs, infinite loops and memory growth fail within limits. Three correct decisions plus starter code score **80**, a correct implementation scores **100**, and code changes alter the artifact fingerprint. Only the three asked decisions and actual code appear in the new receipt/export; unasked decisions are excluded. New records reopen without re-executing user code. Original pipeline and sales scoring/serialization/share behavior remains covered.

During acceptance, an intermittent timeout appeared in the oversized chunked-upload rejection, including a sequential diagnostic run. The JSON reader now drains a small rejected tail, bounded by 64 KiB and 200 ms, before cancelling the stream and returning the same 400 size-limit error. The accepted JSON limit remains 64 KiB; the rejected tail is never buffered or parsed. Regression tests cover bounded rejection/cancellation and a short finite tail. The unchanged full parallel HTTP assertions then passed; temporary tracing was removed and the test runner was restored.

## Browser observation and limits

Native Brave loaded the isolated production preview on port 3216 using synthetic candidate/employer fixtures and a synthetic resume. Screenshots were inspected for the dark candidate sign-in and candidate dashboard. Existing-account sign-in succeeded and the dashboard showed the correct candidate ID, resume controls, 80-point demo record and profile-access state. No default accounts or passwords are shipped in the application. Synthetic preview storage was removed and the owned preview server stopped.

The browser-access host was unavailable. Native control was interrupted by user activity and then timed out during challenge navigation. Full question/code interaction, employer search interaction, keyboard/focus checks, console inspection, 390 px layout and physical camera/visibility/track-stop behavior are **not** claimed as browser-verified. Their API/scoring/authorization paths are covered by the real-server tests. No local screenshot files were created.

A query-navigation issue could leave the wrong login role selected; the role now keys the login form, so navigating between candidate and employer sign-in remounts the correct form. Camera stop/pause is also available outside the desktop-only sidebar. These small UI fixes were typechecked and compiled; further device rehearsal remains appropriate.

This remains a local prototype with self-registered employer accounts, no email verification/password recovery, bounded but in-process document parsing and a limited coding VM. Camera signals cannot establish identity or prevent outside help. No public deployment or automatic remote push is part of this local revision.

---

# Role-led demo revision: actual validation

This section supersedes the previous integrated baseline's status below. The work is on local branch `feat/role-assessment-demo`, based on `254f554`. The lead requested resume upload, job-role selection, a practical test, session monitoring and a clear score/improvement experience. See [DEMO_V2_SPEC.md](DEMO_V2_SPEC.md) for the revised scope.

## Checks actually completed

`npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` all exited **0** after the new packages/features were integrated. Installation reported zero npm audit findings at that time.

- **64 unit tests passed**, zero failed/skipped/cancelled: the original 55 plus nine new resume/pipeline cases.
- **14 HTTP scenarios passed** across two real-server suites; Node reports **16 tests** including the two parent cases. Zero failed/skipped/cancelled.
- Production build compiled all routes, including `/start`, `/challenge/junior-data-engineer` and `/api/resume`.
- New tests perform actual PDF and DOCX text extraction from tiny synthetic in-memory documents, plus TXT parsing. They verify that only filename/skill keywords are returned, raw personal text is absent, and upload creates no receipt. Unsupported/mismatched/oversized documents are rejected.
- The pipeline's reference configuration scores **100**. Each incorrect choice loses exactly its published points. The presentation example scores **75**, with schema and partitioning failed. The simulator exercises latest-vs-first updates, missing values and duplicate-on-append replay.
- Pipeline receipts persist under their own versions, retain server-authoritative scoring despite forged client claims, enforce owner isolation, render private practice steps, export actual configuration and support independent employer sharing/revocation. Employer evidence contains session context but no resume or private practice plan.
- Camera/tab counts and mode do not change score/fingerprint. Presentation mode is forcibly labeled demo. Invalid session fields/counters and unsupported answer values are rejected. Pipeline coach requests use role-specific fixed rules, not legacy R008 cleaning guidance; mocked advice never changes the 75-point receipt.
- Original sales rubric, canonical money handling, old receipt serialization, ownership, exports, sharing, coach failures and real restart persistence remain covered and passed.

## Browser and device observation

A production preview ran on loopback port 3215 with isolated temporary storage. Native Brave loaded the new `/start` page. Actual clicks on **Use a sample resume** and **Choose my role** succeeded. Accessibility snapshots showed the sample label and SQL/Python/ETL keywords, the resume-does-not-score explanation, the four-step journey, search input and both supported role cards. Camera access was not requested during QA.

Further navigation attempts were interrupted by native browser control reporting that the user changed the app; no complete interactive/mobile pass is claimed. Physical camera permissions/preview, visibility pause/resume, stopping tracks, full six-question keyboard interaction and mobile visual layout still need a manual device rehearsal. These features are implemented but not hardware-verified here. No recording, audio capture or tab-content access is implemented. No screenshots from this revision are claimed.

The separate native-browser observation from the older baseline below is historical and does not prove the redesigned UI's complete browser acceptance. The preview server is stopped and its temporary synthetic store removed at teardown.

## Remaining product limits

Only the two listed roles are supported. The Engineer sample tests six configuration decisions rather than every industry skill, live SQL/Python or a production cloud pipeline. resume detection is bounded keyword matching, not verified qualifications or a comprehensive resume assessment. Camera/visibility data is client-reported and cannot prove independent authorship or prevent other-device assistance. Local PDF/DOCX parsing needs resource-isolated workers/rate limits and further hostile-document hardening before public production use. Nothing was deployed or automatically pushed by this local feature task.

---

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
