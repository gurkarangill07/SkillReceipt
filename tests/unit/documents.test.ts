import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { BlobJsonDocuments, FileJsonDocuments, cloudStorageEnabled, type BlobDocumentClient } from "../../lib/server/documents";
import { FileReceiptRepository, hashOwner } from "../../lib/server/store";
import { PeopleRepository } from "../../lib/server/people";
import { validSubmission } from "../helpers/fixtures";

class Conflict extends Error {}
class MemoryBlob implements BlobDocumentClient {
  readonly values = new Map<string, { body: string; version: string }>();
  readonly reads: string[] = [];
  readonly puts: Parameters<BlobDocumentClient["put"]>[2][] = [];
  readonly cursors: (string | undefined)[] = [];
  private version = 0;
  async get(name: string, options: Parameters<BlobDocumentClient["get"]>[1]) {
    assert.equal(options.access, "private"); assert.equal(options.useCache, false); assert.ok(options.abortSignal);
    assert.deepEqual(options.headers, { "Accept-Encoding": "identity" });
    this.reads.push(name);
    const value = this.values.get(name);
    return value ? { statusCode: 200, stream: new Response(value.body).body!, blob: { etag: value.version, size: Buffer.byteLength(value.body) } } : null;
  }
  async put(name: string, body: string, options: Parameters<BlobDocumentClient["put"]>[2]) {
    assert.equal(options.access, "private"); assert.equal(options.addRandomSuffix, false); assert.equal(options.contentType, "application/json");
    this.puts.push(options);
    const value = this.values.get(name);
    if ((!options.allowOverwrite && value) || (options.ifMatch !== undefined && options.ifMatch !== value?.version)) throw new Conflict();
    this.values.set(name, { body, version: `etag-${++this.version}` });
    return {};
  }
  async list(options: Parameters<BlobDocumentClient["list"]>[0]) {
    this.cursors.push(options.cursor);
    const names = [...this.values.keys()].filter((name) => name.startsWith(options.prefix)).sort();
    const start = Number(options.cursor ?? 0);
    const page = names.slice(start, start + 2);
    const hasMore = start + 2 < names.length;
    return { blobs: page.map((pathname) => ({ pathname })), hasMore, ...(hasMore ? { cursor: String(start + 2) } : {}) };
  }
  isConflict(error: unknown): boolean { return error instanceof Conflict; }
}

test("file documents preserve atomic files and reject stale versions or traversal", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "skillreceipt-documents-"));
  try {
    const a = new FileJsonDocuments(directory), b = new FileJsonDocuments(directory);
    assert.equal(await a.compareAndSet("profile.json", { name: "Before" }, null), true);
    const before = await b.read("profile.json");
    assert.equal(await b.compareAndSet("profile.json", { name: "Duplicate" }, null), false);
    assert.equal(await b.compareAndSet("profile.json", { name: "After" }, before!.version), true);
    assert.equal(await a.compareAndSet("profile.json", { name: "Lost update" }, before!.version), false);
    assert.deepEqual((await a.read("profile.json"))?.value, { name: "After" });
    assert.deepEqual(await readdir(directory), ["profile.json"]);
    for (const name of ["../secret.json", "..\\secret.json", "/absolute.json", "a/hidden.json"]) {
      await assert.rejects(a.read(name), /Invalid document/);
      await assert.rejects(a.compareAndSet(name, {}, null), /Invalid document/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("private Blob records use consistent reads, conditional updates and complete pagination", async () => {
  const client = new MemoryBlob(), records = new BlobJsonDocuments("receipts", client);
  for (let index = 0; index < 5; index++) assert.equal(await records.compareAndSet(`record-${index}.json`, { index }, null), true);
  const first = await records.read("record-0.json");
  assert.equal(await records.compareAndSet("record-0.json", { index: 5 }, first!.version), true);
  assert.equal(await records.compareAndSet("record-0.json", { index: 99 }, first!.version), false);
  assert.deepEqual((await records.read("record-0.json"))?.value, { index: 5 });
  assert.equal(await records.compareAndSet("record-0.json", { index: 99 }, null), false);
  assert.deepEqual(await records.list(), Array.from({ length: 5 }, (_, index) => `record-${index}.json`));
  assert.deepEqual(client.cursors, [undefined, "2", "4"]);
  assert.equal(client.puts[0].allowOverwrite, false); assert.equal(client.puts[0].ifMatch, undefined);
  assert.equal(client.puts[5].allowOverwrite, true); assert.equal(client.puts[5].ifMatch, first!.version);
  await assert.rejects(records.compareAndSet("../private.json", {}, null), /Invalid document/);
  await assert.rejects(records.compareAndSet("large.json", "x".repeat(1_048_577), null), /storage limit/);
});

test("provider create collision is confirmed without relying on error text, while service failures propagate", async () => {
  const client = new MemoryBlob(), documents = new BlobJsonDocuments("people", client);
  await documents.compareAndSet("candidate.json", { version: 1 }, null);
  client.isConflict = () => false;
  assert.equal(await documents.compareAndSet("candidate.json", { version: 2 }, null), false);
  client.put = async () => { throw new Error("Simulated service unavailable"); };
  await assert.rejects(documents.compareAndSet("missing.json", {}, null), /Simulated service unavailable/);
});

test("independent cloud repositories preserve scoring, private ownership and immediate sharing revocation", async () => {
  const client = new MemoryBlob();
  const a = new FileReceiptRepository("/simulated-function-a", new BlobJsonDocuments("receipts", client));
  const b = new FileReceiptRepository("/simulated-function-b", new BlobJsonDocuments("receipts", client));
  const owner = hashOwner("a".repeat(64)), outsider = hashOwner("b".repeat(64));
  const receipt = await a.create(validSubmission(), owner);
  assert.equal(receipt.evaluation.score, 100);
  assert.deepEqual(await b.getOwner(receipt.id, owner), receipt);
  assert.equal(await b.getOwner(receipt.id, outsider), null);
  const [first, same] = await Promise.all([a.setSharing(receipt.id, owner, true), b.setSharing(receipt.id, owner, true)]);
  assert.ok(first?.shareToken); assert.equal(same?.shareToken, first.shareToken);
  assert.ok(await b.getShared(first.shareToken));
  await a.setSharing(receipt.id, owner, false);
  assert.equal(await b.getShared(first.shareToken), null);
  const second = await b.setSharing(receipt.id, owner, true);
  assert.notEqual(second?.shareToken, first.shareToken);
  assert.equal((await a.getOwner(receipt.id, owner))?.fingerprint, receipt.fingerprint);
});

test("cloud profile CAS merges concurrent changes across functions and revokes employer discovery immediately", async () => {
  const client = new MemoryBlob();
  const receipts = new FileReceiptRepository("/simulated-receipts", new BlobJsonDocuments("receipts", client));
  const a = new PeopleRepository("/simulated-people-a", receipts, new BlobJsonDocuments("people", client));
  const b = new PeopleRepository("/simulated-people-b", receipts, new BlobJsonDocuments("people", client));
  const owner = hashOwner("c".repeat(64));
  const [createdA, createdB] = await Promise.all([a.saveCandidate(owner, { name: "Cloud Example" }), b.saveCandidate(owner, { name: "Cloud Example" })]);
  assert.equal(createdA.id, createdB.id);
  await Promise.all([a.saveCandidate(owner, { name: "Updated Name" }), b.saveCandidate(owner, { resume: { name: "resume.txt", skills: ["SQL"] } })]);
  const profile = await a.getCandidateForOwner(owner);
  assert.equal(profile?.name, "Updated Name"); assert.equal(profile?.resume?.name, "resume.txt");
  await receipts.create(validSubmission(), owner);
  await a.saveCandidate(owner, { visible: true });
  assert.equal((await b.searchCandidates()).length, 1);
  assert.ok(await b.getCandidateReport(profile!.id));
  await a.saveCandidate(owner, { visible: false });
  assert.deepEqual(await b.searchCandidates(), []);
  assert.equal(await b.getCandidateReport(profile!.id), null);
});

test("cloud repository mutation retries are bounded and never silently claim success", async () => {
  const client = new MemoryBlob();
  const records = new BlobJsonDocuments("receipts", client);
  const receipts = new FileReceiptRepository("/simulated-conflicts", records);
  const owner = hashOwner("a".repeat(64)), receipt = await receipts.create(validSubmission(), owner);
  const put = client.put.bind(client);
  let updates = 0;
  client.put = async (name, body, options) => { if (options.ifMatch) { updates++; throw new Conflict(); } return put(name, body, options); };
  await assert.rejects(receipts.setSharing(receipt.id, owner, true), /changed concurrently/);
  assert.equal(updates, 5);
  assert.equal((await receipts.getOwner(receipt.id, owner))?.shareToken, null);
});

test("Vercel requires explicit durable storage instead of falling back to local temporary files", () => {
  const oldVercel = process.env.VERCEL, oldToken = process.env.BLOB_READ_WRITE_TOKEN;
  try {
    delete process.env.BLOB_READ_WRITE_TOKEN; process.env.VERCEL = "1";
    assert.throws(cloudStorageEnabled, /requires a private Blob store/);
    process.env.BLOB_READ_WRITE_TOKEN = "test-only-token"; assert.equal(cloudStorageEnabled(), true);
    delete process.env.BLOB_READ_WRITE_TOKEN; delete process.env.VERCEL; assert.equal(cloudStorageEnabled(), false);
  } finally {
    if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel;
    if (oldToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = oldToken;
  }
});
