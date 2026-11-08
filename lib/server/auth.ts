import "server-only";
import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { getRepository, hashOwner, validToken } from "./store";
export const OWNER_COOKIE = "skillreceipt_owner";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const newOwnerToken = () => randomBytes(32).toString("hex");
export const ownerHashFromToken = (token: string | undefined): string | null => token && validToken(token) ? hashOwner(token) : null;
export const ownerHashFromRequest = (request: NextRequest): string | null => ownerHashFromToken(request.cookies.get(OWNER_COOKIE)?.value);
export async function authorizedOwnerHash(request: NextRequest): Promise<string | null> {
  const owner = ownerHashFromRequest(request);
  // Account-owned legacy records stay private; old account cookies grant no access.
  if (owner) { const { getAccounts } = await import("./accounts"); if (await getAccounts().requiresAccount(owner)) return null; }
  return owner;
}
export async function getRequestReceipt(request: NextRequest, id: string) {
  const hash = await authorizedOwnerHash(request);
  return hash ? getRepository().getOwner(id, hash) : null;
}
