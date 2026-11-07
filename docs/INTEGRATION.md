# Combined application integration

Date: November 7, 2026, America/Toronto. The lead explicitly authorized merging all team branches into `main`. Integration was prepared on `integration/skillreceipt` from the common docs baseline `9360e8a`, with no reset, force push or discarded branch history.

## Integrated inputs

| Role | Branch | Head included |
| --- | --- | --- |
| User 1 | `claude/skillreceipt-work` | `963dc1d` (backend `c9718ea`, origin fix `3179ced`, handoff) |
| User 2 | `codex/skillreceipt-work` | `2d73d59` (UI `532c7a5`, explicit handoff) |
| User 3 | `feat/coach-quality` | `0fc6009` (local coach, independent tests and docs) |

The three branches were merged with separate normal merge commits, preserving authors and history. User 1 and User 2 explicitly handed off. No shared type, endpoint shape, source row, reference amount, grading rule or product boundary was changed during integration.

## Integration fixes

1. **Empty coach requests:** Next can expose a non-null stream for an empty POST. The old non-null check returned 400 for legitimate owner requests. The coach now reads until actual bytes or EOF, accepts empty streams and rejects all nonempty content (including `{}` and custom prompts). It buffers no prompt and has a 1.5-second request-body deadline. Regression tests cover empty and unfinished streams.
2. **HTTP test request deadlines:** independent cookie clients now attach a 60-second deadline unless a caller supplies one, covering response reads and preventing indefinite test hangs. This changes no assertions, scoring or app authorization. The normal `npm run test:e2e` command now passes without a diagnostic preload.
3. **Coach UI deadline:** the panel now waits up to 50 seconds, beyond the server's 45-second model limit. Deterministic feedback stays visible throughout.
4. **Documentation:** replaced preparatory-only setup/status with actual integrated commands/outcomes, preserving prior role handoffs as historical records. The original role handoffs describe their respective branches at delivery; this file and VALIDATION.md describe the combined app.

## Preserved behavior

The server remains authoritative for all six deterministic checks. Exact decimal-to-cents comparisons, nine valid IDs and the 128550-cent reference are unchanged. The owner cookie is HttpOnly, SameSite=Lax, path=/, 30 days, Secure on HTTPS. The store hashes owner tokens, atomically writes per-receipt files, serializes same-process operations and exposes only safe declared shapes.

Sharing is private by default, explicitly enabled, revocable, and re-enabled with a new token. Public HTML is resolved on the server without an owner cookie, with no-store/noindex/nofollow. Downloads contain actual artifact rows/safe evidence, no owner/private ID/share capability or advice. Model text never grades, mutates, persists in, or becomes part of a receipt.

The coach uses loopback-only server configuration and fixed descriptions/pass-fail flags, selecting up to three approved exercises. Unknown, duplicated, irrelevant, malformed or markup selections return safe 503. Per-process limits remain one pending request per receipt, 30-second cooldown after completion/failure, two global generations and 256 bounded cooldown entries. No cloud fallback or model downloads.

## Validation and limits

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`. All passed on the combined source: 55 unit cases and all ten nested HTTP scenarios. A separate real local-model HTTP smoke returned 200 and left the complete receipt unchanged. See [VALIDATION.md](VALIDATION.md) for precise evidence.

Desktop landing/assessment views loaded in Brave and the landing screenshot was inspected. Further browser actions were interrupted by unstable native control; full interactive/mobile QA remains a recorded gap. This merge does not establish public deployment, production readiness, broad skills certification, identity/authorship verification or hiring suitability.

Local startup is `npm ci` then `npm run dev`, normally http://localhost:3000. Runtime storage defaults to `.data/` and can be overridden with `SKILLRECEIPT_DATA_DIR`; it is one-process local persistence, not a distributed/cloud store. Final demo instructions are in [DEMO.md](DEMO.md).
