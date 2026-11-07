import type { NextRequest } from "next/server";
import { assertSameOrigin, json } from "../../../lib/server/http";
import { readResumeBytes, resumeContext } from "../../../lib/resume";
import { InputError } from "../../../lib/validation";
import { accountToken, accountFailure } from "../../../lib/server/account-http";
import { getAccounts } from "../../../lib/server/accounts";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const header = request.headers.get("x-resume-name");
    if (!header || header.length > 600) throw new InputError("Choose a résumé file.");
    let name: string;
    try { name = decodeURIComponent(header).split(/[\\/]/).pop()!; } catch { throw new InputError("Choose a valid résumé filename."); }
    const token = accountToken(request);
    const account = await getAccounts().account(token);
    if (token && account?.role !== "candidate") return json({ error: "Sign in as a candidate to upload a résumé." }, 403);
    const bytes = await readResumeBytes(request);
    const context = await resumeContext(name, bytes);
    if (account) await getAccounts().saveResume(token, bytes, context);
    return json(context);
  } catch (error) { return accountFailure(error); }
}
