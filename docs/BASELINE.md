# User 1 backend baseline

This branch, `claude/skillreceipt-work`, supplies the shared configuration, assessment, evaluator, server repository/ownership/query helpers, and all APIs except coaching. User 2 owns the UI; User 3 owns coaching and independent acceptance. No frontend or coach code from those branches is included here. The existing README is the original shared starter document; use this file for the new backend setup.

## Install and run

Target Node 22 or a newer supported LTS. Observed local environment: Node 22.14.0, npm 10.9.2. All direct package versions and the npm lockfile are committed.

```bash
npm ci
npm run dev
```

The development server normally prints `http://localhost:3000`. This backend-only branch serves `/api/dataset` and `/api/receipts` plus receipt read/share/download endpoints. The root UI remains User 2's branch; a root 404 on this branch is expected. No server is intentionally left running at handoff.

```bash
npm run typecheck
npm test
npm run build
npm start
```

The pure evaluator and validation code use TypeScript; unit tests use Node's built-in runner via pinned `tsx`. The test launcher enumerates files for consistent Windows/macOS behavior. Server-only imports use Node's `react-server` condition in tests; the actual Next build retains the boundary. No test auth/store substitutes are included in app source.

`npm run test:e2e` invokes User 3's independent integration suite once that branch is combined. In this backend-only checkout it intentionally reports that the suite is absent. In the temporary combined checkout the suite was executed; its actual partial outcome and outstanding coach issue are in [the handoff](handoffs/USER_1.md).

## Configuration and runtime storage

`SKILLRECEIPT_DATA_DIR` is server-only and defaults to `.data/` under the running process's current directory. Set it to an absolute temporary directory for tests. No `.env.local` is required. Runtime data, secrets, installed dependencies and build output remain ignored by Git.

The file repository writes one UUID-named JSON file per receipt with a unique sibling temporary file, file flush and atomic rename. Files use mode 0600 and newly created directories 0700 where supported. Per-directory in-process locks serialize reads, writes and share changes, including multiple repository objects using that directory. No raw owner cookie is persisted. Return values are copied and allowlisted; downloaded/public evidence excludes private IDs, share tokens and owner hashes. The repository interface can be replaced without changing shared queries or routes.

This implementation supports one server process on a durable local filesystem. It does not provide distributed locking, multi-instance correctness, ephemeral/serverless durability, a backup service, or ownership recovery. Owner lists and capability lookups scan local files, which is appropriate only for this small prototype. Corrupt/inconsistent records produce safe failures rather than silent evidence repair.

## Anonymous ownership and origin protection

The browser receives a random 32-byte token as a 64-character lowercase hex `skillreceipt_owner` cookie only after a valid receipt is persisted. It is HttpOnly, SameSite=Lax, Path=/, Max-Age=2,592,000 seconds (30 days), Secure for HTTPS requests and usable over local HTTP otherwise. Losing/clearing/expiring the browser cookie loses access through the app; there is no sign-in or recovery service.

Receipts store a SHA-256 hash of that token. A private UUID does not authorize reads, lists, sharing, revocation, coaching, or downloads. Unauthorized/unavailable receipt APIs return the same 404 shape. Anonymous GET list returns an empty array.

Mutations require an exact Origin match to the incoming Host and request protocol, and reject cross-site/same-site fetch metadata. The guard intentionally does not trust `X-Forwarded-Host`. Next can normalize its internal hostname to `localhost`, so the incoming Host is authoritative for the local origin comparison. Direct API clients must send an appropriate Origin header. Reverse-proxy/public hosting is a separate deployment decision and has not been verified.

## Assessment and evidence

The exact 12-row synthetic source and nine-row reference are in `lib/assessment.ts`. The published six rules, partial/duplicate edge cases and reference total are preserved; see [ASSESSMENT.md](ASSESSMENT.md). The evaluator computes all scores server-side. Client scores, evaluation flags, timestamps, owner fields and other privileged keys are stripped by the submission allowlist. Optional name/reflection/demo defaults do not affect scoring.

Input is an actual streamed UTF-8 JSON body capped at 65,536 bytes, independent of Content-Length. Rows: 1–30. Text limits: ID 40, date 60, region 60, revenue 40, total 40, optional name 60 and optional reflection 1500 characters. Cells remain exact; semantic mistakes are accepted and scored as failures. Malformed envelopes return actionable 400 without creating a receipt or owner cookie.

Fingerprint serialization is UTF-8 JSON with top-level keys in this exact order: `assessmentVersion`, `rubricVersion`, `rows`, `total`. Each row keeps submitted order and keys `orderId`, `date`, `region`, `revenue`, preserving exact strings. SHA-256 hashes that serialization. Name, reflection, demo marker, evaluation, ownership, sharing and advice are excluded. Changing row order or equivalent decimal spelling can change the fingerprint without changing score. It is an artifact fingerprint, not a signature, identity proof or defense against an operator rewriting evidence.

The `sales-cleaning-v1` / `deterministic-v1` implementation is frozen. Reads validate stored consistency with this exact v1 evaluator and fingerprint, rejecting corruption without overwriting it. Future rubric changes require versioned evaluators and a coordinated migration strategy; do not edit v1 semantics in place.

Sharing starts disabled. Explicit owner enablement creates 32 random bytes represented as hex; repeat enabling is idempotent. Revoke invalidates the token, leaves the assessed snapshot unchanged, and re-enable generates a fresh token. Queries and receipt APIs disable caching; the shared Next configuration also marks evidence noindex/nofollow. Saved copies cannot be recalled. A localhost URL works only where the server is accessible.

CSV always represents submitted rows. Cells are quoted/escaped and prefixed with an apostrophe when needed to prevent spreadsheet formula execution, including hidden leading whitespace/control characters. This safety prefix is export-only; original values remain in the JSON artifact. Public evidence and downloads use declared safe shapes, with no coaching output.

## Integration

Merge this branch's shared baseline into the other role branches using the lead's chosen workflow; preserve their work and common ancestor `9360e8a`. User 2's Tailwind v4 import is supported by this pinned PostCSS/Tailwind setup. Shared function/type/endpoint signatures match [SHARED_CONTRACT.md](SHARED_CONTRACT.md). No public evidence API was added: User 2's HTML route calls `getSharedEvidence`.

Final integration still needs the coach's empty-request fix, a clean run of the unmodified full HTTP suite, real browser verification and updated final documentation. None is implied by pushing this backend branch.
