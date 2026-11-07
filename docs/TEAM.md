# Team roles and startup order

## Current shared state

The backend, frontend and local coach are integrated. Start new work from the latest `main`; actual results and remaining browser QA gaps are in [VALIDATION.md](VALIDATION.md). The team lead is User 3. All three human developers use their own Codex sessions and clones; do not launch additional agents/workers.

## Ownership during parallel work

| Owner | Owned scope |
| --- | --- |
| User 1 | `lib/contracts.ts`, `lib/assessment.ts`, `lib/evaluate.ts`, configuration and lockfile, data, validation, fingerprinting, server auth/query/store/http helpers, and APIs except the coaching route; evaluator/validation/storage tests. |
| User 2 | All frontend pages, layouts, styles, components, assessment editing, private results, employer evidence, share controls, and coach panel. |
| User 3 | `lib/server/coach.ts`, `app/api/receipts/[id]/coach/route.ts`, `.env.example`, `tests/unit/coach.test.ts`, `tests/integration/**`, `tests/browser/**` where supported, `tests/helpers/**`, `docs/DEMO.md`, `docs/VALIDATION.md`, `docs/INTEGRATION.md`, final `README.md`, and `docs/handoffs/USER_3.md`. |

This table summarizes the supplied master and User 3 assignment; Users 1 and 2 must also follow their complete assignments from the lead. It does not replace missing role prompts. User 1 is the canonical owner of the shared implementation; [SHARED_CONTRACT.md](SHARED_CONTRACT.md) specifies signatures, not permission for other roles to implement substitutes.

## Startup sequence

The initial sequence below has been completed for this delivery; User 1 and User 2 explicitly handed off before final integration. Use the integrated README to run the app rather than waiting for another baseline.

1. Everyone reads the master, shared contract, and their assignment.
2. User 1 prepares the compatible Next.js/TypeScript/npm baseline, shared types/data/helpers and agreed scripts on the shared history. Coordinate a minimal UI shell with User 2 if required to make the baseline runnable.
3. User 1 shares the baseline commit and setup commands with the team and publishes it through the lead-authorized workflow.
4. Users 2 and 3 update from the baseline and work on their own branches. While waiting, prepare only owned drafts/tests against the contract; do not scaffold separate apps.
5. Coordinate endpoint/type/dependency changes before making them. User 2 owns the coach UI; User 3 supplies its agreed endpoint.
6. Users 1 and 2 explicitly hand off and stop editing their branches.
7. User 3 combines the work on an integration branch, makes minimum coordinated fixes, runs final verification, and documents actual outcomes.

Do not merge incomplete branches just to appear finished. Integration begins after the handoffs, with no destructive resets or overwrites.

## Contract reminders

- The exact synthetic source/reference data and six deterministic checks come from the master. Total: **128550 cents**.
- Use the exact `DataRow`, `Submission`, receipt and evaluation types in the shared contract.
- Owner access uses server-side anonymous-session authorization. A receipt UUID alone is insufficient.
- Evidence is private until explicitly shared. Public evidence/export shapes contain no private ID, session/owner fields, or share capability.
- Coaching receives only fixed rubric text and check pass/fail flags, never user content or tokens. It is transient and excluded from official evidence.
- The UI must preserve demo labels and show failed checks alongside any score.

## Decisions that need coordination

Contract signatures, endpoint shapes, dataset/rubric changes, package additions, storage-directory/test-server configuration, and ownership changes must be agreed with the affected owner and lead. Document the agreed decision rather than silently inventing an alternative.

## Handoff format

Each owner creates their own handoff file when ready, containing:

- Branch and commit(s), plus the baseline they descend from.
- Files changed and interfaces delivered.
- Exact commands run and observed results; explicitly identify unrun checks.
- Open issues, limitations, and dependencies on another owner.
- An explicit statement that editing has stopped and the branch is handed off.

Future handoffs still require explicit owner communication. Historical role handoffs are preserved under `docs/handoffs/`; the User 3 combined handoff describes the integrated delivery.
