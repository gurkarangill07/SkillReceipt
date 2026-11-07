import type { DataRow, Submission } from "./contracts";

export class InputError extends Error {}
export const MAX_BODY_BYTES = 65_536;
export const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, label: string, max: number, nonempty = false): string => {
  if (typeof value !== "string" || value.length > max || (nonempty && value.length === 0)) {
    throw new InputError(`${label} must be ${nonempty ? "a nonempty string" : "a string"} of at most ${max} characters.`);
  }
  return value;
};

export function parseSubmission(value: unknown): Submission {
  if (!isRecord(value)) throw new InputError("Submit a JSON object containing rows and a CAD total.");
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
    demo: value.demo ?? false,
  };
}

export function parseShare(value: unknown): boolean {
  if (!isRecord(value) || typeof value.enabled !== "boolean") throw new InputError("Provide enabled as true or false.");
  return value.enabled;
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
      if (length > MAX_BODY_BYTES) throw new InputError("Request exceeds the 64 KiB limit. Submit fewer or shorter fields.");
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
