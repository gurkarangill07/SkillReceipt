import type { NextRequest } from "next/server";
import { accountFailure, accountToken } from "../../../../../../lib/server/account-http";
import { downloadResume } from "../../../../../../lib/server/resume-download";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  try { return await downloadResume(accountToken(request), (await params).candidateId); } catch (error) { return accountFailure(error); }
}
