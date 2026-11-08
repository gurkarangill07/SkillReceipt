import assert from "node:assert/strict";
import { test } from "node:test";

import type { OwnerReceipt, Submission } from "../../lib/contracts";
import { validSubmission } from "../helpers/fixtures";
import { assertPrivate, assertSafeEvidence, CookieClient, expectError, parseCsv, monitoredSubmission } from "../helpers/http-client.mjs";
import { startIsolatedApp } from "../helpers/next-server.mjs";

test("independent HTTP acceptance against the real Next production server", { timeout: 180_000 }, async (t) => {
  const app = await startIsolatedApp();
  const newClient = () => new CookieClient(app.origin);
  const assertOwnerShape = (receipt: OwnerReceipt) => {
    assert.deepEqual(Object.keys(receipt).sort(), [
      "assessmentVersion", "createdAt", "evaluation", "fingerprint", "id", "rubricVersion", "shareToken", "submission",
    ]);
  };
  async function submit(client: CookieClient, submission: Submission = validSubmission()): Promise<OwnerReceipt> {
    const response = await client.json("/api/receipts", await monitoredSubmission(client, submission));
    assert.equal(response.status, 201);
    assertPrivate(response);
    const receipt = await response.json() as OwnerReceipt;
    assertOwnerShape(receipt);
    assert.equal(receipt.shareToken, null);
    assert.match(receipt.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(receipt.assessmentVersion, "sales-cleaning-v1");
    assert.equal(receipt.rubricVersion, "deterministic-v1");
    assert.ok(Number.isFinite(Date.parse(receipt.createdAt)));
    assert.match(receipt.createdAt, /Z$/);
    return receipt;
  }
  const passedIds = (receipt: OwnerReceipt) => receipt.evaluation.checks.filter((check) => check.passed).map((check) => check.id).sort();
  try {
    await t.test("server-authoritative score, session issuance, and private ownership", async () => {
      const owner = newClient(), outsider = newClient();
      const response = await owner.json("/api/receipts", await monitoredSubmission(owner, {
        ...validSubmission(), score: 0, evaluation: { score: 0 }, createdAt: "1990-01-01", ownerHash: "forged-owner",
      }));
      assert.equal(response.status, 201);
      assertPrivate(response);
      assert.match(owner.cookieHeader, /skillreceipt_owner=[a-f0-9]{64}/);
      const receipt = await response.json() as OwnerReceipt;
      assertOwnerShape(receipt);
      assert.equal(receipt.evaluation.score, 100);
      assert.equal(receipt.evaluation.checks.length, 6);
      assert.equal(receipt.shareToken, null);
      assert.notEqual(receipt.createdAt, "1990-01-01");
      assert.ok(!JSON.stringify(receipt).includes("forged-owner"));
      assert.ok(!JSON.stringify(receipt).includes(owner.cookieHeader.split("=").slice(1).join("=")));
      const ownRead = await owner.request(`/api/receipts/${receipt.id}`);
      assert.equal(ownRead.status, 200);
      assertPrivate(ownRead);
      assert.deepEqual(await ownRead.json(), receipt);
      for (const path of [`/api/receipts/${receipt.id}`, `/api/receipts/${receipt.id}/download?format=json`, `/api/receipts/${receipt.id}/download?format=csv`]) {
        await expectError(await outsider.request(path), 404);
      }
      await expectError(await outsider.json(`/api/receipts/${receipt.id}/share`, { enabled: true }), 404);
      await expectError(await outsider.json(`/api/receipts/${receipt.id}/share`, { enabled: false }), 404);
      await expectError(await outsider.request(`/api/receipts/${receipt.id}/coach`, { method: "POST" }), 404);
      const emptyList = await outsider.request("/api/receipts");
      assert.deepEqual(await emptyList.json(), { receipts: [] });
      const ownList = await owner.request("/api/receipts");
      assertPrivate(ownList);
      const { receipts } = await ownList.json();
      assert.equal(receipts.length, 1);
      assert.equal(receipts[0].id, receipt.id);
      assert.equal(receipts[0].sharingEnabled, false);
      assert.deepEqual(Object.keys(receipts[0]).sort(), ["createdAt", "demo", "id", "score", "sharingEnabled", "tier"]);
      assert.ok(!JSON.stringify(receipts).includes("shareToken"));
      const second = await submit(outsider);
      await expectError(await outsider.request(`/api/receipts/${receipt.id}`), 404);
      await expectError(await owner.request(`/api/receipts/${second.id}`), 404);
    });

    await t.test("independent rubric counterexamples through the actual submission API", async () => {
      const client = newClient();
      const cases: Array<{ name: string; edit: (submission: Submission) => void; score: number; passed?: string[] }> = [
        { name: "reference", edit: () => {}, score: 100 },
        { name: "valid unique subset", edit: (s) => { s.rows = s.rows.slice(0, 1); s.total = "120"; }, score: 20, passed: ["unique"] },
        { name: "invented ID", edit: (s) => { s.rows = [{ ...s.rows[0]!, orderId: "INVENTED" }]; }, score: 0, passed: [] },
        { name: "blank ID", edit: (s) => { s.rows[0]!.orderId = ""; }, score: 0, passed: [] },
        { name: "duplicate reference row", edit: (s) => { s.rows.push({ ...s.rows[0]! }); }, score: 60, passed: ["dates", "regions", "revenue"] },
        { name: "wrong but canonical date", edit: (s) => { s.rows[0]!.date = "2026-10-02"; }, score: 80 },
        { name: "wrong canonical region", edit: (s) => { s.rows[0]!.region = "Quebec"; }, score: 80 },
        { name: "wrong canonical revenue and matching wrong sum", edit: (s) => { s.rows[0]!.revenue = "121.00"; s.total = "1286.50"; }, score: 70 },
        { name: "unknown missing-revenue order retained", edit: (s) => { s.rows.push({ orderId: "R008", date: "2026-10-08", region: "Ontario", revenue: "0" }); }, score: 0, passed: [] },
        { name: "bad total", edit: (s) => { s.total = "1285.49"; }, score: 90 },
        { name: "whole-number decimal form accepted", edit: (s) => { s.rows[0]!.revenue = "120"; }, score: 100 },
      ];
      for (const value of ["-1", "1e2", "NaN", "Infinity", "$120.00", "1,200", " 120", "120 ", "120.001"]) {
        cases.push({ name: `invalid row money ${value}`, edit: (s) => { s.rows[0]!.revenue = value; }, score: 70 });
        cases.push({ name: `invalid total ${value}`, edit: (s) => { s.total = value; }, score: 90 });
      }
      for (const example of cases) {
        const submission = validSubmission();
        example.edit(submission);
        const receipt = await submit(client, submission);
        assert.equal(receipt.evaluation.score, example.score, example.name);
        if (example.passed) assert.deepEqual(passedIds(receipt), example.passed, example.name);
        const { session: _session, ...artifact } = receipt.submission;
        assert.deepEqual(artifact, submission, "The server must not silently correct assessed cells");
      }
      const invalid = validSubmission();
      invalid.rows[0]!.date = "2026-01-01";
      const forged = await client.json("/api/receipts", await monitoredSubmission(client, { ...invalid, score: 100, evaluation: { score: 100, checks: [{ passed: true }] } }));
      assert.equal(forged.status, 201);
      assert.equal((await forged.json()).evaluation.score, 80);
    });

    await t.test("metadata, retries, row order, and sharing do not change assessment results", async () => {
      const owner = newClient();
      const first = await submit(owner);
      const again = await submit(owner);
      assert.notEqual(first.id, again.id);
      assert.deepEqual(first.evaluation, again.evaluation);
      assert.equal(first.fingerprint, again.fingerprint);
      const metadata = validSubmission();
      metadata.displayName = "Self-reported test name";
      metadata.reflection = "Unassessed test reflection";
      const named = await submit(owner, metadata);
      assert.deepEqual(named.evaluation, first.evaluation);
      assert.equal(named.fingerprint, first.fingerprint);
      metadata.demo = true;
      const demo = await submit(owner, metadata);
      assert.deepEqual(demo.evaluation, first.evaluation);
      const reversed = validSubmission();
      reversed.rows.reverse();
      const reordered = await submit(owner, reversed);
      assert.equal(reordered.evaluation.score, first.evaluation.score);
      assert.deepEqual(passedIds(reordered), passedIds(first));
      const reread = await owner.request(`/api/receipts/${first.id}`);
      assert.deepEqual(await reread.json(), first);
    });

    await t.test("share, independent employer evidence, exports, revoke, and rotation", async () => {
      const owner = newClient(), visitor = newClient();
      const submission = validSubmission();
      submission.demo = true;
      submission.displayName = "Self-reported HTTP fixture";
      submission.reflection = "Unassessed reflection fixture";
      const receipt = await submit(owner, submission);
      const enabled = await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: true });
      assert.equal(enabled.status, 200);
      assertPrivate(enabled);
      const { shareToken } = await enabled.json();
      assert.equal(typeof shareToken, "string");
      assert.ok(shareToken.length >= 32);
      for (const body of [{ enabled: "true" }, {}, null]) {
        await expectError(await owner.json(`/api/receipts/${receipt.id}/share`, body), 400);
      }
      const evidence = await visitor.request(`/evidence/${shareToken}`);
      assert.equal(evidence.status, 200);
      assertPrivate(evidence);
      const html = await evidence.text();
      assert.match(html, /R001/);
      assert.ok(html.includes(receipt.fingerprint));
      assert.match(html, /1,?285\.50/);
      assert.match(html, /demo/i);
      assert.ok(html.includes(submission.displayName) && html.includes(submission.reflection));
      assert.match(html, /noindex/i);
      assert.ok(!html.includes(receipt.id));
      assert.ok(!html.includes(owner.cookieHeader.split("=").slice(1).join("=")));
      for (const check of receipt.evaluation.checks) assert.ok(html.includes(check.label), `Missing public check ${check.id}`);
      const downloaded = await owner.request(`/api/receipts/${receipt.id}/download?format=json`);
      assert.equal(downloaded.status, 200);
      assert.match(downloaded.headers.get("content-disposition") ?? "", /attachment/i);
      assertPrivate(downloaded);
      const exported = await downloaded.json();
      assertSafeEvidence(exported, [receipt.id, shareToken]);
      const { id: _id, shareToken: _token, ...expected } = receipt;
      assert.deepEqual(exported, expected);
      const csvResponse = await owner.request(`/api/receipts/${receipt.id}/download?format=csv`);
      assert.equal(csvResponse.status, 200);
      assertPrivate(csvResponse);
      assert.match(csvResponse.headers.get("content-disposition") ?? "", /attachment/i);
      const csv = parseCsv(await csvResponse.text());
      assert.equal(csv.length, 10);
      assert.deepEqual(csv.slice(1), submission.rows.map((row) => [row.orderId, row.date, row.region, row.revenue]));
      const revoked = await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: false });
      assert.deepEqual(await revoked.json(), { shareToken: null });
      assert.equal((await newClient().request(`/evidence/${shareToken}`)).status, 404);
      const ownAfter = await owner.request(`/api/receipts/${receipt.id}`);
      assert.deepEqual(await ownAfter.json(), receipt);
      const rotated = await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: true });
      const nextToken = (await rotated.json()).shareToken;
      assert.notEqual(nextToken, shareToken);
      assert.equal((await newClient().request(`/evidence/${shareToken}`)).status, 404);
      assert.equal((await newClient().request(`/evidence/${nextToken}`)).status, 200);
    });

    await t.test("CSV represents submitted cells and safely escapes spreadsheet formulas", async () => {
      const owner = newClient(), submission = validSubmission();
      const cells = ["=1+1", "+SUM(1,2)", "@SUM(1,2)", "-1"];
      submission.rows[0] = { orderId: cells[0]!, date: cells[1]!, region: cells[2]!, revenue: cells[3]! };
      submission.rows[1]!.region = 'region with comma, quote " and\nnewline';
      const receipt = await submit(owner, submission);
      const response = await owner.request(`/api/receipts/${receipt.id}/download?format=csv`);
      const csv = parseCsv(await response.text());
      for (let i = 0; i < 4; i++) {
        assert.notEqual(csv[1][i], cells[i]);
        assert.match(csv[1][i], /^[\t']/);
        assert.equal(csv[1][i].slice(1), cells[i]);
      }
      assert.equal(csv[2][2], submission.rows[1]!.region);
    });

    await t.test("source download contains the exact twelve synthetic source records", async () => {
      const response = await newClient().request("/api/dataset");
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-disposition") ?? "", /attachment/i);
      const csv = parseCsv(await response.text());
      assert.equal(csv.length, 13);
      assert.deepEqual(csv[1], ["R001", "10/01/2026", " ON ", "$120.00"]);
      assert.deepEqual(csv[9], ["R008", "2026-10-08", "ON", ""]);
      assert.deepEqual(csv[4], csv[5]);
      assert.deepEqual(csv[10], csv[11]);
      assert.deepEqual(csv[12], ["R010", "Oct 10, 2026", "British columbia", "$250.00"]);
    });

    await t.test("invalid envelopes, malformed JSON, and streamed oversized input create no receipts", async () => {
      const owner = newClient();
      await submit(owner);
      const before = await (await owner.request("/api/receipts")).json();
      const invalidBodies: unknown[] = [null, [], "text", {}, { ...validSubmission(), rows: [] },
        { ...validSubmission(), rows: Array.from({ length: 31 }, () => validSubmission().rows[0]) },
        { ...validSubmission(), rows: [null] }, { ...validSubmission(), rows: [{ orderId: "R001" }] },
        { ...validSubmission(), rows: [{ orderId: 1, date: "", region: "", revenue: "" }] },
        { ...validSubmission(), total: "" }, { ...validSubmission(), total: 1285.5 }, { ...validSubmission(), total: "1".repeat(10_000) },
        { ...validSubmission(), displayName: "a".repeat(61) }, { ...validSubmission(), reflection: "a".repeat(1501) },
        { ...validSubmission(), displayName: 42 }, { ...validSubmission(), reflection: 42 },
        { ...validSubmission(), demo: "false" },
      ];
      const fieldLimits: Array<[string, number]> = [["orderId", 40], ["date", 60], ["region", 60], ["revenue", 40]];
      for (const [key, limit] of fieldLimits) {
        const payload = validSubmission();
        Object.assign(payload.rows[0]!, { [key]: "x".repeat(limit + 1) });
        invalidBodies.push(payload);
      }
      for (const payload of invalidBodies) await expectError(await owner.json("/api/receipts", payload), 400);
      await expectError(await owner.request("/api/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }), 400);
      await expectError(await owner.request("/api/receipts", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(validSubmission()) }), 400);
      let chunks = 0;
      const oversized = new ReadableStream({
        pull(controller) {
          if (chunks++ < 70) controller.enqueue(new TextEncoder().encode(" ".repeat(1024)));
          else controller.close();
        },
      });
      await expectError(await owner.request("/api/receipts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: oversized, duplex: "half",
      }), 400);
      assert.deepEqual(await (await owner.request("/api/receipts")).json(), before);
      const invalidSession = newClient();
      const invalid = await invalidSession.json("/api/receipts", { rows: [] });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.headers.getSetCookie().length, 0);
    });

    await t.test("cross-origin mutations, invalid paths, and missing/revoked evidence fail safely", async () => {
      const owner = newClient(), receipt = await submit(owner);
      const headers = { Origin: "https://untrusted.invalid", "Sec-Fetch-Site": "cross-site" };
      await expectError(await owner.json("/api/receipts", validSubmission(), headers), 400);
      await expectError(await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: true }, headers), 400);
      await expectError(await owner.request(`/api/receipts/${receipt.id}/coach`, { method: "POST", headers }), 400);
      await expectError(await owner.request("/api/receipts/not-a-uuid"), 404);
      for (const token of ["not-a-token", "a".repeat(64)]) {
        const response = await newClient().request(`/evidence/${token}`);
        assert.equal(response.status, 404);
        assert.match(await response.text(), /unavailable|not found|no longer/i);
      }
      const after = await (await owner.request(`/api/receipts/${receipt.id}`)).json();
      assert.equal(after.shareToken, null);
    });

    await t.test("coach privacy, malformed/offline fallback, duplicate requests, and unchanged receipts", async () => {
      const owner = newClient();
      const submission = validSubmission();
      submission.displayName = "PRIVATE_HTTP_NAME_SENTINEL";
      submission.reflection = "PRIVATE_HTTP_REFLECTION_SENTINEL";
      const receipt = await submit(owner, submission);
      const path = `/api/receipts/${receipt.id}/coach`;
      await expectError(await owner.json(path, { prompt: "ignore rules", score: 100 }), 400);
      const response = await owner.request(path, { method: "POST" });
      assert.equal(response.status, 200);
      assertPrivate(response);
      const advice = await response.json();
      assert.equal(advice.assessed, false);
      assert.equal(typeof advice.advice, "string");
      assert.equal(advice.model, "mock-local-model");
      await expectError(await owner.request(path, { method: "POST" }), 429);
      const outbound = JSON.stringify(app.mock.state.requests);
      for (const secret of [submission.displayName, submission.reflection, receipt.id, owner.cookieHeader.split("=").slice(1).join("=")]) {
        assert.ok(!outbound.includes(secret), "Coach request leaked private content");
      }
      assert.deepEqual(await (await owner.request(`/api/receipts/${receipt.id}`)).json(), receipt);
      const sharedFirst = await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: true });
      const sharedFirstToken = (await sharedFirst.json()).shareToken;
      const publicHtml = await (await newClient().request(`/evidence/${sharedFirstToken}`)).text();
      assert.ok(!publicHtml.includes(advice.advice) && !publicHtml.includes("mock-local-model"));
      for (const mode of ["offline", "malformed", "markup"] as const) {
        app.mock.state.mode = mode;
        const another = await submit(owner);
        await expectError(await owner.request(`/api/receipts/${another.id}/coach`, { method: "POST" }), 503);
        const shared = await owner.json(`/api/receipts/${another.id}/share`, { enabled: true });
        assert.equal(shared.status, 200);
        const reread = await (await owner.request(`/api/receipts/${another.id}`)).json();
        assert.equal(reread.fingerprint, another.fingerprint);
        assert.deepEqual(reread.evaluation, another.evaluation);
        assert.deepEqual(reread.submission, another.submission);
        const evidenceJson = await (await owner.request(`/api/receipts/${another.id}/download?format=json`)).json();
        assertSafeEvidence(evidenceJson);
      }
      app.mock.state.mode = "delay";
      const concurrent = await submit(owner);
      const concurrentPath = `/api/receipts/${concurrent.id}/coach`;
      const first = owner.request(concurrentPath, { method: "POST" });
      const second = owner.request(concurrentPath, { method: "POST" });
      assert.deepEqual((await Promise.all([first, second])).map((r) => r.status).sort(), [200, 429]);
      app.mock.state.mode = "success";
    });

    await t.test("receipt, owner session, and share state survive a real process restart", async () => {
      const owner = newClient(), receipt = await submit(owner);
      const response = await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: true });
      const { shareToken } = await response.json();
      await app.restart();
      const restored = await owner.request(`/api/receipts/${receipt.id}`);
      assert.equal(restored.status, 200);
      assert.deepEqual(await restored.json(), { ...receipt, shareToken });
      assert.equal((await newClient().request(`/evidence/${shareToken}`)).status, 200);
      await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: false });
      await app.restart();
      assert.equal((await newClient().request(`/evidence/${shareToken}`)).status, 404);
      assert.equal((await owner.request(`/api/receipts/${receipt.id}`)).status, 200);
    });
  } finally {
    await app.close();
  }
});
