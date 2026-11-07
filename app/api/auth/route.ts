import type { NextRequest } from "next/server";
import { ACCOUNT_AGE, ACCOUNT_COOKIE, getAccounts } from "../../../lib/server/accounts";
import { accountFailure, accountToken } from "../../../lib/server/account-http";
import { OWNER_COOKIE } from "../../../lib/server/auth";
import { assertSameOrigin, json } from "../../../lib/server/http";
import { InputError, isRecord, readJson } from "../../../lib/validation";

export const runtime = "nodejs";
export async function GET(request: NextRequest) { try { return json({ account: await getAccounts().account(accountToken(request)) }); } catch (error) { return accountFailure(error); } }
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request); const body = await readJson(request);
    if (!isRecord(body) || !["register", "login", "logout"].includes(String(body.action))) throw new InputError("Choose login, register or logout.");
    if (isRecord(body) && body.action === "logout") {
      await getAccounts().logout(accountToken(request)); const response = json({ ok: true });
      response.cookies.set(ACCOUNT_COOKIE, "", { path: "/", maxAge: 0 }); response.cookies.set(OWNER_COOKIE, "", { path: "/", maxAge: 0 }); return response;
    }
    const result = await getAccounts().signIn(body, isRecord(body) && body.action === "register", request.cookies.get(OWNER_COOKIE)?.value);
    const response = json({ account: result.account });
    const options = { httpOnly: true, sameSite: "lax" as const, secure: request.nextUrl.protocol === "https:", path: "/", maxAge: ACCOUNT_AGE };
    response.cookies.set(ACCOUNT_COOKIE, result.token, options);
    response.cookies.set(OWNER_COOKIE, result.ownerToken ?? "", { ...options, maxAge: result.ownerToken ? ACCOUNT_AGE : 0 });
    return response;
  } catch (error) { return accountFailure(error); }
}
