import { ASSESSMENT_VERSION, REFERENCE_ROWS, SOURCE_ROWS } from "../assessment";
import type { DataRow, Submission } from "../contracts";
import { isRecord } from "./http";

export const DRAFT_KEY = `skillreceipt:draft:${ASSESSMENT_VERSION}`;
export type DraftRow = { key: string; value: DataRow; removed: boolean };
export type Draft = { version: 1; assessmentVersion: string; rows: DraftRow[]; total: string; displayName: string; reflection: string; demo: boolean };
export type DraftRead = { draft: Draft; state: "new" | "restored" | "invalid" | "unavailable" };

export function createSourceDraft(): Draft {
  return { version: 1, assessmentVersion: ASSESSMENT_VERSION, rows: SOURCE_ROWS.map((value, index) => ({ key: `source-${index + 1}`, value: { ...value }, removed: false })), total: "", displayName: "", reflection: "", demo: false };
}

export function createDemoDraft(previous: Draft): Draft {
  return { ...previous, rows: REFERENCE_ROWS.map((value, index) => ({ key: `demo-${index + 1}`, value: { ...value }, removed: false })), total: "1285.50", demo: true };
}

function bounded(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

export function isDraft(value: unknown): value is Draft {
  if (!isRecord(value) || value.version !== 1 || value.assessmentVersion !== ASSESSMENT_VERSION || typeof value.demo !== "boolean" || !bounded(value.total, 40) || !bounded(value.displayName, 60) || !bounded(value.reflection, 1500) || !Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 30) return false;
  const keys = new Set<string>();
  return value.rows.every((row: unknown) => {
    if (!isRecord(row) || !bounded(row.key, 80) || row.key.length === 0 || keys.has(row.key) || typeof row.removed !== "boolean" || !isRecord(row.value)) return false;
    keys.add(row.key);
    return bounded(row.value.orderId, 40) && bounded(row.value.date, 60) && bounded(row.value.region, 60) && bounded(row.value.revenue, 40);
  });
}

export function readDraft(): DraftRead {
  const fresh = createSourceDraft();
  try {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (!saved) return { draft: fresh, state: "new" };
    if (saved.length > 65_536) return { draft: fresh, state: "invalid" };
    const parsed: unknown = JSON.parse(saved);
    return isDraft(parsed) ? { draft: parsed, state: "restored" } : { draft: fresh, state: "invalid" };
  } catch (error) {
    return { draft: fresh, state: error instanceof SyntaxError ? "invalid" : "unavailable" };
  }
}

export function saveDraft(draft: Draft): boolean {
  try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); return true; } catch { return false; }
}

export function clearDraft(): boolean {
  try { window.localStorage.removeItem(DRAFT_KEY); return true; } catch { return false; }
}

export function snapshotSubmission(draft: Draft): Submission {
  const rows = draft.rows.filter((row) => !row.removed).map((row) => Object.freeze({ ...row.value }));
  Object.freeze(rows);
  return Object.freeze({ rows, total: draft.total, displayName: draft.displayName, reflection: draft.reflection, demo: draft.demo });
}
