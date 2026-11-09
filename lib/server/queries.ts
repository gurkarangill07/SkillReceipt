import "server-only";

import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { OwnerReceipt, ReceiptEvidence, ReceiptSummary } from "../contracts";
import { OWNER_COOKIE, ownerHashFromToken } from "./auth";
import { getRepository } from "./store";
import { getAccounts } from "./accounts";

async function currentOwnerHash() {
  const jar = await cookies();
  const owner = ownerHashFromToken(jar.get(OWNER_COOKIE)?.value);
  return owner && !await getAccounts().requiresAccount(owner) ? owner : null;
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
