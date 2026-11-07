# User 3 preparatory delivery

Date: November 7, 2026. Branch: `feat/coach-quality`. Shared ancestor: `9360e8a` (`docs: add shared specification and team onboarding`).

## Status

User 3's owned coaching implementation, independent test suite, and draft documentation are prepared. This is **not the final combined application handoff**. The lead confirmed Users 1 and 2 had not started; neither has handed off. No other feature branches have been integrated and no production app/build/browser pass is claimed.

The implementation is kept local until the lead requests publication. The delivery commit can be identified with:

```bash
git log -1 --format='%h %s' feat/coach-quality
```

## Delivered files

- `lib/server/coach.ts`: required advice API, injectable local Ollama transport, privacy-safe fixed prompt, approved-exercise selection, bounded timeout/output, and delegated owner/origin endpoint adapter with cooldown/global bounds.
- `app/api/receipts/[id]/coach/route.ts`: production Next route using the shared auth/http interfaces. No substitute auth/store/scoring modules were created.
- `.env.example`: safe optional server-only coach configuration.
- `tests/unit/coach.test.ts`: 25 independent mocked unit checks.
- `tests/helpers/**`: synthetic fixtures, explicit test-only Node loader, real-model smoke, cookie/CSV assertions and isolated real Next/mock-model server harness with helper type declarations.
- `tests/integration/receipts.test.ts`: independent HTTP acceptance suite, awaiting the runnable baseline/build.
- `tests/browser/README.md`: browser acceptance checklist and explicit unrun status.
- `README.md`, `docs/DEMO.md`, `docs/VALIDATION.md`, `docs/INTEGRATION.md`: current setup, demo, actual results, owner coordination and final integration requirements.

## Results

The exact commands and observations are in [VALIDATION.md](../VALIDATION.md): 25 coach unit tests passed; syntax checks passed; the final local `llama3.2:latest` smoke returned two approved practice exercises with unchanged evaluation. The HTTP command exited 1 at the missing-build preflight, before any app assertions or receipt creation.

Two real preliminary free-form responses contained rubric mistakes. The final adapter prevents that path by accepting only approved exercise identifiers and returning fixed safe text. No model advice is graded or saved.

## Needed from teammates

User 1: shared types/auth/http modules, `server-only`, pinned packages/scripts, evaluator/store/API implementation, and storage/test configuration agreement. User 2: all screens and the text-only coach panel, including deterministic fallback and accessible async states. Detailed requests and frontend contract: [INTEGRATION.md](../INTEGRATION.md).

After both explicit handoffs: confirm common ancestry, integrate without discarding work, run reproducible installation/typecheck/all tests/build/HTTP/browser checks, verify exclusion of secrets/runtime data/advice from evidence, and replace the preparatory status with the final integrated commits and actual outcomes. A localhost-only prototype is not a public deployment.
