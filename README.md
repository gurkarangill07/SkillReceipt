# SkillReceipt

> Turn practical work into evidence someone else can inspect.

A UNHack 2026 prototype for early-career job seekers: complete a synthetic sales-data cleanup challenge, submit the work, receive a receipt from published deterministic checks, and explicitly enable a read-only evidence link for a reviewer.

**Current status: shared documentation only.** The application, dependencies, package scripts, and automated tests have not been added yet. There is no deployed app. User 1 prepares the runnable shared baseline before the team starts integrating features.

## Start here

1. Read [the master specification](docs/IMPLEMENTATION_SPEC.md).
2. Read [team roles and startup order](docs/TEAM.md).
3. Follow [the shared interface contract](docs/SHARED_CONTRACT.md).
4. Follow [the contribution workflow](CONTRIBUTING.md) and your assigned role prompt.

User 3's supplied assignment is available in [docs/assignments/USER_3.md](docs/assignments/USER_3.md). Users 1 and 2 should use their own assignments from the team lead; their full assignment prompts have not been supplied here.

## Get the repository

```bash
git clone https://github.com/gurkarangill07/SkillReceipt.git
cd SkillReceipt
```

If you already cloned it, commit or otherwise preserve your own work, then update your local `main` with `git pull --ff-only origin main`. Each developer uses their own clone and feature branch. See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete sequence.

There is no `package.json` yet, so `npm ci` and `npm run dev` are not available. Once User 1's baseline is merged, use its pinned Node/npm requirements, run `npm ci`, and follow the documented scripts. The planned stack is Next.js App Router, React, strict TypeScript, Tailwind CSS, npm, and local server persistence, targeting Node 22 or a newer supported LTS.

## Team ownership

| Role | Responsibility |
| --- | --- |
| User 1 | Shared baseline, configuration/lockfile, contracts, dataset, deterministic evaluator, validation, ownership/storage/query helpers, and APIs except coaching. |
| User 2 | All UI, addressable pages, assessment workspace, receipt/evidence views, sharing controls, and coach panel. |
| User 3 / team lead | Local coaching adapter and endpoint, independent tests, final documentation, and final integration after Users 1 and 2 hand off. |

## Product boundaries

- One assessment: `sales-cleaning-v1`, rubric `deterministic-v1`; reference total **1285.50 CAD**.
- Rules score submitted work. Optional local Ollama advice helps practice and never grades or changes a receipt.
- This is **not a résumé builder** and does not verify identity, authorship, credentials, general competence, or hiring suitability.
- Sharing starts disabled. Owners explicitly enable and can revoke a link; saved copies cannot be recalled.
- No secrets, runtime receipts, owner/share tokens, dependency folders, or build output belong in Git.
- Publishing starter documentation does not authorize deployment or unrelated feature pushes.

## Verification status

No application checks have run because application code is not present. Actual build/test/browser outcomes will be recorded in `docs/VALIDATION.md` by User 3 during integration. Do not treat a checklist as a passing test result.
