import type { CheckId } from "../contracts";

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Timestamp unavailable";
  return `${new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(date)} UTC`;
}

export const narrowEvidence: Record<CheckId, string> = {
  unique: "The submitted output has nonempty, unique IDs from the valid reference set. This check alone does not establish completeness.",
  dates: "All nine reference orders are represented and every submitted date matches its canonical reference date.",
  regions: "All nine reference orders are represented and every submitted region matches its canonical reference region.",
  revenue: "All nine reference orders are represented and each submitted revenue uses the required format and matches its reference value.",
  integrity: "The output contains exactly the nine valid reference orders, each once, with R008 excluded.",
  total: "The stated total matches the submitted row sum and the reference total in integer cents, with record integrity satisfied.",
};

export const practiceFeedback: Record<CheckId, string> = {
  unique: "Review order IDs against the source. Keep valid orders once and remove extra copies of R004 and R009.",
  dates: "Preserve each order's actual date and rewrite it as YYYY-MM-DD. Slash dates in the source mean month/day/year.",
  regions: "Map each source region to Ontario, Quebec, or British Columbia, preserving the region for each order.",
  revenue: "Remove currency decorations without changing amounts. Use nonnegative decimal strings with at most two decimal places.",
  integrity: "Keep exactly nine valid orders, each once. Quarantine R008 because its revenue is unknown; do not replace it with zero.",
  total: "Reconcile the total against the nine retained rows. Use a plain decimal CAD amount, with no currency symbol or commas.",
};
