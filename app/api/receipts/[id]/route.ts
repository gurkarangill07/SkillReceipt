import type { NextRequest } from "next/server";
import { getRequestReceipt } from "../../../../lib/server/auth";
import { errorResponse, json, unavailable } from "../../../../lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const receipt = await getRequestReceipt(request, (await params).id);
    return receipt ? json(receipt) : unavailable();
  } catch (error) { return errorResponse(error); }
}
