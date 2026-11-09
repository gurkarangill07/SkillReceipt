import type { NextRequest } from "next/server";
import { authorizedOwnerHash } from "../../../../lib/server/auth";
import { assertSameOrigin, errorResponse, json } from "../../../../lib/server/http";
import { getProctorRepository } from "../../../../lib/server/proctoring";
import { isRecord, InputError, readJson } from "../../../../lib/validation";
import { parseEvents, parseProctorState } from "../../../../lib/proctor-validation";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const owner = await authorizedOwnerHash(request), body = await readJson(request);
    if (!owner || !isRecord(body)) throw new InputError("Start an assessment in this browser first.");
    return json(await getProctorRepository().append((await context.params).id, owner, parseEvents(body.events), parseProctorState(body.state)));
  } catch (error) { return errorResponse(error); }
}
