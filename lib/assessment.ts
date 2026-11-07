import type { SalesCheckId, DataRow } from "./contracts";

export const ASSESSMENT_VERSION = "sales-cleaning-v1";
export const RUBRIC_VERSION = "deterministic-v1";
export const REFERENCE_TOTAL_CENTS = 128550;
const freeze = (rows: DataRow[]): readonly DataRow[] => Object.freeze(rows.map((row) => Object.freeze(row)));

export const SOURCE_ROWS = freeze([
  { orderId: "R001", date: "10/01/2026", region: " ON ", revenue: "$120.00" },
  { orderId: "R002", date: "2026-10-02", region: "QC", revenue: "85.5" },
  { orderId: "R003", date: "Oct 3, 2026", region: "bc", revenue: "CAD 210.00" },
  { orderId: "R004", date: "10/04/2026", region: "ontario", revenue: "140" },
  { orderId: "R004", date: "10/04/2026", region: "ontario", revenue: "140" },
  { orderId: "R005", date: "2026-10-05", region: "quebec ", revenue: "$95.00" },
  { orderId: "R006", date: "Oct 6, 2026", region: "B.C.", revenue: "180.00" },
  { orderId: "R007", date: "10/07/2026", region: "on", revenue: "75" },
  { orderId: "R008", date: "2026-10-08", region: "ON", revenue: "" },
  { orderId: "R009", date: "10/09/2026", region: "QC", revenue: "130.00" },
  { orderId: "R009", date: "10/09/2026", region: "QC", revenue: "130.00" },
  { orderId: "R010", date: "Oct 10, 2026", region: "British columbia", revenue: "$250.00" },
]);

export const REFERENCE_ROWS = freeze([
  { orderId: "R001", date: "2026-10-01", region: "Ontario", revenue: "120.00" },
  { orderId: "R002", date: "2026-10-02", region: "Quebec", revenue: "85.50" },
  { orderId: "R003", date: "2026-10-03", region: "British Columbia", revenue: "210.00" },
  { orderId: "R004", date: "2026-10-04", region: "Ontario", revenue: "140.00" },
  { orderId: "R005", date: "2026-10-05", region: "Quebec", revenue: "95.00" },
  { orderId: "R006", date: "2026-10-06", region: "British Columbia", revenue: "180.00" },
  { orderId: "R007", date: "2026-10-07", region: "Ontario", revenue: "75.00" },
  { orderId: "R009", date: "2026-10-09", region: "Quebec", revenue: "130.00" },
  { orderId: "R010", date: "2026-10-10", region: "British Columbia", revenue: "250.00" },
]);

export const RUBRIC: readonly { id: SalesCheckId; label: string; rule: string; pointsPossible: number }[] = Object.freeze([
  { id: "unique", label: "Unique order IDs", pointsPossible: 20, rule: "Nonempty submission; all IDs belong to the valid reference set and no order ID repeats." },
  { id: "dates", label: "Date normalization and fidelity", pointsPossible: 20, rule: "All nine reference IDs are represented, no unknown IDs, and every submitted date equals its reference in YYYY-MM-DD form." },
  { id: "regions", label: "Region normalization and fidelity", pointsPossible: 20, rule: "All nine reference IDs are represented, no unknown IDs, and every region equals its canonical reference region." },
  { id: "revenue", label: "Revenue normalization and fidelity", pointsPossible: 20, rule: "All nine reference IDs are represented, no unknown IDs, and canonical decimal amounts equal their reference integer cents." },
  { id: "integrity", label: "Record integrity / missing data", pointsPossible: 10, rule: "Exactly the nine reference IDs appear once each. R008 is absent; no invented, missing, or duplicate IDs." },
  { id: "total", label: "Revenue reconciliation", pointsPossible: 10, rule: "Record integrity passes; a canonical stated CAD total equals both the submitted row sum and 128550 reference cents." },
]);
