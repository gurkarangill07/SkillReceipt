> The contract below records the original three-role baseline. The lead-approved revision adds an optional `Submission.workSample` for versioned pipeline decisions and client-reported session context, six pipeline check IDs, and an optional assessment version on pipeline summaries. `lib/contracts.ts` is the current canonical source. Legacy submissions retain exactly their original safe shape. See [DEMO_V2_SPEC.md](DEMO_V2_SPEC.md).

# Shared interface contract — identical for all three teammates


This contract specializes the master prompt's suggested architecture. Follow it rather than inventing similar but incompatible names. User 1 writes the canonical implementation into the shared baseline. Users 2 and 3 may work from these signatures while waiting; do not implement substitute server logic or duplicate shared types.

### Shared browser-safe modules

`lib/contracts.ts` exports these TypeScript types:

```ts
export type DataRow = {
  orderId: string;
  date: string;
  region: string;
  revenue: string;
};
export type Submission = {
  rows: DataRow[];
  total: string;
  displayName: string;
  reflection: string;
  demo: boolean;
};
export type CheckId =
  | 'unique' | 'dates' | 'regions' | 'revenue' | 'integrity' | 'total';
export type CheckResult = {
  id: CheckId;
  label: string;
  rule: string;
  pointsPossible: number;
  pointsEarned: number;
  passed: boolean;
  observations: string[];
};
export type Evaluation = {
  score: number;
  tier: 'Strong evidence on this task'
      | 'Developing evidence on this task'
      | 'More practice needed on this task';
  checks: CheckResult[];
};
export type ReceiptEvidence = {
  createdAt: string; // server ISO UTC timestamp
  assessmentVersion: string;
  rubricVersion: string;
  submission: Submission;
  evaluation: Evaluation;
  fingerprint: string;
};
export type OwnerReceipt = ReceiptEvidence & {
  id: string; // private UUID
  shareToken: string | null;
};
export type ReceiptSummary = {
  id: string;
  createdAt: string;
  score: number;
  tier: Evaluation['tier'];
  demo: boolean;
  sharingEnabled: boolean;
};
export type ApiError = { error: string };
export type CoachResponse = {
  advice: string;
  model: string;
  assessed: false;
};
```

The stored receipt may additionally contain an owner hash internally, but it must never appear in the types above or API output. `ReceiptEvidence` contains no private ID, share capability, or ownership fields. Name and reflection remain self-reported/unassessed. Coaching is excluded from all receipt types.

`lib/assessment.ts` exports:

- `ASSESSMENT_VERSION = 'sales-cleaning-v1'`
- `RUBRIC_VERSION = 'deterministic-v1'`
- `SOURCE_ROWS: readonly DataRow[]` — the exact 12-row master dataset.
- `REFERENCE_ROWS: readonly DataRow[]` — the exact nine-row master reference.
- `REFERENCE_TOTAL_CENTS = 128550`
- `RUBRIC: readonly { id: CheckId; label: string; rule: string; pointsPossible: number }[]`

`lib/evaluate.ts` exports:

- `parseCents(value: string): number | null`
- `evaluate(submission: Submission): Evaluation`

UI code may use the reference data for the explicitly labeled demo solution. The server remains authoritative. No reference or demo flag proves authorship.

### Server-only interfaces

`lib/server/queries.ts` exports:

```ts
getCurrentReceipts(): Promise<ReceiptSummary[]>;
getCurrentReceipt(id: string): Promise<OwnerReceipt | null>;
getSharedEvidence(token: string): Promise<ReceiptEvidence | null>;
```

The first two read and validate the owner cookie using the current Next server request context. The third resolves a capability token without requiring an owner cookie. Each function returns only its safe declared shape. Protect private/public routes against stale caching. Mark these modules server-only.

`lib/server/auth.ts` exports:

```ts
getRequestReceipt(
  request: NextRequest,
  id: string
): Promise<OwnerReceipt | null>;
```

User 3 uses this to authorize coaching without duplicating cookie or filesystem logic. User 1 may add internal helpers but must preserve these interfaces.

`lib/server/http.ts` exports `assertSameOrigin(request: NextRequest): void`, which throws on disallowed cross-origin mutation, plus a shared error-response helper if useful. The coach route must catch an origin rejection and return the same 400 error shape as the other mutation endpoints.

### HTTP contracts

All JSON errors: `{ "error": "Useful message" }`.

| Endpoint | Request | Success |
| --- | --- | --- |
| `GET /api/dataset` | None | Synthetic source CSV attachment. |
| `POST /api/receipts` | JSON `Submission` | 201 `OwnerReceipt`; sets HttpOnly owner cookie. |
| `GET /api/receipts` | Owner cookie | 200 `{ receipts: ReceiptSummary[] }`; empty array without session. |
| `GET /api/receipts/[id]` | Owner cookie | 200 `OwnerReceipt`. |
| `POST /api/receipts/[id]/share` | Owner cookie; JSON `{ enabled: boolean }` | 200 `{ shareToken: string | null }`. |
| `GET /api/receipts/[id]/download?format=json` | Owner cookie | Downloadable safe evidence JSON, including demo status; no ID, owner fields, or share token. |
| `GET /api/receipts/[id]/download?format=csv` | Owner cookie | CSV of actual submitted rows. |
| `POST /api/receipts/[id]/coach` | Owner cookie; no user prompt/body required | 200 `CoachResponse`. |

Unauthorized or unavailable private receipt: 404. Invalid input/origin: 400. Duplicate/rate-limited coach request: 429. Local coach offline/timeout/invalid response: 503. Unexpected server failure: safe 500.

Sharing endpoints belong to User 1. Coaching endpoint belongs to User 3. The employer HTML route `/evidence/[token]` belongs to User 2 and calls `getSharedEvidence`; do not add a competing public API unless coordinated.

For sharing, User 2 builds `/evidence/${shareToken}` against the current browser origin. The token may only exist in owner share UI and that capability URL, not in downloaded evidence. Revocation makes subsequent fresh page requests unavailable; it cannot recall previously viewed/downloaded copies.

### Common product constraints

No résumé builder. No fake endorsement or statistics. No “verified person” badge. The deterministic rubric controls the result. The LLM never grades or edits a receipt. Keep all six check observations visible. Preserve demo labels across the entire flow. No cloud fallback. No public deployment, remote creation, or push without explicit authorization.

Use only the master rubric: uniqueness requires valid IDs; a valid unique subset can earn 20 but not coverage points; invented IDs earn zero; duplicate valid rows may pass field-fidelity checks but fail uniqueness/integrity; reference solution totals 1285.50 CAD. Never silently simplify these rules.
