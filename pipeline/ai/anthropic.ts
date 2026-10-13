import { postJson, type HttpOptions } from "./http";
import type { AIProvider, ModelRequest, ModelResponse } from "./types";

type MessagesBody = {
  content?: ({ type: "text"; text: string } | { type: "tool_use"; name: string; input: unknown })[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  model?: string;
  error?: { type?: string; message?: string };
};

/** 529 is Anthropic's "overloaded". */
const retryable = new Set([408, 429, 500, 502, 503, 504, 529]);
const tool = "respond";

/** Claude through the Messages API. Structured output is a forced tool call whose input is the JSON. */
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
        temperature: request.temperature ?? 0,
        ...(request.system ? { system: request.system } : {}),
        messages: [
          {
            role: "user",
            content: request.parts.map((part) =>
              "text" in part ? { type: "text", text: part.text } : { type: "image", source: { type: "base64", media_type: part.image.mimeType, data: Buffer.from(part.image.data).toString("base64") } },
            ),
          },
        ],
        ...(request.jsonSchema ? { tools: [{ name: tool, description: "Return the result.", input_schema: request.jsonSchema }], tool_choice: { type: "tool", name: tool } } : {}),
      },
      model: request.model,
      label: "anthropic",
      retryable,
      errorMessage: (parsed, raw) => (parsed as MessagesBody | null)?.error?.message ?? raw.slice(0, 200),
      options: this.options,
    })) as MessagesBody;
    const blocks = body.content ?? [];
    const call = blocks.find((block) => block.type === "tool_use");
    const text = call && "input" in call ? JSON.stringify(call.input) : blocks.map((block) => ("text" in block ? block.text : "")).join("");
    const input = body.usage?.input_tokens ?? 0;
    const output = body.usage?.output_tokens ?? 0;
    return { text, model: body.model ?? request.model, finishReason: body.stop_reason?.toUpperCase(), usage: { inputTokens: input, outputTokens: output, totalTokens: input + output } };
  }
}
