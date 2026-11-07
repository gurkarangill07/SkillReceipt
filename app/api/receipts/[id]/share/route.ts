import type { NextRequest } from "next/server";
import { authorizedOwnerHash } from "../../../../../lib/server/auth";
import { assertSameOrigin, errorResponse, json, unavailable } from "../../../../../lib/server/http";
import { getRepository } from "../../../../../lib/server/store";
import { parseShare, readJson } from "../../../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const hash = await authorizedOwnerHash(request);
    const id = (await params).id;
    if (!hash || !await getRepository().getOwner(id, hash)) return unavailable();
    const enabled = parseShare(await readJson(request));
    const result = await getRepository().setSharing(id, hash, enabled);
    return result ? json(result) : unavailable();
  } catch (error) { return errorResponse(error); }
}
