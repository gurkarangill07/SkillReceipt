> Historical original specification. The lead subsequently requested résumé context, role selection and focused sessions; those additions are specified in [DEMO_V2_SPEC.md](DEMO_V2_SPEC.md). Original sales-assessment semantics remain frozen.

> Shared product specification supplied by the team lead. Machine-specific project paths have been replaced with a portable placeholder; use your own clone. This is a specification, not a claim that features are implemented. The shared interface contract specializes its suggested architecture. The lead separately authorized repository creation and this starter-documentation upload.

# SkillReceipt — shared master prompt for a three-person team

## READ THIS BEFORE TAKING ANY ACTION

This is shared product context for three separate people using their own Codex sessions. **Do not start implementation when this master prompt is pasted by itself.** Reply: “Master prompt received. Send my User 1, User 2, or User 3 assignment.” Then wait for that assignment.

If the master prompt and assignment arrive in the same message, work only on that assignment. The role assignment controls file ownership, task scope, startup order, and handoff. References below to building the entire application describe the team's combined deliverable, not permission for each session to build everything.

Do not launch subagents or additional workers. The three human teammates each run their own Codex. Do not create or modify a project just to acknowledge this master prompt. Do not publish, create a remote repository, or push without explicit team authorization.

The project directory from the original master belongs to the original user's Mac. Each teammate must use their own clone of the same project in the directory selected in their Codex. Never create that absolute path on a different computer. If no shared project or branch is available, ask for the existing project location; do not build a disconnected competing app. A shared remote is useful but not assumed or created automatically.

Once assigned, follow the role's shared interface contract exactly. Treat any change to endpoint shapes, data types, source dataset, or rubric as a coordinated change, not an individual preference. Preserve all product and evidence boundaries below.

---

You are the lead product designer and full-stack engineer building **SkillReceipt**, a polished, working web application prototype for **UNHack 2026**. Implement and validate the application described below. Work autonomously on ordinary implementation choices, keep the scope focused, and report real limitations honestly.

## 1. Start in the correct project

The user has already created this local directory:

`<your-local-project-directory>`

Use it as the application root. Do not create a second project elsewhere or an unnecessary nested application directory. Inspect its current contents and applicable `AGENTS.md` instructions first. Preserve existing work and never assume the directory will still be empty. If files conflict with the implementation, resolve safe changes without overwriting unrelated content. Do not read or print unrelated credentials.

The requested deliverable is a runnable local Next.js project. Do not publish it, upload its source, create a remote repository, register a domain, deploy to a hosting service, or modify another project unless explicitly requested. Use normal permission mechanisms if writing to this directory requires approval.

Before implementation, briefly state the concrete flow you are about to build and write this specification into `docs/IMPLEMENTATION_SPEC.md`. Then build the app; do not stop after a plan. Do not expand into speculative features.

## 2. Product purpose and non-negotiable boundaries

**SkillReceipt helps early-career job seekers demonstrate practical skills through a work sample, receive transparent results, and share evidence that a reviewer can inspect.**

The core sequence is:

**Complete a practical challenge → Submit the work → Run published deterministic checks → Issue an evidence-backed skill receipt → Share an employer-view evidence page.**

SkillReceipt is **not a résumé builder**. Do not implement résumé generation, résumé rewriting, résumé uploads, résumé templates, résumé scoring, or résumé PDF export. Do not make a résumé the final output. The final output is a receipt and an inspectable evidence page.

This prototype checks the **submitted artifact** against the rules of **one specific assessment**. It does not verify:

- The submitter’s legal identity.
- Education, certifications, credentials, or employment history.
- Independent authorship or whether outside assistance was used.
- A person’s general professional competence.
- Hiring suitability, employability, or future job performance.

Never show a generic “verified candidate,” “certified analyst,” “identity verified,” or “employer approved” badge. A SHA-256 fingerprint identifies a submitted artifact; it is not identity proof, an independent credential, a digital signature, or a guarantee against operator tampering.

Do not fabricate employers, partnerships, endorsements, testimonials, users, success stories, adoption figures, accuracy rates, job-placement statistics, or workshop research. Any sample receipt must be visibly labeled as an illustrative sample. Any demo-filled attempt must be visibly marked as a demo.

## 3. Challenge context and target user

Challenge context: UNHack 2026, Learning, Work & Opportunity.

Design for early-career job seekers who can do practical work but have limited professional experience and difficulty presenting credible evidence of their abilities. A reviewer needs to see what was submitted, how it was checked, and what the result does and does not mean.

Amina is an **illustrative persona**: an aspiring junior data analyst who struggles to demonstrate her abilities through a conventional application. Her personal details and motivations are assumptions, not findings from a real user interview. Do not present her as a real customer or make her identity the default identity of every user.

Suggested value proposition:

> Turn practical work into evidence someone else can inspect.

Suggested headline:

> Let your work do the talking.

Use clear, human copy. Avoid exaggerated promises such as “eliminate hiring bias,” “guaranteed job,” or “prove everything you know.”

## 4. MVP scope: one reliable end-to-end flow

Build this complete flow:

1. A visitor understands the product on the landing page.
2. They open the Junior Data Analyst challenge and read the brief and rubric.
3. They edit a small synthetic dataset directly in the application.
4. They remove duplicate/invalid records, normalize fields, and enter the total revenue.
5. They optionally add a display name and an unassessed reflection.
6. They submit the artifact.
7. The server validates the payload and computes the result using deterministic rules.
8. An immutable private receipt shows the score, check-by-check evidence, and submitted work.
9. The user explicitly enables sharing and copies an opaque evidence link.
10. An independent visitor can open the employer page without the owner session.
11. The owner can revoke sharing; subsequent requests to that link become unavailable.
12. The owner can start another attempt without changing the previous result.

Also provide “My receipts” for the same anonymous browser session and downloadable evidence JSON / submitted CSV.

Do not build additional roles, an employer management dashboard, job matching, messaging, payments, social profiles, skill marketplaces, credential imports, multi-role assessments, authentication providers, or administrative analytics. Do not create placeholder navigation to unfinished features.

## 5. Required stack and local operation

Use:

- Next.js App Router with real pages and route handlers.
- TypeScript with strict checking.
- React.
- Tailwind CSS, with custom CSS where needed for a coherent design.
- A current compatible Node.js LTS release; target Node 22 or newer supported LTS.
- npm with a committed lockfile and reproducible dependency installation.
- A pure TypeScript scoring module.
- Server-side local persistence behind a small repository abstraction.
- A lightweight test runner, plus HTTP integration tests and browser verification where supported.

Choose compatible supported package versions and pin the resolved versions. Do not mix incompatible starter instructions from different major versions. Avoid network-loaded fonts or dependencies that require external services just to render the app.

No paid service, cloud database, cloud LLM, API key, or email service should be required. The core app must work without Ollama.

For local persistence, use one file per receipt with atomic writes, or another equally simple reliable local store. Keep runtime data outside tracked source, such as `.data/`. Document its single-server limitation. Do not present a filesystem implementation as ready for ephemeral/serverless or multiple-instance deployments. Keep the repository layer replaceable without introducing an unused database framework.

Supply these scripts, or equivalent clearly documented names:

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`

## 6. Optional local LLM: useful coaching, never grading

The user already has a local Ollama service. At specification time it responded at `http://127.0.0.1:11434` and listed:

- `llama3.2:latest`
- `gemma3:4b`
- `deepseek-r1:8b`

Recheck availability when implementing. Do not download or replace large models without permission. Prefer the existing `llama3.2:latest` for a small coaching request unless another existing model works better in observed testing.

Integrate a **Local practice coach** on the private result page. It may suggest what to practice next based on the published checks. It must not score work, alter a score, decide whether a check passed, certify skills, infer identity, or add claims to the official receipt.

Requirements:

1. Keep the official evaluator pure, deterministic, and independent of the model.
2. Coaching runs only when the user presses an explicit button such as “Get practice suggestions.”
3. Make the request from the Next.js server to Ollama, never directly from the browser.
4. Use server-only configuration: `OLLAMA_BASE_URL` and `OLLAMA_MODEL`. Include a safe `.env.example`; do not commit `.env.local`.
5. Send only fixed assessment/rubric descriptions and pass/fail summaries. Do not send the display name, reflection, arbitrary user prompts, local files, owner token, share token, or personal information.
6. Use a tightly bounded prompt: at most three concrete practice suggestions, short plain text, no certification or hiring claims.
7. Use a request timeout and output-length limit. Prevent concurrent duplicate requests for the same receipt. Provide a bounded local cooldown if necessary.
8. Treat model text as untrusted, render it safely as text, and label it “AI-generated practice advice · not assessed.” Do not execute markup, code, links, or instructions from the response.
9. Keep advice visually separate from official results. Do not save it into the immutable assessed artifact, include it in the employer view, or count it as evidence.
10. If Ollama is offline, missing the configured model, slow, or returns malformed data, show a useful error and deterministic next-step feedback. The receipt must already be available and remain unchanged.
11. Never silently fall back to a hosted model.
12. When all checks pass, suggest another exercise rather than claim broad expertise.

The UI should communicate the distinction simply:

> Rules score your work. The local coach helps you practice.

Do not expose infrastructure jargon in the main assessment flow. Setup details belong in the README and optional coach status.

## 7. Assessment: Junior Data Analyst / Sales data cleanup

Assessment ID/version: `sales-cleaning-v1`.

Rubric version: `deterministic-v1`.

Scenario:

> You are preparing a synthetic October sales report. The export contains duplicate orders, inconsistent dates and region names, currency decorations, and one order with missing revenue. Produce a clean set of valid orders and reconcile its revenue before reporting.

Estimated time: approximately 15–20 minutes, explicitly an estimate. Do not enforce a timer or use speed to score the result.

All data is synthetic. No personal files or uploads are required.

### Source dataset

Use the following exact data as the versioned immutable source:

| Source row | order_id | order_date | region | revenue_cad |
| --- | --- | --- | --- | --- |
| 1 | R001 | 10/01/2026 | ` ON ` | $120.00 |
| 2 | R002 | 2026-10-02 | QC | 85.5 |
| 3 | R003 | Oct 3, 2026 | bc | CAD 210.00 |
| 4 | R004 | 10/04/2026 | ontario | 140 |
| 5 | R004 | 10/04/2026 | ontario | 140 |
| 6 | R005 | 2026-10-05 | `quebec ` | $95.00 |
| 7 | R006 | Oct 6, 2026 | B.C. | 180.00 |
| 8 | R007 | 10/07/2026 | on | 75 |
| 9 | R008 | 2026-10-08 | ON | empty string |
| 10 | R009 | 10/09/2026 | QC | 130.00 |
| 11 | R009 | 10/09/2026 | QC | 130.00 |
| 12 | R010 | Oct 10, 2026 | British columbia | $250.00 |

Backticks above identify intentional whitespace, not literal dataset characters. Missing revenue is an empty string, not the words “empty string.”

### Instructions visible before submission

- Slash dates use **month/day/year**. State this explicitly so the task is not ambiguous.
- Remove the extra copy of R004 and the extra copy of R009.
- Quarantine/remove R008 from the valid output because its revenue is unknown. Do not invent revenue or treat a blank as zero.
- Keep the other nine orders exactly once.
- Preserve their real dates and revenue values.
- Standardize dates as `YYYY-MM-DD`.
- Standardize region names as `Ontario`, `Quebec`, or `British Columbia`.
- Use nonnegative plain decimal revenue strings with at most two decimal places; remove currency symbols and decorations. Both `120` and `120.00` represent the same acceptable value.
- Enter a total revenue in CAD for the nine valid orders.
- Changes are scored only when submitted. Do not silently correct an artifact during submission.

### Reference artifact

| order_id | order_date | region | revenue_cad |
| --- | --- | --- | --- |
| R001 | 2026-10-01 | Ontario | 120.00 |
| R002 | 2026-10-02 | Quebec | 85.50 |
| R003 | 2026-10-03 | British Columbia | 210.00 |
| R004 | 2026-10-04 | Ontario | 140.00 |
| R005 | 2026-10-05 | Quebec | 95.00 |
| R006 | 2026-10-06 | British Columbia | 180.00 |
| R007 | 2026-10-07 | Ontario | 75.00 |
| R009 | 2026-10-09 | Quebec | 130.00 |
| R010 | 2026-10-10 | British Columbia | 250.00 |

Reference total: **1285.50 CAD** / **128550 cents**.

Use integer cents for all money equality and reconciliation. Do not use floating-point tolerance to decide whether a monetary answer is correct. Use a strict parser that rejects negatives, exponent notation, `NaN`, `Infinity`, currency characters, commas, leading/trailing spaces, and more than two decimal places in the submitted canonical output. Keep numeric ranges bounded.

## 8. Transparent deterministic rubric

Show the complete rubric before submission. Each check is all-or-nothing. Explain that checks assess different properties and that some have shared prerequisites; they are not statistically independent measures.

| Check | Points | Pass rule |
| --- | --- | --- |
| Unique order IDs | 20 | Nonempty submission; every ID belongs to the valid reference set; no repeated order ID. |
| Date normalization and fidelity | 20 | All nine reference IDs are represented, no unknown IDs, and every submitted date exactly equals that ID’s reference date in canonical form. |
| Region normalization and fidelity | 20 | All nine reference IDs are represented, no unknown IDs, and every submitted region exactly equals that ID’s canonical reference region. |
| Revenue normalization and fidelity | 20 | All nine reference IDs are represented, no unknown IDs, every submitted amount has valid canonical format, and integer cents equal that ID’s reference value. |
| Record integrity / missing data | 10 | Exactly the nine reference IDs, each once. R008 absent; no invented, missing, or duplicate IDs. |
| Revenue reconciliation | 10 | Record integrity passes; submitted total has valid canonical money format; it equals both the submitted row sum and 128550 reference cents. |

Important edge behavior:

- Do not reward empty arrays through vacuous truth. Reject an empty submission envelope; also keep the evaluator safe if called with empty rows in a test.
- An array of invented IDs earns no points, including for uniqueness.
- A nonempty subset of valid unique IDs may pass uniqueness but must fail all checks requiring full coverage. Explain the narrow uniqueness result honestly.
- Duplicate rows with otherwise correct fields may pass date/region/revenue fidelity while failing uniqueness and integrity. Report each rule precisely; never hide the duplicate failure behind a high score.
- A correctly formatted but incorrect date or amount must fail fidelity.
- Never award points just because a string resembles a date or number.
- Order of submitted rows does not affect score.
- Do not grant discretionary points for reflection quality or name/identity information.
- A client-supplied score or pass flag must have no effect.

Each check returns:

`id`, `label`, `rule`, `pointsPossible`, `pointsEarned`, `passed`, and specific `observations`.

Observations should identify affected row numbers/IDs, missing or unexpected IDs, duplicate IDs, malformed values, expected versus submitted values, and stated versus computed total where relevant. Cap displayed observations sensibly and allow expansion rather than creating an unreadable page.

Show a score out of 100 and task-bound descriptive tiers:

- 80–100: Strong evidence on this task.
- 50–79: Developing evidence on this task.
- 0–49: More practice needed on this task.

These are prototype thresholds, not industry benchmarks or certifications. A high total does not override individual failures. Display the number of passed checks and the full breakdown alongside the score.

Describe evidence precisely. An output that has unique IDs demonstrates a property of the submitted output; it does not prove how the person produced it. Avoid claims about an observed cleaning process unless the app actually captured that process.

## 9. Routes and application screens

Use real addressable routes rather than hiding the full app behind an unshareable single page.

### A. `/` — landing page

Include a compact brand/nav, a strong headline, a short explanation, a primary “Take the challenge” action, and a three-step explanation. Show one visibly illustrative receipt preview. Present the one available assessment with role, task, time estimate, and scope.

Include the evidence boundary in understandable language. Link to the assessment and My receipts. No fake employer logo strip or vanity statistics.

### B. `/assessment` — brief and workspace

Give the user enough context to start without onboarding. Include:

- Task scenario and synthetic-data label.
- Explicit data conventions and cleanup instructions.
- Full published rubric, expandable if needed.
- Source CSV download.
- Editable table with the four assessment columns.
- Stable internal row keys separate from editable order IDs.
- Accessible labels that include row number and column name.
- Remove/quarantine-row controls and a clear way to restore removed rows or reset the entire draft.
- Visible retained-row count; expected valid count is nine.
- Total revenue input with CAD units.
- Optional display name, clearly self-reported.
- Optional short reflection, clearly unassessed and included in the shared receipt if entered.
- A brief reminder that the submitted output is checked; identity and authorship are not.
- Submit loading state and useful inline validation errors.
- No automatic cleaning disguised as candidate work.

Persist the draft in localStorage for accidental refreshes. Validate restored draft shape/version and handle corrupt storage, storage denial, or an incompatible saved version gracefully. Reset should clear the saved draft and return to the original source. Freeze/copy the exact submitted snapshot before the request so edits cannot race the stored artifact.

Provide an explicit **Load demo solution** control for presentation reliability. It fills the reference solution and total, marks the attempt as demo, and explains that this is a walkthrough. Keep that marker on submission, receipt, My receipts, downloads, and employer page. Editing a demo-filled artifact does not remove the marker. Only starting a fresh source attempt resets it. A client marker is a disclosure aid, not proof that other attempts were completed independently.

### C. `/receipts` — owner’s receipts

List only receipts belonging to the current anonymous browser session. Show task, creation time, score, demo status, sharing status, and a link to each private receipt. Include a meaningful empty state and a start-challenge action.

Explain that this is a local prototype without accounts: clearing cookies or changing browsers loses private-session access, and receipts remain on the server until locally removed. Do not fabricate account recovery or a login flow.

### D. `/receipts/[id]` — private result

Show:

- Task title, versions, server creation timestamp with timezone.
- Demo banner if applicable.
- Score, task-bound tier, and number of checks passed.
- All checks with rules, earned points, and concrete observations.
- Narrow evidence statements tied to passed checks.
- Full submitted table and stated total.
- Reflection labeled unassessed and name labeled self-reported.
- Artifact fingerprint and its limited meaning.
- A concise “What this checks / What this does not check” section.
- JSON and CSV downloads.
- Start another attempt.
- Explicit sharing controls, disabled by default.
- Optional local practice coach, separated from assessed results.

Do not show only successful receipts. A low-score receipt remains a valid record of that submission. A retry creates a separate receipt.

### E. `/evidence/[token]` — independent employer view

Read from server persistence using an opaque capability token. A visitor does not need the owner cookie. Do not reconstruct an alleged public receipt from the owner’s localStorage.

Use a professional, restrained, read-only layout containing the task, versions, demo status, timestamp, score, complete rubric breakdown, submitted work, stated total, unassessed reflection, self-reported name if provided, fingerprint, and verification limits.

Never expose owner secrets, private receipt identifiers, local filesystem paths, session hashes, or a list of other receipts. Do not include private coaching output.

The page is suitable for a reviewer to inspect the evidence, not a certificate implying verified identity or credentials. Include no endorsement or hiring recommendation.

Return a helpful unavailable/404 state for missing, invalid, or revoked tokens. Set noindex/nofollow and no-store behavior so revocation is checked on fresh requests. Avoid prefetching and route caching that could misleadingly keep showing a revoked page after navigation.

## 10. Receipt model and trust boundary

A persisted receipt should include:

- Random private receipt UUID.
- Hash of the anonymous owner session token; not the raw token.
- Server-generated UTC creation timestamp.
- Assessment and rubric versions.
- Validated immutable artifact snapshot: submitted rows and total.
- Optional self-reported display name and unassessed reflection.
- Demo marker.
- Server-computed evaluation.
- SHA-256 artifact fingerprint.
- Nullable opaque share token, initially absent.

Define and document one stable fingerprint serialization. For example, hash a fixed-key-order payload containing assessment version, rubric version, rows in submitted order with fixed column-key order, and stated total. Exclude sharing state, session ownership, name, reflection, and generated coaching. Do not call a plain JSON hash a signature. Explain that row order can change the fingerprint without changing the score.

Use a cryptographically random anonymous session cookie, HttpOnly, SameSite, path-scoped to the app, with sensible expiry. Use Secure when deployed over HTTPS and document local HTTP behavior. Do not store the owner secret in client JavaScript or return it in JSON.

All owner read/list/download/share/revoke endpoints require the matching session. A guessed private UUID is not authorization. Return an unavailable response for unauthorized access without exposing another user’s record.

Issue the cookie only after a valid submission is ready to persist. Strip client-supplied evaluation, timestamp, owner, and other privileged fields. The evaluator must use the canonical server-side assessment version.

## 11. Sharing lifecycle

Sharing is off by default. Explain the decision before enabling:

> Anyone with this link can read the submitted work, result, and any name or reflection you included. You can turn the link off later, but downloaded or saved copies cannot be recalled.

Enable sharing only on an explicit owner action. Generate a high-entropy random token, at least 24 random bytes. Copy the resulting absolute URL with visible confirmation. Provide a selectable text fallback if clipboard access fails. Support “Open employer view” and “Revoke link.”

Revocation removes/invalidates the capability token. Subsequent server requests to the old token fail. Turning sharing back on creates a new token. Revocation does not delete the owner’s receipt. Never mutate the assessed snapshot or score through sharing actions.

Document that a localhost link is reachable only where that server is accessible. Do not claim a local prototype link can be sent to an employer on the public internet. Public remote hosting is a separate future decision.

Implement atomic updates and serialize relevant read/modify/write operations within the supported single-process design. Do not claim distributed concurrency safety.

## 12. Input validation and safe handling

Validate unknown input before using it:

- JSON object only; supported content type.
- Body size cap of 64 KB enforced while reading, not just by trusting Content-Length.
- Rows array between 1 and 30 rows.
- Each row is an object with four string fields.
- Bounded field sizes, for example ID 40, date 60, region 60, revenue 40 characters.
- Total is a nonempty bounded string; semantically incorrect values are scored as failures.
- Optional name up to 60 characters.
- Optional reflection up to 1500 characters.
- Demo marker is a boolean if present.
- Controlled path/token formats prevent path traversal.

Reject malformed envelopes with an actionable 400 response and do not create a receipt. Accept valid envelopes with incorrect work and honestly score them. Do not trim or auto-correct assessed cells silently.

Reject cross-origin mutations using origin/fetch metadata checks appropriate to the local deployment. Keep GET requests free of mutations. Render all submitted and model-generated text safely. Do not evaluate code or inject submitted HTML.

Return useful errors without exposing stack traces, secrets, or local paths. Use private/no-store response policies for receipt APIs and sensitive pages. Avoid logging personal content or capability tokens.

CSV exports must quote and escape cells and neutralize leading spreadsheet formula characters. CSV content must represent the actual submitted artifact; do not silently export the reference solution. Evidence JSON must exclude owner hashes, session tokens, and share capabilities.

## 13. Design and interaction requirements

Make the app look like a deliberate, finished product. Use a calm, editorial visual direction:

- Warm off-white background.
- Dark forest green for navigation, ink, and primary controls.
- Restrained chartreuse/lime accent.
- Thin borders, generous whitespace, subtle paper/receipt details.
- Strong typography hierarchy using reliable local/system fonts.
- Consistent small icon set.
- Clear green pass states and readable non-color-only failure states.
- Minimal motion and reduced-motion support.

Do not use generic stock-photo hero imagery, loud gradients, random dashboard charts, excessive cards, gamified trophies, fake activity feeds, or speculative feature teasers.

Desktop: generous layout with clear task hierarchy. Assessment: comfortable workspace and readable instructions. Results: score summary plus inspectable details. Employer view: simpler and evidence-focused.

Mobile at approximately 390 px: no page-level horizontal overflow; table scroll is contained and labeled; fields, totals, controls, score, and sharing remain usable. Navigation adapts without hiding core actions.

Accessibility: semantic landmarks, one primary heading per page, page titles, skip link, visible focus, sensible contrast, explicit labels, accessible field errors, keyboard-operable controls, status announcements for submission/copy/share/coach, disabled-state explanations, and no color-only meaning.

For every asynchronous action implement loading, success, and failure states. Prevent double submission. Keep error messages near the relevant action. Do not use alerts as the only feedback.

## 14. Suggested architecture

Use an organization similar to:

```text
app/
  layout.tsx
  page.tsx
  globals.css
  assessment/page.tsx
  receipts/page.tsx
  receipts/[id]/page.tsx
  evidence/[token]/page.tsx
  api/dataset/route.ts
  api/receipts/route.ts
  api/receipts/[id]/route.ts
  api/receipts/[id]/share/route.ts
  api/receipts/[id]/download/route.ts
  api/receipts/[id]/coach/route.ts
components/
  navigation.tsx
  assessment-workspace.tsx
  rubric.tsx
  receipt-view.tsx
  share-controls.tsx
  local-coach.tsx
lib/
  assessment.ts
  evaluate.ts
  validation.ts
  fingerprint.ts
  store.ts
  http.ts
  coach.ts
tests/
  evaluation.test.ts
  validation.test.ts
  store.test.ts
  coach.test.ts
  integration.test.ts
public/
  synthetic-sales.csv
docs/
  IMPLEMENTATION_SPEC.md
  ASSESSMENT.md
  DEMO.md
  VALIDATION.md
.env.example
.gitignore
README.md
package.json
package-lock.json
```

Equivalent organization is fine if it keeps scoring, request validation, persistence, and coaching separate and testable. Prefer server rendering for read-only evidence and a client component only where interaction requires it. Do not import filesystem or server-only model configuration into the browser bundle.

## 15. Required automated verification

Write meaningful tests around trust boundaries and assessment behavior, rather than tests that merely mirror component markup.

### Scoring tests

Cover:

- Reference artifact scores 100 and passes all checks.
- Raw source rows fail cleaning rules appropriately.
- Each check has a test that demonstrates its specific pass/fail behavior.
- Wrong but well-formatted dates and revenue fail fidelity.
- Unknown IDs, missing IDs, duplicate IDs, blank IDs, R008 inclusion.
- Empty evaluator input does not pass vacuous checks.
- Partial unique valid subset gets only the narrow points allowed by the rubric.
- Duplicate reference rows can pass field checks but fail uniqueness and integrity.
- Bad total, mismatched total, invalid numeric forms, negative values, excessive precision.
- Exact decimal-to-cents handling, including 85.50 and zero parsing.
- Repeated evaluations are deeply equal.
- Row ordering does not change score.
- Reflection, name, demo status, and model availability cannot change score.

### Validation and storage tests

Cover invalid envelopes, bounds, type coercion rejection, malformed JSON, actual streamed size cap, invalid tokens/paths, atomic persistence, owner separation, fingerprint stability, and no secret fields in public/exported output.

### HTTP end-to-end integration

Against a running real Next server:

1. Submit a valid artifact and receive an owner session plus private receipt.
2. Confirm a forged client score does not alter server results.
3. Load the receipt as owner.
4. Confirm another browser/session cannot read, share, revoke, download, or list it.
5. Confirm no public evidence link exists before enablement.
6. Enable sharing as owner.
7. Read the employer evidence without the owner cookie.
8. Confirm score/artifact match the submission and no ownership secret is present.
9. Download CSV and JSON and verify actual content.
10. Revoke sharing; old link fails on a fresh request.
11. Confirm owner access still works.
12. Re-enable and confirm a different share token.
13. Restart the server using the same data directory and confirm persistence.
14. Reject cross-origin mutation, malformed and oversized requests without receipt creation.
15. Confirm invalid/revoked routes show a useful unavailable state.

Use an isolated temporary data directory for tests, never actual user receipts. Document how the integration test server starts/stops. Avoid test artifacts in the My receipts list.

### Coach tests

Mock model success, timeout, offline error, HTTP failure, malformed output, and text containing markup. Verify:

- Model requests contain no name/reflection/session/share token.
- Model output never alters official score or stored artifact.
- Endpoint requires the owner session.
- Duplicate concurrent requests are bounded.
- Offline coaching leaves the full assessment/share flow usable.

If the real local model is available, run one small smoke request and record the observed result separately from mocked test coverage. Do not claim a real model test passed when only a mock ran.

## 16. Browser QA and acceptance checklist

Run the app and inspect it with supported browser tools if available. Check:

- Landing page at desktop and mobile sizes.
- Starting the challenge and reading the rules.
- Editing a cell, removing/restoring rows, entering total, and navigating with keyboard.
- Draft restoration after refresh and safe handling of invalid draft data.
- Reset and demo-fill labels.
- Submitting a deliberately imperfect artifact and inspecting useful failure feedback.
- Submitting the demo solution and seeing its persistent demo label.
- Private receipt, downloads, share/copy fallback, independent employer view, revoke, and retry.
- Coach success if available and a useful offline state.
- No overflow, unreadable text, broken controls, missing page titles, or console/runtime errors.

Capture screenshots for useful review if supported. If browser automation is unavailable, complete HTTP and production checks and explicitly identify the visual/interactive verification gap. Do not pass off HTTP tests as browser tests.

The work is complete only when the single end-to-end flow is functioning, typechecking passes, meaningful automated tests pass, the production build succeeds, and remaining limitations are documented. Fix actual failures before adding optional polish or features.

## 17. Documentation and demo

README must explain:

- What the app does and its intended user.
- Explicitly: it is not a résumé builder.
- Installation, Node version, `npm ci`, local run, production build/start.
- The one assessment, its conventions, all six checks, and score interpretation.
- Anonymous browser ownership, session expiry/loss, and local data location.
- Share/revoke behavior and localhost reachability limits.
- Local Ollama setup using existing models, configuration, timeout, and offline behavior.
- Why deterministic scoring and optional generative coaching are separated.
- What is verified and what is not.
- Known limitations and production next steps without pretending they are implemented.
- Exact verification commands and observed results.

Write `docs/DEMO.md` with a reliable 2–3 minute presentation:

1. Explain the early-career evidence problem in one sentence.
2. Show the task and transparent rubric.
3. Make one manual edit to demonstrate interaction.
4. Use **Load demo solution** and point out the demo label.
5. Submit and inspect check evidence plus the exact artifact.
6. Enable sharing and show the read-only reviewer page.
7. Revoke and show the old link becoming unavailable.
8. Optionally request local practice advice; explain it never controls scoring.
9. Close with the verification boundary and one plausible next validation step.

Include an alternative imperfect-attempt demonstration to show that the evaluator does not just award 100 to everything. Do not use coaching as a critical dependency in a live presentation.

Write `docs/VALIDATION.md` with actual commands, outcomes, any screenshots, real local-model smoke result if run, and remaining gaps. Do not invent test counts, passing checks, or deployment status.

## 18. Completion handoff

When implementation is complete, give a concise report including:

- The project location and exact local startup command.
- The working local URL if a server is running.
- What was built, centered on the assessment → receipt → evidence flow.
- Which checks actually passed.
- Local LLM status and behavior when offline.
- Any material limitations or verification gaps.

Do not claim public deployment or remote employer access unless that was separately authorized and verified. Do not commit runtime receipts, local secrets, dependency folders, or build output. Do not push or publish anything without a user request.

Prioritize a credible, polished, honest demonstration over feature breadth. Build only what the product can defend with inspectable evidence.
