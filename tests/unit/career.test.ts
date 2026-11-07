import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PIPELINE_TASKS, evaluatePipeline, simulatePipeline } from "../../lib/career";
import type { PipelineWork, Submission } from "../../lib/contracts";
import { parseSubmission } from "../../lib/validation";
import { fingerprint } from "../../lib/fingerprint";
import { FileReceiptRepository, hashOwner } from "../../lib/server/store";
import { buildPracticePrompt } from "../../lib/server/coach";
import { detectResumeSkills, resumeContext, RESUME_LIMIT } from "../../lib/resume";
import { pdfFixture, docxFixture } from "../helpers/resume-fixtures";

export const pipelineSubmission = (): Submission => ({ rows: [], total: "", displayName: "", reflection: "", demo: false, workSample: { kind: "data-pipeline-v1", answers: Object.fromEntries(PIPELINE_TASKS.map((task) => [task.id, task.correct])) as PipelineWork["answers"], session: { mode: "practice", cameraStarted: false, tabSwitches: 0, interruptions: 0, activeSeconds: 30 } } });

test("pipeline reference earns 100; each wrong real decision loses its published points", () => {
  const input = pipelineSubmission(); assert.equal(evaluatePipeline(input.workSample!).score, 100);
  for (const task of PIPELINE_TASKS) {
    const wrong = pipelineSubmission(); wrong.workSample!.answers[task.id] = task.options.find((option) => option.value !== task.correct)!.value;
    const result = evaluatePipeline(wrong.workSample!);
    assert.equal(result.score, 100 - task.points);
    assert.equal(result.checks.find((check) => check.id === task.id)?.passed, false);
  }
});
test("presentation example scores 75 with two useful gaps; simulation executes dedupe and replay decisions", () => {
  const input = pipelineSubmission(); input.workSample!.answers.schema = "strings"; input.workSample!.answers.partition = "ingestion_date";
  assert.equal(evaluatePipeline(input.workSample!).score, 75);
  const correct = pipelineSubmission().workSample!.answers;
  assert.deepEqual(simulatePipeline(correct), { input: 5, retained: 3, quarantine: 1, revenue: 355.5, afterRetry: 3, schemaEnforced: true, partition: "order_date" });
  assert.equal(simulatePipeline({ ...correct, load: "append" }).afterRetry, 6);
  assert.equal(simulatePipeline({ ...correct, dedupe: "first" }).revenue, 345.5);
  assert.equal(simulatePipeline({ ...correct, missing: "zero" }).retained, 4);
});
test("camera/tab context never changes score/fingerprint; presentation is always labeled demo", () => {
  const input = pipelineSubmission(), other = pipelineSubmission();
  other.workSample!.session = { mode: "camera", cameraStarted: true, tabSwitches: 12, interruptions: 4, activeSeconds: 999 };
  assert.deepEqual(evaluatePipeline(input.workSample!), evaluatePipeline(other.workSample!));
  assert.equal(fingerprint(input), fingerprint(other));
  other.workSample!.session.mode = "presentation";
  assert.equal(parseSubmission(other).demo, true);
});
test("pipeline validation rejects forged kinds, unsupported choices and invalid monitoring counts", () => {
  const invalid = pipelineSubmission(); invalid.workSample!.answers.key = "forged";
  assert.throws(() => parseSubmission(invalid));
  for (const value of [-1, NaN, 100_000, "12"]) {
    const input = pipelineSubmission(); Object.assign(input.workSample!.session, { tabSwitches: value });
    assert.throws(() => parseSubmission(input));
  }
  const camera = pipelineSubmission(); camera.workSample!.session.mode = "camera";
  assert.throws(() => parseSubmission(camera));
});
test("pipeline versioned records persist and expose configuration/session without ownership fields", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-pipeline-"));
  try {
    const store = new FileReceiptRepository(directory), owner = hashOwner("a".repeat(64));
    const receipt = await store.create(pipelineSubmission(), owner);
    assert.equal(receipt.assessmentVersion, "orders-pipeline-v1"); assert.equal(receipt.evaluation.score, 100);
    assert.deepEqual(await new FileReceiptRepository(directory).getOwner(receipt.id, owner), receipt);
    const shared = await store.setSharing(receipt.id, owner, true);
    const evidence = await store.getShared(shared!.shareToken!);
    assert.deepEqual(evidence?.submission.workSample, receipt.submission.workSample);
    assert.ok(!JSON.stringify(evidence).includes(owner));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("pipeline coach uses the correct published role checks, never legacy cleaning rules", () => {
  const prompt = buildPracticePrompt(evaluatePipeline(pipelineSubmission().workSample!));
  assert.match(prompt, /orders-pipeline-v1/); assert.ok(!prompt.includes("R008"));
});
test("résumé parsing returns skill keywords, never raw personal text", async () => {
  const result = await resumeContext("resume.txt", new TextEncoder().encode("PRIVATE_PERSON person@example.invalid SQL Python ETL"));
  assert.deepEqual(result.skills, ["SQL", "Python", "ETL"]);
  assert.ok(!JSON.stringify(result).includes("PRIVATE_PERSON"));
  assert.deepEqual(detectResumeSkills("sql pythonic PostgreSQL"), ["SQL", "PostgreSQL"]);
});
test("actual PDF and DOCX extraction work from synthetic documents", async () => {
  assert.deepEqual((await resumeContext("sample.pdf", pdfFixture())).skills, ["SQL", "Python", "ETL"]);
  assert.deepEqual((await resumeContext("sample.docx", docxFixture())).skills, ["SQL", "Python", "Airflow"]);
});
test("résumé rejects mismatched files, malformed documents and byte limits", async () => {
  for (const name of ["resume.exe", "resume.pdf", "resume.docx"]) await assert.rejects(resumeContext(name, new TextEncoder().encode("not a document")));
  await assert.rejects(resumeContext("resume.txt", new Uint8Array(RESUME_LIMIT + 1)));
});
