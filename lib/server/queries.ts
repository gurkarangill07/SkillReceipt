import "server-only";

import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { OwnerReceipt, ReceiptEvidence, ReceiptSummary } from "../contracts";
import { OWNER_COOKIE, ownerHashFromToken } from "./auth";
import { getRepository } from "./store";
import { ACCOUNT_COOKIE, getAccounts } from "./accounts";

async function currentOwnerHash() {
  const jar = await cookies(); const session = jar.get(ACCOUNT_COOKIE)?.value;
  if (session) return getAccounts().owner(session);
  const legacy = ownerHashFromToken(jar.get(OWNER_COOKIE)?.value);
  return legacy && !await getAccounts().requiresAccount(legacy) ? legacy : null;
}

export async function getCurrentReceipts(): Promise<ReceiptSummary[]> {
  noStore();
  const hash = await currentOwnerHash();
  return hash ? getRepository().listOwner(hash) : [];
}

export async function getCurrentReceipt(id: string): Promise<OwnerReceipt | null> {
  noStore();
  const hash = await currentOwnerHash();
  return hash ? getRepository().getOwner(id, hash) : null;
}

export async function getSharedEvidence(token: string): Promise<ReceiptEvidence | null> {
  noStore();
  return getRepository().getShared(token);
}
