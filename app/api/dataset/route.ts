import { SOURCE_ROWS } from "../../../lib/assessment";
import { rowsToCsv } from "../../../lib/csv";

export const runtime = "nodejs";
export async function GET() {
  return new Response(rowsToCsv(SOURCE_ROWS), { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="skillreceipt-synthetic-sales.csv"',
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  } });
}
