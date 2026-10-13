import { AIRequestError } from "./gemini";

export type HttpResponse = { status: number; text(): Promise<string>; headers?: { get(name: string): string | null } };
export type HttpTransport = (url: string, init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<HttpResponse>;
export type RetryEvent = { model: string; status: number; attempt: number; delayMs: number; message: string };

export type HttpOptions = {
  transport?: HttpTransport;
  timeoutMs?: number;
  maxRetries?: number;
  /** A longer retry hint means a quota is gone; waiting it out would stall a run for hours. */
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (event: RetryEvent) => void;
};

const defaultTransport: HttpTransport = (url, init) => fetch(url, init);

/**
 * POSTs JSON and retries transient failures (the statuses in `retryable`, timeouts, network errors) with the
 * server's Retry-After hint or exponential backoff. Returns the parsed body of the first 2xx response.
 */
export async function postJson(input: {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  model: string;
  label: string;
  retryable: ReadonlySet<number>;
  errorMessage: (body: unknown, raw: string) => string;
  options: HttpOptions;
}): Promise<unknown> {
  const { options } = input;
  const transport = options.transport ?? defaultTransport;
  const maxRetries = options.maxRetries ?? 6;
  const maxWaitMs = options.maxWaitMs ?? 300_000;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const body = JSON.stringify(input.body);
  for (let attempt = 0; ; attempt += 1) {
    let status = 0;
    let message = "";
    let hintMs: number | null = null;
    try {
      const response = await transport(input.url, { method: "POST", headers: { "content-type": "application/json", ...input.headers }, body, signal: AbortSignal.timeout(options.timeoutMs ?? 240_000) });
      status = response.status;
      const raw = await response.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      if (status >= 200 && status < 300 && parsed) return parsed;
      message = input.errorMessage(parsed, raw);
      const retryAfter = Number.parseFloat(response.headers?.get("retry-after") ?? "");
      hintMs = Number.isFinite(retryAfter) ? Math.ceil(retryAfter * 1000) + 500 : null;
      const retryable = input.retryable.has(status) || (status >= 200 && status < 300);
      if (!retryable || attempt >= maxRetries) throw new AIRequestError(`${input.label} ${input.model} ${status}: ${message}`, status, retryable);
    } catch (error) {
      if (error instanceof AIRequestError) throw error;
      const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      message = timeout ? "timed out" : (error as Error).message;
      if (attempt >= maxRetries) throw new AIRequestError(`${input.label} ${input.model}: ${message}`, 0, true);
    }
    const delayMs = hintMs ?? Math.min(60_000, 2000 * 2 ** attempt);
    options.onRetry?.({ model: input.model, status, attempt, delayMs, message: message.slice(0, 120) });
    if (delayMs > maxWaitMs) throw new AIRequestError(`${input.label} ${input.model} ${status}: asks to wait ${Math.round(delayMs / 60_000)} min (quota exhausted): ${message}`, status, false);
    await sleep(delayMs);
  }
}
