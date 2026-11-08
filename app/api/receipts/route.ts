import type { NextRequest } from "next/server";
import { authorizedOwnerHash, newOwnerToken, OWNER_COOKIE, SESSION_SECONDS } from "../../../lib/server/auth";
import { assertSameOrigin, errorResponse, json } from "../../../lib/server/http";
import { getRepository, hashOwner } from "../../../lib/server/store";
import { InputError, isRecord, parseSubmission, readJson } from "../../../lib/validation";
import { getProctorRepository } from "../../../lib/server/proctoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const hash = await authorizedOwnerHash(request);
    return json({ receipts: hash ? await getRepository().listOwner(hash) : [] });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const submission = parseSubmission(body);
    const existingHash = await authorizedOwnerHash(request);
    let receiptId: string | undefined;
    if (!submission.demo) {
      const session = submission.session ?? submission.workSample?.session;
      if (!existingHash || session?.mode !== "camera" || !session.cameraStarted || !session.fullscreenStarted || !session.sessionId || !isRecord(body) || !Number.isInteger(body.sessionSequence) || Number(body.sessionSequence) < 0) throw new InputError("A live camera, fullscreen and a monitored session are required. Start the assessment checks first.");
      const exercise = submission.scenario?.roleId ?? (submission.workSample ? "junior-data-engineer" : "junior-data-analyst");
      const verified = await getProctorRepository().seal(session.sessionId, existingHash, exercise, Number(body.sessionSequence));
      submission.session = verified;
      if (submission.workSample) submission.workSample.session = verified;
      receiptId = session.sessionId;
    } else {
      if (submission.session) { delete submission.session.integrity; delete submission.session.sessionId; }
      if (submission.workSample) { delete submission.workSample.session.integrity; delete submission.workSample.session.sessionId; }
    }
    const token = existingHash ? null : newOwnerToken();
    const receipt = await getRepository().create(submission, existingHash ?? hashOwner(token!), receiptId);
    const response = json(receipt, 201);
    if (token) response.cookies.set(OWNER_COOKIE, token, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
      secure: request.nextUrl.protocol === "https:",
    });
    return response;
  } catch (error) { return errorResponse(error); }
}
