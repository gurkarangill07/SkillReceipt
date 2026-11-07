export type DataRow = { orderId: string; date: string; region: string; revenue: string };
export type SalesCheckId = "unique" | "dates" | "regions" | "revenue" | "integrity" | "total";
export type PipelineCheckId = "key" | "dedupe" | "missing" | "schema" | "load" | "partition";
export type CheckId = SalesCheckId | PipelineCheckId;
export type SessionContext = { mode: "camera" | "practice" | "presentation"; cameraStarted: boolean; tabSwitches: number; interruptions: number; activeSeconds: number };
export type PipelineWork = { kind: "data-pipeline-v1"; answers: Record<PipelineCheckId, string>; session: SessionContext };
export type Submission = { rows: DataRow[]; total: string; displayName: string; reflection: string; demo: boolean; workSample?: PipelineWork };
export type CheckResult = { id: CheckId; label: string; rule: string; pointsPossible: number; pointsEarned: number; passed: boolean; observations: string[] };
export type Evaluation = {
  score: number;
  tier: "Strong evidence on this task" | "Developing evidence on this task" | "More practice needed on this task";
  checks: CheckResult[];
};
export type ReceiptEvidence = {
  createdAt: string;
  assessmentVersion: string;
  rubricVersion: string;
  submission: Submission;
  evaluation: Evaluation;
  fingerprint: string;
};
export type OwnerReceipt = ReceiptEvidence & { id: string; shareToken: string | null };
export type ReceiptSummary = { id: string; createdAt: string; score: number; tier: Evaluation["tier"]; demo: boolean; sharingEnabled: boolean; assessmentVersion?: string };
export type ApiError = { error: string };
export type CoachResponse = { advice: string; model: string; assessed: false };
