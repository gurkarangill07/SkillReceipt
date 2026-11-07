import "server-only";

import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { getRepository, hashOwner, validToken } from "./store";
import { ACCOUNT_COOKIE, getAccounts } from "./accounts";

export const OWNER_COOKIE = "skillreceipt_owner";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const newOwnerToken = () => randomBytes(32).toString("hex");
export const ownerHashFromToken = (token: string | undefined): string | null => token && validToken(token) ? hashOwner(token) : null;
export const ownerHashFromRequest = (request: NextRequest): string | null => ownerHashFromToken(request.cookies.get(OWNER_COOKIE)?.value);

export async function authorizedOwnerHash(request: NextRequest): Promise<string | null> {
  const session = request.cookies.get(ACCOUNT_COOKIE)?.value;
  if (session) return getAccounts().owner(session);
  const legacy = ownerHashFromRequest(request);
  return legacy && !await getAccounts().requiresAccount(legacy) ? legacy : null;
}

export async function getRequestReceipt(request: NextRequest, id: string) {
  const hash = await authorizedOwnerHash(request);
  return hash ? getRepository().getOwner(id, hash) : null;
}
