import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ACCOUNT_COOKIE, AccountError, getAccounts } from "./accounts";
import { errorResponse, json } from "./http";

export const accountToken = (request: NextRequest) => request.cookies.get(ACCOUNT_COOKIE)?.value;
export async function currentAccount() { return getAccounts().account((await cookies()).get(ACCOUNT_COOKIE)?.value); }
export const accountFailure = (error: unknown) => error instanceof AccountError ? json({ error: error.message }, error.status) : errorResponse(error);
