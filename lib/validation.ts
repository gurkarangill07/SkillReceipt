import type { DataRow, PipelineWork, SessionContext, Submission } from "./contracts";
import { PIPELINE_TASKS } from "./career";
import { getScenario } from "./scenarios";
import { parseAudit } from "./proctor-validation";

export class InputError extends Error {}
export const MAX_BODY_BYTES = 65_536;
export const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, label: string, max: number, nonempty = false): string => {
  if (typeof value !== "string" || value.length > max || (nonempty && value.length === 0)) {
    throw new InputError(`${label} must be ${nonempty ? "a nonempty string" : "a string"} of at most ${max} characters.`);
  }
  return value;
};

export function parseSession(value: unknown): SessionContext {
  if (!isRecord(value) || typeof value.mode !== "string" || !["camera", "practice", "presentation"].includes(value.mode) || typeof value.cameraStarted !== "boolean") throw new InputError("Choose a supported session mode.");
  const count = (key: string, optional = false): number | undefined => {
    const number = value[key];
    if (optional && number === undefined) return undefined;
    if (typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > 86_400) throw new InputError("Session counts must be bounded nonnegative integers.");
    return number;
  };
  if (value.mode === "camera" && !value.cameraStarted) throw new InputError("Start the camera before submitting a camera session.");
  if (value.fullscreenStarted !== undefined && typeof value.fullscreenStarted !== "boolean") throw new InputError("Fullscreen status must be a boolean.");
  if (value.sessionId !== undefined && (typeof value.sessionId !== "string" || !/^[a-f0-9-]{36}$/.test(value.sessionId))) throw new InputError("Invalid assessment session ID.");
  return { mode: value.mode as SessionContext["mode"], cameraStarted: value.cameraStarted, tabSwitches: count("tabSwitches")!, interruptions: count("interruptions")!, activeSeconds: count("activeSeconds")!,
    ...(value.focusLosses !== undefined ? { focusLosses: count("focusLosses", true)! } : {}),
    ...(value.pasteEvents !== undefined ? { pasteEvents: count("pasteEvents", true)! } : {}),
    ...(value.fullscreenExits !== undefined ? { fullscreenExits: count("fullscreenExits", true)! } : {}),
    ...(value.fullscreenStarted !== undefined ? { fullscreenStarted: value.fullscreenStarted } : {}),
    ...(value.sessionId !== undefined ? { sessionId: value.sessionId as string } : {}),
    ...(value.integrity !== undefined ? { integrity: parseAudit(value.integrity) } : {}) };
}

export function parseSubmission(value: unknown): Submission {
  if (!isRecord(value)) throw new InputError("Submit a JSON object containing rows and a CAD total.");
  const session = value.session === undefined ? undefined : parseSession(value.session);
  const sessionFields = session ? { session } : {};
  if (value.scenario !== undefined) {
    if (value.workSample !== undefined) throw new InputError("Submit one challenge at a time.");
    const work = value.scenario;
    if (!isRecord(work) || work.kind !== "scenario-v1" || typeof work.roleId !== "string" || !isRecord(work.answers)) throw new InputError("Choose a supported challenge.");
    const scenario = getScenario(work.roleId);
    if (!scenario) throw new InputError("Choose a supported challenge.");
    const answers: Record<string, string> = {};
    for (const field of [...scenario.questions, ...scenario.exercise]) {
      const answer = text(work.answers[field.id], field.label, 100, true);
      if (field.options && !field.options.some((option) => option.value === answer)) throw new InputError(`Choose an option for ${field.label}.`);
      answers[field.id] = answer;
    }
    if (value.demo !== undefined && typeof value.demo !== "boolean") throw new InputError("The demo marker must be a boolean.");
    return { rows: [], total: "", displayName: "", reflection: "", demo: value.demo === true || session?.mode === "presentation", scenario: { kind: "scenario-v1", roleId: scenario.id, answers }, ...sessionFields };
  }
  if (value.workSample !== undefined) {
    const work = value.workSample;
    if (!isRecord(work) || typeof work.kind !== "string" || !["data-pipeline-v1", "data-engineer-v2"].includes(work.kind) || !isRecord(work.answers) || !isRecord(work.session)) throw new InputError("Provide a supported work sample and session context.");
    const answers = {} as PipelineWork["answers"];
    for (const task of PIPELINE_TASKS) {
      if (work.kind === "data-engineer-v2" && !["key", "missing", "load"].includes(task.id)) continue;
      const answer = work.answers[task.id];
      if (typeof answer !== "string" || !task.options.some((option) => option.value === answer)) throw new InputError(`Choose an answer for ${task.label}.`);
      answers[task.id] = answer;
    }
    const context = parseSession(work.session);
    if (session && JSON.stringify(session) !== JSON.stringify(context)) throw new InputError("Session details must agree with the work sample.");
    if (value.demo !== undefined && typeof value.demo !== "boolean") throw new InputError("The demo marker must be a boolean.");
    const code = work.kind === "data-engineer-v2" ? text(work.code, "JavaScript code", 5000, true) : undefined;
    return { rows: [], total: "", displayName: value.displayName === undefined ? "" : text(value.displayName, "Display name", 60), reflection: value.reflection === undefined ? "" : text(value.reflection, "Reflection", 1500), demo: value.demo === true || context.mode === "presentation", workSample: { kind: work.kind as PipelineWork["kind"], answers, session: context, ...(code !== undefined ? { code } : {}) }, ...sessionFields };
  }
  if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 30) {
    throw new InputError("Submit between 1 and 30 rows.");
  }
  const rows: DataRow[] = value.rows.map((row: unknown, index: number) => {
    if (!isRecord(row)) throw new InputError(`Row ${index + 1} must be an object with four text fields.`);
    return {
      orderId: text(row.orderId, `Row ${index + 1} order ID`, 40),
      date: text(row.date, `Row ${index + 1} date`, 60),
      region: text(row.region, `Row ${index + 1} region`, 60),
      revenue: text(row.revenue, `Row ${index + 1} revenue`, 40),
    };
  });
  if (value.demo !== undefined && typeof value.demo !== "boolean") throw new InputError("The demo marker must be a boolean.");
  return {
    rows, total: text(value.total, "Total revenue", 40, true),
    displayName: value.displayName === undefined ? "" : text(value.displayName, "Display name", 60),
    reflection: value.reflection === undefined ? "" : text(value.reflection, "Reflection", 1500),
    demo: value.demo === true || session?.mode === "presentation", ...sessionFields,
  };
}

export function parseShare(value: unknown): boolean {
  if (!isRecord(value) || typeof value.enabled !== "boolean") throw new InputError("Provide enabled as true or false.");
  return value.enabled;
}

// Finish a small, bounded tail before rejecting a chunked upload. Cancelling the
// request mid-upload can otherwise race Next's HTTP response and stall the client.
async function drainRejectedTail(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (async () => {
        let bytes = 0;
        while (bytes <= MAX_BODY_BYTES) {
          const next = await reader.read();
          if (next.done) return;
          bytes += next.value.byteLength;
        }
      })(),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, 200); }),
    ]);
  } catch { /* Preserve the size-limit error if the sender disconnects. */ }
  finally { clearTimeout(timer); }
}

export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new InputError("Use Content-Type: application/json.");
  }
  if (!request.body) throw new InputError("A JSON request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await drainRejectedTail(reader);
        throw new InputError("Request exceeds the 64 KiB limit. Submit fewer or shorter fields.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown; }
    catch { throw new InputError("Request body must contain valid UTF-8 JSON."); }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
