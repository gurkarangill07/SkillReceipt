# Candidate and employer portal revision

Lead request: simplify the interface, use dark mode, keep résumé → role search → professional assessment, make the demonstration easier, add candidate/employer logins, Candidate ID lookup with résumé and score review, improvement steps, and a small coding test.

This revision supersedes the original no-account/no-résumé-storage boundary and the six-question Engineer demo in DEMO_V2_SPEC.md. The original sales rubric and stored pipeline-v1 receipts retain their versions and evaluation behavior.

## Candidate journey

Create a candidate account at `/login`, then use `/dashboard` to upload/update a PDF, DOCX or TXT résumé, view a stable `SR-…` Candidate ID and previous results. `/start` leads from résumé context to a search over the two supported role assessments. No live job board or arbitrary-role generation is claimed.

The new Engineer version presents three decisions individually: business key, missing-value handling, and reliable retries. Then a small JavaScript exercise asks for `totalRevenue(orders)`, adding integer revenueCents and skipping nulls. Four published cases cover ordinary amounts, an empty list, missing amounts, and genuine zero. Decisions earn 20 each; coding earns 10 per passing case. The starter function returns zero and passes two cases, giving an 80-point presenter attempt with a visible coding improvement opportunity. The sample-code helper marks the attempt as demo.

The server executes code in QuickJS WASM, without host bindings, filesystem, network, browser or Node APIs. Each case has an 8 MiB VM memory limit, bounded stack and a 120 ms interrupt deadline. Code is at most 5,000 characters. This is a small synchronous exercise, not a general development environment. A production public runner would need additional process isolation and operational abuse controls.

A new receipt uses `engineer-coding-v2` / `engineer-rules-v2`. It preserves submitted code, assessed decisions and per-case outcomes. Reads validate persisted outcomes and score consistency without executing user code again. The fingerprint covers the three assessed decisions and code; session observations do not affect it. Unasked v1 decisions are excluded from new submissions and exports. Existing v1 serializers are unchanged.

Private results show the score, four skill checks, exact missed coding cases and practical next steps. Every attempt is a separate record. Existing optional loopback coaching uses fixed rule descriptions and pass/fail flags; it receives no code or résumé.

## Employer journey and consent

Employer accounts sign in at `/login?role=employer`, then use `/employer` to search an exact Candidate ID. Accounts are self-registered; this does not verify an employer's identity or company.

A candidate must explicitly enable employer profile access. While enabled, any signed-in employer who has the ID can see the candidate's self-reported name, uploaded résumé and all work-sample receipts, including demo attempts. The account email/password, owner hashes, private receipt IDs and share tokens are excluded. Contact details inside an uploaded résumé remain in the downloadable file. Employer evidence excludes the private improvement plan and coaching.

Disabling profile access blocks fresh ID lookups and résumé downloads. Already displayed or saved copies cannot be recalled. Opaque public receipt links remain separately controlled and revocable; they contain work-sample evidence, not the account résumé.

## Local accounts and persistence

The application stores account records and private résumé bytes under ignored `.data/accounts/` (or the server's configured data directory), with private file permissions and atomic renames. Passwords use scrypt with random salts; account session tokens are random, hashed on disk, expire after seven days, and are revoked on sign-out. Session cookies are HttpOnly, SameSite=Lax and Secure on HTTPS. Mutations require the same origin. Sign-in has a bounded in-process per-email attempt limit.

An existing anonymous owner can bind its receipts to one candidate account. Bound receipts then require an authenticated account session; an old anonymous ownership cookie alone cannot bypass login. Signing in again restores the account's ownership. The account file also retains the internal receipt-ownership secret; it must be protected alongside résumé files and password hashes.

This is a single-process local prototype. No password recovery, email verification, verified employer organization, multi-process persistence, production document-parser isolation, or public-service account-management lifecycle is implemented. Do not deploy it as a real hiring or proctoring system on the strength of this demo.

Camera preview remains optional and local. Visibility changes pause the task; no footage, audio, browsing history or identity inference is collected. Client-reported session context does not prove independent authorship or prevent cheating and never changes the score.
