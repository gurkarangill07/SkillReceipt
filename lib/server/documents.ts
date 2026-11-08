import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

export type JsonDocument = { value: unknown; version: string };
export interface JsonDocuments {
  readonly kind: "file" | "blob";
  read(name: string): Promise<JsonDocument | null>;
  list(): Promise<string[]>;
  /** Null means create only; a version means update exactly that version. */
  compareAndSet(name: string, value: unknown, version: string | null): Promise<boolean>;
}

const validName = (name: string) => name.trim() === name && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}\.json$/.test(name) && !name.includes("..");
function checkName(name: string) { if (!validName(name)) throw new Error("Invalid document name."); }
const MAX_DOCUMENT_BYTES = 1_048_576;
function encode(value: unknown): string {
  const body = JSON.stringify(value);
  if (typeof body !== "string" || Buffer.byteLength(body) > MAX_DOCUMENT_BYTES) throw new Error("Document exceeds the storage limit.");
  return body;
}
const digest = (body: string) => createHash("sha256").update(body, "utf8").digest("hex");
const writes = new Map<string, Promise<void>>();
async function locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = writes.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  writes.set(key, current);
  await previous;
  try { return await operation(); }
  finally { release(); if (writes.get(key) === current) writes.delete(key); }
}

/** Local persistence keeps the original on-disk layout and atomic file writes. */
export class FileJsonDocuments implements JsonDocuments {
  readonly kind = "file" as const;
  readonly directory: string;
  constructor(directory: string) { this.directory = path.resolve(directory); }
  async read(name: string): Promise<JsonDocument | null> {
    checkName(name);
    let body: string;
    try { body = await readFile(path.join(this.directory, name), "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    if (Buffer.byteLength(body) > MAX_DOCUMENT_BYTES) throw new Error("Stored document exceeds the storage limit.");
    return { value: JSON.parse(body), version: digest(body) };
  }
  async list(): Promise<string[]> {
    try { return (await readdir(this.directory)).filter(validName); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }
  async compareAndSet(name: string, value: unknown, version: string | null): Promise<boolean> {
    checkName(name);
    const body = encode(value);
    return locked(path.join(this.directory, name), async () => {
      const existing = await this.read(name);
      if ((existing?.version ?? null) !== version) return false;
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temporary = path.join(this.directory, `.${randomUUID()}.tmp`);
      let file;
      try {
        file = await open(temporary, "wx", 0o600);
        await file.writeFile(body, "utf8"); await file.sync();
        await file.close(); file = undefined;
        await rename(temporary, path.join(this.directory, name));
        return true;
      } finally { await file?.close(); await rm(temporary, { force: true }); }
    });
  }
}

type BlobRead = { statusCode: number; stream: ReadableStream<Uint8Array> | null; blob: { etag: string; size: number | null } };
export type BlobDocumentClient = {
  get(pathname: string, options: { access: "private"; useCache: false; abortSignal: AbortSignal }): Promise<BlobRead | null>;
  list(options: { prefix: string; cursor?: string; limit: number; abortSignal: AbortSignal }): Promise<{ blobs: { pathname: string }[]; hasMore: boolean; cursor?: string }>;
  put(pathname: string, body: string, options: { access: "private"; addRandomSuffix: false; allowOverwrite: boolean; ifMatch?: string; contentType: string; cacheControlMaxAge: number; abortSignal: AbortSignal }): Promise<unknown>;
  isConflict(error: unknown): boolean;
};

async function sdkClient(): Promise<BlobDocumentClient> {
  const sdk = await import("@vercel/blob");
  return {
    get: (pathname, options) => sdk.get(pathname, options),
    list: (options) => sdk.list(options),
    put: (pathname, body, options) => sdk.put(pathname, body, options),
    isConflict: (error) => error instanceof sdk.BlobPreconditionFailedError,
  };
}

/** Private JSON only: URLs and storage credentials never enter application views. */
export class BlobJsonDocuments implements JsonDocuments {
  readonly kind = "blob" as const;
  readonly prefix: string;
  private readonly client: Promise<BlobDocumentClient>;
  constructor(namespace: "receipts" | "people", client?: BlobDocumentClient) {
    this.prefix = `skillreceipt/v1/${namespace}/`;
    this.client = client ? Promise.resolve(client) : sdkClient();
  }
  async read(name: string): Promise<JsonDocument | null> {
    checkName(name);
    const result = await (await this.client).get(this.prefix + name, { access: "private", useCache: false, abortSignal: AbortSignal.timeout(15_000) });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream || !result.blob.etag || (result.blob.size ?? 0) > MAX_DOCUMENT_BYTES) throw new Error("Stored document is unavailable.");
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.byteLength;
        if (length > MAX_DOCUMENT_BYTES) throw new Error("Stored document exceeds the storage limit.");
        chunks.push(next.value);
      }
    } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), version: result.blob.etag };
  }
  async list(): Promise<string[]> {
    const client = await this.client;
    const names: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.list({ prefix: this.prefix, ...(cursor ? { cursor } : {}), limit: 1000, abortSignal: AbortSignal.timeout(15_000) });
      for (const blob of page.blobs) {
        if (!blob.pathname.startsWith(this.prefix)) continue;
        const name = blob.pathname.slice(this.prefix.length);
        if (validName(name)) names.push(name);
      }
      if (!page.hasMore) break;
      if (!page.cursor || page.cursor === cursor) throw new Error("Storage pagination did not advance.");
      cursor = page.cursor;
    } while (true);
    return names;
  }
  async compareAndSet(name: string, value: unknown, version: string | null): Promise<boolean> {
    checkName(name);
    const client = await this.client;
    try {
      await client.put(this.prefix + name, encode(value), { access: "private", addRandomSuffix: false, allowOverwrite: version !== null,
        ...(version !== null ? { ifMatch: version } : {}), contentType: "application/json", cacheControlMaxAge: 60, abortSignal: AbortSignal.timeout(15_000) });
      return true;
    } catch (error) {
      if (client.isConflict(error)) return false;
      // The SDK reports create-only collisions as a generic BlobError. Confirm
      // existence rather than depending on provider error-message wording.
      if (version === null && await this.read(name)) return false;
      throw error;
    }
  }
}

export function cloudStorageEnabled(): boolean {
  const enabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (process.env.VERCEL === "1" && !enabled) throw new Error("Vercel deployment requires a private Blob store connected through BLOB_READ_WRITE_TOKEN.");
  return enabled;
}

export const newCloudDocuments = (namespace: "receipts" | "people") => new BlobJsonDocuments(namespace);
