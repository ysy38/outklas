import { postJson, type HttpOptions, type HttpResponse } from "./http";
import type { PromptCacheMode } from "./anthropic";
import type { AIProvider, ModelRequest, ModelResponse, Usage } from "./types";

const retryable = new Set([408, 429, 500, 502, 503, 504]);

/** Appended to the system prompt so free-text reason fields stay short without gutting Zod quality fields. */
export const openrouterBrevity = "Output discipline: JSON only; each free-text reason ≤20 words; no essays, no stem restatement, no filler.";

export const openrouterDataPolicies = ["allow", "deny"] as const;
export type OpenRouterDataPolicy = (typeof openrouterDataPolicies)[number];

type ChatMessage = {
  content?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
  refusal?: string | null;
};

type ChatBody = {
  choices?: { message?: ChatMessage; finish_reason?: string }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  };
  model?: string;
  error?: { message?: string } | string;
};

/**
 * Prefer message.content; if empty (reasoning models often spend the whole budget on reasoning),
 * fall back to reasoning text so downstream JSON extraction can still recover an object.
 */
export function openrouterMessageText(message: ChatMessage | undefined | null): string {
  const content = (message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (content) return content;
  const reasoning = (message?.reasoning ?? message?.reasoning_content ?? "").trim();
  return reasoning;
}

export type OpenRouterHttp = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal }) => Promise<HttpResponse>;

export type OpenRouterOptions = HttpOptions & {
  apiKey: string;
  baseUrl?: string;
  minOutputTokens?: number;
  /** Explicit cache_control on the system message (Anthropic/Qwen-style); "off" sends a plain string. */
  promptCache?: PromptCacheMode;
  /** Prefer endpoints that refuse training / logging when set to deny (exam content). */
  dataCollection?: OpenRouterDataPolicy;
  /** App attribution headers (optional). */
  referer?: string;
  title?: string;
  /** Overrides postJson's POST-only transport for batch GET/POST. */
  http?: OpenRouterHttp;
};

export const isBatchModel = (model: string) => model.endsWith(":batch");
export const stripBatchSuffix = (model: string) => (isBatchModel(model) ? model.slice(0, -":batch".length) : model);

function systemMessage(system: string, mode: PromptCacheMode): { role: "system"; content: string | { type: "text"; text: string; cache_control?: { type: "ephemeral"; ttl?: "1h" } }[] } {
  const text = `${system}\n\n${openrouterBrevity}`;
  if (mode === "off") return { role: "system", content: text };
  return {
    role: "system",
    content: [{ type: "text", text, cache_control: mode === "1h" ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" } }],
  };
}

/** OpenRouter bills cached reads inside prompt_tokens; peel them out so our cost table matches Anthropic/Gemini. */
export function openrouterUsage(usage: ChatBody["usage"]): Usage {
  const prompt = usage?.prompt_tokens ?? 0;
  const output = usage?.completion_tokens ?? 0;
  const read = usage?.prompt_tokens_details?.cached_tokens ?? 0;
  const write = usage?.prompt_tokens_details?.cache_write_tokens ?? 0;
  const input = Math.max(0, prompt - read);
  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: usage?.total_tokens ?? prompt + output,
    ...(write ? { cacheWriteTokens: write } : {}),
    ...(read ? { cacheReadTokens: read } : {}),
  };
}

/**
 * OpenRouter chat completions (OpenAI-compatible). Model ids keep org/name and optional `:batch`
 * (`openrouter:google/gemini-3.8-flash:batch` → model `google/gemini-3.8-flash:batch`).
 * Sync `generate` rejects `:batch` ids; use {@link OpenRouterBatchClient} for offline/eval work.
 */
export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";

  constructor(private readonly options: OpenRouterOptions) {
    if (typeof window !== "undefined") throw new Error("OpenRouterProvider is server-only; it must never run in a browser.");
    if (!options.apiKey) throw new Error("OPENROUTER_API_KEY is not set (put it in .env.local).");
  }

  private baseUrl() {
    return (this.options.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.options.apiKey}`,
      accept: "application/json",
      ...(this.options.referer ? { "HTTP-Referer": this.options.referer } : {}),
      ...(this.options.title ? { "X-OpenRouter-Title": this.options.title } : {}),
    };
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    if (isBatchModel(request.model)) {
      throw new Error(
        `${request.model} is an OpenRouter batch model; sync chat/completions cannot run it. Use OpenRouterBatchClient (offline/eval) or drop the :batch suffix for interactive smoke.`,
      );
    }
    const text = request.parts.map((part) => {
      if (!("text" in part)) throw new Error("openrouter provider does not take images in the factory path");
      return part.text;
    });
    const body = (await postJson({
      url: `${this.baseUrl()}/chat/completions`,
      headers: this.headers(),
      body: {
        model: request.model,
        messages: [...(request.system ? [systemMessage(request.system, this.options.promptCache ?? "5m")] : []), { role: "user", content: text.join("\n\n") }],
        temperature: request.temperature ?? 0,
        // Reasoning models otherwise spend the whole budget on hidden chain-of-thought and return empty content.
        max_tokens: Math.max(request.maxOutputTokens ?? 0, this.options.minOutputTokens ?? 4096),
        reasoning: { exclude: true },
        ...(request.jsonSchema
          ? { response_format: { type: "json_schema", json_schema: { name: "output", strict: true, schema: request.jsonSchema } } }
          : {}),
        ...(this.options.dataCollection
          ? { provider: { data_collection: this.options.dataCollection, ...(this.options.dataCollection === "deny" ? { require_parameters: true } : {}) } }
          : {}),
      },
      model: request.model,
      label: "openrouter",
      retryable,
      errorMessage: (parsed, raw) => {
        const chat = parsed as ChatBody | null;
        return (typeof chat?.error === "string" ? chat.error : chat?.error?.message ?? raw.slice(0, 200)).toString();
      },
      options: this.options,
    })) as ChatBody;
    const choice = body.choices?.[0];
    return {
      text: openrouterMessageText(choice?.message),
      model: body.model ?? request.model,
      finishReason: choice?.finish_reason?.toUpperCase(),
      usage: openrouterUsage(body.usage),
    };
  }

  /** Batch client sharing this provider's auth and base URL. */
  batch(): OpenRouterBatchClient {
    return new OpenRouterBatchClient(this.options);
  }
}

export type BatchRequest = { custom_id: string; body: Record<string, unknown> };

export type BatchStatus = "validating" | "in_progress" | "finalizing" | "completed" | "failed" | "expired" | "cancelled";

export type BatchJob = {
  id: string;
  status: BatchStatus;
  model?: string;
  endpoint?: string;
  results?: { custom_id: string; response?: unknown; error?: { message?: string } }[];
  error?: { message?: string };
  usage?: { cost?: number };
};

/**
 * OpenRouter Batch API (~½ list price, async, results within ~24h). One model + one endpoint per batch.
 * Factory interactive stages stay on sync; use this for offline benchmarks / calibration only.
 * Batch cannot combine with Zero Data Retention (OpenRouter keeps batch data ≤30 days).
 */
export class OpenRouterBatchClient {
  constructor(private readonly options: OpenRouterOptions) {
    if (!options.apiKey) throw new Error("OPENROUTER_API_KEY is not set (put it in .env.local).");
  }

  private baseUrl() {
    return (this.options.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    return { authorization: `Bearer ${this.options.apiKey}`, accept: "application/json", "content-type": "application/json" };
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const http = this.options.http ?? ((url, init) => fetch(url, init));
    const response = await http(`${this.baseUrl()}${path}`, {
      method,
      headers: this.headers(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 240_000),
    });
    const raw = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (response.status < 200 || response.status >= 300) {
      const message = (parsed as { error?: { message?: string } } | null)?.error?.message ?? raw.slice(0, 200);
      throw new Error(`openrouter batch ${response.status}: ${message}`);
    }
    return parsed;
  }

  /** Submit a chat-completions batch. `model` may include `:batch`; it is stripped for the API. */
  async submit(input: { model: string; requests: BatchRequest[]; endpoint?: "/v1/chat/completions" | "/v1/responses" | "/v1/messages"; callbackUrl?: string }): Promise<BatchJob> {
    if (!input.requests.length) throw new Error("OpenRouter batch needs at least one request");
    return (await this.request("POST", "/batches", {
      endpoint: input.endpoint ?? "/v1/chat/completions",
      model: stripBatchSuffix(input.model),
      requests: input.requests,
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
      ...(this.options.dataCollection ? { provider: { data_collection: this.options.dataCollection } } : {}),
    })) as BatchJob;
  }

  async get(id: string): Promise<BatchJob> {
    return (await this.request("GET", `/batches/${encodeURIComponent(id)}`)) as BatchJob;
  }

  /** Poll until completed/failed/expired/cancelled or attempts exhausted. */
  async poll(id: string, opts: { intervalMs?: number; maxAttempts?: number; sleep?: (ms: number) => Promise<void> } = {}): Promise<BatchJob> {
    const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    const intervalMs = opts.intervalMs ?? 5_000;
    const maxAttempts = opts.maxAttempts ?? 120;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const job = await this.get(id);
      if (job.status === "completed" || job.status === "failed" || job.status === "expired" || job.status === "cancelled") return job;
      await sleep(intervalMs);
    }
    throw new Error(`openrouter batch ${id}: still running after ${maxAttempts} polls`);
  }
}
