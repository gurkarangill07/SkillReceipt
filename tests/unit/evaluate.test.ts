import assert from "node:assert/strict";
import { test } from "node:test";
import { REFERENCE_ROWS, SOURCE_ROWS } from "../../lib/assessment";
import type { Submission } from "../../lib/contracts";
import { evaluate, parseCents } from "../../lib/evaluate";

const valid = (): Submission => ({ rows: REFERENCE_ROWS.map((row) => ({ ...row })), total: "1285.50", displayName: "", reflection: "", demo: false });
const passed = (submission: Submission) => evaluate(submission).checks.filter((check) => check.passed).map((check) => check.id);

test("exact decimal parser accepts zero, short fractions, and cents without floating point", () => {
  for (const [text, expected] of [["0", 0], ["0.00", 0], ["85.50", 8550], ["85.5", 8550], ["0.01", 1], ["999999999.99", 99999999999]] as const) assert.equal(parseCents(text), expected);
});
test("parser rejects invalid money and whitespace including final newline", () => {
  for (const text of ["", "-0", "-1", "+1", "1e2", "NaN", "Infinity", "1,200", "$120.00", "CAD 120", " 120", "120 ", "120\n", "120\r", "120.001", ".5", "1.", "1000000000"]) assert.equal(parseCents(text), null, JSON.stringify(text));
  assert.equal(parseCents(120 as unknown as string), null);
});
test("source is exactly 12 immutable rows with intentional whitespace and missing revenue", () => {
  assert.equal(SOURCE_ROWS.length, 12); assert.equal(REFERENCE_ROWS.length, 9);
  assert.equal(SOURCE_ROWS[0].region, " ON "); assert.equal(SOURCE_ROWS[5].region, "quebec ");
  assert.equal(SOURCE_ROWS[8].revenue, ""); assert.deepEqual(SOURCE_ROWS[3], SOURCE_ROWS[4]);
  assert.deepEqual(SOURCE_ROWS[9], SOURCE_ROWS[10]);
  assert.ok(Object.isFrozen(SOURCE_ROWS) && Object.isFrozen(SOURCE_ROWS[0]));
});
test("reference earns 100 with six checks and all required evidence fields", () => {
  const result = evaluate(valid());
  assert.equal(result.score, 100); assert.equal(result.checks.length, 6);
  assert.equal(result.tier, "Strong evidence on this task");
  for (const check of result.checks) {
    assert.equal(check.passed, true); assert.equal(check.pointsEarned, check.pointsPossible);
    assert.deepEqual(Object.keys(check).sort(), ["id", "label", "observations", "passed", "pointsEarned", "pointsPossible", "rule"]);
    assert.ok(check.observations.length);
  }
});
test("uncleaned source earns zero rather than vacuous or formatting points", () => {
  const submission = valid(); submission.rows = SOURCE_ROWS.map((row) => ({ ...row }));
  assert.equal(evaluate(submission).score, 0);
});
test("empty evaluator input is safe and every check fails", () => {
  const submission = valid(); submission.rows = [];
  assert.deepEqual(passed(submission), []); assert.equal(evaluate(submission).score, 0);
});
test("partial valid unique output earns only narrow uniqueness points", () => {
  const submission = valid(); submission.rows = submission.rows.slice(0, 1); submission.total = "120";
  assert.deepEqual(passed(submission), ["unique"]); assert.equal(evaluate(submission).score, 20);
  assert.match(evaluate(submission).checks[0].observations.join(" "), /alone does not establish full/);
});
test("unknown and blank IDs, missing records, and retained R008 fail coverage", () => {
  for (const id of ["INVENTED", "", "R008"]) {
    const submission = valid(); submission.rows[0].orderId = id;
    assert.equal(evaluate(submission).score, 0, id);
  }
  const missing = valid(); missing.rows.pop(); assert.deepEqual(passed(missing), ["unique"]);
});
test("duplicate correct rows pass field fidelity while uniqueness/integrity/total fail", () => {
  const submission = valid(); submission.rows.push({ ...submission.rows[0] });
  assert.deepEqual(passed(submission), ["dates", "regions", "revenue"]);
  assert.equal(evaluate(submission).score, 60);
  assert.match(evaluate(submission).checks[0].observations.join(" "), /row\(s\) 1, 10/);
});
for (const [field, value, score] of [["date", "2026-10-02", 80], ["region", "Quebec", 80], ["revenue", "121.00", 70]] as const) {
  test(`wrong canonical ${field} fails fidelity with row/expected/submitted evidence`, () => {
    const submission = valid(); submission.rows[0][field] = value;
    const result = evaluate(submission); assert.equal(result.score, score);
    const check = result.checks.find((check) => check.id === ({ date: "dates", region: "regions", revenue: "revenue" } as const)[field])!;
    assert.match(check.observations.join(" "), /Row 1 \(R001\).*expected.*submitted/);
  });
}
test("reconciliation checks both submitted sum and reference, and integrity", () => {
  const badTotal = valid(); badTotal.total = "1285.49"; assert.equal(evaluate(badTotal).score, 90);
  const matchedWrong = valid(); matchedWrong.rows[0].revenue = "121"; matchedWrong.total = "1286.50";
  assert.equal(evaluate(matchedWrong).checks[5].passed, false);
  for (const total of ["1e3", "-1285.50", "1285.500"]) {
    const submission = valid(); submission.total = total; assert.equal(evaluate(submission).score, 90);
  }
});
test("score is deterministic, order-invariant, and independent of metadata or claimed score", () => {
  const submission = valid(), before = structuredClone(submission);
  assert.deepEqual(evaluate(submission), evaluate(submission)); assert.deepEqual(submission, before);
  submission.rows.reverse(); submission.displayName = "Name"; submission.reflection = "Reflection"; submission.demo = true;
  Object.assign(submission, { score: 0, evaluation: { score: 0 }, model: "unavailable" });
  assert.equal(evaluate(submission).score, 100);
  assert.deepEqual(passed(submission), ["unique", "dates", "regions", "revenue", "integrity", "total"]);
});
