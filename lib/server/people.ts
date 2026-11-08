import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReceiptEvidence } from "../contracts";
import type { CandidateProfile, CandidateReport, CandidateSearchResult } from "../people";
import { ROLE_CATALOG } from "../career";
import { getScenario } from "../scenarios";
import { InputError, isRecord } from "../validation";
import { FileReceiptRepository, validToken, type ReceiptRepository } from "./store";

type StoredCandidate = CandidateProfile & { ownerHash: string };
export type CandidateSearchOptions = { q?: string; minScore?: number; includeExamples?: boolean };
const candidateId = (value: string) => /^SR-[A-F0-9]{10}$/.test(value);
const profileView = ({ id, name, resume, visible, createdAt }: StoredCandidate): CandidateProfile => structuredClone({ id, name, resume, visible, createdAt });
const pending = new Map<string, Promise<void>>();

async function locked<T>(directory: string, operation: () => Promise<T>): Promise<T> {
  const previous = pending.get(directory) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  pending.set(directory, current);
  await previous;
  try { return await operation(); }
  finally { release(); if (pending.get(directory) === current) pending.delete(directory); }
}

function profileName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 60 || /[\u0000-\u001f]/.test(value)) throw new InputError("Enter a name of 1–60 characters.");
  return value.trim();
}

function resumeSummary(value: unknown): CandidateProfile["resume"] {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.name !== "string" || !value.name.trim() || value.name.length > 160 || !Array.isArray(value.skills) || value.skills.length > 40) throw new InputError("Add a valid résumé summary.");
  const skills: string[] = [];
  for (const skill of value.skills) {
    if (typeof skill !== "string" || !skill.trim() || skill.length > 60 || /[\u0000-\u001f]/.test(skill)) throw new InputError("Each résumé skill must be 1–60 characters.");
    if (!skills.some((item) => item.toLowerCase() === skill.trim().toLowerCase())) skills.push(skill.trim());
  }
  return { name: value.name.trim(), skills };
}

function safeEvidence(receipt: ReceiptEvidence): ReceiptEvidence {
  return structuredClone({ createdAt: receipt.createdAt, assessmentVersion: receipt.assessmentVersion, rubricVersion: receipt.rubricVersion, submission: receipt.submission, evaluation: receipt.evaluation, fingerprint: receipt.fingerprint });
}

function assessedRole(receipt: ReceiptEvidence) {
  const scenario = receipt.submission.scenario ? getScenario(receipt.submission.scenario.roleId) : undefined;
  return scenario ?? ROLE_CATALOG[receipt.submission.workSample ? 0 : 1];
}

function assessedTerms(receipt: ReceiptEvidence): string[] {
  const earned = receipt.evaluation.checks.filter((check) => check.pointsEarned > 0);
  const labels = earned.map((check) => check.label);
  const id = receipt.submission.scenario?.roleId ?? (receipt.submission.workSample ? "junior-data-engineer" : "junior-data-analyst");
  const aliases: Record<string, Record<string, string[]>> = {
    "junior-data-engineer": { key: ["Business keys"], missing: ["Data quality"], load: ["Reliable loads"], coding: ["JavaScript", "JavaScript basics"] },
    "junior-data-analyst": { unique: ["Data cleaning"], dates: ["Date normalization"], regions: ["Data cleaning"], revenue: ["Data cleaning"], integrity: ["Data quality"], total: ["Revenue reconciliation"] },
    "frontend-developer": { "scenario-control": ["HTML", "Forms"], "scenario-loading": ["Forms"], "scenario-label": ["Accessibility", "Forms"], "scenario-keyboard": ["Accessibility"], "scenario-mobile": ["CSS", "Responsive UI"], "scenario-feedback": ["Accessibility"] },
    "qa-engineer": { "scenario-boundary": ["Boundary testing", "Testing"], "scenario-report": ["Bug reports"], "scenario-regression": ["Regression", "Testing"] },
    "product-analyst": { "scenario-metric": ["Conversion", "Product metrics"], "scenario-decision": ["Experiments"], "scenario-guardrail": ["Product metrics"], "scenario-control": ["Conversion"], "scenario-variant": ["Conversion"] },
    "security-analyst": { "scenario-triage": ["Incident triage", "Incident response"], "scenario-contain": ["Access control", "Incident response"], "scenario-verify": ["Safe verification"], "scenario-logs": ["Incident response"] },
  };
  return [...labels, ...earned.flatMap((check) => aliases[id]?.[check.id] ?? [])];
}

/** No credentials or original résumé files are stored in a guest profile. */
export class PeopleRepository {
  readonly directory: string;
  readonly receipts: ReceiptRepository;

  constructor(directory: string, receipts?: ReceiptRepository) {
    const root = path.resolve(directory);
    this.directory = path.join(root, "people");
    this.receipts = receipts ?? new FileReceiptRepository(root);
  }

  private async read(ownerHash: string): Promise<StoredCandidate | null> {
    if (!validToken(ownerHash)) return null;
    let value: unknown;
    try { value = JSON.parse(await readFile(path.join(this.directory, `${ownerHash}.json`), "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    if (!isRecord(value) || value.ownerHash !== ownerHash || typeof value.id !== "string" || !candidateId(value.id) || typeof value.visible !== "boolean" || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) throw new Error("Stored candidate is invalid.");
    let name: string, resume: CandidateProfile["resume"];
    try { name = profileName(value.name); resume = resumeSummary(value.resume); }
    catch { throw new Error("Stored candidate is invalid."); }
    return { id: value.id, name, resume, visible: value.visible, createdAt: value.createdAt, ownerHash };
  }

  private async owners(): Promise<string[]> {
    try { return (await readdir(this.directory)).filter((name) => name.endsWith(".json") && validToken(name.slice(0, -5))).map((name) => name.slice(0, -5)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }

  private async write(candidate: StoredCandidate): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temporary = path.join(this.directory, `.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(candidate), { flag: "wx", mode: 0o600 });
      await rename(temporary, path.join(this.directory, `${candidate.ownerHash}.json`));
    } finally { await rm(temporary, { force: true }); }
  }

  async getCandidateForOwner(ownerHash: string): Promise<CandidateProfile | null> {
    return locked(this.directory, async () => { const candidate = await this.read(ownerHash); return candidate ? profileView(candidate) : null; });
  }

  async saveCandidate(ownerHash: string, input: unknown): Promise<CandidateProfile> {
    if (!validToken(ownerHash)) throw new Error("Invalid owner.");
    if (!isRecord(input)) throw new InputError("Add your name and résumé summary.");
    if (!["name", "resume", "visible"].some((key) => key in input)) throw new InputError("Choose a profile change to save.");
    if (input.visible !== undefined && typeof input.visible !== "boolean") throw new InputError("Choose whether employers can find your profile.");
    return locked(this.directory, async () => {
      const existing = await this.read(ownerHash);
      const name = input.name === undefined && existing ? existing.name : profileName(input.name);
      const resume = input.resume === undefined ? existing?.resume ?? null : resumeSummary(input.resume);
      const visible = typeof input.visible === "boolean" ? input.visible : existing?.visible ?? false;
      if (visible && !(await this.receipts.listOwner(ownerHash)).length) throw new InputError("Complete an exercise before making your profile visible to employers.");
      const candidate: StoredCandidate = { id: existing?.id ?? `SR-${randomBytes(5).toString("hex").toUpperCase()}`, name, resume, visible, createdAt: existing?.createdAt ?? new Date().toISOString(), ownerHash };
      await this.write(candidate);
      return profileView(candidate);
    });
  }

  private async reportsFor(ownerHash: string, includeExamples = true): Promise<ReceiptEvidence[]> {
    const summaries = await this.receipts.listOwner(ownerHash);
    const reports: ReceiptEvidence[] = [];
    for (const summary of summaries) {
      if (!includeExamples && summary.demo) continue;
      const receipt = await this.receipts.getOwner(summary.id, ownerHash);
      if (receipt) reports.push(safeEvidence(receipt));
    }
    return reports;
  }

  async searchCandidates(options: CandidateSearchOptions = {}): Promise<CandidateSearchResult[]> {
    const { q = "", minScore = 0, includeExamples = true } = options;
    if (typeof q !== "string" || q.length > 100) throw new InputError("Search using up to 100 characters.");
    if (!Number.isInteger(minScore) || minScore < 0 || minScore > 100) throw new InputError("Choose a minimum score between 0 and 100.");
    if (typeof includeExamples !== "boolean") throw new InputError("Choose whether to include example attempts.");
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return locked(this.directory, async () => {
      const results: CandidateSearchResult[] = [];
      for (const ownerHash of await this.owners()) {
        const candidate = await this.read(ownerHash);
        if (!candidate?.visible) continue;
        const allReports = await this.reportsFor(ownerHash, includeExamples);
        // A high score on an unrelated assessment cannot satisfy a skill search.
        const reports = allReports.filter((report) => {
          const searchable = [candidate.id, candidate.name, assessedRole(report).title, ...assessedTerms(report)].join(" ").toLowerCase();
          return terms.every((term) => searchable.includes(term));
        });
        if (!reports.length) continue;
        const testedSkills = [...new Set(reports.flatMap(assessedTerms))];
        const topScore = Math.max(...reports.map((report) => report.evaluation.score));
        if (topScore < minScore) continue;
        results.push({ candidate: profileView(candidate), topScore, assessments: reports.length, testedSkills, latestAt: reports[0].createdAt, examplesOnly: reports.every((report) => report.submission.demo) });
      }
      return results.sort((a, b) => b.topScore - a.topScore || b.latestAt.localeCompare(a.latestAt) || a.candidate.id.localeCompare(b.candidate.id));
    });
  }

  async getCandidateReport(id: string): Promise<CandidateReport | null> {
    if (!candidateId(id)) return null;
    return locked(this.directory, async () => {
      for (const ownerHash of await this.owners()) {
        const candidate = await this.read(ownerHash);
        if (candidate?.id !== id || !candidate.visible) continue;
        const reports = await this.reportsFor(ownerHash);
        return reports.length ? { candidate: profileView(candidate), reports } : null;
      }
      return null;
    });
  }
}

let singleton: PeopleRepository | undefined;
export function getPeopleRepository(): PeopleRepository {
  const root = path.resolve(/*turbopackIgnore: true*/ process.env.SKILLRECEIPT_DATA_DIR ?? path.join(process.cwd(), ".data"));
  if (!singleton || singleton.directory !== path.join(root, "people")) singleton = new PeopleRepository(root);
  return singleton;
}
export const getCandidateForOwner = (ownerHash: string) => getPeopleRepository().getCandidateForOwner(ownerHash);
export const saveCandidate = (ownerHash: string, input: unknown) => getPeopleRepository().saveCandidate(ownerHash, input);
export const searchCandidates = (options: CandidateSearchOptions = {}) => getPeopleRepository().searchCandidates(options);
export const getCandidateReport = (id: string) => getPeopleRepository().getCandidateReport(id);
