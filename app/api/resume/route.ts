import type { NextRequest } from "next/server";
import { assertSameOrigin, errorResponse, json } from "../../../lib/server/http";
import { readResumeBytes, resumeContext } from "../../../lib/resume";
import { InputError } from "../../../lib/validation";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const header = request.headers.get("x-resume-name");
    if (!header || header.length > 600) throw new InputError("Choose a resume file.");
    let name: string;
    try { name = decodeURIComponent(header).split(/[\\/]/).pop()!; } catch { throw new InputError("Choose a valid filename."); }
    return json(await resumeContext(name, await readResumeBytes(request)));
  } catch (error) { return errorResponse(error); }
}
