import assert from "node:assert/strict";
import { test } from "node:test";
import { CookieClient, expectError } from "../helpers/http-client.mjs";
import { startIsolatedApp } from "../helpers/next-server.mjs";
import { CODING_STARTER, CODING_EXAMPLE } from "../../lib/coding";

test("candidate and employer portals with actual coding and revocable résumé access", { timeout: 120_000 }, async (t) => {
  const app = await startIsolatedApp();
  const candidate = new CookieClient(app.origin), employer = new CookieClient(app.origin), visitor = new CookieClient(app.origin);
  const account = { action: "register", name: "Synthetic Candidate", email: "candidate@example.invalid", password: "test-only-password-2026", role: "candidate" };
  const input = { workSample: { kind: "data-engineer-v2", answers: { key: "order_id", missing: "quarantine", load: "upsert" }, code: CODING_STARTER, session: { mode: "practice", cameraStarted: false, tabSwitches: 0, interruptions: 0, activeSeconds: 20 } } };
  let candidateId = "", receiptId = "", legacyCookie = "";
  try {
    await t.test("separate account roles use HttpOnly sessions and protect workspace pages", async () => {
      const response = await candidate.json("/api/auth", account); assert.equal(response.status, 200);
      assert.ok(response.headers.getSetCookie().some((cookie) => cookie.includes("HttpOnly") && cookie.includes("SameSite=lax")));
      const body = await response.json(); candidateId = body.account.candidateId;
      legacyCookie = candidate.cookieHeader.split("; ").find((cookie: string) => cookie.startsWith("skillreceipt_owner="))!;
      assert.match(candidateId, /^SR-[A-F0-9]{10}$/); assert.equal(body.account.visible, false);
      assert.ok(!JSON.stringify(body).includes("passwordHash"));
      assert.equal((await visitor.request("/start")).status, 307);
      assert.equal((await employer.json("/api/auth", { ...account, email: "employer@example.invalid", role: "employer" })).status, 200);
      await expectError(await employer.json("/api/receipts", input), 403);
      await expectError(await candidate.json("/api/profile", { enabled: true }, { Origin: "https://evil.invalid" }), 400);
    });
    await t.test("candidate uploads a private résumé; employer cannot download before opt-in", async () => {
      const upload = await candidate.request("/api/resume", { method: "POST", headers: { "X-Resume-Name": "demo-resume.txt" }, body: "Synthetic Candidate\nSQL Python JavaScript ETL" });
      assert.equal(upload.status, 200);
      assert.equal((await (await candidate.request("/api/auth")).json()).account.resume.name, "demo-resume.txt");
      assert.equal(await (await candidate.request("/api/profile/resume")).text(), "Synthetic Candidate\nSQL Python JavaScript ETL");
      await expectError(await employer.request(`/api/employer/candidates/${candidateId}`), 404);
      await expectError(await employer.request(`/api/employer/candidates/${candidateId}/resume`), 404);
      await expectError(await candidate.request(`/api/employer/candidates/${candidateId}`), 403);
    });
    await t.test("real VM awards partial/full scores and private result shows a coding improvement plan", async () => {
      const run = await candidate.json("/api/coding", { code: CODING_EXAMPLE }); assert.equal(run.status, 200);
      assert.equal((await run.json()).passed, 4);
      const response = await candidate.json("/api/receipts", { ...input, score: 100 }); assert.equal(response.status, 201);
      const receipt = await response.json(); receiptId = receipt.id;
      assert.equal(receipt.evaluation.score, 80); assert.equal(receipt.assessmentVersion, "engineer-coding-v2");
      const html = await (await candidate.request(`/receipts/${receiptId}`)).text();
      assert.ok(html.replace(/<!--.*?-->/g, "").includes("3 of 4") && html.includes("JavaScript basics") && html.includes("Turn the gaps into a plan"));
      const good = await (await candidate.json("/api/receipts", { ...input, workSample: { ...input.workSample, code: CODING_EXAMPLE } })).json();
      assert.equal(good.evaluation.score, 100); assert.notEqual(good.fingerprint, receipt.fingerprint);
      const csv = await (await candidate.request(`/api/receipts/${receiptId}/download?format=csv`)).text(); assert.ok(csv.includes("JavaScript") && !csv.includes("Schema validation"));
      const dashboard = await (await candidate.request("/dashboard")).text(); assert.ok(dashboard.includes("Orders pipeline work sample"));
    });
    await t.test("opt-in lookup exposes name, résumé and actual safe evidence; revocation blocks new access", async () => {
      assert.equal((await candidate.json("/api/profile", { enabled: true })).status, 200);
      const response = await employer.request(`/api/employer/candidates/${candidateId}`); assert.equal(response.status, 200);
      const result = await response.json(); assert.equal(result.profile.name, account.name); assert.equal(result.receipts.length, 2);
      const serialized = JSON.stringify(result);
      for (const secret of [account.email, account.password, "passwordHash", "ownerHash", "shareToken", receiptId]) assert.ok(!serialized.includes(secret), secret);
      assert.deepEqual(result.receipts.map((receipt: { evaluation: { score: number } }) => receipt.evaluation.score).sort((a: number, b: number) => a - b), [80, 100]);
      const resume = await employer.request(`/api/employer/candidates/${candidateId}/resume`); assert.equal(resume.status, 200); assert.match(resume.headers.get("content-disposition")!, /attachment/);
      assert.match(await resume.text(), /Synthetic Candidate/);
      await candidate.json("/api/profile", { enabled: false });
      await expectError(await employer.request(`/api/employer/candidates/${candidateId}`), 404);
      await expectError(await employer.request(`/api/employer/candidates/${candidateId}/resume`), 404);
      await expectError(await visitor.request(`/api/employer/candidates/${candidateId}`), 403);
    });
    await t.test("logout blocks old sessions and legacy-cookie bypass; login restores results after restart", async () => {
      const oldSession = candidate.cookieHeader;
      await candidate.json("/api/auth", { action: "logout" });
      assert.equal((await candidate.request("/dashboard")).status, 307);
      for (const cookie of [oldSession, legacyCookie]) {
        const response = await fetch(`${app.origin}/api/receipts/${receiptId}`, { headers: { Cookie: cookie } }); assert.equal(response.status, 404);
      }
      await app.restart();
      const response = await candidate.json("/api/auth", { ...account, action: "login" }); assert.equal(response.status, 200);
      assert.equal((await response.json()).account.candidateId, candidateId);
      assert.equal((await candidate.request(`/api/receipts/${receiptId}`)).status, 200);
      assert.equal((await (await candidate.request("/api/receipts")).json()).receipts.length, 2);
      await expectError(await candidate.json("/api/auth", { ...account, action: "login", password: "wrong-password-2026" }), 401);
    });
  } finally { await app.close(); }
});
