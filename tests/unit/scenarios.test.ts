import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { SCENARIOS, evaluateScenario } from "../../lib/scenarios";
import { parseSubmission } from "../../lib/validation";
import { fingerprint } from "../../lib/fingerprint";
import { FileReceiptRepository, hashOwner } from "../../lib/server/store";
import { scenarioToCsv } from "../../lib/csv";

for (const scenario of SCENARIOS) {
  const solution = () => ({ kind: "scenario-v1" as const, roleId: scenario.id, answers: Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, field.answer])) });
  test(`${scenario.title}: correct work earns 100; each wrong answer loses exactly its points`, () => {
    assert.equal(evaluateScenario(solution()).score, 100);
    for (const [index, field] of [...scenario.questions, ...scenario.exercise].entries()) {
      const wrong = solution();
      wrong.answers[field.id] = field.options ? field.options.find((option) => option.value !== field.answer)!.value : "99999";
      assert.equal(evaluateScenario(wrong).score, index < 3 ? 80 : 90);
    }
  });
  test(`${scenario.title}: evidence persists, separates owners, shares and exports actual answers`, async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-scenario-"));
    try {
      const repository = new FileReceiptRepository(directory), owner = hashOwner("a".repeat(64));
      const submission = parseSubmission({ scenario: solution(), demo: true, score: 0, evaluation: { score: 0 } });
      const receipt = await repository.create(submission, owner);
      assert.equal(receipt.evaluation.score, 100);
      assert.deepEqual(await new FileReceiptRepository(directory).getOwner(receipt.id, owner), receipt);
      assert.equal(await repository.getOwner(receipt.id, hashOwner("b".repeat(64))), null);
      const shared = await repository.setSharing(receipt.id, owner, true);
      assert.equal((await repository.getShared(shared!.shareToken!))?.fingerprint, receipt.fingerprint);
      await repository.setSharing(receipt.id, owner, false);
      assert.equal(await repository.getShared(shared!.shareToken!), null);
      assert.match(scenarioToCsv(submission.scenario!), /submitted_answer/);
      const changed = structuredClone(submission);
      changed.scenario!.answers[scenario.questions[0].id] = scenario.questions[0].options!.find((option) => option.value !== scenario.questions[0].answer)!.value;
      assert.notEqual(fingerprint(changed), fingerprint(submission));
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}

test("scenario validation rejects unsupported roles, missing answers, bogus choices and ambiguous submissions", () => {
  const scenario = SCENARIOS[0];
  const work = { kind: "scenario-v1", roleId: scenario.id, answers: Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, field.answer])) };
  assert.throws(() => parseSubmission({ scenario: { ...work, roleId: "does-not-exist" } }));
  assert.throws(() => parseSubmission({ scenario: { ...work, answers: {} } }));
  assert.throws(() => parseSubmission({ scenario: { ...work, answers: { ...work.answers, control: "forged" } } }));
  assert.throws(() => parseSubmission({ scenario: work, workSample: {} }));
  assert.throws(() => parseSubmission({ scenario: work, demo: "true" }));
});

test("numeric practical checks accept decimals and reject empty, nonfinite, exponent and hexadecimal inputs", () => {
  const scenario = SCENARIOS.find((role) => role.id === "product-analyst")!;
  const work = { kind: "scenario-v1" as const, roleId: scenario.id, answers: Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, field.answer])) };
  assert.equal(evaluateScenario({ ...work, answers: { ...work.answers, control: "10.00" } }).score, 100);
  for (const control of ["", "Infinity", "0xA", "1e1", "10%", "10abc"]) {
    assert.equal(evaluateScenario({ ...work, answers: { ...work.answers, control } }).score, 90);
  }
});
