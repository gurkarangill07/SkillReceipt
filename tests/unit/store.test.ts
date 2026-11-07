import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { REFERENCE_ROWS } from "../../lib/assessment";
import { FileReceiptRepository, hashOwner, validId, validToken } from "../../lib/server/store";

const valid = () => ({ rows: REFERENCE_ROWS.map((row) => ({ ...row })), total: "1285.50", displayName: "", reflection: "", demo: true });
const ownerToken = "a".repeat(64), owner = hashOwner(ownerToken), outsider = hashOwner("b".repeat(64));

test("private receipt persists atomically, separates owners and exposes safe shapes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-store-"));
  try {
    const repository = new FileReceiptRepository(directory);
    const input = valid(), before = structuredClone(input);
    const receipt = await repository.create(input, owner);
    assert.deepEqual(input, before); assert.equal(receipt.evaluation.score, 100); assert.equal(receipt.shareToken, null);
    assert.ok(validId(receipt.id)); assert.equal(await repository.getOwner(receipt.id, outsider), null);
    assert.deepEqual(await repository.listOwner(outsider), []);
    assert.equal(await repository.setSharing(receipt.id, outsider, true), null);
    assert.deepEqual(await repository.getOwner(receipt.id, owner), receipt);
    const json = JSON.stringify(receipt); assert.ok(!json.includes("ownerHash") && !json.includes(ownerToken) && !json.includes(owner));
    const files = await readdir(directory); assert.deepEqual(files, [`${receipt.id}.json`]);
    const stored = await readFile(path.join(directory, files[0]), "utf8");
    assert.ok(stored.includes(owner) && !stored.includes(ownerToken));
    if (process.platform !== "win32") assert.equal((await stat(path.join(directory, files[0]))).mode & 0o777, 0o600);
    const fresh = new FileReceiptRepository(directory); assert.deepEqual(await fresh.getOwner(receipt.id, owner), receipt);
    const list = await fresh.listOwner(owner); assert.equal(list.length, 1); assert.equal(list[0].demo, true);
    assert.ok(!JSON.stringify(list).includes("shareToken") && !JSON.stringify(list).includes(owner));
    input.rows[0].revenue = "0"; assert.deepEqual(await fresh.getOwner(receipt.id, owner), receipt);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("share capabilities revoke, rotate, survive new repositories and never alter evidence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-sharing-"));
  try {
    const repository = new FileReceiptRepository(directory);
    const receipt = await repository.create(valid(), owner);
    const first = await repository.setSharing(receipt.id, owner, true);
    assert.ok(first?.shareToken && validToken(first.shareToken));
    assert.deepEqual(await repository.setSharing(receipt.id, owner, true), first);
    const publicView = await new FileReceiptRepository(directory).getShared(first.shareToken);
    const { id: _id, shareToken: _token, ...expected } = receipt;
    assert.deepEqual(publicView, expected);
    const output = JSON.stringify(publicView);
    for (const privateValue of [receipt.id, first.shareToken, owner, "ownerHash", "advice"]) assert.ok(!output.includes(privateValue));
    await repository.setSharing(receipt.id, owner, false);
    assert.equal(await repository.getShared(first.shareToken), null);
    const second = await repository.setSharing(receipt.id, owner, true);
    assert.notEqual(second?.shareToken, first.shareToken);
    assert.equal(await repository.getShared(first.shareToken), null);
    assert.deepEqual(await repository.getOwner(receipt.id, owner), { ...receipt, shareToken: second!.shareToken });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("concurrent operations across repository instances are serialized with no lost sharing updates", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-concurrency-"));
  try {
    const a = new FileReceiptRepository(directory), b = new FileReceiptRepository(directory);
    const receipts = await Promise.all(Array.from({ length: 12 }, (_, index) => (index % 2 ? a : b).create(valid(), owner)));
    assert.equal(new Set(receipts.map((receipt) => receipt.id)).size, 12);
    const id = receipts[0].id;
    const operations = await Promise.all([a.setSharing(id, owner, true), b.setSharing(id, owner, false), a.setSharing(id, owner, true)]);
    assert.ok(operations[0]?.shareToken); assert.equal(operations[1]?.shareToken, null); assert.ok(operations[2]?.shareToken);
    assert.notEqual(operations[0]?.shareToken, operations[2]?.shareToken);
    assert.equal((await a.getOwner(id, owner))?.shareToken, operations[2]?.shareToken);
    assert.equal((await a.listOwner(owner)).length, 12);
    assert.equal((await readdir(directory)).some((file) => file.endsWith(".tmp")), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("invalid tokens and paths cannot select files; corrupt evidence fails without repair", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-invalid-"));
  try {
    const repository = new FileReceiptRepository(directory);
    for (const value of ["../secret", "..%2fsecret", "", "a".repeat(64) + "\n", "not-a-token"]) {
      assert.equal(await repository.getOwner(value, owner), null);
      assert.equal(await repository.getShared(value), null);
    }
    await assert.rejects(repository.create(valid(), "invalid"));
    assert.deepEqual(await readdir(directory), []);
    const receipt = await repository.create(valid(), owner);
    const filename = path.join(directory, `${receipt.id}.json`);
    const raw = JSON.parse(await readFile(filename, "utf8")); raw.evaluation.score = 42;
    const corrupt = JSON.stringify(raw); await writeFile(filename, corrupt);
    await assert.rejects(repository.getOwner(receipt.id, owner), /inconsistent/);
    assert.equal(await readFile(filename, "utf8"), corrupt);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
