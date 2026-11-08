import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { ASSESSMENT_VERSION, RUBRIC_VERSION } from "../assessment";
import type { OwnerReceipt, ReceiptEvidence, ReceiptSummary, Submission } from "../contracts";
import { evaluate } from "../evaluate";
import { CODING_VERSION, CODING_RUBRIC_VERSION, evaluateEngineer, evaluatePipeline, PIPELINE_VERSION, PIPELINE_RUBRIC_VERSION, pipelineVersion } from "../career";
import { runCoding, storedCodingEvaluation } from "./coding";
import { fingerprint } from "../fingerprint";
import { isRecord, parseSubmission } from "../validation";
import { SCENARIOS, evaluateScenario, scenarioVersions } from "../scenarios";

export const validId = (value: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value) && value.length === 36;
export const validToken = (value: string) => value.length === 64 && /^[a-f0-9]{64}$/.test(value);
export const hashOwner = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
type StoredReceipt = OwnerReceipt & { ownerHash: string };

export interface ReceiptRepository {
  create(submission: Submission, ownerHash: string): Promise<OwnerReceipt>;
  getOwner(id: string, ownerHash: string): Promise<OwnerReceipt | null>;
  listOwner(ownerHash: string): Promise<ReceiptSummary[]>;
  setSharing(id: string, ownerHash: string, enabled: boolean): Promise<{ shareToken: string | null } | null>;
  getShared(token: string): Promise<ReceiptEvidence | null>;
}

const locks = new Map<string, Promise<void>>();
async function withLock<T>(directory: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(directory) ?? Promise.resolve();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  locks.set(directory, pending);
  await previous;
  try { return await operation(); }
  finally { release(); if (locks.get(directory) === pending) locks.delete(directory); }
}

function evidence(record: StoredReceipt): ReceiptEvidence {
  // Explicit allowlist: ownership and share capability never reach public exports.
  return structuredClone({
    createdAt: record.createdAt, assessmentVersion: record.assessmentVersion,
    rubricVersion: record.rubricVersion, submission: record.submission,
    evaluation: record.evaluation, fingerprint: record.fingerprint,
  });
}
const ownerView = (record: StoredReceipt): OwnerReceipt => ({ ...evidence(record), id: record.id, shareToken: record.shareToken });

export class FileReceiptRepository implements ReceiptRepository {
  readonly directory: string;
  constructor(directory: string) { this.directory = path.resolve(directory); }

  private async read(id: string): Promise<StoredReceipt | null> {
    if (!validId(id)) return null;
    let raw: string;
    try { raw = await readFile(path.join(this.directory, `${id}.json`), "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.id !== id || typeof parsed.ownerHash !== "string" || !validToken(parsed.ownerHash) ||
        (parsed.shareToken !== null && (typeof parsed.shareToken !== "string" || !validToken(parsed.shareToken))) ||
        ![ASSESSMENT_VERSION, PIPELINE_VERSION, CODING_VERSION, ...SCENARIOS.map((s) => `scenario-${s.id}-v1`)].includes(String(parsed.assessmentVersion)) || ![RUBRIC_VERSION, PIPELINE_RUBRIC_VERSION, CODING_RUBRIC_VERSION, "scenario-rules-v1"].includes(String(parsed.rubricVersion)) ||
        typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt)) ||
        typeof parsed.fingerprint !== "string" || !validToken(parsed.fingerprint) || !isRecord(parsed.evaluation)) {
      throw new Error("Stored receipt is invalid.");
    }
    const submission = parseSubmission(parsed.submission);
    const versions = submission.scenario ? scenarioVersions(submission.scenario) : pipelineVersion(submission) ?? { assessmentVersion: ASSESSMENT_VERSION, rubricVersion: RUBRIC_VERSION };
    if (parsed.assessmentVersion !== versions.assessmentVersion || parsed.rubricVersion !== versions.rubricVersion) throw new Error("Stored assessment version is inconsistent.");
    // Validate and copy only the declared evaluation shape, never arbitrary disk fields.
    const evaluation = parsed.evaluation;
    if (!Number.isInteger(evaluation.score) || Number(evaluation.score) < 0 || Number(evaluation.score) > 100 ||
        !["Strong evidence on this task", "Developing evidence on this task", "More practice needed on this task"].includes(String(evaluation.tier)) ||
        !Array.isArray(evaluation.checks) || evaluation.checks.length !== (submission.scenario ? 7 : submission.workSample?.kind === "data-engineer-v2" ? 4 : 6)) throw new Error("Stored evaluation is invalid.");
    const clean = submission.scenario ? evaluateScenario(submission.scenario) : submission.workSample?.kind === "data-engineer-v2" ? storedCodingEvaluation(submission.workSample, evaluation) : submission.workSample ? evaluatePipeline(submission.workSample) : evaluate(submission);
    // v1 evaluator is fixed. A corrupt record fails rather than being silently repaired.
    if (JSON.stringify(evaluation) !== JSON.stringify(clean) || parsed.fingerprint !== fingerprint(submission)) throw new Error("Stored evidence is inconsistent.");
    return {
      id, ownerHash: parsed.ownerHash, shareToken: parsed.shareToken as string | null,
      createdAt: parsed.createdAt, ...versions,
      submission, evaluation: clean, fingerprint: parsed.fingerprint,
    };
  }

  private async write(record: StoredReceipt): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const destination = path.join(this.directory, `${record.id}.json`);
    const temporary = path.join(this.directory, `.${record.id}.${randomUUID()}.tmp`);
    let file;
    try {
      file = await open(temporary, "wx", 0o600);
      await file.writeFile(JSON.stringify(record), "utf8");
      await file.sync();
      await file.close(); file = undefined;
      await rename(temporary, destination);
    } finally {
      await file?.close();
      await rm(temporary, { force: true });
    }
  }

  private async ids(): Promise<string[]> {
    try {
      return (await readdir(this.directory)).filter((name) => name.endsWith(".json") && validId(name.slice(0, -5))).map((name) => name.slice(0, -5));
    } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }

  async create(input: Submission, ownerHash: string): Promise<OwnerReceipt> {
    if (!validToken(ownerHash)) throw new Error("Invalid owner hash.");
    const submission = parseSubmission(input);
    return withLock(this.directory, async () => {
      const record: StoredReceipt = {
        id: randomUUID(), ownerHash, shareToken: null, createdAt: new Date().toISOString(),
        ...(submission.scenario ? scenarioVersions(submission.scenario) : pipelineVersion(submission) ?? { assessmentVersion: ASSESSMENT_VERSION, rubricVersion: RUBRIC_VERSION }),
        submission, evaluation: submission.scenario ? evaluateScenario(submission.scenario) : submission.workSample?.kind === "data-engineer-v2" ? evaluateEngineer(submission.workSample, await runCoding(submission.workSample.code!)) : submission.workSample ? evaluatePipeline(submission.workSample) : evaluate(submission), fingerprint: fingerprint(submission),
      };
      await this.write(record);
      return ownerView(record);
    });
  }

  async getOwner(id: string, ownerHash: string): Promise<OwnerReceipt | null> {
    if (!validToken(ownerHash) || !validId(id)) return null;
    return withLock(this.directory, async () => {
      const record = await this.read(id);
      return record?.ownerHash === ownerHash ? ownerView(record) : null;
    });
  }

  async listOwner(ownerHash: string): Promise<ReceiptSummary[]> {
    if (!validToken(ownerHash)) return [];
    return withLock(this.directory, async () => {
      const summaries: ReceiptSummary[] = [];
      for (const id of await this.ids()) {
        const record = await this.read(id);
        if (record?.ownerHash === ownerHash) summaries.push({
          id: record.id, createdAt: record.createdAt, score: record.evaluation.score,
          tier: record.evaluation.tier, demo: record.submission.demo, sharingEnabled: record.shareToken !== null,
          ...(record.submission.workSample || record.submission.scenario ? { assessmentVersion: record.assessmentVersion } : {}),
        });
      }
      return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    });
  }

  async setSharing(id: string, ownerHash: string, enabled: boolean): Promise<{ shareToken: string | null } | null> {
    if (!validId(id) || !validToken(ownerHash)) return null;
    return withLock(this.directory, async () => {
      const record = await this.read(id);
      if (!record || record.ownerHash !== ownerHash) return null;
      // Enabling twice is idempotent. Re-enabling after revocation gets fresh entropy.
      record.shareToken = enabled ? record.shareToken ?? randomBytes(32).toString("hex") : null;
      await this.write(record);
      return { shareToken: record.shareToken };
    });
  }

  async getShared(token: string): Promise<ReceiptEvidence | null> {
    if (!validToken(token)) return null;
    return withLock(this.directory, async () => {
      for (const id of await this.ids()) {
        const record = await this.read(id);
        if (record?.shareToken === token) return evidence(record);
      }
      return null;
    });
  }
}

let singleton: FileReceiptRepository | undefined;
export function getRepository(): ReceiptRepository {
  // Runtime receipts are external mutable data and must not be bundled as source.
  const directory = path.resolve(/*turbopackIgnore: true*/ process.env.SKILLRECEIPT_DATA_DIR ?? path.join(process.cwd(), ".data"));
  if (!singleton || singleton.directory !== directory) singleton = new FileReceiptRepository(directory);
  return singleton;
}
