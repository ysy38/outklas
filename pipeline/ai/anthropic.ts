import { postJson, type HttpOptions } from "./http";
import type { AIProvider, ModelRequest, ModelResponse } from "./types";

type MessagesBody = {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  model?: string;
  error?: { type?: string; message?: string };
};

/** 529 is Anthropic's "overloaded". */
const retryable = new Set([408, 429, 500, 502, 503, 504, 529]);

/** Keywords structured outputs reject; Zod enforces them after the call. */
const unsupported = new Set(["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "format"]);

/** Structured outputs need every object closed (`additionalProperties: false`). */
export function anthropicSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(anthropicSchema);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !unsupported.has(key))
    .map(([key, inner]) => [key, key === "properties" ? Object.fromEntries(Object.entries(inner as Record<string, unknown>).map(([name, field]) => [name, anthropicSchema(field)])) : anthropicSchema(inner)]);
  const schema = Object.fromEntries(entries) as Record<string, unknown>;
  return schema.type === "object" || schema.properties ? { ...schema, additionalProperties: false } : schema;
}

/**
 * Claude through the Messages API. JSON comes from `output_config.format` (Sonnet 5.5 refuses forced tool calls),
 * and no temperature is sent because Claude 5.x models reject it.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";

  constructor(private readonly options: HttpOptions & { apiKey: string; baseUrl?: string }) {
    if (typeof window !== "undefined") throw new Error("AnthropicProvider is server-only; it must never run in a browser.");
    if (!options.apiKey) throw new Error("CLAUDE_API_KEY is not set (put it in .env.local).");
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const body = (await postJson({
      url: `${(this.options.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/$/, "")}/messages`,
      headers: { "x-api-key": this.options.apiKey, "anthropic-version": "2023-06-01" },
      body: {
        model: request.model,
        max_tokens: request.maxOutputTokens ?? 4096,
        ...(request.system ? { system: request.system } : {}),
        messages: [
          {
            role: "user",
            content: request.parts.map((part) =>
              "text" in part ? { type: "text", text: part.text } : { type: "image", source: { type: "base64", media_type: part.image.mimeType, data: Buffer.from(part.image.data).toString("base64") } },
            ),
          },
        ],
        ...(request.jsonSchema ? { output_config: { format: { type: "json_schema", schema: anthropicSchema(request.jsonSchema) } } } : {}),
      },
      model: request.model,
      label: "anthropic",
      retryable,
      errorMessage: (parsed, raw) => (parsed as MessagesBody | null)?.error?.message ?? raw.slice(0, 200),
      options: this.options,
    })) as MessagesBody;
    const text = (body.content ?? []).map((block) => (block.type === "text" ? (block.text ?? "") : "")).join("");
    const input = body.usage?.input_tokens ?? 0;
    const output = body.usage?.output_tokens ?? 0;
    return { text, model: body.model ?? request.model, finishReason: body.stop_reason?.toUpperCase(), usage: { inputTokens: input, outputTokens: output, totalTokens: input + output } };
  }
}
