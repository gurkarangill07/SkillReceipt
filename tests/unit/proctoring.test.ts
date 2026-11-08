import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ProctorRepository } from "../../lib/server/proctoring";
import { FileJsonDocuments } from "../../lib/server/documents";
import { FileReceiptRepository, hashOwner } from "../../lib/server/store";
import { parseEvents, parseProctorState } from "../../lib/proctor-validation";
import { parseSession } from "../../lib/validation";
import type { ProctorState } from "../../lib/proctoring";
import { validSubmission } from "../helpers/fixtures";

const ready: ProctorState = { camera: true, fullscreen: true, focused: true, visible: true, detector: true, faces: 1, paused: false };
test("proctoring validates all start requirements and never retains arbitrary payloads", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-proctor-"));
  try {
    const repository = new ProctorRepository(new FileJsonDocuments(directory));
    for (const state of [{ ...ready, camera: false }, { ...ready, faces: 0 }, { ...ready, faces: 2 }, { ...ready, fullscreen: false }, { ...ready, detector: false }, { ...ready, paused: true }]) await assert.rejects(repository.start("owner", "qa-engineer", state));
    assert.deepEqual(parseProctorState({ ...ready, audio: "private", screenshot: "private" }), ready);
    assert.deepEqual(parseEvents([{ seq: 1, kind: "paste_blocked", elapsedMs: 10, clipboard: "private" }]), [{ seq: 1, kind: "paste_blocked", elapsedMs: 10 }]);
    for (const events of [[{ seq: -1, kind: "paste_blocked", elapsedMs: 0 }], [{ seq: 1, kind: "key_pressed", elapsedMs: 0 }], [{ seq: 1, kind: "face_missing", elapsedMs: Infinity }], Array(51).fill({ seq: 1, kind: "face_missing", elapsedMs: 0 })]) assert.throws(() => parseEvents(events));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("session events survive restarts, cannot be erased/reordered or accessed by another owner, and detect gaps", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-proctor-"));
  let now = Date.parse("2026-11-08T15:00:00Z");
  const documents = new FileJsonDocuments(directory), repository = new ProctorRepository(documents, () => now);
  try {
    const session = await repository.start("owner", "qa-engineer", ready);
    now += 1000;
    const events = [{ seq: 1, kind: "tab_hidden" as const, elapsedMs: 1000 }];
    await repository.append(session.id, "owner", events, { ...ready, paused: true });
    await assert.rejects(repository.append(session.id, "outsider", [], ready));
    await assert.rejects(repository.append(session.id, "owner", [{ ...events[0], kind: "resumed" }], ready));
    await assert.rejects(repository.append(session.id, "owner", [{ seq: 3, kind: "resumed", elapsedMs: 1000 }], ready));
    await assert.rejects(repository.append(session.id, "owner", [{ seq: 2, kind: "heartbeat", elapsedMs: 1000 }], ready));
    await assert.rejects(repository.seal(session.id, "owner", "qa-engineer", 1));
    now += 35_000;
    await assert.rejects(repository.seal(session.id, "owner", "qa-engineer", 1));
    const restarted = new ProctorRepository(documents, () => now);
    await restarted.append(session.id, "owner", events, ready); // Same batch retry is idempotent.
    await assert.rejects(restarted.seal(session.id, "owner", "frontend-developer", 1));
    await assert.rejects(restarted.seal(session.id, "owner", "qa-engineer", 0));
    const report = await restarted.seal(session.id, "owner", "qa-engineer", 1);
    assert.equal(report.tabSwitches, 1); assert.equal(report.integrity!.connectionGaps, 1);
    assert.equal(report.integrity!.events.filter((event) => event.kind === "tab_hidden").length, 1);
    assert.deepEqual(parseSession(report), report);
    assert.equal(report.integrity!.events.at(-1)!.kind, "session_submitted");
    assert.deepEqual(await restarted.seal(session.id, "owner", "qa-engineer", 1), report);
    await assert.rejects(restarted.append(session.id, "owner", [], ready));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("one monitored attempt creates one receipt on retry, retains the audit and hides internal session IDs", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-proctor-"));
  try {
    const owner = hashOwner("a".repeat(64)), repository = new ProctorRepository(new FileJsonDocuments(path.join(directory, "sessions")));
    const session = await repository.start(owner, "junior-data-analyst", ready);
    const submission = { ...validSubmission(), session: await repository.seal(session.id, owner, "junior-data-analyst", 0) };
    const receipts = new FileReceiptRepository(directory);
    const receipt = await receipts.create(submission, owner, session.id);
    assert.equal(receipt.submission.session!.sessionId, undefined);
    assert.ok(receipt.submission.session!.integrity);
    const again = await receipts.create(submission, owner, session.id);
    assert.deepEqual(again, receipt);
    assert.equal((await receipts.listOwner(owner)).length, 1);
    await assert.rejects(receipts.create({ ...submission, total: "0" }, owner, session.id));
    const token = (await receipts.setSharing(receipt.id, owner, true))!.shareToken!;
    const shared = await receipts.getShared(token);
    assert.deepEqual(shared!.submission.session!.integrity, receipt.submission.session!.integrity);
    assert.ok(!JSON.stringify(shared).includes(session.id));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
