export type DataRow = { orderId: string; date: string; region: string; revenue: string };
export type Submission = { rows: DataRow[]; total: string; displayName: string; reflection: string; demo: boolean };
export type CheckId = "unique" | "dates" | "regions" | "revenue" | "integrity" | "total";
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
export type ReceiptSummary = { id: string; createdAt: string; score: number; tier: Evaluation["tier"]; demo: boolean; sharingEnabled: boolean };
export type ApiError = { error: string };
export type CoachResponse = { advice: string; model: string; assessed: false };
