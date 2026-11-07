# SkillReceipt

> A résumé says it. Your work shows it.

A local UNHack prototype with a short, role-focused journey: **candidate login → upload résumé → search a role → three decisions + a little code → review score and improvement → opt in to employer review**.

The current product scope is in [DARK_PORTALS_SPEC.md](docs/DARK_PORTALS_SPEC.md). It adds separate candidate/employer portals and supersedes the original no-account/no-upload restrictions. Résumés provide context; they never earn points.

## Run locally

Use Node 22 or a newer supported LTS and the committed npm lockfile:

```bash
npm ci
npm run dev
```

Open **http://localhost:3000**, choose **Get started**, and select **Create an account** on the candidate sign-in screen. Employer registration uses **For employers** and a separate account. Passwords require at least ten characters. No API key, cloud database or model is required. For a production build, run `npm run build` then `npm start`. If the host restricts Turbopack’s compiler ports, use `npm run dev -- --webpack` or `npm run build -- --webpack`. Windows can use `npm.cmd` if PowerShell blocks npm.ps1.

## Two supported work samples

- **Junior Data Engineer:** three simple decisions about business keys, missing data and safe retries, followed by a small JavaScript sum function. Four real, published coding tests run in a limited QuickJS WASM VM without host, file or network APIs. This is a starter work sample, not every requirement of the profession.
- **Junior Data Analyst:** the original sales-cleanup work sample, transparent six-rule evaluator and 1285.50 CAD reference. Its rubric and existing receipts are unchanged.

The role search is a catalog of these supported assessments, not a live job board or a claim that arbitrary roles can already be assessed. The new engineering sample uses `engineer-coding-v2` / `engineer-rules-v2`. Existing six-decision `orders-pipeline-v1` / `pipeline-rules-v1` records still open with their original rubric. Original sales records retain their original versions and exact fingerprint serialization.

## Résumé privacy

Upload a text-based PDF (at most ten pages), DOCX or UTF-8 TXT, up to **2 MB**. For signed-in candidates, the local server returns recognized skill keywords and saves the original file privately under ignored `.data/accounts/`. Raw extracted text is not saved or sent to a model. Employers can download the file only when the candidate explicitly enables employer profile access; separate public receipt links do not contain it. The retained guest parsing API returns context without persisting files. Keyword matches are self-reported résumé context, not verified abilities. Scanned/image-only PDFs are not supported. A visibly labeled sample résumé and skip option keep the presentation reliable.

Résumé parsing has bounded file/text/page limits, but this local prototype is not a hardened public document-ingestion service. Production hardening would need isolated parser workers, process/resource limits, rate limiting and further malformed-document review.

## Focused sessions

Before the engineering task, camera mode explains and requires acknowledgment of the conditions. Video is requested only on the explicit **Enable local camera preview** button. No microphone, video recording/upload, screen recording, face/identity/emotion inference or browsing history is collected. The page counts its own visibility changes and pauses when hidden or after camera interruption. Camera tracks stop on leaving/submitting or switching mode.

Practice mode works without a camera. Presentation mode is always labeled demo. Session conditions are client-reported, can be altered and do **not** establish identity, continuous monitoring or absence of outside assistance. They do not affect the skill score. Sharing discloses the session summary alongside the work; no footage is shared. Physical-camera/visibility interaction still needs manual device verification in this environment.

## Score and improvement

The server assigns published deterministic points, not the résumé, a model, speed, camera status or tab counts. The 0–100 number describes one role's work sample; it is not a credit score, general rating, certification or hiring recommendation. The private result shows the four checks, coding outcomes and practice steps tied to missed points. The employer view shows actual score, submitted work and session context without the private plan or coaching. ID lookup also provides the résumé when profile access is enabled.

The presenter example scores **80/100**: all three decisions pass; starter code passes two of four cases, earning 20/40 coding points. A correct implementation earns 100. Every new attempt creates a separate immutable receipt; do not compare scores across different assessment versions as an industry benchmark.

## Evidence, storage and sharing

Results and candidate profiles start private. Candidate/employer accounts use salted scrypt password hashes and random HttpOnly, SameSite=Lax sessions that expire after seven days; Secure is enabled on HTTPS. Sign-out revokes the account session, and signing in restores results. There is no email verification or password recovery in this local prototype. Original anonymous receipts keep their 30-day browser ownership unless bound to a candidate account; bound receipts require account login. Local account records retain an internal receipt-ownership secret and must be protected with the résumé files.

Enable **Employer profile access** on the dashboard to let any signed-in employer with your Candidate ID see your name, résumé and all results, including demos. Account email, credentials, private IDs and share tokens are excluded; contact details inside a résumé remain in that file. Turn access off to block fresh lookups/downloads. Employers self-register and are not verified organizations. Public receipt links have separate controls.

The local one-file-per-receipt store defaults to ignored `.data/`; override server-only `SKILLRECEIPT_DATA_DIR` if needed. Writes are atomic and same-process updates are serialized. This is one-process local persistence, not ephemeral/serverless or distributed hosting. Capability lookups are linear scans.

Explicit sharing creates an opaque link anyone holding it can inspect. Revoke invalidates fresh requests; re-enable creates a different token. Saved copies cannot be recalled. Downloaded CSV/JSON represents actual submitted configuration/data with no private ID, share token or owner hash. CSV formulas are neutralized. The SHA-256 fingerprint identifies assessed strings/configuration, not identity or a digital signature. Unassessed session observations and résumé context do not affect it. Localhost links only work where that server is reachable; no public deployment is implied.

## Optional local coach

The private result includes an optional, collapsed local-coach panel. Defaults: `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=llama3.2:latest`. Copy [.env.example](.env.example) to an ignored `.env.local` only to override defaults. Reuse installed models; none is downloaded automatically.

Only fixed assessment descriptions and pass/fail flags go to loopback Ollama—no résumé, names, reflections, session fields, tokens or arbitrary observations. The model chooses approved exercises; it never grades, changes a receipt or becomes evidence. Limits: 45-second model deadline, 32 KiB response, at most three exercises, 30-second cooldown and two simultaneous requests per process. Offline/malformed output yields deterministic fallback while the assessment/share flow stays usable. There is no cloud fallback.

## Verification and demo

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

See [VALIDATION.md](docs/VALIDATION.md) for actual results, including the résumé upload and engineering score APIs, original assessment regression, and browser/camera gaps. HTTP tests use isolated temporary storage and production server processes with independent cookie jars; they never use your actual receipts.

Use the [2–3 minute demo script](docs/DEMO.md). The main story is four steps and one role. Camera hardware is optional for a pitch and must not be presented as cheat-proof proctoring. No fake employers, certifications, users or placement claims are included.
