import type { NextRequest } from "next/server";
import { accountFailure, accountToken } from "../../../../lib/server/account-http";
import { downloadResume } from "../../../../lib/server/resume-download";
export async function GET(request: NextRequest) { try { return await downloadResume(accountToken(request)); } catch (error) { return accountFailure(error); } }
