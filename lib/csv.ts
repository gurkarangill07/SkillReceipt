import type { DataRow } from "./contracts";

export function csvCell(value: string): string {
  // Prefix formulas even when hidden behind leading whitespace/control characters.
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function rowsToCsv(rows: readonly DataRow[]): string {
  const header = ["order_id", "order_date", "region", "revenue_cad"];
  return [header, ...rows.map((row) => [row.orderId, row.date, row.region, row.revenue])]
    .map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
