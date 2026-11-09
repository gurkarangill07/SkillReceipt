# Sales cleanup v1

Assessment `sales-cleaning-v1`; rubric `deterministic-v1`. All data is synthetic. Slash dates mean month/day/year. Remove extra R004 and R009 copies, quarantine missing-revenue R008, and retain the other nine orders once each. Preserve dates and amounts, normalize region/date representations, and state the CAD total. Reference: **1285.50 CAD / 128550 cents**.

The exact immutable source, reference and rule definitions are exported from `lib/assessment.ts`; the original master documents every row. `lib/evaluate.ts` is a pure deterministic implementation independent of coaching, display name, reflection and demo status.

| Check | Points | Pass rule |
| --- | --- | --- |
| Unique IDs | 20 | Nonempty, valid reference IDs only, no duplicates. |
| Dates | 20 | All nine valid IDs covered, no unknown IDs; every submitted date equals its ID's canonical reference. |
| Regions | 20 | All nine valid IDs covered, no unknown IDs; every submitted region equals its ID's canonical reference. |
| Revenue | 20 | All nine valid IDs covered, no unknown IDs; every canonical amount equals its reference cents. |
| Integrity | 10 | Exactly nine valid IDs once each, R008 absent. |
| Total | 10 | Integrity passes; canonical stated CAD total equals both actual submitted row sum and 128550 cents. |

Rules are all-or-nothing with overlapping prerequisites. Empty/invented-only outputs earn zero. A unique valid subset can earn only 20 uniqueness points. Duplicate otherwise correct rows can earn 60 field-fidelity points while failing uniqueness/integrity/reconciliation. Incorrect dates/amounts fail even when they look well formatted. Row order does not affect score. Every result includes all six check objects and specific failure evidence; the UI owns observation expansion.

`parseCents` accepts nonnegative ASCII plain decimals with 1–9 whole digits and zero to two fractional digits (when a decimal point is present, one or two digits follow it). Maximum value: 999999999.99 CAD. `0`, `85.5`, `85.50`, `120` and `120.00` are valid lexical forms; equality uses integer cents. Negatives, signs, exponents, currency characters, commas, whitespace/newlines, missing integer digits and excessive precision are rejected. An invalid money string is a scored failure inside a valid bounded envelope, not a silently corrected amount.

Score tiers are task-bound prototype thresholds: 80–100 Strong evidence on this task; 50–79 Developing evidence on this task; 0–49 More practice needed on this task. A high score cannot hide individual failed checks. This assessment does not verify identity, independent authorship, credentials, general professional competence or hiring suitability. It is not a resume builder.
