import type { NextRequest } from "next/server";
import { authorizedOwnerHash, newOwnerToken, OWNER_COOKIE, SESSION_SECONDS } from "../../../lib/server/auth";
import { hashOwner } from "../../../lib/server/store";
import { assertSameOrigin, errorResponse, json } from "../../../lib/server/http";
import { getProctorRepository } from "../../../lib/server/proctoring";
import { isRecord, InputError, readJson } from "../../../lib/validation";
import { parseProctorState } from "../../../lib/proctor-validation";
import { EXERCISES } from "../../../lib/exercise-catalog";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!isRecord(body) || body.consent !== true || typeof body.exercise !== "string" || !EXERCISES.some((exercise) => exercise.id === body.exercise)) throw new InputError("Consent and a supported exercise are required.");
    const owner = await authorizedOwnerHash(request), token = owner ? null : newOwnerToken();
    const session = await getProctorRepository().start(owner ?? hashOwner(token!), body.exercise, parseProctorState(body.state));
    const response = json(session, 201);
    if (token) response.cookies.set(OWNER_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS, secure: request.nextUrl.protocol === "https:" });
    return response;
  } catch (error) { return errorResponse(error); }
}
