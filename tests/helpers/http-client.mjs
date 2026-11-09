import assert from "node:assert/strict";

export class CookieClient {
  #cookies = new Map();
  constructor(origin) { this.origin = origin; }

  get cookieHeader() {
    return [...this.#cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  async request(path, init = {}) {
    const headers = new Headers(init.headers);
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);
    if (init.method && !["GET", "HEAD"].includes(init.method.toUpperCase()) && !headers.has("Origin")) {
      headers.set("Origin", this.origin);
    }
    const response = await fetch(new URL(path, this.origin), {
      ...init, headers, redirect: "manual", signal: init.signal ?? AbortSignal.timeout(60_000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const split = pair.indexOf("=");
      if (split > 0) this.#cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    return response;
  }

  json(path, body, headers = {}) {
    return this.request(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  }
}

// HTTP tests report synthetic observations explicitly; browser tests run the real detector.
export async function monitoredSubmission(client, input, kinds = []) {
  const body = structuredClone(input);
  if (body.demo || body.session?.mode === "presentation" || body.workSample?.session?.mode === "presentation") return body;
  const state = { camera: true, fullscreen: true, focused: true, visible: true, detector: true, faces: 1, paused: false };
  const exercise = body.scenario?.roleId ?? (body.workSample ? "junior-data-engineer" : "junior-data-analyst");
  const start = await client.json("/api/assessment-sessions", { consent: true, exercise, state });
  assert.equal(start.status, 201, await start.clone().text());
  const { id } = await start.json();
  if (kinds.length) {
    const sent = await client.json(`/api/assessment-sessions/${id}`, { state, events: kinds.map((kind, index) => ({ seq: index + 1, kind, elapsedMs: 0 })) });
    assert.equal(sent.status, 200, await sent.clone().text());
  }
  body.session = { mode: "camera", cameraStarted: true, fullscreenStarted: true, tabSwitches: 0, interruptions: 0, activeSeconds: 0, sessionId: id };
  if (body.workSample) body.workSample.session = body.session;
  body.sessionSequence = kinds.length;
  return body;
}

export function assertPrivate(response) {
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
}

export async function expectError(response, status) {
  assert.equal(response.status, status);
  assertPrivate(response);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.ok(!/stack trace|at \S+ \(|\/Users\/|ownerHash|ECONNREFUSED/i.test(body.error));
  return body;
}

export function assertSafeEvidence(evidence, secrets = []) {
  assert.deepEqual(Object.keys(evidence).sort(), [
    "assessmentVersion", "createdAt", "evaluation", "fingerprint", "rubricVersion", "submission",
  ]);
  const inspect = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!/^(owner|ownerHash|ownerToken|sessionId|sessionToken|sessionHash|shareToken|advice|coaching)$/i.test(key), `Private field ${key}`);
      inspect(child);
    }
  };
  inspect(evidence);
  const serialized = JSON.stringify(evidence);
  for (const secret of secrets.filter(Boolean)) assert.ok(!serialized.includes(secret), "Evidence contains a capability/ownership value");
}

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\r" && text[i + 1] === "\n") { /* CSV record separator, outside quotes. */ }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  assert.equal(quoted, false, "Unterminated CSV quote");
  return rows;
}
