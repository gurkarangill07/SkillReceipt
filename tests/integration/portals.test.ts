import assert from "node:assert/strict";
import { test } from "node:test";
import { CookieClient, expectError, monitoredSubmission } from "../helpers/http-client.mjs";
import { startIsolatedApp } from "../helpers/next-server.mjs";
import { CODING_STARTER, CODING_EXAMPLE } from "../../lib/coding";
import { SCENARIOS } from "../../lib/scenarios";

test("guest challenges: no accounts, real scoring, private receipts and revocable sharing", { timeout: 180_000 }, async (t) => {
  const app = await startIsolatedApp();
  const owner = new CookieClient(app.origin), visitor = new CookieClient(app.origin);
  const input = { workSample: { kind: "data-engineer-v2", answers: { key: "order_id", missing: "quarantine", load: "upsert" }, code: CODING_STARTER, session: { mode: "practice", cameraStarted: false, tabSwitches: 0, interruptions: 0, activeSeconds: 0 } } };
  try {
    await t.test("all challenges open without sign-in; old account paths cannot register or log in", async () => {
      for (const route of ["/", "/start", "/receipts", "/challenge/junior-data-engineer", "/assessment", ...SCENARIOS.map((s) => `/challenge/${s.id}`)]) {
        const response = await visitor.request(route); assert.equal(response.status, 200, route);
        const html = await response.text(); assert.ok(!html.includes("Candidate sign in") && !html.includes("Create an account"));
      }
      const login = await visitor.request("/login"); assert.equal(login.status, 307); assert.equal(login.headers.get("location"), "/start");
      for (const action of ["register", "login"]) await expectError(await visitor.json("/api/auth", { action, email: "test@example.invalid", password: "password" }), 410);
      assert.equal((await visitor.request("/api/profile/resume")).status, 410);
    });
    await t.test("engineering still runs code, awards 80/100 for starter and 100 for correct implementation", async () => {
      const starter = await owner.json("/api/receipts", { ...input, demo: true, score: 100 }); assert.equal(starter.status, 201);
      const receipt = await starter.json(); assert.equal(receipt.evaluation.score, 80);
      const page = await owner.request(`/receipts/${receipt.id}`); assert.equal(page.status, 200); assert.ok((await page.text()).includes("JavaScript basics"));
      const run = await owner.json("/api/coding", { code: CODING_EXAMPLE }); assert.equal((await run.json()).passed, 4);
      const full = await owner.json("/api/receipts", await monitoredSubmission(owner, { ...input, workSample: { ...input.workSample, code: CODING_EXAMPLE } })); assert.equal((await full.json()).evaluation.score, 100);
      await expectError(await visitor.request(`/api/receipts/${receipt.id}`), 404);
    });
    for (const scenario of SCENARIOS) await t.test(`${scenario.title}: score, owner view, CSV/JSON, sharing and revocation`, async () => {
      const work = { kind: "scenario-v1", roleId: scenario.id, answers: Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, field.answer])) };
      work.answers[scenario.questions[0].id] = scenario.questions[0].options!.find((option) => option.value !== scenario.questions[0].answer)!.value;
      const response = await owner.json("/api/receipts", { scenario: work, demo: true, score: 100 }); assert.equal(response.status, 201);
      const receipt = await response.json(); assert.equal(receipt.evaluation.score, 80); assert.equal(receipt.submission.demo, true);
      const html = await (await owner.request(`/receipts/${receipt.id}`)).text(); assert.ok(html.includes(scenario.title) && html.includes("Make your next attempt stronger"));
      const csv = await (await owner.request(`/api/receipts/${receipt.id}/download?format=csv`)).text(); assert.ok(csv.includes("submitted_answer") && csv.includes(scenario.questions[0].label));
      const json = await (await owner.request(`/api/receipts/${receipt.id}/download?format=json`)).json(); assert.equal(json.evaluation.score, 80); assert.ok(!("id" in json) && !("ownerHash" in json) && !("shareToken" in json));
      const shared = await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: true }); const { shareToken } = await shared.json();
      const publicHtml = await (await visitor.request(`/evidence/${shareToken}`)).text(); assert.ok(publicHtml.includes(scenario.title) && !publicHtml.includes("Make your next attempt stronger"));
      await owner.json(`/api/receipts/${receipt.id}/share`, { enabled: false }); assert.equal((await visitor.request(`/evidence/${shareToken}`)).status, 404);
      await expectError(await visitor.request(`/api/receipts/${receipt.id}`), 404);
    });
    await t.test("all guest results remain available after a server restart", async () => {
      await app.restart();
      assert.equal((await (await owner.request("/api/receipts")).json()).receipts.length, 6);
      assert.equal((await (await visitor.request("/api/receipts")).json()).receipts.length, 0);
    });
  } finally { await app.close(); }
});
