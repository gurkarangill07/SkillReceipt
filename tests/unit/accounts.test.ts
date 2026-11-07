import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { AccountStore } from "../../lib/server/accounts";
import { hashOwner } from "../../lib/server/store";

const details = (email: string, role = "candidate") => ({ name: "Synthetic Applicant", email, password: "test-only-password-2026", role });
test("accounts persist password/session hashes, recover candidate ownership on login, and revoke sessions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "skillreceipt-accounts-"));
  try {
    const store = new AccountStore(root);
    const registered = await store.signIn(details("candidate@example.invalid"), true, "a".repeat(64));
    assert.equal(registered.account.visible, false);
    assert.match(registered.account.candidateId, /^SR-[A-F0-9]{10}$/);
    assert.equal(await store.owner(registered.token), hashOwner("a".repeat(64)));
    const disk = await readFile(path.join(store.directory, "state.json"), "utf8");
    assert.ok(!disk.includes(details("").password) && !disk.includes(registered.token));
    assert.ok(!JSON.stringify(registered.account).includes("passwordHash"));
    assert.ok(await new AccountStore(root).account(registered.token));
    await assert.rejects(store.signIn({ ...details("candidate@example.invalid"), password: "wrong-password-2026" }, false));
    await assert.rejects(store.signIn(details("candidate@example.invalid", "employer"), false));
    await assert.rejects(store.signIn(details("CANDIDATE@example.invalid"), true));
    const signed = await store.signIn(details("candidate@example.invalid"), false);
    assert.equal(signed.account.candidateId, registered.account.candidateId);
    assert.equal(await store.owner(signed.token), await store.owner(registered.token));
    await store.logout(registered.token); assert.equal(await store.account(registered.token), null);
    const state = JSON.parse(await readFile(path.join(store.directory, "state.json"), "utf8"));
    state.sessions[createHash("sha256").update(signed.token).digest("hex")].expires = Date.now() - 1;
    await writeFile(path.join(store.directory, "state.json"), JSON.stringify(state));
    assert.equal(await store.account(signed.token), null);
    assert.equal(await store.requiresAccount(hashOwner("a".repeat(64))), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("résumé and ID lookup require employer role and candidate opt-in; revocation blocks both", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "skillreceipt-profile-"));
  try {
    const store = new AccountStore(root);
    const candidate = await store.signIn(details("person@example.invalid"), true);
    const employer = await store.signIn(details("employer@example.invalid", "employer"), true);
    assert.equal(await store.owner(employer.token), null);
    const bytes = new TextEncoder().encode("SYNTHETIC RESUME SQL Python");
    await store.saveResume(candidate.token, bytes, { name: "demo.txt", skills: ["SQL", "Python"] });
    assert.equal(await store.candidate(employer.token, candidate.account.candidateId), null);
    await assert.rejects(store.candidate(candidate.token, candidate.account.candidateId));
    await assert.rejects(store.saveResume(employer.token, bytes, { name: "demo.txt", skills: [] }));
    await assert.rejects(store.visibility(employer.token, true));
    await store.visibility(candidate.token, true);
    const found = await store.candidate(employer.token, candidate.account.candidateId);
    assert.equal(found?.profile.name, candidate.account.name);
    assert.ok(!("email" in found!.profile));
    assert.equal((await store.resume(employer.token, candidate.account.candidateId))?.bytes.toString(), "SYNTHETIC RESUME SQL Python");
    await store.visibility(candidate.token, false);
    assert.equal(await store.candidate(employer.token, candidate.account.candidateId), null);
    assert.equal(await store.resume(employer.token, candidate.account.candidateId), null);
    assert.ok(await store.resume(candidate.token));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("a browser ownership token can bind to only one account", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "skillreceipt-account-bind-"));
  try {
    const store = new AccountStore(root), token = "b".repeat(64);
    const first = await store.signIn(details("first@example.invalid"), true, token);
    const second = await store.signIn(details("second@example.invalid"), true, token);
    assert.notEqual(await store.owner(first.token), await store.owner(second.token));
  } finally { await rm(root, { recursive: true, force: true }); }
});
