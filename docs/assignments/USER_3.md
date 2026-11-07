# User 3 prompt — local AI coaching, independent tests, documentation, integration

You are **User 3 of a three-person SkillReceipt team**. Use the master prompt for product context and this assignment for your implementation scope. Own the local LLM service integration, independent end-to-end verification, final documentation, and the final combined application after both other owners hand off.

Do not start by building an alternative frontend, scoring module, or persistence layer.

## File ownership during parallel work

You own:

- `lib/server/coach.ts`.
- `app/api/receipts/[id]/coach/route.ts`.
- `.env.example` containing only safe configuration examples.
- `tests/unit/coach.test.ts`.
- `tests/integration/**`, `tests/browser/**` if supported, and `tests/helpers/**`.
- `docs/DEMO.md`, `docs/VALIDATION.md`, `docs/INTEGRATION.md`.
- Final `README.md` and `docs/handoffs/USER_3.md`.

User 2 owns all UI, including the coach panel. User 1 owns shared contracts, configuration/lockfile, data, evaluator, validation, server auth/query/store, and all other APIs. Do not duplicate or edit those during parallel work. Request dependency/script additions from User 1 rather than independently rewriting `package.json`.

## Start and simultaneous work

Use your own clone/working copy and branch, e.g. `feat/coach-quality`, from User 1's shared baseline. While it is being prepared, draft tests, fixtures, the demo script, and the model adapter against this contract. Do not scaffold a disconnected app or create a shared remote without authorization.

Early useful work includes mocking the Ollama transport, authoring HTTP assertions, and documenting the expected demo flow. You do not need User 2's finished styling to start.

## Local model integration

Implement `lib/server/coach.ts` with an exported function:

```ts
getPracticeAdvice(evaluation: Evaluation): Promise<{
  advice: string;
  model: string;
}>;
```

Use existing local Ollama when available; default to `http://127.0.0.1:11434` and `llama3.2:latest`. Recheck available models on this machine. Other teammates may have no Ollama, so keep mocked tests runnable without it. Do not download models, expose Ollama to the internet, or fall back to a cloud model.

The adapter gets only official evaluation data. Construct its outbound prompt from the fixed rubric definitions and pass/fail flags, not arbitrary stored observations or user-supplied strings. Do not pass a name, reflection, artifact, session, or capability token. Ask for at most three short practical suggestions; no grading, certification, identity inference, or hiring advice.

Use server-only configuration `OLLAMA_BASE_URL` and `OLLAMA_MODEL`, a bounded timeout (for example 45 seconds), bounded output, and safe handling of malformed/empty responses. Support transport mocking/injection for meaningful unit tests. Advice is transient and never changes or becomes part of the receipt.

The coach route:

- Requires matching owner via User 1's `getRequestReceipt(request, id)`.
- Uses the shared same-origin guard and catches origin rejection as 400.
- Ignores/rejects attempts to supply a replacement score or custom prompt.
- Prevents concurrent duplicate work for one receipt and bounds local request rate.
- Returns 200 `{ advice, model, assessed: false }`.
- Returns a safe 503 for unavailable model/timeout/malformed output and 429 when bounded.
- Uses private/no-store responses.
- Never exposes its raw server errors or secret/configuration details.

Coordinate the simple frontend endpoint contract with User 2; do not take ownership of their component.

## Independent verification

Write meaningful tests for the combined flow using isolated temporary storage and independent cookie jars. Cover all master requirements: server-authoritative score, valid/invalid submissions, owner isolation, read/list/download restrictions, share enable, independent evidence access, revocation, re-enable with new token, persistence across server restart, no secret leakage, malformed/oversized body handling, and cross-origin rejection.

Test scoring behavior through the real API where possible rather than changing the rubric to make tests pass. User 1 owns evaluator unit tests, but report independent counterexamples if you find an error. Keep observed values and expected reference values grounded in the master dataset.

Mock coach success/offline/timeout/malformed output and inspect the outbound payload for privacy boundaries. Confirm model availability never changes a score or receipt fingerprint. If local Ollama is available, run one small real smoke test and separately record that observation.

Use supported browser tools for real interaction/mobile checks where available. Do not install an entire browser toolchain without first checking what is available and coordinating dependencies. If browser verification is unavailable, state the gap clearly; still run HTTP tests, typecheck, and production build.

## Final integration — after handoff, not while others are editing

You are the final integrator. Start broad integration edits only after Users 1 and 2 have explicitly handed off and stopped editing their branches. Until then, keep to your owned files.

1. Confirm all three branches descend from the same baseline and preserve each person's work.
2. In a clean integration branch such as `integration/skillreceipt`, combine their local commits using the team's authorized Git/patch workflow. Do not reset away, force-push, or overwrite unrelated work.
3. Resolve boundary conflicts against the shared contract. If your test reveals a genuine bug, ask the relevant owner for a targeted fix or, after their handoff, apply the minimum necessary integration fix and document it.
4. At this stage only, you may make coordinated fixes across the application and adjust package scripts/lockfile when needed. Avoid redesigning a completed screen or changing the product/rubric.
5. Run `npm ci` in the integrated checkout, typecheck, full unit/integration tests, production build, and supported browser checks. Fix actual failures. Test with the coach unavailable as well as any available model.
6. Verify no development mock, model advice in employer receipts, runtime data, `.env.local`, or ownership token is included in tracked source.
7. Write the final README, actual validation results, known limitations, and reliable 2–3 minute demo instructions.
8. Hand over the combined local project/branch and startup command. Do not publish or push unless explicitly authorized.

Your `docs/handoffs/USER_3.md` should identify integrated commits, commands and real outcomes, local model status, screenshots if available, and unresolved gaps. Do not claim that any unrun check passed.

Read the accompanying [shared interface contract](../SHARED_CONTRACT.md).
