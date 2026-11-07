import type { CheckId, Evaluation, OwnerReceipt, Submission } from "../../lib/contracts";

// Independent, explicit test fixture transcribed from the published master.
// Do not import the evaluator or reference solution to generate expected results.
export function validSubmission(): Submission {
  return {
    rows: [
      { orderId: "R001", date: "2026-10-01", region: "Ontario", revenue: "120.00" },
      { orderId: "R002", date: "2026-10-02", region: "Quebec", revenue: "85.50" },
      { orderId: "R003", date: "2026-10-03", region: "British Columbia", revenue: "210.00" },
      { orderId: "R004", date: "2026-10-04", region: "Ontario", revenue: "140.00" },
      { orderId: "R005", date: "2026-10-05", region: "Quebec", revenue: "95.00" },
      { orderId: "R006", date: "2026-10-06", region: "British Columbia", revenue: "180.00" },
      { orderId: "R007", date: "2026-10-07", region: "Ontario", revenue: "75.00" },
      { orderId: "R009", date: "2026-10-09", region: "Quebec", revenue: "130.00" },
      { orderId: "R010", date: "2026-10-10", region: "British Columbia", revenue: "250.00" },
    ],
    total: "1285.50", displayName: "", reflection: "", demo: false,
  };
}

export function evaluationFixture(failed: CheckId[] = []): Evaluation {
  const definitions: [CheckId, number][] = [
    ["unique", 20], ["dates", 20], ["regions", 20],
    ["revenue", 20], ["integrity", 10], ["total", 10],
  ];
  const checks = definitions.map(([id, pointsPossible]) => ({
    id, label: `label-${id}`, rule: `rule-${id}`, pointsPossible,
    pointsEarned: failed.includes(id) ? 0 : pointsPossible,
    passed: !failed.includes(id), observations: [`observation-${id}`],
  }));
  const score = checks.reduce((sum, check) => sum + check.pointsEarned, 0);
  return {
    score,
    tier: score >= 80 ? "Strong evidence on this task" : score >= 50 ? "Developing evidence on this task" : "More practice needed on this task",
    checks,
  };
}

export function receiptFixture(id = "fbc4dc1f-e46e-48c6-b2a1-e5051fc8ac98"): OwnerReceipt {
  return {
    id, createdAt: "2026-11-07T18:00:00.000Z", assessmentVersion: "sales-cleaning-v1",
    rubricVersion: "deterministic-v1", submission: validSubmission(),
    evaluation: evaluationFixture(["dates"]), fingerprint: "a".repeat(64), shareToken: null,
  };
}
