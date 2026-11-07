import type { NextRequest } from "next/server";
import { newOwnerToken, OWNER_COOKIE, ownerHashFromRequest, SESSION_SECONDS } from "../../../lib/server/auth";
import { assertSameOrigin, errorResponse, json } from "../../../lib/server/http";
import { getRepository, hashOwner } from "../../../lib/server/store";
import { parseSubmission, readJson } from "../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const hash = ownerHashFromRequest(request);
    return json({ receipts: hash ? await getRepository().listOwner(hash) : [] });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const submission = parseSubmission(await readJson(request));
    const existingHash = ownerHashFromRequest(request);
    const token = existingHash ? null : newOwnerToken();
    const receipt = await getRepository().create(submission, existingHash ?? hashOwner(token!));
    const response = json(receipt, 201);
    if (token) response.cookies.set(OWNER_COOKIE, token, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
      secure: request.nextUrl.protocol === "https:",
    });
    return response;
  } catch (error) { return errorResponse(error); }
}
