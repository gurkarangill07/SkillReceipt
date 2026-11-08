export class CookieClient {
  constructor(origin: string);
  origin: string;
  readonly cookieHeader: string;
  request(path: string, init?: RequestInit & { duplex?: "half" }): Promise<Response>;
  json(path: string, body: unknown, headers?: Record<string, string>): Promise<Response>;
}
export function assertPrivate(response: Response): void;
export function expectError(response: Response, status: number): Promise<{ error: string }>;
export function assertSafeEvidence(evidence: unknown, secrets?: Array<string | null | undefined>): void;
export function parseCsv(text: string): string[][];
export function monitoredSubmission<T>(client: CookieClient, input: T, kinds?: string[]): Promise<T & { session?: import("../../lib/contracts").SessionContext; sessionSequence?: number }>;
