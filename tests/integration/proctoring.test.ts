import assert from "node:assert/strict";
import { test } from "node:test";
import { CookieClient, expectError } from "../helpers/http-client.mjs";
import { startIsolatedApp } from "../helpers/next-server.mjs";
import { validSubmission } from "../helpers/fixtures";

test("mandatory monitoring is enforced by the receipt API and reports remain bound to their owner and exercise", { timeout: 180_000 }, async () => {
  const app = await startIsolatedApp(), owner = new CookieClient(app.origin), outsider = new CookieClient(app.origin);
  const ready = { camera: true, fullscreen: true, focused: true, visible: true, detector: true, faces: 1, paused: false };
  try {
    await expectError(await owner.json("/api/receipts", validSubmission()), 400);
    for (const state of [{ ...ready, camera: false }, { ...ready, fullscreen: false }, { ...ready, faces: 0 }, { ...ready, faces: 2 }]) await expectError(await owner.json("/api/assessment-sessions", { consent: true, exercise: "junior-data-analyst", state }), 400);
    await expectError(await owner.json("/api/assessment-sessions", { consent: false, exercise: "junior-data-analyst", state: ready }), 400);
    await expectError(await owner.json("/api/assessment-sessions", { consent: true, exercise: "junior-data-analyst", state: ready }, { Origin: "https://other.invalid" }), 400);
    const started = await owner.json("/api/assessment-sessions", { consent: true, exercise: "junior-data-analyst", state: ready });
    assert.equal(started.status, 201);
    assert.match(started.headers.getSetCookie().join(";"), /HttpOnly/);
    assert.match(started.headers.getSetCookie().join(";"), /SameSite=lax/i);
    const session = await started.json();
    const endpoint = `/api/assessment-sessions/${session.id}`;
    await expectError(await outsider.json(endpoint, { events: [], state: ready }), 400);
    await expectError(await owner.json(endpoint, { events: [{ seq: 2, kind: "paste_blocked", elapsedMs: 0 }], state: ready }), 400);
    const event = { seq: 1, kind: "paste_blocked", elapsedMs: 0 };
    assert.equal((await owner.json(endpoint, { events: [event], state: { ...ready, paused: true } })).status, 200);
    const payload = { ...validSubmission(), sessionSequence: 1, session: { mode: "camera", cameraStarted: true, fullscreenStarted: true, sessionId: session.id, tabSwitches: 999, interruptions: 999, activeSeconds: 999 } };
    await expectError(await owner.json("/api/receipts", payload), 400);
    assert.equal((await owner.json(endpoint, { events: [event], state: ready })).status, 200);
    await expectError(await owner.json("/api/receipts", { ...payload, session: { ...payload.session, mode: "practice" } }), 400);
    await expectError(await outsider.json("/api/receipts", payload), 400);
    const saved = await owner.json("/api/receipts", payload); assert.equal(saved.status, 201);
    const receipt = await saved.json();
    assert.equal(receipt.evaluation.score, 100); assert.equal(receipt.submission.demo, false);
    assert.equal(receipt.submission.session.tabSwitches, 0); assert.equal(receipt.submission.session.pasteEvents, 1);
    assert.ok(receipt.submission.session.integrity.events.some((item: { kind: string }) => item.kind === "paste_blocked"));
    assert.ok(!JSON.stringify(receipt).includes(session.id) || receipt.id === session.id);
    await expectError(await owner.json(endpoint, { events: [], state: ready }), 400);
    const retry = await owner.json("/api/receipts", payload); assert.equal(retry.status, 201); assert.deepEqual(await retry.json(), receipt);
    await expectError(await owner.json("/api/receipts", { ...payload, total: "0" }), 400);
    assert.equal((await (await owner.request("/api/receipts")).json()).receipts.length, 1);
    const exported = await (await owner.request(`/api/receipts/${receipt.id}/download?format=json`)).json();
    assert.deepEqual(exported.submission.session.integrity, receipt.submission.session.integrity);
    assert.ok(!JSON.stringify(exported).includes(session.id));
    await app.restart();
    const reopened = await (await owner.request(`/api/receipts/${receipt.id}`)).json(); assert.deepEqual(reopened, receipt);
  } finally { await app.close(); }
});
