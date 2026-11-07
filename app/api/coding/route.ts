import type { NextRequest } from "next/server";
import { assertSameOrigin, errorResponse, json } from "../../../lib/server/http";
import { runCoding } from "../../../lib/server/coding";
import { InputError, isRecord, readJson } from "../../../lib/validation";
export const runtime = "nodejs";
const gates = new Set<string>();
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); const body = await readJson(request);
    if (!isRecord(body) || typeof body.code !== "string") throw new InputError("Provide JavaScript code.");
    const key = request.cookies.get("skillreceipt_account")?.value ?? "guest";
    if (gates.has(key) || gates.size >= 2) return json({ error: "A code run is already in progress. Try again shortly." }, 429);
    gates.add(key); try { return json(await runCoding(body.code)); } finally { gates.delete(key); }
  } catch (error) { return errorResponse(error); }
}
