import type { NextRequest } from "next/server";

import { getRequestReceipt } from "../../../../../lib/server/auth";
import { createCoachEndpoint } from "../../../../../lib/server/coach";
import { assertSameOrigin } from "../../../../../lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleCoach = createCoachEndpoint({ assertSameOrigin, getRequestReceipt });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return handleCoach(request, id);
}
