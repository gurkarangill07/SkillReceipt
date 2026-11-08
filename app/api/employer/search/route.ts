import type { NextRequest } from "next/server";
import { errorResponse, json } from "../../../../lib/server/http";
import { searchCandidates } from "../../../../lib/server/people";
import { InputError } from "../../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const rawScore = params.get("minScore") ?? "0";
    const rawExamples = params.get("includeExamples") ?? "true";
    if (!/^\d{1,3}$/.test(rawScore) || !["true", "false", "1", "0"].includes(rawExamples)) throw new InputError("Choose a valid score and example filter.");
    return json({ candidates: await searchCandidates({ q: params.get("q") ?? "", minScore: Number(rawScore), includeExamples: rawExamples === "true" || rawExamples === "1" }) });
  } catch (error) { return errorResponse(error); }
}
