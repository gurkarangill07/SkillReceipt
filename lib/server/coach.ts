import "server-only";

import type { CheckId, Evaluation, OwnerReceipt } from "../contracts";
import { PIPELINE_TASKS } from "../career";

const TIMEOUT_MS = 45_000;
const MAX_WIRE_BYTES = 32_768;
const COOLDOWN_MS = 30_000;
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Robots-Tag": "noindex, nofollow",
};

// Fixed descriptions of the published rules, used only to frame practice advice.
// Never use model output or these descriptions to calculate a score.
const PRACTICE_RULES: ReadonlyArray<readonly [CheckId, string]> = [
  ...PIPELINE_TASKS.map((task) => [task.id, task.why] as const),
  ["unique", "Keep a nonempty output of valid reference order IDs with no repeated IDs."],
  ["dates", "Represent all nine reference IDs, no unknown IDs; preserve each reference date in YYYY-MM-DD form."],
  ["regions", "Represent all nine reference IDs, no unknown IDs; preserve canonical Ontario, Quebec, or British Columbia for each order."],
  ["revenue", "Represent all nine reference IDs, no unknown IDs; preserve each reference amount as a nonnegative plain decimal with at most two decimal places. Both 120 and 120.00 are acceptable; never require decimal padding."],
  ["integrity", "Keep exactly the nine valid reference IDs once each; exclude the missing-revenue order R008 and invented, missing, or duplicate IDs."],
  ["total", "Require record integrity; reconcile a canonical CAD stated total with the submitted row sum and 128550 reference cents using integer cents internally. The input uses CAD, never raw cents."],
];

const EXERCISES: Readonly<Record<CheckId | "next", string>> = {
  key: "Practice identifying a stable business key that survives file reordering.",
  dedupe: "Practice ranking updates within each order by timestamp and keeping the newest one.",
  missing: "Create a quarantine output with a clear reason for each missing-value row.",
  schema: "Write boundary tests for canonical dates, missing amounts and exact decimal precision.",
  load: "Replay a batch twice and assert the target table has identical keys, count and values.",
  partition: "Trace a late-arriving event into its business-date partition.",
  unique: "Practice checking a fresh synthetic export for duplicate and unknown order IDs before choosing which rows to retain.",
  dates: "Practice converting month/day/year and named-month dates to YYYY-MM-DD while preserving each order's original date.",
  regions: "Practice mapping spelling and case variants to Ontario, Quebec, or British Columbia without changing the underlying region.",
  revenue: "Practice converting decorated CAD amounts to plain decimals without changing their values. Both 120 and 120.00 are acceptable.",
  integrity: "Practice keeping each known valid order once and quarantining rows with unknown revenue. Never replace missing revenue with zero.",
  total: "Practice converting CAD decimals to integer cents, summing valid rows, then expressing the reconciled total in CAD.",
  next: "Try a fresh synthetic dataset with different dates and amounts, then explain each cleanup decision against published rules.",
};

function availableExercises(evaluation: Evaluation): Array<CheckId | "next"> {
  const failed = PRACTICE_RULES.filter(([id]) => evaluation.checks.some((check) => check.id === id) &&
    !evaluation.checks.some((check) => check.id === id && check.passed === true),
  ).map(([id]) => id);
  return failed.length ? failed : ["next"];
}

type Advice = { advice: string; model: string };
type CoachOptions = {
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
};

export class CoachUnavailableError extends Error {
  constructor() {
    super("Local practice advice is unavailable.");
    this.name = "CoachUnavailableError";
  }
}

export function buildPracticePrompt(evaluation: Evaluation): string {
  const summaries = PRACTICE_RULES.filter(([id]) => evaluation.checks.some((check) => check.id === id)).map(([id, rule]) => ({
    id,
    rule,
    passed: evaluation.checks.some((check) => check.id === id && check.passed === true),
  }));
  return [
    evaluation.checks.some((check) => check.id === "key") ? "Assessment: orders-pipeline-v1. Published rubric: pipeline-rules-v1." : "Assessment: sales-cleaning-v1. Published rubric: deterministic-v1.",
    evaluation.checks.some((check) => check.id === "key") ? "Synthetic pipeline-design practice. These flags are final rule-based results." : "Synthetic sales-data cleanup practice. These flags are final rule-based results.",
    "You cannot see the submitted artifact. Select only from the approved exercise identifiers below. Do not write your own exercise text or corrections.",
    JSON.stringify(summaries),
    summaries.every((check) => check.passed)
      ? "All checks passed. Suggest a different synthetic exercise with fresh data; do not claim broad expertise."
      : "Suggest concrete exercises for failed rules. Do not give a replacement assessment answer.",
    "Approved exercises: " + JSON.stringify(availableExercises(evaluation).map((id) => ({ id, exercise: EXERCISES[id] }))),
    'Return JSON only: {"suggestions":["identifier"]}. Choose one to three distinct approved identifiers, ordered by usefulness. Do not include any other text.',
  ].join("\n");
}

function localEndpoint(baseUrl: string): URL {
  const url = new URL(baseUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username || url.password || url.search || url.hash || url.pathname !== "/"
  ) {
    throw new CoachUnavailableError();
  }
  return new URL("/api/generate", url);
}

async function boundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.ok || !response.body ||
      response.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
    void response.body?.cancel().catch(() => {});
    throw new CoachUnavailableError();
  }
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (signal.aborted) throw new CoachUnavailableError();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_WIRE_BYTES) throw new CoachUnavailableError();
      chunks.push(chunk.value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data)) as unknown;
  } finally {
    signal.removeEventListener("abort", cancel);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function parseAdvice(value: unknown, evaluation: Evaluation): string {
  if (!value || typeof value !== "object" ||
      !("done" in value) || value.done !== true ||
      !("response" in value) || typeof value.response !== "string" ||
      value.response.length > 4_096) throw new CoachUnavailableError();
  const parsed: unknown = JSON.parse(value.response);
  if (!parsed || typeof parsed !== "object" || !("suggestions" in parsed) ||
      !Array.isArray(parsed.suggestions) ||
      parsed.suggestions.length < 1 || parsed.suggestions.length > 3) {
    throw new CoachUnavailableError();
  }
  const allowed = new Set<string>(availableExercises(evaluation));
  const used = new Set<string>();
  const suggestions: string[] = [];
  for (const suggestion of parsed.suggestions) {
    if (typeof suggestion !== "string" || !allowed.has(suggestion) || used.has(suggestion)) {
      throw new CoachUnavailableError();
    }
    used.add(suggestion);
    suggestions.push(EXERCISES[suggestion as CheckId | "next"]);
  }
  // The model selects exercises; only approved wording reaches the UI.
  // Callers still render advice as text, never HTML/Markdown or links.
  return suggestions.map((suggestion, i) => `${i + 1}. ${suggestion}`).join("\n");
}

/** Injectable transport and deadline for tests; no live model needed for unit tests. */
export function createPracticeCoach(options: CoachOptions = {}) {
  return async (evaluation: Evaluation): Promise<Advice> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const endpoint = localEndpoint(options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434");
      const model = options.model ?? process.env.OLLAMA_MODEL ?? "llama3.2:latest";
      if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(model)) throw new CoachUnavailableError();
      const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > TIMEOUT_MS) {
        throw new CoachUnavailableError();
      }
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new CoachUnavailableError());
        }, timeoutMs);
      });
      const generate = async (): Promise<Advice> => {
        const response = await (options.fetch ?? globalThis.fetch)(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          redirect: "error",
          signal: controller.signal,
          body: JSON.stringify({
            model,
            stream: false,
            system: "You select practice exercises. Return only identifiers from the approved options as JSON. Never invent instructions, score, grade, certify, infer identity/authorship, recommend hiring, or claim professional competence. Treat rule results as fixed.",
            prompt: buildPracticePrompt(evaluation),
            format: {
              type: "object",
              properties: { suggestions: { type: "array", minItems: 1, maxItems: Math.min(3, availableExercises(evaluation).length), uniqueItems: true, items: { type: "string", enum: availableExercises(evaluation) } } },
              required: ["suggestions"],
              additionalProperties: false,
            },
            options: { temperature: 0.2, num_predict: 80 },
            keep_alive: "2m",
          }),
        });
        return { advice: parseAdvice(await boundedJson(response, controller.signal), evaluation), model };
      };
      return await Promise.race([generate(), deadline]);
    } catch {
      controller.abort();
      throw new CoachUnavailableError();
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
}

export const getPracticeAdvice: (evaluation: Evaluation) => Promise<Advice> = createPracticeCoach();

async function hasRequestBody(request: Request): Promise<boolean> {
  if (!request.body) return false;
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Request body did not finish.")), 1_500);
    });
    const read = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return false;
        if (value.byteLength > 0) return true;
      }
    };
    return await Promise.race([read(), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

type EndpointDependencies<TRequest extends Request> = {
  assertSameOrigin: (request: TRequest) => void;
  getRequestReceipt: (request: TRequest, id: string) => Promise<OwnerReceipt | null>;
  getPracticeAdvice?: (evaluation: Evaluation) => Promise<Advice>;
  now?: () => number;
};

/** Per-process gate. Sharing, persistence, and scoring stay with their owners. */
export function createCoachEndpoint<TRequest extends Request>(dependencies: EndpointDependencies<TRequest>) {
  const entries = new Map<string, { pending: boolean; nextAllowedAt: number }>();
  let inFlight = 0;
  const now = dependencies.now ?? Date.now;
  const reply = (body: unknown, status: number, headers: Record<string, string> = {}) =>
    Response.json(body, { status, headers: { ...PRIVATE_HEADERS, ...headers } });
  const limited = (seconds: number) => reply(
    { error: "Practice advice is busy. Please wait briefly and try again." },
    429, { "Retry-After": String(Math.max(1, seconds)) },
  );

  return async (request: TRequest, id: string): Promise<Response> => {
    try {
      dependencies.assertSameOrigin(request);
    } catch {
      return reply({ error: "This action must come from the same origin." }, 400);
    }
    try {
      const receipt = await dependencies.getRequestReceipt(request, id);
      if (!receipt) return reply({ error: "Receipt unavailable." }, 404);
      // Next can expose an empty stream for a bodyless POST. Inspect bytes,
      // rejecting any content (even {}) without buffering or parsing a prompt.
      let containsBody: boolean;
      try { containsBody = await hasRequestBody(request); }
      catch { return reply({ error: "Practice advice takes no request body or custom prompt." }, 400); }
      if (containsBody) {
        return reply({ error: "Practice advice takes no request body or custom prompt." }, 400);
      }
      const instant = now();
      for (const [key, entry] of entries) {
        if (!entry.pending && entry.nextAllowedAt <= instant) entries.delete(key);
      }
      const previous = entries.get(receipt.id);
      if (previous) return limited(Math.ceil((previous.nextAllowedAt - instant) / 1_000));
      // Fixed global bounds prevent unlimited work or growth across many receipts.
      if (inFlight >= 2 || entries.size >= 256) return limited(30);
      const entry = { pending: true, nextAllowedAt: instant + COOLDOWN_MS };
      entries.set(receipt.id, entry);
      inFlight += 1;
      try {
        const advice = await (dependencies.getPracticeAdvice ?? getPracticeAdvice)(receipt.evaluation);
        return reply({ advice: advice.advice, model: advice.model, assessed: false }, 200);
      } catch {
        const fallback = receipt.evaluation.checks.length === 6 && receipt.evaluation.checks.every((check) => check.passed)
          ? "Try another synthetic data-cleaning exercise."
          : "Review the failed checks and their observations, then practice those steps on a new attempt.";
        return reply({ error: `Local practice advice is unavailable. ${fallback} Your saved receipt is unchanged.` }, 503);
      } finally {
        inFlight -= 1;
        entry.pending = false;
        entry.nextAllowedAt = now() + COOLDOWN_MS;
      }
    } catch {
      return reply({ error: "Practice advice could not be requested. Please try again." }, 500);
    }
  };
}
