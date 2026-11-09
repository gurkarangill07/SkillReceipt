import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { NextRequest } from "next/server";
import type { SessionContext, Submission } from "../../lib/contracts";
import { parseSession, parseSubmission } from "../../lib/validation";
import { SCENARIOS, evaluateScenario, toClientScenario } from "../../lib/scenarios";
import { PIPELINE_TASKS, evaluateEngineer } from "../../lib/career";
import { CODING_STARTER } from "../../lib/coding";
import { evaluate } from "../../lib/evaluate";
import { fingerprint } from "../../lib/fingerprint";
import { FileReceiptRepository, hashOwner } from "../../lib/server/store";
import { recommendExercises } from "../../lib/recommendations";
import { detectResumeSkills } from "../../lib/resume";
import { validSubmission } from "../helpers/fixtures";
import { POST as examplePost } from "../../app/api/challenges/[role]/example/route";
import { CODING_EXAMPLE } from "../../lib/coding";

const session = (): SessionContext => ({ mode: "practice", cameraStarted: false, tabSwitches: 0, interruptions: 0, activeSeconds: 30 });
const cameraSession = (): SessionContext => ({ mode: "camera", cameraStarted: true, tabSwitches: 3, interruptions: 1, activeSeconds: 126, focusLosses: 4, pasteEvents: 2, fullscreenExits: 1, fullscreenStarted: true });
const scenarioSubmission = (): Submission => {
  const scenario = SCENARIOS.find((role) => role.id === "qa-engineer")!;
  return { rows: [], total: "", displayName: "", reflection: "", demo: false, scenario: { kind: "scenario-v1", roleId: scenario.id, answers: Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, field.answer])) } };
};
const engineerSubmission = (): Submission => ({ rows: [], total: "", displayName: "", reflection: "", demo: false, workSample: { kind: "data-engineer-v2", answers: { key: "order_id", missing: "quarantine", load: "upsert" }, code: CODING_STARTER, session: session() } });

test("session reports preserve bounded camera/focus/paste/fullscreen observations and strip unrelated fields", () => {
  const context = cameraSession();
  assert.deepEqual(parseSession({ ...context, video: "never save frames", microphone: true, browserHistory: ["private"] }), context);
  const legacy = session();
  assert.deepEqual(parseSession(legacy), legacy);
  for (const key of ["focusLosses", "pasteEvents", "fullscreenExits", "fullscreenStarted"]) assert.ok(!(key in parseSession(legacy)));
  assert.equal(parseSession({ ...context, activeSeconds: 86_400 }).activeSeconds, 86_400);
});

test("session validation rejects unsupported modes, malformed flags, missing counts and noninteger/out-of-range counts", () => {
  for (const mode of ["proctored", "", 1, null, ["practice"], { mode: "practice" }]) assert.throws(() => parseSession({ ...session(), mode }), `mode ${JSON.stringify(mode)}`);
  for (const flag of ["true", 1, null, [], {}]) {
    assert.throws(() => parseSession({ ...session(), cameraStarted: flag }));
    assert.throws(() => parseSession({ ...session(), fullscreenStarted: flag }));
  }
  assert.throws(() => parseSession({ ...session(), mode: "camera" }));
  for (const key of ["tabSwitches", "interruptions", "activeSeconds", "focusLosses", "pasteEvents", "fullscreenExits"]) {
    for (const value of [-1, 86_401, 0.5, "1", null, true, NaN, Infinity]) assert.throws(() => parseSession({ ...session(), [key]: value }), `${key}: ${String(value)}`);
  }
  for (const key of ["tabSwitches", "interruptions", "activeSeconds"]) {
    const input: Record<string, unknown> = session(); delete input[key]; assert.throws(() => parseSession(input));
  }
});

test("presentation sessions force example disclosure across sales, scenario and engineering submissions", () => {
  for (const make of [validSubmission, scenarioSubmission, engineerSubmission]) {
    const input = make();
    input.session = { ...session(), mode: "presentation" };
    if (input.workSample) input.workSample.session = input.session;
    input.demo = false;
    assert.equal(parseSubmission(input).demo, true);
  }
});

test("engineering rejects conflicting outer/inner observations and malformed work kinds", () => {
  const input = engineerSubmission(); input.session = session();
  assert.deepEqual(parseSubmission(input).session, session());
  for (const changes of [{ tabSwitches: 1 }, { activeSeconds: 31 }, { focusLosses: 0 }, { mode: "presentation" }, { cameraStarted: true }]) assert.throws(() => parseSubmission({ ...input, session: { ...input.session, ...changes } }));
  const legacyPipeline = { kind: "data-pipeline-v1", answers: Object.fromEntries(PIPELINE_TASKS.map((field) => [field.id, field.correct])), session: session() };
  assert.throws(() => parseSubmission({ workSample: { ...legacyPipeline, kind: ["data-pipeline-v1"] } }));
  assert.throws(() => parseSubmission({ workSample: { ...legacyPipeline, kind: { name: "data-pipeline-v1" } } }));
});

test("session observations do not influence task scores or assessed artifact fingerprints", () => {
  const makers = [validSubmission, scenarioSubmission, engineerSubmission];
  for (const make of makers) {
    const plain = parseSubmission(make()), observed = structuredClone(plain);
    observed.session = cameraSession();
    if (observed.workSample) observed.workSample.session = cameraSession();
    const clean = parseSubmission(observed);
    assert.equal(fingerprint(clean), fingerprint(plain));
    const score = (input: Submission) => input.scenario ? evaluateScenario(input.scenario) : input.workSample ? evaluateEngineer(input.workSample, { passed: 2, tests: [{ label: "Ordinary amounts", passed: false }, { label: "Empty list", passed: true }, { label: "Missing amounts", passed: false }, { label: "Genuine zero", passed: true }] }) : evaluate(input);
    assert.deepEqual(score(clean), score(plain));
  }
});

test("legacy receipts reopen without invented monitoring fields; new observations persist in reports", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-session-"));
  try {
    const owner = hashOwner("a".repeat(64)), repository = new FileReceiptRepository(directory);
    for (const make of [validSubmission, scenarioSubmission, engineerSubmission]) {
      const input = make();
      const legacy = await repository.create(input, owner);
      const restored = await new FileReceiptRepository(directory).getOwner(legacy.id, owner);
      assert.deepEqual(restored, legacy);
      assert.equal(restored!.submission.session, undefined);
      if (restored!.submission.workSample) assert.equal(restored!.submission.workSample.session.fullscreenStarted, undefined);
      const observed = structuredClone(input); observed.session = cameraSession();
      if (observed.workSample) observed.workSample.session = cameraSession();
      const current = await repository.create(observed, owner);
      const reopened = await new FileReceiptRepository(directory).getOwner(current.id, owner);
      assert.deepEqual(reopened!.submission.session, cameraSession());
      assert.equal(reopened!.fingerprint, legacy.fingerprint);
      assert.equal(reopened!.evaluation.score, legacy.evaluation.score);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("normal client scenario payloads omit answer keys and feedback while retaining usable choices", () => {
  for (const scenario of SCENARIOS) {
    const client = toClientScenario(scenario);
    for (const field of [...client.questions, ...client.exercise]) {
      assert.ok(!("answer" in field) && !("rule" in field) && !("practice" in field));
      assert.ok(field.id && field.label && field.prompt);
    }
    assert.equal(client.questions.length, 3); assert.equal(client.exercise.length, 4);
    assert.deepEqual(client.questions[0].options, scenario.questions[0].options);
    assert.equal(client.artifact, scenario.artifact);
    assert.ok(!JSON.stringify(client).includes('"answer":'));
  }
});

test("resume recommendations use actual frontend, QA and security keywords; unknown skills stay unmatched", () => {
  const examples = [
    { text: "Frontend developer: React JavaScript HTML CSS TypeScript Accessibility", role: "frontend-developer", match: "React" },
    { text: "QA specialist: Testing Jest Cypress Playwright", role: "qa-engineer", match: "Playwright" },
    { text: "Cybersecurity: incident response, phishing, networks and Security", role: "security-analyst", match: "Incident response" },
  ];
  for (const example of examples) {
    const skills = detectResumeSkills(example.text), recommendations = recommendExercises(skills);
    assert.equal(recommendations[0].id, example.role);
    assert.ok(recommendations[0].matchedSkills.includes(example.match));
  }
  const unknown = recommendExercises(detectResumeSkills("Sculpture and ceramic glazing"));
  assert.equal(unknown.length, 6); assert.ok(unknown.every((exercise) => exercise.matchedSkills.length === 0));
  assert.deepEqual(detectResumeSkills("JavaScripted, Reactivity and Playwrightish"), []);
  assert.equal(recommendExercises(["react", "HTML"])[0].id, "frontend-developer");
});

test("worked-example endpoints disclose examples and return usable scenario answers without changing normal client payloads", async () => {
  for (const scenario of SCENARIOS) {
    const request = new NextRequest(`http://localhost:3000/api/challenges/${scenario.id}/example`, { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: "{}" });
    const response = await examplePost(request, { params: Promise.resolve({ role: scenario.id }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.demo, true);
    assert.equal(evaluateScenario({ kind: "scenario-v1", roleId: scenario.id, answers: result.answers }).score, 100);
    assert.ok(!JSON.stringify(toClientScenario(scenario)).includes('"answer":'));
  }
});

test("engineering example supports partial starter/full solution, rejects cross-origin requests and unknown roles", async () => {
  const request = (origin = "http://localhost:3000", body = "{}") => new NextRequest("http://localhost:3000/api/challenges/junior-data-engineer/example", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body });
  const params = { params: Promise.resolve({ role: "junior-data-engineer" }) };
  const starter = await (await examplePost(request(), params)).json();
  const full = await (await examplePost(request("http://localhost:3000", '{"solution":true}'), params)).json();
  assert.equal(starter.code, CODING_STARTER); assert.equal(full.code, CODING_EXAMPLE);
  assert.equal(starter.demo, true); assert.equal(full.demo, true);
  assert.deepEqual(starter.answers, { key: "order_id", missing: "quarantine", load: "upsert" });
  assert.equal((await examplePost(request("https://other.invalid"), params)).status, 400);
  assert.equal((await examplePost(request(), { params: Promise.resolve({ role: "not-a-role" }) })).status, 404);
});
