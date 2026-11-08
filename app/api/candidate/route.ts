import type { NextRequest } from "next/server";
import { authorizedOwnerHash, newOwnerToken, OWNER_COOKIE, SESSION_SECONDS } from "../../../lib/server/auth";
import { assertSameOrigin, errorResponse, json } from "../../../lib/server/http";
import { getCandidateForOwner, saveCandidate } from "../../../lib/server/people";
import { hashOwner } from "../../../lib/server/store";
import { readJson } from "../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const owner = await authorizedOwnerHash(request);
    return json({ candidate: owner ? await getCandidateForOwner(owner) : null });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const value = await readJson(request);
    const existingOwner = await authorizedOwnerHash(request);
    const token = existingOwner ? null : newOwnerToken();
    const candidate = await saveCandidate(existingOwner ?? hashOwner(token!), value);
    const response = json({ candidate });
    if (token) response.cookies.set(OWNER_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS, secure: request.nextUrl.protocol === "https:" });
    return response;
  } catch (error) { return errorResponse(error); }
}
