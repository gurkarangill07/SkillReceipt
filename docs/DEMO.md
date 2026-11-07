# SkillReceipt demo script

Status: the combined app builds and all ten HTTP acceptance scenarios pass; desktop landing/assessment were inspected. A full interactive rehearsal remains outstanding because browser control was interrupted. Verify the complete flow manually before presenting. Local coaching is optional and never a live-demo dependency.

## Before presenting

Follow the integrated README's install/start instructions. Use a fresh anonymous browser session and synthetic data only. Confirm the source dataset, 1285.50 CAD reference, expected demo label, sharing/revocation, and a separate reviewer session. A localhost link works only where that server is reachable; no public deployment is implied.

## Main flow: approximately 2–3 minutes

| Time | Action and narration |
| --- | --- |
| 0:00–0:20 | Landing: “Early-career applicants need a way to show practical work that another person can inspect. SkillReceipt turns one work sample into a transparent evidence receipt.” |
| 0:20–0:45 | Open the Junior Data Analyst challenge. Show synthetic-data label, month/day/year convention, missing-revenue rule, and all six published checks. “These rules assess the submitted output, not identity or independent authorship.” |
| 0:45–1:00 | Make one manual cell edit. Remove and restore a duplicate row. Point out retained-row count and CAD total input. |
| 1:00–1:20 | Select **Load demo solution**. Point out the persistent **demo** label. “This fills the published reference for demonstration; it does not represent independent candidate work.” Submit. |
| 1:20–1:45 | Inspect the score, six checks, observations, exact artifact, versions, and fingerprint. “A hash identifies this artifact; it is not an identity check, signature, or credential.” Show JSON/CSV downloads briefly. |
| 1:45–2:15 | Read the sharing disclosure and enable sharing. Open the evidence link in a separate browser session without owner cookies. Show the full read-only result and demo label. |
| 2:15–2:35 | Return as owner and revoke the link. Make a fresh reviewer request and show unavailable state. Confirm owner receipt remains accessible. “Saved copies cannot be recalled.” |
| 2:35–3:00 | Optional: request local practice suggestions. “Rules score your work; the local coach selects what to practice. Advice never changes this receipt.” Close with the limits and a proposed next validation step: ask early-career applicants and reviewers whether the evidence page is understandable and useful. This is a proposed study, not completed research. |

## Alternative imperfect attempt

1. Start another attempt and load the demo solution. Preserve the demo label.
2. Change only R001's date from `2026-10-01` to the well-formatted but incorrect `2026-10-02`.
3. Keep all other rows and total unchanged; submit.
4. Expected result from the published rubric: **80/100, five checks passed; date normalization/fidelity fails**. The tier may still be “Strong evidence on this task”; explain that the total never overrides the visible individual failure.
5. Inspect the date observation and submitted row. This proves format alone is insufficient and the evaluator does not simply award 100 for every valid envelope.

These expected imperfect-attempt values passed through the real HTTP API. The complete interactive presentation still needs a manual rehearsal.

## Coach unavailable

If the coach shows unavailable, use the failed check observations as deterministic next-step feedback and continue. Do not wait repeatedly, download a model, or rely on coaching to issue/share a receipt. Requests have a 45-second upper deadline and a 30-second retry cooldown. Existing successful coaching on this machine is recorded separately in [VALIDATION.md](VALIDATION.md).
