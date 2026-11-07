import type { NextRequest } from "next/server";
import { getAccounts } from "../../../lib/server/accounts";
import { accountFailure, accountToken } from "../../../lib/server/account-http";
import { assertSameOrigin, json } from "../../../lib/server/http";
import { InputError, isRecord, readJson } from "../../../lib/validation";
export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); const body = await readJson(request);
    if (!isRecord(body) || typeof body.enabled !== "boolean") throw new InputError("Choose whether to enable employer profile access.");
    return json({ account: await getAccounts().visibility(accountToken(request), body.enabled) });
  } catch (error) { return accountFailure(error); }
}
