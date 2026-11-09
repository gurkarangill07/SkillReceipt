import { createHash } from "node:crypto";
import { ASSESSMENT_VERSION, RUBRIC_VERSION } from "./assessment";
import type { Submission } from "./contracts";
import { pipelineVersion } from "./career";
import { getScenario, scenarioVersions } from "./scenarios";

/** Fixed-key-order JSON; rows retain submitted order and exact assessed strings. */
export function serializeArtifact(submission: Submission): string {
  if (submission.scenario) {
    const work = submission.scenario;
    const scenario = getScenario(work.roleId)!;
    return JSON.stringify({ ...scenarioVersions(work), roleId: work.roleId, answers: Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, work.answers[field.id]])) });
  }
  if (submission.workSample) {
    const { key, dedupe, missing, schema, load, partition } = submission.workSample.answers;
    return JSON.stringify({ ...pipelineVersion(submission), answers: submission.workSample.kind === "data-engineer-v2" ? { key, missing, load } : { key, dedupe, missing, schema, load, partition }, ...(submission.workSample.kind === "data-engineer-v2" ? { code: submission.workSample.code } : {}) });
  }
  return JSON.stringify({
    assessmentVersion: ASSESSMENT_VERSION,
    rubricVersion: RUBRIC_VERSION,
    rows: submission.rows.map(({ orderId, date, region, revenue }) => ({ orderId, date, region, revenue })),
    total: submission.total,
  });
}

export function fingerprint(submission: Submission): string {
  return createHash("sha256").update(serializeArtifact(submission), "utf8").digest("hex");
}
