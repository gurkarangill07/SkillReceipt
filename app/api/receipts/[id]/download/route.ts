import type { NextRequest } from "next/server";
import { pipelineToCsv, rowsToCsv } from "../../../../../lib/csv";
import { getRequestReceipt } from "../../../../../lib/server/auth";
import { errorResponse, PRIVATE_HEADERS, unavailable } from "../../../../../lib/server/http";
import { InputError } from "../../../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const receipt = await getRequestReceipt(request, (await params).id);
    if (!receipt) return unavailable();
    const format = request.nextUrl.searchParams.get("format");
    if (format !== "csv" && format !== "json") throw new InputError("Choose format=json or format=csv.");
    const { createdAt, assessmentVersion, rubricVersion, submission, evaluation, fingerprint } = receipt;
    const content = format === "csv" ? (submission.workSample ? pipelineToCsv(submission.workSample) : rowsToCsv(submission.rows)) : JSON.stringify({ createdAt, assessmentVersion, rubricVersion, submission, evaluation, fingerprint }, null, 2);
    return new Response(content, { headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="skillreceipt-evidence.${format}"`,
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return errorResponse(error); }
}
