# Contributing to SkillReceipt

Read [the master specification](docs/IMPLEMENTATION_SPEC.md), [team guide](docs/TEAM.md), and [shared contract](docs/SHARED_CONTRACT.md) before implementing your assignment. Do not build a second app or substitute shared interfaces.

## Use the same history

Clone the shared repository into your own chosen directory. Do not create another teammate's machine-specific path.

```bash
git clone https://github.com/gurkarangill07/SkillReceipt.git
cd SkillReceipt
git switch main
git pull --ff-only origin main
```

For an existing checkout, preserve uncommitted work before switching branches. Do not reset, clean, or overwrite another developer's changes.

User 1 publishes the runnable baseline first. Users 2 and 3 can prepare their owned documentation, fixtures, or adapter design while waiting, but should branch implementation work from that baseline. Example branch names:

- User 1: `feat/core-baseline`
- User 2: `feat/ui`
- User 3: `feat/coach-quality`
- Final integrator, after explicit handoff: `integration/skillreceipt`

Create your assigned feature branch after updating `main`, for example:

```bash
git switch -c feat/ui
```

If a branch already exists, switch to it instead of creating a replacement. If you started before the baseline was available, coordinate bringing the baseline into your branch without discarding your work.

## Keep changes reviewable

- Work in your assigned files. Coordinate contract, dependency, dataset, and rubric changes before editing them.
- Request package/script additions from User 1 during parallel work; do not independently rewrite the lockfile.
- Inspect `git status` and `git diff --cached` before committing. Stage the specific intended paths.
- Never commit `.env.local`, credentials, `.data/`, `node_modules/`, `.next/`, test reports, or local receipts.
- When the team lead authorizes publishing your work, push your feature branch and open a pull request targeting `main`. Never force-push shared history.
- This setup request authorizes the initial shared documentation upload; future implementation publication follows the team lead's instructions.

Include the problem solved, affected contracts, actual validation results, and remaining gaps in your PR. The PR template is a reminder, not evidence that checks ran.

## Hand off explicitly

Each owner records their branch and commit, changed files, exported interfaces, commands actually run and outcomes, and remaining gaps in `docs/handoffs/USER_1.md`, `USER_2.md`, or `USER_3.md` as appropriate. State explicitly when you have stopped editing and handed off.

User 3 begins broad integration edits only after Users 1 and 2 explicitly hand off. Preserve all branches and resolve conflicts against the shared contract. Do not change the rubric to satisfy a test.

## Validation after the baseline exists

Use the scripts provided by the baseline. Required final checks include reproducible `npm ci`, typechecking, unit and HTTP integration tests, production build, and supported browser QA. Integration tests use isolated temporary storage and independent cookie jars. Record unrun checks and failures honestly. Local coaching being unavailable must not break the assessment, receipt, download, or sharing flow.
