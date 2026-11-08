import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { PeopleRepository } from "../../lib/server/people";
import { FileReceiptRepository, hashOwner } from "../../lib/server/store";
import { validSubmission } from "../helpers/fixtures";
import { SCENARIOS } from "../../lib/scenarios";

test("guest profile is browser-owned, private by default, persisted and requires a result before publishing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-people-"));
  try {
    const owner = hashOwner("a".repeat(64)), outsider = hashOwner("b".repeat(64));
    const people = new PeopleRepository(directory);
    const profile = await people.saveCandidate(owner, { name: "Jordan Example", resume: { name: "resume.txt", skills: ["SQL", "Python"] }, ownerHash: outsider, id: "forged", visible: false });
    assert.match(profile.id, /^SR-[A-F0-9]{10}$/);
    assert.equal(profile.visible, false);
    assert.ok(!JSON.stringify(profile).includes(owner));
    assert.equal(await people.getCandidateForOwner(outsider), null);
    assert.deepEqual(await new PeopleRepository(directory).getCandidateForOwner(owner), profile);
    assert.deepEqual(await people.searchCandidates(), []);
    assert.equal(await people.getCandidateReport(profile.id), null);
    await assert.rejects(people.saveCandidate(owner, { visible: true }), /Complete an exercise/);
    const persisted = JSON.parse(await readFile(path.join(directory, "people", `${owner}.json`), "utf8"));
    assert.equal(persisted.ownerHash, owner); assert.equal(persisted.name, profile.name);
    assert.equal(persisted.password, undefined); assert.equal(persisted.resumeText, undefined);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("employer search uses assessed skills, score and example filters; visibility controls all fresh reports", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-people-"));
  try {
    const owner = hashOwner("a".repeat(64)), receipts = new FileReceiptRepository(directory), people = new PeopleRepository(directory, receipts);
    const profile = await people.saveCandidate(owner, { name: "Jordan Example", resume: { name: "resume.txt", skills: ["UnassessedSpecialSkill", "Python"] } });
    const attempt = validSubmission(); attempt.demo = true;
    const receipt = await receipts.create(attempt, owner);
    await people.saveCandidate(owner, { visible: true });
    assert.equal((await people.searchCandidates({ q: "Data Analyst", minScore: 100 })).length, 1);
    assert.equal((await people.searchCandidates({ q: profile.id })).length, 1);
    assert.equal((await people.searchCandidates({ q: "UnassessedSpecialSkill" })).length, 0);
    assert.equal((await people.searchCandidates({ includeExamples: false })).length, 0);
    const entry = (await people.searchCandidates({ q: "reconciliation" }))[0];
    assert.equal(entry.topScore, 100); assert.equal(entry.examplesOnly, true); assert.equal(entry.assessments, 1);
    const report = await people.getCandidateReport(profile.id);
    assert.equal(report?.reports[0].fingerprint, receipt.fingerprint);
    const serialized = JSON.stringify(report);
    for (const secret of [receipt.id, "ownerHash", "shareToken", owner]) assert.ok(!serialized.includes(secret), secret);
    assert.equal(report!.reports[0].submission.demo, true);
    await people.saveCandidate(owner, { visible: false });
    assert.deepEqual(await people.searchCandidates(), []);
    assert.equal(await people.getCandidateReport(profile.id), null);
    assert.equal((await receipts.getOwner(receipt.id, owner))?.evaluation.score, 100);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("scenario records are searchable by their own role and skills with no invented score", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-people-"));
  try {
    const owner = hashOwner("c".repeat(64)), receipts = new FileReceiptRepository(directory), people = new PeopleRepository(directory, receipts);
    const profile = await people.saveCandidate(owner, { name: "Alex Example", resume: null });
    const scenario = SCENARIOS.find((role) => role.id === "qa-engineer")!;
    const answers = Object.fromEntries([...scenario.questions, ...scenario.exercise].map((field) => [field.id, field.answer]));
    answers.boundary = "0";
    await receipts.create({ rows: [], total: "", displayName: "", reflection: "", demo: false, scenario: { kind: "scenario-v1", roleId: scenario.id, answers } }, owner);
    await people.saveCandidate(owner, { visible: true });
    const matches = await people.searchCandidates({ q: "regression", minScore: 80, includeExamples: false });
    assert.equal(matches.length, 1); assert.equal(matches[0].topScore, 80); assert.equal(matches[0].examplesOnly, false);
    assert.equal((await people.searchCandidates({ q: "boundary" })).length, 0);
    assert.equal((await people.searchCandidates({ minScore: 81 })).length, 0);
    await receipts.create(validSubmission(), owner);
    assert.equal((await people.searchCandidates({ q: "QA Engineer", minScore: 90 })).length, 0);
    assert.equal((await people.searchCandidates({ q: "Data Analyst", minScore: 90 })).length, 1);
    assert.equal((await people.getCandidateReport(profile.id))?.reports.find((report) => report.submission.scenario)?.evaluation.score, 80);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("profile input validation blocks malformed records, invalid visibility and path selection", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-people-"));
  try {
    const people = new PeopleRepository(directory), owner = hashOwner("a".repeat(64));
    for (const input of [{}, { name: "" }, { name: "x".repeat(61) }, { name: "Example", visible: "true" }, { name: "Example", resume: { name: "resume.txt", skills: [42] } }]) await assert.rejects(people.saveCandidate(owner, input));
    assert.equal(await people.getCandidateForOwner("../secret"), null);
    assert.equal(await people.getCandidateReport("../../secret"), null);
    await assert.rejects(people.searchCandidates({ minScore: -1 }));
    await assert.rejects(people.searchCandidates({ q: "x".repeat(101) }));
    const candidate = await people.saveCandidate(owner, { name: "Example", resume: { name: "resume.txt", skills: ["SQL", "sql", "Python"] } });
    assert.deepEqual(candidate.resume?.skills, ["SQL", "Python"]);
    const [first, second] = await Promise.all([people.saveCandidate(owner, { name: "Updated" }), people.saveCandidate(owner, { resume: { name: "new.txt", skills: ["JavaScript"] } })]);
    assert.equal(first.id, second.id);
    const final = await people.getCandidateForOwner(owner); assert.equal(final?.name, "Updated"); assert.equal(final?.resume?.name, "new.txt");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
