import type { NextRequest } from "next/server";
import { errorResponse, json } from "../../../../../lib/server/http";
import { getCandidateReport } from "../../../../../lib/server/people";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  try {
    const report = await getCandidateReport((await params).candidateId);
    return report ? json(report) : json({ error: "Candidate report unavailable. The candidate may have turned off employer access." }, 404);
  } catch (error) { return errorResponse(error); }
}
