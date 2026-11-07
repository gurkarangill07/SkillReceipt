import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { OWNER_COOKIE, newOwnerToken, ownerHashFromRequest, SESSION_SECONDS } from "../../lib/server/auth";
import { assertSameOrigin, errorResponse, json, unavailable } from "../../lib/server/http";
import { hashOwner } from "../../lib/server/store";
import { InputError } from "../../lib/validation";

test("same-origin guard rejects absent, opaque, mismatched and cross-site origins", () => {
  const request = (headers: Record<string, string>) => new NextRequest("http://localhost:3000/api/receipts", { method: "POST", headers });
  assert.doesNotThrow(() => assertSameOrigin(request({ Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin" })));
  assert.doesNotThrow(() => assertSameOrigin(request({ Origin: "http://127.0.0.1:3100", Host: "127.0.0.1:3100" })));
  assert.throws(() => assertSameOrigin(request({ Origin: "https://evil.invalid", "X-Forwarded-Host": "evil.invalid" })), InputError);
  const rejected: Record<string, string>[] = [{}, { Origin: "null" }, { Origin: "https://evil.invalid" }, { Origin: "http://localhost:3000/path" }, { Origin: "http://localhost:3000", "Sec-Fetch-Site": "cross-site" }];
  for (const headers of rejected) assert.throws(() => assertSameOrigin(request(headers)), InputError);
});
test("owner cookie is opaque random entropy, hashed, and strictly validated", () => {
  const token = newOwnerToken(); assert.match(token, /^[a-f0-9]{64}$/); assert.notEqual(token, newOwnerToken());
  assert.equal(SESSION_SECONDS, 2_592_000);
  assert.equal(ownerHashFromRequest(new NextRequest("http://localhost", { headers: { Cookie: `${OWNER_COOKIE}=${token}` } })), hashOwner(token));
  for (const value of ["invalid", "../path", "a".repeat(63), "a".repeat(65)]) assert.equal(ownerHashFromRequest(new NextRequest("http://localhost", { headers: { Cookie: `${OWNER_COOKIE}=${value}` } })), null);
});
test("private API responses disable caching and hide unexpected exception details", async () => {
  const responses = [json({ ok: true }), unavailable(), errorResponse(new Error("SECRET /Users/private/path")), errorResponse(new InputError("Please provide rows."))];
  assert.deepEqual(responses.map((response) => response.status), [200, 404, 500, 400]);
  for (const response of responses) {
    assert.match(response.headers.get("cache-control")!, /private.*no-store/);
    assert.equal(response.headers.get("vary"), "Cookie");
    assert.ok(!(await response.text()).includes("SECRET"));
  }
});
