import { createHash } from "node:crypto";
import { ASSESSMENT_VERSION, RUBRIC_VERSION } from "./assessment";
import type { Submission } from "./contracts";
import { pipelineVersion } from "./career";

/** Fixed-key-order JSON; rows retain submitted order and exact assessed strings. */
export function serializeArtifact(submission: Submission): string {
  if (submission.workSample) {
    const { key, dedupe, missing, schema, load, partition } = submission.workSample.answers;
    return JSON.stringify({ ...pipelineVersion(submission), answers: { key, dedupe, missing, schema, load, partition } });
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
