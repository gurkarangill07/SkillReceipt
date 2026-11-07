import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InputError } from "../validation";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Robots-Tag": "noindex, nofollow" };
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
export const unavailable = () => json({ error: "Receipt unavailable." }, 404);
export const errorResponse = (error: unknown) => error instanceof InputError
  ? json({ error: error.message }, 400)
  : json({ error: "The request could not be completed. Please try again." }, 500);

export function assertSameOrigin(request: NextRequest): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") throw new InputError("This action must come from the same origin.");
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") throw new InputError("This action must come from the same origin.");
  try {
    const supplied = new URL(origin);
    // Next can normalize the internal URL hostname to localhost. Compare the
    // browser Origin with the incoming Host, never a client-supplied forwarded host.
    const expected = new URL(`${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`);
    if (supplied.origin !== origin || origin !== expected.origin) throw new Error();
  } catch { throw new InputError("This action must come from the same origin."); }
}
