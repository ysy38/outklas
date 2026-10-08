import type { AIProvider, ModelRequest, ModelResponse } from "./types";

export type TransportResponse = { status: number; text(): Promise<string> };
export type Transport = (url: string, init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<TransportResponse>;

export type GeminiOptions = {
  apiKey: string;
  transport?: Transport;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** A longer retry hint means the daily quota is gone; waiting it out would stall a run for hours. */
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (event: { model: string; status: number; attempt: number; delayMs: number; message: string }) => void;
};

type GeminiPart = { text?: string; thought?: boolean };
type GeminiBody = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number };
  modelVersion?: string;
  error?: { code?: number; message?: string; status?: string; details?: { "@type"?: string; retryDelay?: string }[] };
};

export class AIRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const retryableStatus = new Set([408, 429, 500, 502, 503, 504]);

const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

export function geminiBody(request: ModelRequest) {
  return {
    ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
    contents: [
      {
        role: "user",
        parts: request.parts.map((part) => ("text" in part ? { text: part.text } : { inlineData: { mimeType: part.image.mimeType, data: base64(part.image.data) } })),
      },
    ],
    generationConfig: {
      temperature: request.temperature ?? 0,
      ...(request.maxOutputTokens ? { maxOutputTokens: request.maxOutputTokens } : {}),
      ...(request.jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: request.jsonSchema } : {}),
    },
  };
}

function retryDelayMs(body: GeminiBody | null, attempt: number): number {
  const hint = body?.error?.details?.find((detail) => detail.retryDelay)?.retryDelay;
  const seconds = hint ? Number.parseFloat(hint) : Number.NaN;
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) + 500 : Math.min(60_000, 2000 * 2 ** attempt);
}

const defaultTransport: Transport = (url, init) => fetch(url, init);

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private readonly transport: Transport;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxWaitMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: GeminiOptions) {
    if (typeof window !== "undefined") throw new Error("GeminiProvider is server-only; it must never run in a browser.");
    if (!options.apiKey) throw new Error("GEMINI_API_KEY is not set (put it in .env.local).");
    this.transport = options.transport ?? defaultTransport;
    this.baseUrl = options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    this.timeoutMs = options.timeoutMs ?? 180_000;
    this.maxRetries = options.maxRetries ?? 6;
    this.maxWaitMs = options.maxWaitMs ?? 300_000;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const url = `${this.baseUrl}/models/${encodeURIComponent(request.model)}:generateContent`;
    const body = JSON.stringify(geminiBody(request));
    for (let attempt = 0; ; attempt += 1) {
      let status = 0;
      let parsed: GeminiBody | null = null;
      let message = "";
      try {
        const response = await this.transport(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": this.options.apiKey },
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        status = response.status;
        const raw = await response.text();
        try {
          parsed = JSON.parse(raw) as GeminiBody;
        } catch {
          parsed = null;
        }
        if (status === 200 && parsed?.candidates?.length) return this.toResponse(request, parsed);
        message = parsed?.error?.message ?? (status === 200 ? "empty response" : raw.slice(0, 200));
        const retryable = retryableStatus.has(status) || (status === 200 && !parsed?.candidates?.length);
        if (!retryable || attempt >= this.maxRetries) throw new AIRequestError(`Gemini ${request.model} ${status}: ${message}`, status, retryable);
      } catch (error) {
        if (error instanceof AIRequestError) throw error;
        const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        message = timeout ? "timed out" : (error as Error).message;
        if (attempt >= this.maxRetries) throw new AIRequestError(`Gemini ${request.model}: ${message}`, 0, true);
      }
      const delayMs = retryDelayMs(parsed, attempt);
      this.options.onRetry?.({ model: request.model, status, attempt, delayMs, message: message.slice(0, 120) });
      if (delayMs > this.maxWaitMs) throw new AIRequestError(`Gemini ${request.model} ${status}: asks to wait ${Math.round(delayMs / 60_000)} min (quota exhausted): ${message}`, status, false);
      await this.sleep(delayMs);
    }
  }

  private toResponse(request: ModelRequest, body: GeminiBody): ModelResponse {
    const candidate = body.candidates![0];
    const text = (candidate.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    const usage = body.usageMetadata ?? {};
    const output = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
    return {
      text,
      model: body.modelVersion ?? request.model,
      finishReason: candidate.finishReason,
      usage: { inputTokens: usage.promptTokenCount ?? 0, outputTokens: output, totalTokens: usage.totalTokenCount ?? (usage.promptTokenCount ?? 0) + output },
    };
  }
}
