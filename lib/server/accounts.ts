import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AccountRole, PublicAccount } from "../accounts";
import { hashOwner, validToken } from "./store";
import { isRecord } from "../validation";

export const ACCOUNT_COOKIE = "skillreceipt_account";
export const ACCOUNT_AGE = 7 * 24 * 60 * 60;
export class AccountError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
type Account = PublicAccount & { salt: string; passwordHash: string; ownerToken: string; resumeFile: string | null };
type Session = { accountId: string; expires: number };
type State = { accounts: Account[]; sessions: Record<string, Session> };
const publicView = ({ id, candidateId, name, email, role, visible, resume }: Account): PublicAccount => ({ id, candidateId, name, email, role, visible, resume });
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
async function passwordKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result)));
}
const pending = new Map<string, Promise<void>>();
const attempts = new Map<string, { count: number; until: number }>();
function limit(email: string) {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
  const entry = attempts.get(email) ?? { count: 0, until: now + 300_000 };
  if (entry.count >= 10 || (!attempts.has(email) && attempts.size >= 500)) throw new AccountError("Too many attempts. Wait five minutes and try again.", 429);
  entry.count += 1; attempts.set(email, entry);
}

export class AccountStore {
  readonly directory: string;
  constructor(directory: string) { this.directory = path.resolve(directory, "accounts"); }
  private async state(): Promise<State> {
    try { return JSON.parse(await readFile(path.join(this.directory, "state.json"), "utf8")) as State; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { accounts: [], sessions: {} }; throw error; }
  }
  private async save(state: State) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temp = path.join(this.directory, `${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(state), { flag: "wx", mode: 0o600 });
    await rename(temp, path.join(this.directory, "state.json"));
  }
  private async locked<T>(fn: () => Promise<T>): Promise<T> {
    const previous = pending.get(this.directory) ?? Promise.resolve(); let release!: () => void;
    const next = new Promise<void>((resolve) => { release = resolve; }); pending.set(this.directory, next);
    await previous; try { return await fn(); } finally { release(); if (pending.get(this.directory) === next) pending.delete(this.directory); }
  }
  private session(state: State, account: Account) {
    const token = randomBytes(32).toString("hex");
    for (const [hash, session] of Object.entries(state.sessions)) if (session.expires <= Date.now()) delete state.sessions[hash];
    state.sessions[digest(token)] = { accountId: account.id, expires: Date.now() + ACCOUNT_AGE * 1000 };
    return { account: publicView(account), token, ownerToken: account.role === "candidate" ? account.ownerToken : null };
  }
  async signIn(value: unknown, register: boolean, existingOwner?: string) {
    if (!isRecord(value)) throw new AccountError("Enter your account details.");
    const { email, password, role } = value;
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== "string" || password.length < 10 || password.length > 128 || !["candidate", "employer"].includes(String(role))) throw new AccountError("Use a valid email and a password of 10–128 characters.");
    const normalized = email.trim().toLowerCase(); limit(normalized);
    return this.locked(async () => {
      const state = await this.state(); let account = state.accounts.find((item) => item.email === normalized);
      if (register) {
        if (account) throw new AccountError("This account could not be created. Try signing in or use another email.");
        if (typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 60) throw new AccountError("Enter a name of 1–60 characters.");
        const salt = randomBytes(16).toString("hex");
        account = { id: randomUUID(), candidateId: `SR-${randomBytes(5).toString("hex").toUpperCase()}`, name: value.name.trim(), email: normalized, role: role as AccountRole, visible: false, resume: null, resumeFile: null, salt, passwordHash: (await passwordKey(password, salt)).toString("hex"), ownerToken: existingOwner && validToken(existingOwner) && role === "candidate" && !state.accounts.some((item) => item.role === "candidate" && item.ownerToken === existingOwner) ? existingOwner : randomBytes(32).toString("hex") };
        state.accounts.push(account);
      } else {
        const key = await passwordKey(password, account?.salt ?? "00000000000000000000000000000000");
        if (!account || account.role !== role || !timingSafeEqual(key, Buffer.from(account.passwordHash, "hex"))) throw new AccountError("Email, password or account type is incorrect.", 401);
      }
      const result = this.session(state, account); await this.save(state); return result;
    });
  }
  private async current(state: State, token: string | undefined): Promise<Account | null> {
    if (!token || !validToken(token)) return null;
    const session = state.sessions[digest(token)];
    if (!session || session.expires <= Date.now()) return null;
    return state.accounts.find((account) => account.id === session.accountId) ?? null;
  }
  async account(token?: string): Promise<PublicAccount | null> { return this.locked(async () => { const account = await this.current(await this.state(), token); return account ? publicView(account) : null; }); }
  async owner(token?: string): Promise<string | null> { return this.locked(async () => { const account = await this.current(await this.state(), token); return account?.role === "candidate" ? hashOwner(account.ownerToken) : null; }); }
  async requiresAccount(ownerHash: string): Promise<boolean> { return this.locked(async () => (await this.state()).accounts.some((account) => account.role === "candidate" && hashOwner(account.ownerToken) === ownerHash)); }
  async logout(token?: string) { return this.locked(async () => { if (!token || !validToken(token)) return; const state = await this.state(); delete state.sessions[digest(token)]; await this.save(state); }); }
  async visibility(token: string | undefined, enabled: boolean) {
    return this.locked(async () => { const state = await this.state(); const account = await this.current(state, token);
      if (!account || account.role !== "candidate") throw new AccountError("Sign in as a candidate.", 403);
      account.visible = enabled; await this.save(state); return publicView(account);
    });
  }
  async saveResume(token: string | undefined, bytes: Uint8Array, metadata: { name: string; skills: string[] }) {
    return this.locked(async () => { const state = await this.state(); const account = await this.current(state, token);
      if (!account || account.role !== "candidate") throw new AccountError("Sign in as a candidate to save a résumé.", 403);
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const filename = `${account.id}.resume`;
      const temp = path.join(this.directory, `${randomUUID()}.upload`);
      await writeFile(temp, bytes, { flag: "wx", mode: 0o600 }); await rename(temp, path.join(this.directory, filename));
      account.resumeFile = filename; account.resume = { ...metadata, uploadedAt: new Date().toISOString() }; await this.save(state);
      return publicView(account);
    });
  }
  async candidate(token: string | undefined, candidateId: string) {
    return this.locked(async () => { const state = await this.state(); const employer = await this.current(state, token);
      if (!employer || employer.role !== "employer") throw new AccountError("Sign in as an employer.", 403);
      if (!/^SR-[A-F0-9]{10}$/.test(candidateId)) return null;
      const candidate = state.accounts.find((item) => item.role === "candidate" && item.candidateId === candidateId && item.visible);
      return candidate ? { profile: { candidateId: candidate.candidateId, name: candidate.name, resume: candidate.resume }, ownerHash: hashOwner(candidate.ownerToken) } : null;
    });
  }
  async resume(token: string | undefined, candidateId?: string) {
    return this.locked(async () => { const state = await this.state(); const viewer = await this.current(state, token);
      if (!viewer) throw new AccountError("Sign in to view this résumé.", 403);
      const account = candidateId ? state.accounts.find((item) => viewer.role === "employer" && item.role === "candidate" && item.candidateId === candidateId && item.visible) : viewer.role === "candidate" ? viewer : null;
      if (!account?.resume || !account.resumeFile || !/^[a-f0-9-]{36}\.resume$/.test(account.resumeFile)) return null;
      return { metadata: account.resume, bytes: await readFile(path.join(this.directory, account.resumeFile)) };
    });
  }
}

let singleton: AccountStore | undefined;
export function getAccounts() {
  const root = path.resolve(/*turbopackIgnore: true*/ process.env.SKILLRECEIPT_DATA_DIR ?? path.join(process.cwd(), ".data"));
  if (!singleton || singleton.directory !== path.join(root, "accounts")) singleton = new AccountStore(root);
  return singleton;
}
