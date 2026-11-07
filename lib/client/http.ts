export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function postJson(path: string, body?: unknown, timeoutMs = 25_000): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = isRecord(result) && typeof result.error === "string" && result.error.length > 0 && result.error.length <= 400
        ? result.error : "The request could not be completed. Please try again.";
      throw new ApiRequestError(message, response.status);
    }
    return { status: response.status, body: result };
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    if (controller.signal.aborted) throw new ApiRequestError("The request took too long. Check the current server state before trying again.", 0);
    throw new ApiRequestError("Could not reach the app. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timeout);
  }
}
