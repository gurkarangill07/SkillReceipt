import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCoding } from "../../lib/server/coding";
import { CODING_EXAMPLE, CODING_STARTER } from "../../lib/coding";
import { PIPELINE_TASKS } from "../../lib/career";
import { parseSubmission } from "../../lib/validation";
import { fingerprint } from "../../lib/fingerprint";
import { FileReceiptRepository, hashOwner } from "../../lib/server/store";
import { pipelineToCsv } from "../../lib/csv";
import { buildPracticePrompt } from "../../lib/server/coach";
import type { Submission } from "../../lib/contracts";

const input = (code = CODING_STARTER): Submission => parseSubmission({ workSample: { kind: "data-engineer-v2", answers: { key: "order_id", missing: "quarantine", load: "upsert" }, code, session: { mode: "practice", cameraStarted: false, tabSwitches: 0, interruptions: 0, activeSeconds: 0 } } });
test("JavaScript executes four cases and reports real partial credit", async () => {
  assert.equal((await runCoding(CODING_EXAMPLE)).passed, 4);
  assert.equal((await runCoding(CODING_STARTER)).passed, 2);
  assert.equal((await runCoding("invalid javascript !")).passed, 0);
  assert.equal((await runCoding("function totalRevenue() { return '2050'; }")).passed, 0);
});
test("coding VM bounds infinite work and exposes no host, network or filesystem APIs", { timeout: 5000 }, async () => {
  const start = Date.now();
  assert.equal((await runCoding("function totalRevenue() { while(true) {} }")).passed, 0);
  assert.ok(Date.now() - start < 2500);
  for (const api of ["process.exit()", "require('node:fs')", "fetch('https://example.invalid')", "window.location"]) assert.equal((await runCoding(`function totalRevenue() { return ${api}; }`)).passed, 0);
  assert.equal((await runCoding("function totalRevenue() { let a=[]; while(true) a.push(new Array(10000).fill(1)); }")).passed, 0);
  await assert.rejects(runCoding("a".repeat(5001)));
});
test("new version stores real coding score, reopens it safely, and fingerprints only assessed work", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "skillreceipt-coding-"));
  try {
    const store = new FileReceiptRepository(root), owner = hashOwner("c".repeat(64));
    const partial = await store.create(input(), owner);
    assert.equal(partial.assessmentVersion, "engineer-coding-v2");
    assert.deepEqual(Object.keys(partial.submission.workSample!.answers).sort(), ["key", "load", "missing"]);
    assert.equal(partial.evaluation.score, 80); assert.equal(partial.evaluation.checks.length, 4);
    assert.equal(partial.evaluation.checks.find((check) => check.id === "coding")?.pointsEarned, 20);
    assert.deepEqual(await new FileReceiptRepository(root).getOwner(partial.id, owner), partial);
    const perfect = await store.create(input(CODING_EXAMPLE), owner);
    assert.equal(perfect.evaluation.score, 100);
    assert.notEqual(perfect.fingerprint, partial.fingerprint);
    const variant = input(); variant.workSample!.session.tabSwitches = 9; variant.workSample!.answers.schema = "strings";
    assert.equal(fingerprint(variant), partial.fingerprint);
    assert.ok(pipelineToCsv(input().workSample!).includes(CODING_STARTER));
    assert.ok(!pipelineToCsv(input().workSample!).includes("Schema validation"));
    assert.match(buildPracticePrompt(perfect.evaluation), /engineer-coding-v2/);
    assert.equal(PIPELINE_TASKS.length, 6);
  } finally { await rm(root, { recursive: true, force: true }); }
});
