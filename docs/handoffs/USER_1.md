# User 1 backend handoff

Date: November 7, 2026, America/Toronto. Branch: `claude/skillreceipt-work`. Shared ancestor: `9360e8a`. The lead explicitly requested implementing User 1 and publishing this branch.

## Delivered

- `c9718ea`: pinned Next/React/TypeScript/Tailwind/npm baseline; browser-safe contracts and exact source/reference/rubric; pure evaluator; bounded streamed validation; fixed fingerprint serialization; CSV escaping/formula protection; repository, auth, query and HTTP helpers; dataset/create/list/read/share/download APIs; evaluator/validation/storage/origin tests.
- `3179ced`: correct same-origin validation against incoming Host/protocol, covering Next's internally normalized hostname and rejecting forwarded-host spoofing.
- Setup, storage, session, fingerprint, boundary and integration notes are in [BASELINE.md](../BASELINE.md) and [ASSESSMENT.md](../ASSESSMENT.md).

No frontend implementation, coach route/adapter, substitute shared modules, existing receipt data or secrets were added from other owners. User 2 and User 3 branches remain separate. The branch is a runnable backend baseline; root UI is intentionally absent until User 2 is combined.

## Validation actually performed

Environment: Node 22.14.0, npm 10.9.2. Commands run in the User 1 checkout:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Observed: locked installation succeeded with zero audit findings at install time; strict typecheck passed; **28 unit tests passed**; production API build passed. The initial test-only header typing error was corrected. A runtime-data tracing warning was addressed by excluding the intentionally dynamic external store path from Turbopack source tracing. Rechecking after the origin fix is recorded by the final commit's checks.

The independent unit coverage includes exact decimal/zero parsing, invalid forms/precision/newline, source immutability, reference 100, uncleaned/empty/invented outputs, partial 20, duplicate 60, wrong canonical values, reconciliation, determinism/metadata independence, bounds/coercion/privilege stripping, malformed UTF-8/JSON, true streamed size cap, fingerprint invariants, CSV protection, owner isolation, atomic files/permissions, share rotation/revocation, persistence through a new repository, multi-instance-object in-process serialization, corrupt-record refusal, origin guard and safe errors.

## Temporary combined compatibility check

An isolated detached checkout under `/private/tmp` combined these exact inputs for verification only:

- User 1 backend `c9718ea` plus origin fix `3179ced`.
- User 2 frontend `532c7a5` and explicit handoff `2d73d59`.
- User 3 coach/tests/documentation `0fc6009`.

Nothing from this detached checkout is merged into `claude/skillreceipt-work` or `main`. It ran `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`: installation/typecheck/build passed and **53 combined unit tests passed**. Tailwind worker port binding required normal elevated tool execution in this sandbox; after a sandbox-denied attempt its generated temporary `.next` cache was cleared and the elevated build succeeded. No package workaround or UI alteration was needed.

The real Next-server independent HTTP suite was attempted. The first run caught the User 1 origin bug (valid Origin vs normalized internal hostname); that bug was fixed and regression-tested. A subsequent run without per-request deadlines stalled during invalid-input acceptance and hit its 180-second parent test deadline; it did not pass. Separate deadline-bounded diagnostics confirmed malformed JSON, unsupported type, large Content-Length bodies and chunked oversized bodies return safe 400, and invalid envelopes create no additional receipt.

A final diagnostic run used a temporary preload adding 10-second client request deadlines without changing application code or the assertions:

```bash
node --conditions=react-server --import tsx --import /private/tmp/skillreceipt-http-deadline.mjs --test tests/integration/receipts.test.ts
```

Observed: **9 of 10 nested scenarios passed**, including authoritative scoring and counterexamples, owner isolation, immutable metadata/order behavior, independent evidence/sharing/revocation/rotation, actual exports, formula protection, source download, malformed/oversized requests, cross-origin rejection, and persistence/revocation across two real process restarts. The coach scenario failed with HTTP 400 instead of 200; the parent consequently failed. The overall suite exited **1**, not a passing end-to-end result. No full HTTP or browser acceptance pass is claimed.

## Outstanding User 3 integration issue

The coach factory in User 3's `lib/server/coach.ts` rejects every `request.body !== null`. Actual Next POST requests can expose a non-null stream even with an empty body. The factory must check whether any bytes are present using a bounded read, accepting a genuinely empty stream while rejecting `{}`, custom prompts and nonempty bodies. Keep the owner/origin guards, deadline/concurrency limits and safe response contract. This issue is outside User 1's code and is not patched by changing auth or bypassing request validation.

User 3 should also give HTTP client requests a bounded deadline so failures cannot leave the runner hanging, then run the unmodified suite cleanly and perform actual browser/mobile QA. The existing UI coach timeout (30 seconds) is shorter than the server's maximum 45 seconds; coordinate that behavior before final demo acceptance. No model smoke or browser checks were rerun for this User 1 delivery.

## Ready for integration

User 1 implementation editing is stopped and this backend is handed off for integration. Preserve its commits and User 2/User 3 histories. Startup from this checkout is `npm ci` then `npm run dev`; no server is left running here. Local store defaults to `.data/`, override `SKILLRECEIPT_DATA_DIR` for isolated tests. Cookie lifetime is 30 days, local HTTP compatible, Secure on HTTPS. The assessment flow works without a model; the coach is optional and does not control scoring.

Known limits: one process/durable local filesystem; linear receipt/capability scans; no distributed locking or recovery; corrupt records fail safely; v1 consistency requires frozen rubric semantics; browser verification and clean combined end-to-end acceptance remain pending. This push does not merge into main or deploy the app.
