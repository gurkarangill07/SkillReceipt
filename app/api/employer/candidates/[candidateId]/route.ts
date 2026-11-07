import type { NextRequest } from "next/server";
import { getAccounts } from "../../../../../lib/server/accounts";
import { accountFailure, accountToken } from "../../../../../lib/server/account-http";
import { json, unavailable } from "../../../../../lib/server/http";
import { getRepository } from "../../../../../lib/server/store";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  try {
    const candidate = await getAccounts().candidate(accountToken(request), (await params).candidateId);
    if (!candidate) return unavailable();
    const records = await getRepository().listOwner(candidate.ownerHash);
    const receipts = [];
    for (const record of records) {
      const full = await getRepository().getOwner(record.id, candidate.ownerHash);
      if (full) { const { id: _id, shareToken: _token, ...evidence } = full; receipts.push(evidence); }
    }
    return json({ profile: candidate.profile, receipts });
  } catch (error) { return accountFailure(error); }
}
