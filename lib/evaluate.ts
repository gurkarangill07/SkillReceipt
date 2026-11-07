import { REFERENCE_ROWS, REFERENCE_TOTAL_CENTS, RUBRIC } from "./assessment";
import type { CheckId, Evaluation, Submission } from "./contracts";

/** At most 999,999,999.99 CAD. Never normalize or coerce assessed values. */
export function parseCents(value: string): number | null {
  if (typeof value !== "string" || value.trim() !== value || !/^\d{1,9}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

const references = new Map(REFERENCE_ROWS.map((row) => [row.orderId, row]));
const money = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")} CAD`;

export function evaluate(submission: Submission): Evaluation {
  const rows = submission.rows;
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.orderId, (counts.get(row.orderId) ?? 0) + 1);
  const missing = REFERENCE_ROWS.filter((row) => !counts.has(row.orderId)).map((row) => row.orderId);
  const unknown = [...counts.keys()].filter((id) => !references.has(id));
  const duplicate = [...counts].filter(([, count]) => count > 1);
  const coverage = missing.length === 0 && unknown.length === 0;
  const integrity = coverage && rows.length === 9 && duplicate.length === 0;
  const unique = rows.length > 0 && unknown.length === 0 && duplicate.length === 0;
  const coverageNotes = [
    ...(missing.length ? [`Missing IDs: ${missing.join(", ")}.`] : []),
    ...unknown.map((id) => `Unexpected ID ${JSON.stringify(id)} at row(s) ${rows.flatMap((row, i) => row.orderId === id ? [i + 1] : []).join(", ")}.`),
  ];
  const uniqueNotes = [
    ...(rows.length === 0 ? ["No rows were submitted; an empty output cannot demonstrate uniqueness."] : []),
    ...coverageNotes.filter((note) => !note.startsWith("Missing IDs:")),
    ...duplicate.map(([id, count]) => `Duplicate ID ${JSON.stringify(id)} appears ${count} times at row(s) ${rows.flatMap((row, i) => row.orderId === id ? [i + 1] : []).join(", ")}.`),
  ];
  if (unique) uniqueNotes.push("The submitted IDs are valid and unique. This check alone does not establish full record coverage or how the output was produced.");

  const fieldChecks = (field: "date" | "region" | "revenue") => {
    const observations = [...coverageNotes];
    let valid = coverage;
    rows.forEach((row, index) => {
      const reference = references.get(row.orderId);
      if (!reference) return;
      const submitted = row[field];
      const expected = reference[field];
      const matches = field === "revenue"
        ? parseCents(submitted) !== null && parseCents(submitted) === parseCents(expected)
        : submitted === expected;
      if (!matches) {
        valid = false;
        observations.push(`Row ${index + 1} (${row.orderId}): ${field} expected ${JSON.stringify(expected)}, submitted ${JSON.stringify(submitted)}${field === "revenue" && parseCents(submitted) === null ? " (invalid canonical money format)" : ""}.`);
      }
    });
    if (valid) observations.push(`All submitted ${field} values match their references and all nine valid IDs are represented. Duplicate IDs are assessed separately.`);
    return { passed: valid, observations };
  };

  const parsed = rows.map((row) => parseCents(row.revenue));
  const rowSum = parsed.every((value) => value !== null) ? parsed.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  const stated = parseCents(submission.total);
  const total = integrity && stated !== null && rowSum !== null && stated === rowSum && stated === REFERENCE_TOTAL_CENTS;
  const totalNotes = [
    ...(!integrity ? ["Record integrity must pass before reconciliation can earn points."] : []),
    `Stated total: ${JSON.stringify(submission.total)}${stated === null ? " (invalid canonical money format)" : ` CAD (${stated} cents)`}.`,
    `Computed submitted row sum: ${rowSum === null ? "unavailable because at least one amount is malformed" : money(rowSum)}. Reference total: ${money(REFERENCE_TOTAL_CENTS)}.`,
  ];
  const results: Record<CheckId, { passed: boolean; observations: string[] }> = {
    unique: { passed: unique, observations: uniqueNotes },
    dates: fieldChecks("date"), regions: fieldChecks("region"), revenue: fieldChecks("revenue"),
    integrity: { passed: integrity, observations: integrity ? ["Exactly the nine valid orders appear once each; R008 is absent."] : [...coverageNotes, ...uniqueNotes.filter((note) => note.startsWith("Duplicate")), `Retained rows: ${rows.length}; expected exactly 9 valid orders once each. Missing revenue must not be invented or treated as zero.`] },
    total: { passed: total, observations: totalNotes },
  };
  const checks = RUBRIC.map((rule) => ({ ...rule, ...results[rule.id], pointsEarned: results[rule.id].passed ? rule.pointsPossible : 0 }));
  const score = checks.reduce((sum, check) => sum + check.pointsEarned, 0);
  return { score, tier: score >= 80 ? "Strong evidence on this task" : score >= 50 ? "Developing evidence on this task" : "More practice needed on this task", checks };
}
