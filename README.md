# SkillReceipt

> A résumé says it. Your work shows it.

A local UNHack prototype with a short, role-focused journey: **add résumé context → choose a job role → complete a practical work sample → inspect your score and practice plan → optionally share evidence**.

The lead's revised product direction is in [DEMO_V2_SPEC.md](docs/DEMO_V2_SPEC.md). It supersedes the original no-upload/single-role restrictions. This is résumé context, not résumé generation or résumé scoring.

## Run locally

Use Node 22 or a newer supported LTS and the committed npm lockfile:

```bash
npm ci
npm run dev
```

Open **http://localhost:3000**, then select **Find my next step**. No API key, cloud database or model is required. For production, run `npm run build` then `npm start`. Windows can use `npm.cmd` if PowerShell blocks npm.ps1.

## Two supported work samples

- **Junior Data Engineer:** six pipeline decisions about business keys, latest-update deduplication, quarantine, schema, safe retries and partitioning. A small synthetic simulator makes consequences visible. This checks configuration decisions, not SQL/Python execution, cloud operations or every requirement of the profession.
- **Junior Data Analyst:** the original sales-cleanup work sample, transparent six-rule evaluator and 1285.50 CAD reference. Its rubric and existing receipts are unchanged.

The role search is a catalog of these supported assessments, not a live job board or a claim that arbitrary roles can already be assessed. The engineering work sample has its own versions (`orders-pipeline-v1`, `pipeline-rules-v1`). Original sales records retain their original versions and exact fingerprint serialization.

## Résumé privacy

Upload a text-based PDF (at most ten pages), DOCX or UTF-8 TXT, up to **2 MB**. The local server reads it in memory and returns recognized skill keywords. Neither the file nor extracted text is persisted, sent to a model, logged by application code or included in employer evidence. Keyword matches are self-reported résumé context, not verified abilities. Scanned/image-only PDFs are not supported. A visibly labeled sample résumé and skip option keep the presentation reliable.

Résumé parsing has bounded file/text/page limits, but this local prototype is not a hardened public document-ingestion service. Production hardening would need isolated parser workers, process/resource limits, rate limiting and further malformed-document review.

## Focused sessions

Before the engineering task, camera mode explains and requires acknowledgment of the conditions. Video is requested only on the explicit **Enable local camera preview** button. No microphone, video recording/upload, screen recording, face/identity/emotion inference or browsing history is collected. The page counts its own visibility changes and pauses when hidden or after camera interruption. Camera tracks stop on leaving/submitting or switching mode.

Practice mode works without a camera. Presentation mode is always labeled demo. Session conditions are client-reported, can be altered and do **not** establish identity, continuous monitoring or absence of outside assistance. They do not affect the skill score. Sharing discloses the session summary alongside the work; no footage is shared. Physical-camera/visibility interaction still needs manual device verification in this environment.

## Score and improvement

The server assigns published deterministic points, not the résumé, a model, speed, camera status or tab counts. The 0–100 number describes one role's work sample; it is not a credit score, general rating, certification or hiring recommendation. The private result shows all six checks and up to three practice steps tied to missed points. The employer view shows the score, decisions, check evidence and honest session context, without the private practice plan or résumé.

The presenter example scores **75/100**: schema and partitioning fail, making the improvement story visible. A correct configuration scores 100. Every new attempt creates a separate immutable receipt; do not compare scores across different assessment versions as an industry benchmark.

## Evidence, storage and sharing

Results start private. An anonymous HttpOnly, SameSite=Lax cookie provides browser ownership for up to 30 days; Secure is enabled on HTTPS and local HTTP works. Only a hash is stored. Clearing/losing/expiring the cookie loses app access; no account recovery exists.

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
