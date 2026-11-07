# SkillReceipt

> Turn practical work into evidence someone else can inspect.

A UNHack 2026 prototype for early-career job seekers: complete a synthetic sales-data cleanup challenge, submit the work, receive a receipt from published deterministic checks, and explicitly enable a read-only evidence link for a reviewer.

**Current status: User 3's coach and tests are prepared on `feat/coach-quality`.** The shared Next.js baseline, evaluator/store/APIs, package scripts, and UI from Users 1 and 2 are still pending. This branch is not a runnable combined application. There is no deployed app. See [actual verification results](docs/VALIDATION.md) and [integration notes](docs/INTEGRATION.md).

## Start here

1. Read [the master specification](docs/IMPLEMENTATION_SPEC.md).
2. Read [team roles and startup order](docs/TEAM.md).
3. Follow [the shared interface contract](docs/SHARED_CONTRACT.md).
4. Follow [the contribution workflow](CONTRIBUTING.md) and your assigned role prompt.

User 3's supplied assignment is available in [docs/assignments/USER_3.md](docs/assignments/USER_3.md). Users 1 and 2 should use their own assignments from the team lead; their full assignment prompts have not been supplied here.

## Get the repository

```bash
git clone https://github.com/gurkarangill07/SkillReceipt.git
cd SkillReceipt
```

If you already cloned it, commit or otherwise preserve your own work, then update your local `main` with `git pull --ff-only origin main`. Each developer uses their own clone and feature branch. See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete sequence.

There is no `package.json` yet, so `npm ci` and `npm run dev` are not available. The planned stack is Next.js App Router, React, strict TypeScript, Tailwind CSS, npm, and local server persistence, targeting Node 22 or a newer supported LTS. User 1 owns compatible pinned versions and the lockfile.

After that baseline arrives, the required application workflow is:

```bash
npm ci
npm run dev
# After stopping the development server:
npm run typecheck
npm test
npm run build
npm start
```

These application commands are pending, not verified on this preparatory branch. Use the URL printed by the eventual server; no app server is running from this branch.

## Team ownership

| Role | Responsibility |
| --- | --- |
| User 1 | Shared baseline, configuration/lockfile, contracts, dataset, deterministic evaluator, validation, ownership/storage/query helpers, and APIs except coaching. |
| User 2 | All UI, addressable pages, assessment workspace, receipt/evidence views, sharing controls, and coach panel. |
| User 3 / team lead | Local coaching adapter and endpoint, independent tests, final documentation, and final integration after Users 1 and 2 hand off. |

## Product boundaries

- One assessment: `sales-cleaning-v1`, rubric `deterministic-v1`; reference total **1285.50 CAD**.
- Rules score submitted work. Optional local Ollama advice helps practice and never grades or changes a receipt.
- This is **not a résumé builder** and does not verify identity, authorship, credentials, general competence, or hiring suitability.
- Sharing starts disabled. Owners explicitly enable and can revoke a link; saved copies cannot be recalled.
- No secrets, runtime receipts, owner/share tokens, dependency folders, or build output belong in Git.
- Publishing starter documentation does not authorize deployment or unrelated feature pushes.

## Assessment and score interpretation

The one challenge asks for cleanup of a synthetic October sales export. Slash dates are **month/day/year**. Remove the extra R004 and R009 copies, quarantine R008 because revenue is unknown, and retain the other nine valid orders exactly once. Preserve actual dates/values, standardize dates to `YYYY-MM-DD` and regions to Ontario/Quebec/British Columbia, use plain nonnegative decimal revenue with at most two decimal places, and enter a CAD total. Money comparisons use integer cents. Source/reference data and exact edge behavior live in the [master spec](docs/IMPLEMENTATION_SPEC.md).

| Published check | Points | Required property |
| --- | --- | --- |
| Unique order IDs | 20 | Nonempty output, valid reference IDs only, no duplicates. |
| Date normalization and fidelity | 20 | All nine IDs represented, no unknown IDs, every date exactly matches its canonical reference. |
| Region normalization and fidelity | 20 | All nine IDs represented, no unknown IDs, every region matches its canonical reference. |
| Revenue normalization and fidelity | 20 | All nine IDs represented, no unknown IDs, canonical amounts match reference integer cents. |
| Record integrity / missing data | 10 | Exactly the nine valid IDs once each, R008 absent. |
| Revenue reconciliation | 10 | Integrity passes; canonical stated total equals row sum and 128550 reference cents. |

Each rule is all-or-nothing; coverage prerequisites overlap. A valid unique subset can earn only the narrow uniqueness points. Duplicate correct rows can pass field fidelity while failing uniqueness/integrity. Scores 80–100 mean “Strong evidence on this task,” 50–79 “Developing evidence on this task,” and 0–49 “More practice needed on this task.” These prototype thresholds are not certifications or industry benchmarks. Individual failures remain visible even with a high total. Name/reflection/demo status never earn points.

## Ownership, sharing, and storage

The required design uses an anonymous HttpOnly browser-session cookie. Losing or expiring that session loses owner access; another browser cannot read/list/share/revoke/download a private receipt by knowing its UUID. Actual cookie lifetime and implemented storage configuration will be documented from User 1's baseline rather than guessed here.

Receipts are immutable assessed snapshots; retries create new receipts. Sharing is off initially. Explicit enabling creates an opaque capability URL; anyone holding it can read the work, result, and any self-reported name/unassessed reflection. Revocation stops fresh requests, cannot recall saved copies, and does not delete the private result. Re-enabling creates a different token. A localhost link is only reachable where the server is accessible.

The planned local store lives outside tracked source (for example `.data/`) behind a repository abstraction. Its design supports one server process, not ephemeral/serverless or multiple-instance hosting. User 1 owns atomic persistence, fingerprint serialization, and session enforcement; those pieces are not implemented on this branch.

## Optional local practice coach

The core assessment must work without Ollama. If an existing local service is available, the owner can explicitly request practice suggestions. Defaults are `http://127.0.0.1:11434` and `llama3.2:latest`. Check installed models first:

```bash
curl http://127.0.0.1:11434/api/tags
```

If overriding defaults, copy the safe [.env.example](.env.example) to an untracked `.env.local` and configure `OLLAMA_BASE_URL` / `OLLAMA_MODEL` on the server. Never use `NEXT_PUBLIC_` variables or download a new model as an implicit setup step. The adapter accepts loopback-only URLs, never redirects or falls back to a cloud model.

The server sends fixed rubric descriptions and pass/fail flags only. The model chooses up to three approved practice exercises; server validation rejects unknown/irrelevant choices and returns fixed plain-text wording. This avoids misleading free-form corrections observed during real smoke testing. It never sends names, reflections, observations, artifacts, or session/share tokens.

Requests have a 45-second deadline, 32 KiB response-envelope cap, a 30-second per-receipt cooldown after completion/failure, and at most two simultaneous model calls in one process. Offline/missing/slow/malformed models return a safe error with deterministic next steps. The saved result remains available and unchanged. Advice is transient, unassessed, and excluded from receipts, evidence pages, JSON, and CSV. All-pass suggestions offer another exercise, not a broad competence claim.

API implementation follows Ollama's [generation](https://docs.ollama.com/api/generate) and [model-list](https://docs.ollama.com/api/tags) endpoints. Frontend wiring belongs to User 2; its exact agreed request and error handling are in [INTEGRATION.md](docs/INTEGRATION.md).

## Verification status

Run the independent coach tests now without installing dependencies or running a model:

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs --test tests/unit/coach.test.ts
```

Observed: **25 mocked unit tests passed**. A separate real `llama3.2:latest` adapter smoke succeeded. Type stripping is not typechecking; test helpers must not be loaded into the application.

After the production baseline/build is ready, run the prepared real-server HTTP suite (the final `npm run test:e2e` script is to be coordinated with User 1):

```bash
node --experimental-strip-types --import ./tests/helpers/register-typescript.mjs --test tests/integration/receipts.test.ts
```

It copies the production build to temporary working/storage directories, uses independent cookie jars and a mock local model, restarts the actual server to test persistence, and cleans up. It deliberately fails preflight when the baseline/build is absent; **no HTTP acceptance pass is claimed yet**. Full typecheck, build, evaluator/storage tests, and browser QA are pending. See [VALIDATION.md](docs/VALIDATION.md) for exact observed results and [browser acceptance](tests/browser/README.md) for unrun interactive checks.

## Demo and next steps

Use the prepared [2–3 minute demo script](docs/DEMO.md), including an imperfect attempt and optional/offline coaching path. It awaits rehearsal against the combined app. Complete final integration only after Users 1 and 2 explicitly hand off, following [INTEGRATION.md](docs/INTEGRATION.md).

Production next steps are future work: validated identity/authentication decisions, a durable deployment-appropriate store, multi-instance concurrency/rate limits, security review, and real applicant/reviewer usability studies. None is implied by this prototype. There is no résumé generation, fake endorsement, professional certification, or public deployment.
