import type { Evaluation, PipelineCheckId, PipelineWork, Submission } from "./contracts";

export const PIPELINE_VERSION = "orders-pipeline-v1";
export const PIPELINE_RUBRIC_VERSION = "pipeline-rules-v1";
export const ROLE_CATALOG = [
  { id: "junior-data-engineer", title: "Junior Data Engineer", subtitle: "Build a reliable orders pipeline", duration: "12–15 min", skills: ["Data modeling", "Deduplication", "Data quality", "Schema validation", "Reliable loads", "Partitioning"] },
  { id: "junior-data-analyst", title: "Junior Data Analyst", subtitle: "Clean and reconcile a sales report", duration: "15–20 min", skills: ["Data cleaning", "Date normalization", "Revenue reconciliation"] },
] as const;

export const PIPELINE_TASKS: readonly { id: PipelineCheckId; label: string; question: string; why: string; points: number; correct: string; options: readonly { value: string; label: string; detail: string }[]; practice: string }[] = [
  { id: "key", label: "Business keys", question: "What identifies one order across repeated exports?", why: "The same order can arrive again tomorrow. Its identity must stay stable.", points: 20, correct: "order_id", options: [{ value: "order_id", label: "Order ID", detail: "A stable business identifier" }, { value: "row_number", label: "Position in the file", detail: "The row number in each export" }, { value: "customer", label: "Customer name", detail: "Group orders from the same person" }], practice: "Model a small orders table. Identify a key that survives file reordering and allows one customer to place several orders." },
  { id: "dedupe", label: "Deduplication", question: "An order arrives twice with different update times. What survives?", why: "Order R004 is corrected from $140 to $150 in a later update.", points: 15, correct: "latest", options: [{ value: "latest", label: "Latest update per order", detail: "Keep the correction with the newest updated_at" }, { value: "first", label: "First copy received", detail: "Ignore later corrections" }, { value: "all", label: "Every copy", detail: "Retain each incoming row" }], practice: "Practice ranking records by updated_at within each order ID, then retaining only the newest record." },
  { id: "missing", label: "Missing-data handling", question: "One order has no revenue. Where should it go?", why: "Missing revenue means unknown revenue. The reporting table must not invent an amount.", points: 20, correct: "quarantine", options: [{ value: "quarantine", label: "Quarantine for review", detail: "Keep it out of valid revenue totals" }, { value: "zero", label: "Replace the blank with zero", detail: "Include it as a zero-value sale" }, { value: "discard", label: "Permanently discard it", detail: "Leave no record for investigation" }], practice: "Create a quarantine output with a reason per rejected row. Keep unknown values separate from real zero amounts." },
  { id: "schema", label: "Schema validation", question: "Which contract should the pipeline enforce?", why: "Dates and CAD amounts need reliable types before downstream reporting.", points: 15, correct: "strict", options: [{ value: "strict", label: "ISO dates + exact decimal amounts", detail: "Reject malformed values; use integer cents internally" }, { value: "strings", label: "Keep every field as arbitrary text", detail: "Let each downstream report interpret it" }, { value: "coerce", label: "Coerce invalid values to defaults", detail: "Use today’s date or zero when parsing fails" }], practice: "Write boundary cases for impossible dates, currency decorations, missing amounts and decimal precision. Reject invalid input explicitly." },
  { id: "load", label: "Reliable loading", question: "A failed job retries yesterday’s file. How do you avoid double counting?", why: "A rerun should produce the same reporting table, not another copy of every order.", points: 20, correct: "upsert", options: [{ value: "upsert", label: "Upsert by the business key", detail: "Insert new orders and update existing ones" }, { value: "append", label: "Append every time", detail: "Add every incoming row on each retry" }, { value: "replace", label: "Replace all historical data", detail: "Keep only the current file" }], practice: "Load the same batch twice and assert identical row count, keys and revenue. Then test a correction and a late-arriving order." },
  { id: "partition", label: "Partition strategy", question: "Reports filter by the date the order happened. How should data be partitioned?", why: "Late-arriving October orders still belong to October’s reporting period.", points: 10, correct: "order_date", options: [{ value: "order_date", label: "Order date", detail: "Group by the business event date" }, { value: "ingestion_date", label: "File arrival date", detail: "Group by when the pipeline received it" }, { value: "customer", label: "Customer name", detail: "Create a separate partition for each customer" }], practice: "Compare event date and arrival date for a late order. Explain which partitions an October report needs to read." },
];

export function pipelineVersion(submission: Submission) {
  return submission.workSample ? { assessmentVersion: PIPELINE_VERSION, rubricVersion: PIPELINE_RUBRIC_VERSION } : null;
}

export function evaluatePipeline(work: PipelineWork): Evaluation {
  const checks = PIPELINE_TASKS.map((task) => {
    const passed = work.answers[task.id] === task.correct;
    const selected = task.options.find((option) => option.value === work.answers[task.id]);
    return { id: task.id, label: task.label, rule: task.why, passed, pointsPossible: task.points, pointsEarned: passed ? task.points : 0,
      observations: [`Submitted: ${selected?.label ?? "No supported answer"}.`, passed ? `This configuration meets the published ${task.label.toLowerCase()} rule.` : `Expected: ${task.options.find((option) => option.value === task.correct)!.label}. ${task.why}`] };
  });
  const score = checks.reduce((sum, check) => sum + check.pointsEarned, 0);
  return { score, tier: score >= 80 ? "Strong evidence on this task" : score >= 50 ? "Developing evidence on this task" : "More practice needed on this task", checks };
}

export function simulatePipeline(answers: PipelineWork["answers"]) {
  const source = [
    { id: "R001", amount: 12000, updated: 1 }, { id: "R002", amount: 8550, updated: 1 },
    { id: "R004", amount: 14000, updated: 1 }, { id: "R004", amount: 15000, updated: 2 },
    { id: "R008", amount: null, updated: 1 },
  ];
  let rows = source.filter((row) => row.amount !== null || answers.missing === "zero").map((row, index) => ({ ...row, amount: row.amount ?? 0, key: answers.key === "order_id" ? row.id : String(index) }));
  if (answers.dedupe !== "all") {
    const byKey = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const previous = byKey.get(row.key);
      if (!previous || (answers.dedupe === "latest" && row.updated > previous.updated)) byKey.set(row.key, row);
    }
    rows = [...byKey.values()];
  }
  const retained = rows.length;
  return { input: source.length, retained, quarantine: answers.missing === "quarantine" ? 1 : 0, revenue: rows.reduce((sum, row) => sum + row.amount, 0) / 100, afterRetry: answers.load === "append" ? retained * 2 : retained, schemaEnforced: answers.schema === "strict", partition: answers.partition };
}
