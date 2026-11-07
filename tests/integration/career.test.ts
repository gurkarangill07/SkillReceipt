import assert from "node:assert/strict";
import { test } from "node:test";
import { CookieClient, expectError } from "../helpers/http-client.mjs";
import { startIsolatedApp } from "../helpers/next-server.mjs";
import { pdfFixture, docxFixture } from "../helpers/resume-fixtures";

test("résumé to role score and employer evidence", { timeout: 120_000 }, async (t) => {
  const app = await startIsolatedApp();
  const owner = new CookieClient(app.origin), visitor = new CookieClient(app.origin);
  const input = {
    rows: [], total: "", displayName: "", reflection: "", demo: false,
    workSample: { kind: "data-pipeline-v1", answers: { key: "order_id", dedupe: "latest", missing: "quarantine", schema: "strings", load: "upsert", partition: "ingestion_date" }, session: { mode: "presentation", cameraStarted: false, tabSwitches: 0, interruptions: 0, activeSeconds: 5 } },
  };
  try {
    await t.test("TXT/PDF/DOCX uploads extract context without returning personal text or creating receipts", async () => {
      for (const [name, body] of [["sample.txt", new TextEncoder().encode("PRIVATE_APPLICANT private@example.invalid SQL Python")], ["sample.pdf", pdfFixture()], ["sample.docx", docxFixture()]] as const) {
        const response = await owner.request("/api/resume", { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Resume-Name": encodeURIComponent(name) }, body: Buffer.from(body) });
        assert.equal(response.status, 200, name);
        const result = await response.json(); assert.ok(result.skills.includes("SQL"));
        assert.ok(!JSON.stringify(result).includes("PRIVATE_APPLICANT"));
        assert.deepEqual(Object.keys(result).sort(), ["name", "skills"]);
      }
      assert.deepEqual(await (await owner.request("/api/receipts")).json(), { receipts: [] });
      await expectError(await owner.request("/api/resume", { method: "POST", headers: { "X-Resume-Name": "test.exe" }, body: "SQL" }), 400);
      await expectError(await owner.request("/api/resume", { method: "POST", headers: { "X-Resume-Name": "test.txt", Origin: "https://evil.invalid" }, body: "SQL" }), 400);
    });
    let id = "", fingerprint = "";
    await t.test("server grades the sample 75 and forces a demo label despite forged claims", async () => {
      const response = await owner.json("/api/receipts", { ...input, score: 100, evaluation: { score: 100 } });
      assert.equal(response.status, 201); const receipt = await response.json();
      assert.equal(receipt.evaluation.score, 75); assert.equal(receipt.submission.demo, true);
      assert.equal(receipt.assessmentVersion, "orders-pipeline-v1");
      assert.equal(receipt.evaluation.checks.filter((check: { passed: boolean }) => check.passed).length, 4);
      id = receipt.id; fingerprint = receipt.fingerprint;
      await expectError(await visitor.request(`/api/receipts/${id}`), 404);
      const html = await (await owner.request(`/receipts/${id}`)).text();
      assert.ok(html.includes("Turn the gaps into a plan") && html.includes("Schema validation"));
      const coach = await owner.request(`/api/receipts/${id}/coach`, { method: "POST" });
      assert.equal(coach.status, 200);
      const advice = await coach.json(); assert.equal(advice.assessed, false);
      assert.ok(!advice.advice.includes("R008"));
      assert.equal((await (await owner.request(`/api/receipts/${id}`)).json()).evaluation.score, 75);
    });
    await t.test("employer sees score, configuration and honest conditions without resume or private plan", async () => {
      const shared = await owner.json(`/api/receipts/${id}/share`, { enabled: true }); const { shareToken } = await shared.json();
      const response = await visitor.request(`/evidence/${shareToken}`); assert.equal(response.status, 200);
      const html = await response.text();
      for (const expected of ["75", "Demo work sample", "Presentation demo", "CLIENT-REPORTED", "Schema validation"]) assert.ok(html.includes(expected), expected);
      assert.ok(!html.includes("PRIVATE_APPLICANT") && !html.includes("Turn the gaps into a plan"));
      const evidence = await (await owner.request(`/api/receipts/${id}/download?format=json`)).json();
      assert.equal(evidence.fingerprint, fingerprint); assert.ok(!("id" in evidence) && !("shareToken" in evidence) && !("ownerHash" in evidence));
      const csv = await (await owner.request(`/api/receipts/${id}/download?format=csv`)).text(); assert.match(csv, /submitted_configuration/); assert.match(csv, /ingestion_date/);
      await owner.json(`/api/receipts/${id}/share`, { enabled: false }); assert.equal((await visitor.request(`/evidence/${shareToken}`)).status, 404);
    });
    await t.test("realistic correct attempt scores 100; camera metrics cannot change score or artifact fingerprint", async () => {
      const correct = structuredClone(input); correct.workSample.answers.schema = "strict"; correct.workSample.answers.partition = "order_date";
      correct.workSample.session.mode = "practice";
      const first = await (await owner.json("/api/receipts", correct)).json();
      assert.equal(first.evaluation.score, 100);
      const secondInput = structuredClone(correct); secondInput.workSample.session.tabSwitches = 4;
      const second = await (await owner.json("/api/receipts", secondInput)).json();
      assert.equal(second.evaluation.score, 100); assert.equal(second.fingerprint, first.fingerprint);
      assert.notEqual(second.id, first.id);
    });
  } finally { await app.close(); }
});
