export type DataRow = { orderId: string; date: string; region: string; revenue: string };
export type SalesCheckId = "unique" | "dates" | "regions" | "revenue" | "integrity" | "total";
export type PipelineCheckId = "key" | "dedupe" | "missing" | "schema" | "load" | "partition";
export type CheckId = SalesCheckId | PipelineCheckId | "coding" | `scenario-${string}`;
export type SessionContext = { mode: "camera" | "practice" | "presentation"; cameraStarted: boolean; tabSwitches: number; interruptions: number; activeSeconds: number; focusLosses?: number; pasteEvents?: number; fullscreenExits?: number; fullscreenStarted?: boolean; sessionId?: string; integrity?: import("./proctoring").IntegrityAudit };
export type PipelineWork = { kind: "data-pipeline-v1" | "data-engineer-v2"; answers: Record<"key" | "missing" | "load", string> & Partial<Record<"dedupe" | "schema" | "partition", string>>; session: SessionContext; code?: string };
export type ScenarioWork = { kind: "scenario-v1"; roleId: string; answers: Record<string, string> };
export type Submission = { rows: DataRow[]; total: string; displayName: string; reflection: string; demo: boolean; workSample?: PipelineWork; scenario?: ScenarioWork; session?: SessionContext };
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
