import assert from "node:assert/strict";
import { test } from "node:test";
import { REFERENCE_ROWS } from "../../lib/assessment";
import { csvCell, rowsToCsv } from "../../lib/csv";
import { fingerprint, serializeArtifact } from "../../lib/fingerprint";
import { InputError, parseShare, parseSubmission, readJson } from "../../lib/validation";

const valid = () => ({ rows: REFERENCE_ROWS.map((row) => ({ ...row })), total: "1285.50", displayName: "", reflection: "", demo: false });
test("validator rejects invalid envelopes, row counts, fields, coercion, and bounds", () => {
  for (const value of [null, [], "text", {}, { ...valid(), rows: [] }, { ...valid(), rows: Array(31).fill(valid().rows[0]) },
    { ...valid(), rows: [null] }, { ...valid(), rows: [{ orderId: "R001" }] }, { ...valid(), total: 1285.5 },
    { ...valid(), total: "" }, { ...valid(), demo: "false" }, { ...valid(), displayName: null },
    { ...valid(), displayName: "a".repeat(61) }, { ...valid(), reflection: "a".repeat(1501) }, { ...valid(), total: "1".repeat(41) }]) assert.throws(() => parseSubmission(value), InputError);
  for (const [field, limit] of [["orderId", 40], ["date", 60], ["region", 60], ["revenue", 40]] as const) {
    const value = valid(); value.rows[0][field] = "a".repeat(limit + 1); assert.throws(() => parseSubmission(value), InputError);
    Object.assign(value.rows[0], { [field]: 1 }); assert.throws(() => parseSubmission(value), InputError);
  }
});
test("validator preserves incorrect work exactly, defaults optional context, strips privileges", () => {
  const value = valid(); value.rows[0].region = " ON "; value.rows[0].revenue = "";
  const result = parseSubmission({ ...value, evaluation: { score: 100 }, ownerHash: "forged", createdAt: "forged" });
  assert.deepEqual(result, value); assert.notEqual(result.rows[0], value.rows[0]);
  assert.equal(parseSubmission({ rows: value.rows, total: "wrong" }).displayName, "");
  assert.equal(parseSubmission({ rows: value.rows, total: "wrong" }).demo, false);
});
test("JSON reader enforces actual streamed bytes without trusting a fake Content-Length", async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(65_537)); }, cancel() { cancelled = true; } });
  const request = new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "1" }, body, duplex: "half" } as RequestInit);
  await assert.rejects(readJson(request), /64 KiB/); assert.equal(cancelled, true);
});
test("oversized upload drains only a bounded tail and still rejects instead of parsing", async () => {
  let pulled = 0;
  const body = new ReadableStream({ pull(controller) {
    pulled++;
    if (pulled === 1) controller.enqueue(new Uint8Array(65_537));
    else if (pulled === 2) controller.enqueue(new Uint8Array(1024));
    else controller.close();
  } });
  const request = new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body, duplex: "half" } as RequestInit);
  await assert.rejects(readJson(request), /64 KiB/);
  assert.equal(pulled, 3);
});
test("JSON reader handles exact cap and rejects malformed JSON, UTF8 and content type", async () => {
  const body = '{"a":"' + "x".repeat(65_528) + '"}'; assert.equal(Buffer.byteLength(body), 65_536);
  assert.ok(await readJson(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body })));
  for (const request of [new Request("http://localhost", { method: "POST", body: "{}" }), new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }), new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: new Uint8Array([0xff]) })]) await assert.rejects(readJson(request), InputError);
});
test("share validation requires a boolean", () => {
  assert.equal(parseShare({ enabled: true }), true); assert.equal(parseShare({ enabled: false }), false);
  for (const value of [null, {}, { enabled: "false" }, { enabled: 1 }]) assert.throws(() => parseShare(value), InputError);
});
test("fingerprint serialization has fixed keys and excludes metadata; exact artifact/order matters", () => {
  const first = valid(), other = valid();
  other.displayName = "Name"; other.reflection = "Private reflection"; other.demo = true;
  assert.equal(fingerprint(first), fingerprint(other));
  assert.deepEqual(Object.keys(JSON.parse(serializeArtifact(first))), ["assessmentVersion", "rubricVersion", "rows", "total"]);
  assert.deepEqual(Object.keys(JSON.parse(serializeArtifact(first)).rows[0]), ["orderId", "date", "region", "revenue"]);
  other.rows.reverse(); assert.notEqual(fingerprint(first), fingerprint(other));
  other.rows.reverse(); other.rows[0].revenue = "120"; assert.notEqual(fingerprint(first), fingerprint(other));
  assert.match(fingerprint(first), /^[a-f0-9]{64}$/);
});
test("CSV quotes/escapes actual cells and neutralizes formulas including hidden prefixes", () => {
  assert.equal(csvCell('a,"b"\n'), '"a,""b""\n"');
  for (const text of ["=1", "+1", "@SUM(1)", "-1", "  =1", "\t=1", "\rplain"]) assert.equal(csvCell(text), `"'${text}"`);
  const rows = valid().rows; rows[0].region = "my actual region";
  const csv = rowsToCsv(rows); assert.match(csv, /my actual region/); assert.equal(csv.split("\r\n").length, 11);
});
