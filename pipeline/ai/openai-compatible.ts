import { postJson, type HttpOptions } from "./http";
import type { AIProvider, ModelRequest, ModelResponse } from "./types";

type ChatBody = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  detail?: string;
  error?: { message?: string } | string;
};

const retryable = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Any OpenAI-compatible chat endpoint (NVIDIA build.nvidia.com today). Reasoning models spend output tokens on
 * thinking before the JSON, so the output budget never drops below `minOutputTokens`.
 */
export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    readonly name: string,
    private readonly options: HttpOptions & { apiKey: string; baseUrl: string; minOutputTokens?: number },
  ) {
    if (typeof window !== "undefined") throw new Error(`${name} provider is server-only; it must never run in a browser.`);
    if (!options.apiKey) throw new Error(`The ${name} API key is not set (put it in .env.local).`);
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const text = request.parts.map((part) => {
      if (!("text" in part)) throw new Error(`${this.name} provider does not take images`);
      return part.text;
    });
    const body = (await postJson({
      url: `${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`,
      headers: { authorization: `Bearer ${this.options.apiKey}`, accept: "application/json" },
      body: {
        model: request.model,
        messages: [...(request.system ? [{ role: "system", content: request.system }] : []), { role: "user", content: text.join("\n\n") }],
        temperature: request.temperature ?? 0,
        max_tokens: Math.max(request.maxOutputTokens ?? 0, this.options.minOutputTokens ?? 16_384),
        ...(request.jsonSchema ? { response_format: { type: "json_schema", json_schema: { name: "output", schema: request.jsonSchema } } } : {}),
      },
      model: request.model,
      label: this.name,
      retryable,
      errorMessage: (parsed, raw) => {
        const chat = parsed as ChatBody | null;
        return (chat?.detail ?? (typeof chat?.error === "string" ? chat.error : chat?.error?.message) ?? raw.slice(0, 200)).toString();
      },
      options: this.options,
    })) as ChatBody;
    const choice = body.choices?.[0];
    const content = (choice?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const usage = body.usage ?? {};
    return {
      text: content,
      model: body.model ?? request.model,
      finishReason: choice?.finish_reason?.toUpperCase(),
      usage: { inputTokens: usage.prompt_tokens ?? 0, outputTokens: usage.completion_tokens ?? 0, totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0) },
    };
  }
}
