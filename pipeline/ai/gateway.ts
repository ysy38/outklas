import { anthropicSchema } from "./anthropic";
import { postJson, type HttpOptions } from "./http";
import { openrouterBrevity, openrouterMessageText, openrouterUsage } from "./openrouter";
import type { AIProvider, ModelRequest, ModelResponse, ThinkingLevel } from "./types";

const retryable = new Set([408, 429, 500, 502, 503, 504]);

type ChatBody = {
  choices?: { message?: { content?: string | null; reasoning?: string | null }; finish_reason?: string }[];
  usage?: Parameters<typeof openrouterUsage>[0];
  model?: string;
  provider?: string;
  error?: { message?: string } | string;
};

export type GatewayOptions = HttpOptions & {
  apiKey: string;
  baseUrl?: string;
  minOutputTokens?: number;
  /** Restrict routing to providers that do not train on prompts (exam content). */
  noTraining?: boolean;
  /** Hard provider allowlist (`providerOptions.gateway.only`). Unset leaves gateway routing alone. */
  only?: string[];
  /** Custom Reporting tags shown in the AI Gateway dashboard. */
  tags?: string[];
};

/** Reasoning effort per factory thinking level. Unset must not leave adaptive thinking on: those tokens are spent inside max_tokens. */
const effort: Record<ThinkingLevel, string> = { minimal: "minimal", low: "low", medium: "medium", high: "high" };

/** The reasoning effort and output ceiling this provider will put on the wire. Part of the cache key. */
export function gatewayWireIdentity(request: ModelRequest, minOutputTokens = 4096): { reasoningEffort: string; maxTokens: number } {
  return {
    reasoningEffort: request.thinking ? effort[request.thinking] : "none",
    maxTokens: Math.max(request.maxOutputTokens ?? 0, minOutputTokens),
  };
}

/**
 * Vercel AI Gateway over its OpenAI-compatible Chat Completions endpoint. Model ids are the gateway's
 * `creator/model` strings (`gateway:anthropic/claude-haiku-5.5`). `caching: "auto"` lets the gateway add
 * prompt-cache markers for explicit-caching providers (Anthropic); OpenAI, Google and DeepSeek cache implicitly.
 */
export class GatewayProvider implements AIProvider {
  readonly name = "gateway";

  wireIdentity(request: ModelRequest): Record<string, unknown> {
    return { ...gatewayWireIdentity(request, this.options.minOutputTokens ?? 4096) };
  }

  constructor(private readonly options: GatewayOptions) {
    if (typeof window !== "undefined") throw new Error("GatewayProvider is server-only; it must never run in a browser.");
    if (!options.apiKey) throw new Error("AI_GATEWAY_API_KEY is not set (put it in .env.local).");
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const text = request.parts.map((part) => {
      if (!("text" in part)) throw new Error("gateway provider does not take images in the factory path");
      return part.text;
    });
    const system = request.system ? `${request.system}\n\n${openrouterBrevity}` : null;
    const wire = gatewayWireIdentity(request, this.options.minOutputTokens ?? 4096);
    const body = (await postJson({
      url: `${(this.options.baseUrl ?? "https://ai-gateway.vercel.sh/v1").replace(/\/$/, "")}/chat/completions`,
      headers: { authorization: `Bearer ${this.options.apiKey}`, accept: "application/json" },
      body: {
        model: request.model,
        messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: text.join("\n\n") }],
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        // Reasoning tokens count against max_tokens. The floor stays 4096; thinking is off unless a role asked for it.
        max_tokens: wire.maxTokens,
        reasoning: { effort: wire.reasoningEffort },
        // Strict decoding (OpenAI) needs every object closed with additionalProperties: false.
        ...(request.jsonSchema ? { response_format: { type: "json_schema", json_schema: { name: "output", strict: true, schema: anthropicSchema(request.jsonSchema) } } } : {}),
        providerOptions: {
          gateway: {
            caching: "auto",
            ...(this.options.noTraining ? { disallowPromptTraining: true } : {}),
            ...(this.options.only?.length ? { only: this.options.only } : {}),
            ...(this.options.tags?.length ? { tags: this.options.tags } : {}),
          },
        },
      },
      model: request.model,
      label: "gateway",
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
      ...(typeof body.provider === "string" && body.provider ? { servedProvider: body.provider } : {}),
    };
  }
}
