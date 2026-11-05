import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { requestHash } from "./cache";
import { AnthropicProvider } from "./anthropic";
import { loadAIConfig, modelDefaults, parseModel, sameModel } from "./config";
import { AIRequestError, GeminiProvider, geminiBody, type Transport } from "./gemini";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { isBatchModel, OpenRouterBatchClient, OpenRouterProvider, openrouterMessageText, openrouterUsage, stripBatchSuffix } from "./openrouter";
import { GatewayProvider } from "./gateway";
import { extractJsonText, normalizeUnitScale } from "./service";
import { loadPrices, priceFor } from "./prices";
import { analyzerResponseSchema } from "./prompts/analyzer.v2";
import { withRefEnums } from "./prompts/schema";
import { AIOutputError, assertIndependent, createAIService, JudgeNotIndependent, NotImplementedRole, structuredCall } from "./service";
import type { AIProvider, ModelRequest, ModelResponse } from "./types";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "tomo-ai-"));
  process.env.ANALYSIS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ANALYSIS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

const ok = (text: string) => ({ status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2 }, modelVersion: "m-1" }) });
const fail = (status: number, retryDelay?: string) => ({ status, text: async () => JSON.stringify({ error: { code: status, message: "busy", details: retryDelay ? [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay }] : [] } }) });

function fakeProvider(outputs: string[]): AIProvider & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    name: "fake",
    calls,
    async generate(request): Promise<ModelResponse> {
      calls.push(request);
      return { text: outputs[Math.min(calls.length - 1, outputs.length - 1)], model: request.model, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
    },
  };
}

describe("config", () => {
  it("keeps model names in one place and lets env override them", () => {
    expect(loadAIConfig({}).models).toEqual(modelDefaults);
    const config = loadAIConfig({ ANALYZER_MODEL: "a", GENERATOR_MODEL: "same", JUDGE_MODEL: "same", AI_MAX_RETRIES: "2", GEMINI_API_KEY: " k ", CLAUDE_API_KEY: "c" });
    expect(config.models.analyzer).toBe("a");
    expect(config.apiKey).toBe("k");
    expect(config.maxRetries).toBe(2);
    expect(config.warnings).toHaveLength(1);
    expect(loadAIConfig({}).apiKey).toBeNull();
    expect(() => loadAIConfig({ AI_PROVIDER: "openai" })).toThrow();
  });

  it("reads a provider prefix per role and compares models by provider and name", () => {
    expect(parseModel("gemini-3.1-flash-lite")).toEqual({ provider: "gemini", model: "gemini-3.1-flash-lite" });
    expect(parseModel("nvidia:nvidia/nemotron-3-super-120b-a12b")).toEqual({ provider: "nvidia", model: "nvidia/nemotron-3-super-120b-a12b" });
    expect(parseModel("anthropic:claude-haiku-5-5")).toEqual({ provider: "anthropic", model: "claude-haiku-5-5" });
    expect(parseModel("openrouter:google/gemini-3.8-flash")).toEqual({ provider: "openrouter", model: "google/gemini-3.8-flash" });
    expect(parseModel("openrouter:google/gemini-3.8-flash:batch")).toEqual({ provider: "openrouter", model: "google/gemini-3.8-flash:batch" });
    expect(parseModel("openrouter:anthropic/claude-haiku-5.5:batch")).toEqual({ provider: "openrouter", model: "anthropic/claude-haiku-5.5:batch" });
    expect(sameModel("gemini:gemini-x", "gemini-x")).toBe(true);
    expect(sameModel("nvidia:m", "anthropic:m")).toBe(false);
    expect(sameModel("openrouter:google/m:batch", "openrouter:google/m")).toBe(false);
    const config = loadAIConfig({ GEMINI_API_KEY: "g", NVIDIA_API_KEY: "n", GENERATOR_MODEL: "g1", DISTRACTOR_MODEL: "g2", EXPLANATION_MODEL: "g3", DISTRACTOR_JUDGE_MODEL: "nvidia:j", FINAL_JUDGE_MODEL: "anthropic:claude-haiku-5-5" });
    expect(config.keys).toEqual({ gemini: "g", nvidia: "n", anthropic: null, openrouter: null, gateway: null });
    expect(config.warnings).toEqual(["judge uses anthropic, but its API key is not set."]);
    expect(loadAIConfig({ ANTHROPIC_API_KEY: "a" }).keys.anthropic).toBe("a");
    expect(loadAIConfig({}).nvidiaBaseUrl).toBe("https://integrate.api.nvidia.com/v1");
    expect(loadAIConfig({ OPENROUTER_API_KEY: "or" }).keys.openrouter).toBe("or");
    expect(loadAIConfig({}).openrouterBaseUrl).toBe("https://openrouter.ai/api/v1");
    expect(loadAIConfig({ OPENROUTER_DATA_COLLECTION: "deny" }).openrouterDataCollection).toBe("deny");
    expect(() => loadAIConfig({ OPENROUTER_DATA_COLLECTION: "maybe" })).toThrow(/OPENROUTER_DATA_COLLECTION/);
  });

  it("runs the factory roles on Claude by default: Haiku writes, Sonnet judges", () => {
    const { models, warnings } = loadAIConfig({ GEMINI_API_KEY: "g", CLAUDE_API_KEY: "c" });
    expect([models.generator, models.distractor, models.explanation].map((setting) => parseModel(setting))).toEqual(Array(3).fill({ provider: "anthropic", model: "claude-haiku-5-5" }));
    expect([models.distractorJudge, models.judge].map((setting) => parseModel(setting))).toEqual(Array(2).fill({ provider: "anthropic", model: "claude-sonnet-5-5" }));
    expect(warnings).toEqual([]);
  });

  it("reads share thresholds as fractions and word-count thresholds as whole numbers", () => {
    expect(loadAIConfig({ ANSWER_REUSE_TOKEN_OVERLAP: "0.7", STEM_SHARED_CONTENT_WORDS: "5" }).thresholds).toMatchObject({ answerReuseTokenOverlap: 0.7, stemSharedContentWords: 5 });
    expect(() => loadAIConfig({ ANSWER_SHARED_CONTENT_WORDS: "0.5" })).toThrow(/whole number/);
    expect(() => loadAIConfig({ ANSWER_REUSE_TOKEN_OVERLAP: "4" })).toThrow(/\(0, 1\]/);
  });
});

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) => ({ status, text: async () => JSON.stringify(body), headers: { get: (name: string) => headers[name] ?? null } });

describe("OpenRouterProvider", () => {
  it("sends JSON schema, cache_control on the system prefix, data_collection deny, and peels cache tokens", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    const provider = new OpenRouterProvider({
      apiKey: "or-key",
      dataCollection: "deny",
      title: "tomo-factory",
      transport: async (url, init) => {
        seen.push({ url, headers: init.headers, body: init.body });
        return reply(200, {
          choices: [{ message: { content: '<think>x</think>\n{"ok":true}' }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1000, completion_tokens: 20, total_tokens: 1020, prompt_tokens_details: { cached_tokens: 800, cache_write_tokens: 50 } },
          model: "google/gemini-3.8-flash",
        });
      },
    });
    const response = await provider.generate({
      model: "google/gemini-3.8-flash",
      system: "stable rules",
      parts: [{ text: "item" }],
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } } },
      maxOutputTokens: 512,
    });
    expect(response.text).toBe('{"ok":true}');
    expect(response.usage).toEqual({ inputTokens: 200, outputTokens: 20, totalTokens: 1020, cacheWriteTokens: 50, cacheReadTokens: 800 });
    expect(seen[0].url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(seen[0].headers.authorization).toBe("Bearer or-key");
    expect(seen[0].headers["X-OpenRouter-Title"]).toBe("tomo-factory");
    const body = JSON.parse(seen[0].body);
    expect(body.model).toBe("google/gemini-3.8-flash");
    expect(body.messages[0]).toEqual({ role: "system", content: [{ type: "text", text: expect.stringContaining("stable rules"), cache_control: { type: "ephemeral" } }] });
    expect(body.messages[0].content[0].text).toContain("≤20 words");
    expect(body.response_format).toEqual({ type: "json_schema", json_schema: { name: "output", strict: true, schema: { type: "object", properties: { ok: { type: "boolean" } } } } });
    expect(body.provider).toEqual({ data_collection: "deny", require_parameters: true });
    expect(body.reasoning).toEqual({ exclude: true });
    expect(body.max_tokens).toBe(4096);
  });

  it("falls back to reasoning text when content is empty and extracts fenced JSON", async () => {
    expect(openrouterMessageText({ content: "", reasoning: '```json\n{"ok":true}\n```' })).toContain('"ok":true');
    expect(extractJsonText('Here you go:\n```json\n{"a":1,"b":{"c":2}}\n```\nthanks')).toBe('{"a":1,"b":{"c":2}}');
    expect(extractJsonText('prefix {"x":1} trailing')).toBe('{"x":1}');

    const provider = new OpenRouterProvider({
      apiKey: "or-key",
      transport: async () =>
        reply(200, {
          choices: [{ message: { content: "", reasoning: '{"ok":true}' }, finish_reason: "length" }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          model: "deepseek/deepseek-v4.1-flash",
        }),
    });
    const response = await provider.generate({ model: "deepseek/deepseek-v4.1-flash", parts: [{ text: "item" }], maxOutputTokens: 512 });
    expect(response.text).toBe('{"ok":true}');
    expect(response.finishReason).toBe("LENGTH");
  });

  it("rejects :batch models on sync and supports batch submit/poll hooks", async () => {
    const provider = new OpenRouterProvider({ apiKey: "k", transport: async () => reply(200, {}) });
    await expect(provider.generate({ model: "google/gemini-3.8-flash:batch", parts: [{ text: "x" }] })).rejects.toThrow(/batch model/);
    expect(isBatchModel("google/m:batch")).toBe(true);
    expect(stripBatchSuffix("google/m:batch")).toBe("google/m");
    expect(openrouterUsage({ prompt_tokens: 10, completion_tokens: 2, prompt_tokens_details: { cached_tokens: 4 } })).toEqual({
      inputTokens: 6,
      outputTokens: 2,
      totalTokens: 12,
      cacheReadTokens: 4,
    });

    const calls: { method: string; url: string; body?: string }[] = [];
    const jobs = [
      { id: "b1", status: "validating" },
      { id: "b1", status: "completed", results: [{ custom_id: "1", response: { ok: 1 } }] },
    ];
    const client = new OpenRouterBatchClient({
      apiKey: "k",
      http: async (url, init) => {
        calls.push({ method: init.method, url, body: init.body });
        if (init.method === "POST") return reply(202, { id: "b1", status: "validating" });
        return reply(200, jobs.shift());
      },
    });
    const submitted = await client.submit({
      model: "anthropic/claude-haiku-5.5:batch",
      requests: [{ custom_id: "1", body: { messages: [{ role: "user", content: "hi" }], response_format: { type: "json_schema", json_schema: { name: "o", schema: { type: "object" } } } } }],
    });
    expect(submitted.id).toBe("b1");
    expect(JSON.parse(calls[0].body!).model).toBe("anthropic/claude-haiku-5.5");
    const done = await client.poll("b1", { intervalMs: 1, sleep: async () => {} });
    expect(done.status).toBe("completed");
    expect(done.results?.[0].custom_id).toBe("1");
  });

  it("looks up openrouter prices including :batch keys", () => {
    const prices = loadPrices({ FACTORY_PRICES: path.join(__dirname, "prices.openrouter.json") })!;
    expect(priceFor(prices.table, "openrouter:google/gemini-3.8-flash:batch")).toMatchObject({ in: 0.375, out: 1.875 });
    expect(priceFor(prices.table, "openrouter:deepseek/deepseek-v4.1-flash")).toMatchObject({ in: 0.045, out: 0.5 });
  });
});

describe("GatewayProvider", () => {
  it("posts chat completions with a JSON schema, auto caching, no-training routing and a reasoning effort", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    const provider = new GatewayProvider({
      apiKey: "gw-key",
      noTraining: true,
      tags: ["app:tomo-factory"],
      transport: async (url, init) => {
        seen.push({ url, headers: init.headers, body: init.body });
        return reply(200, {
          choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }],
          usage: { prompt_tokens: 900, completion_tokens: 30, total_tokens: 930, prompt_tokens_details: { cached_tokens: 600 } },
          model: "anthropic/claude-haiku-5.5",
        });
      },
    });
    const response = await provider.generate({
      model: "anthropic/claude-haiku-5.5",
      system: "stable rules",
      parts: [{ text: "item" }],
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } } },
      temperature: 0,
      thinking: "low",
    });
    expect(response.text).toBe('{"ok":true}');
    expect(response.usage).toEqual({ inputTokens: 300, outputTokens: 30, totalTokens: 930, cacheReadTokens: 600 });
    expect(seen[0].url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions");
    expect(seen[0].headers.authorization).toBe("Bearer gw-key");
    const body = JSON.parse(seen[0].body);
    expect(body.messages[0]).toEqual({ role: "system", content: expect.stringContaining("stable rules") });
    expect(body.response_format).toEqual({ type: "json_schema", json_schema: { name: "output", strict: true, schema: { type: "object", properties: { ok: { type: "boolean" } }, additionalProperties: false } } });
    expect(body.providerOptions).toEqual({ gateway: { caching: "auto", disallowPromptTraining: true, tags: ["app:tomo-factory"] } });
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.max_tokens).toBe(4096);
  });

  it("routes gateway: settings to the gateway key", () => {
    expect(parseModel("gateway:anthropic/claude-haiku-5.5")).toEqual({ provider: "gateway", model: "anthropic/claude-haiku-5.5" });
    const config = loadAIConfig({ AI_GATEWAY_API_KEY: "gw", GENERATOR_MODEL: "gateway:anthropic/claude-haiku-5.5" });
    expect(config.keys.gateway).toBe("gw");
    expect(config.gatewayNoTraining).toBe(true);
    expect(config.distractorJudgeStyle).toBe("rubric");
    expect(loadAIConfig({ FACTORY_DISTRACTOR_JUDGE: "verdict" }).distractorJudgeStyle).toBe("verdict");
    expect(() => loadAIConfig({ FACTORY_DISTRACTOR_JUDGE: "vibes" })).toThrow(/FACTORY_DISTRACTOR_JUDGE/);
  });
});

describe("normalizeUnitScale", () => {
  const schema = z.object({ question_number: z.number().int().min(1).max(200), report: z.object({ a: z.number().min(0).max(1), b: z.number().min(0).max(1), count: z.number().int() }) });
  const json = z.toJSONSchema(schema) as Parameters<typeof normalizeUnitScale>[1];

  it("reads every unit field of an object on the 0–5 scale once one of them is above 1, and leaves other numbers alone", () => {
    expect(normalizeUnitScale({ question_number: 3, report: { a: 4, b: 1, count: 3 } }, json)).toEqual({ question_number: 3, report: { a: 0.8, b: 0.2, count: 3 } });
  });

  it("keeps a 0..1 answer as it is", () => {
    expect(normalizeUnitScale({ question_number: 3, report: { a: 1, b: 0.3, count: 2 } }, json)).toEqual({ question_number: 3, report: { a: 1, b: 0.3, count: 2 } });
  });
});

describe("OpenAI-compatible provider (NVIDIA)", () => {
  it("sends a bearer key, a system message and a JSON schema, keeps a reasoning budget and drops thinking", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    const provider = new OpenAICompatibleProvider("nvidia", {
      apiKey: "nv-key",
      baseUrl: "https://integrate.api.nvidia.com/v1/",
      transport: async (url, init) => {
        seen.push({ url, headers: init.headers, body: init.body });
        return reply(200, { choices: [{ message: { content: '<think>hmm</think>\n{"x":1}' }, finish_reason: "stop" }], usage: { prompt_tokens: 9, completion_tokens: 4, total_tokens: 13 }, model: "nvidia/m" });
      },
    });
    const response = await provider.generate({ model: "nvidia/m", system: "sys", parts: [{ text: "hi" }], jsonSchema: { type: "object" }, maxOutputTokens: 1024 });
    expect(response).toEqual({ text: '{"x":1}', model: "nvidia/m", finishReason: "STOP", usage: { inputTokens: 9, outputTokens: 4, totalTokens: 13 } });
    expect(seen[0].url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect(seen[0].headers.authorization).toBe("Bearer nv-key");
    const body = JSON.parse(seen[0].body);
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
    ]);
    expect(body.max_tokens).toBe(16_384);
    expect(body.response_format).toEqual({ type: "json_schema", json_schema: { name: "output", schema: { type: "object" } } });
    await expect(provider.generate({ model: "m", parts: [{ image: { mimeType: "image/png", data: new Uint8Array([1]) } }] })).rejects.toThrow(/images/);
  });

  it("retries a busy worker with Retry-After and stops on an hours-long wait", async () => {
    const delays: number[] = [];
    const responses = [reply(503, { detail: "Worker local total request limit reached" }, { "retry-after": "2" }), reply(200, { choices: [{ message: { content: "{}" } }] })];
    const provider = new OpenAICompatibleProvider("nvidia", { apiKey: "k", baseUrl: "https://x/v1", transport: async () => responses.shift()!, sleep: async (ms) => void delays.push(ms) });
    expect((await provider.generate({ model: "m", parts: [{ text: "x" }] })).text).toBe("{}");
    expect(delays).toEqual([2500]);
    const exhausted = new OpenAICompatibleProvider("nvidia", { apiKey: "k", baseUrl: "https://x/v1", transport: async () => reply(429, { detail: "quota" }, { "retry-after": "40000" }), sleep: async () => {} });
    await expect(exhausted.generate({ model: "m", parts: [{ text: "x" }] })).rejects.toMatchObject({ status: 429, retryable: false });
    const missing = new OpenAICompatibleProvider("nvidia", { apiKey: "k", baseUrl: "https://x/v1", transport: async () => reply(404, { detail: "Function not found for account" }), sleep: async () => {} });
    await expect(missing.generate({ model: "m", parts: [{ text: "x" }] })).rejects.toThrow(/404: Function not found/);
    expect(() => new OpenAICompatibleProvider("nvidia", { apiKey: "", baseUrl: "https://x/v1" })).toThrow(/key/);
  });
});

describe("AnthropicProvider", () => {
  it("forces a tool call for JSON and returns the tool input as the text", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    const provider = new AnthropicProvider({
      apiKey: "cl-key",
      transport: async (url, init) => {
        seen.push({ url, headers: init.headers, body: init.body });
        return reply(200, { content: [{ type: "text", text: '{"x":1}' }], stop_reason: "end_turn", usage: { input_tokens: 20, output_tokens: 5 }, model: "claude-haiku-5-5" });
      },
    });
    const schema = { type: "object", properties: { x: { type: "number", minimum: 0, maximum: 1 }, list: { type: "array", items: { type: "object", properties: { y: { type: "string" } } } } } };
    const response = await provider.generate({ model: "claude-haiku-5-5", system: "sys", parts: [{ text: "hi" }], jsonSchema: schema, temperature: 0.4 });
    expect(response).toEqual({ text: '{"x":1}', model: "claude-haiku-5-5", finishReason: "END_TURN", usage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 } });
    expect(seen[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect(seen[0].headers).toMatchObject({ "x-api-key": "cl-key", "anthropic-version": "2023-06-01" });
    const body = JSON.parse(seen[0].body);
    expect(body).toMatchObject({ model: "claude-haiku-5-5", system: [{ type: "text", text: "sys", cache_control: { type: "ephemeral" } }], max_tokens: 4096 });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("tool_choice");
    expect(body.output_config.format).toEqual({
      type: "json_schema",
      schema: { type: "object", additionalProperties: false, properties: { x: { type: "number" }, list: { type: "array", items: { type: "object", additionalProperties: false, properties: { y: { type: "string" } } } } } },
    });
    expect(body.messages[0].content).toEqual([{ type: "text", text: "hi" }]);
  });

  it("caches the system prompt only, and reports cache writes and reads apart from fresh input", async () => {
    const bodies: Record<string, unknown>[] = [];
    const usages = [
      { input_tokens: 40, output_tokens: 10, cache_creation_input_tokens: 1200, cache_read_input_tokens: 0 },
      { input_tokens: 45, output_tokens: 12, cache_creation_input_tokens: 0, cache_read_input_tokens: 1200 },
    ];
    const provider = new AnthropicProvider({
      apiKey: "k",
      transport: async (_url, init) => {
        bodies.push(JSON.parse(init.body));
        return reply(200, { content: [{ type: "text", text: "{}" }], usage: usages.shift(), model: "claude-sonnet-5-5" });
      },
    });
    const request = { model: "claude-sonnet-5-5", system: "long stable rules", parts: [{ text: "item 1" }] };
    const first = await provider.generate(request);
    const second = await provider.generate({ ...request, parts: [{ text: "item 2" }] });
    expect(first.usage).toEqual({ inputTokens: 40, outputTokens: 10, totalTokens: 1250, cacheWriteTokens: 1200 });
    expect(second.usage).toEqual({ inputTokens: 45, outputTokens: 12, totalTokens: 1257, cacheReadTokens: 1200 });
    for (const body of bodies) {
      expect(body.system).toEqual([{ type: "text", text: "long stable rules", cache_control: { type: "ephemeral" } }]);
      expect(body).not.toHaveProperty("cache_control");
      expect(JSON.stringify(body.messages)).not.toMatch(/cache_control/);
    }
  });

  it("sends a one-hour breakpoint or none, as configured", async () => {
    const bodies: Record<string, unknown>[] = [];
    const transport = async (_url: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return reply(200, { content: [{ type: "text", text: "{}" }], usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 900, cache_creation: { ephemeral_1h_input_tokens: 900 } } });
    };
    const hour = await new AnthropicProvider({ apiKey: "k", transport, promptCache: "1h" }).generate({ model: "m", system: "s", parts: [{ text: "x" }] });
    await new AnthropicProvider({ apiKey: "k", transport, promptCache: "off" }).generate({ model: "m", system: "s", parts: [{ text: "x" }] });
    expect(bodies[0].system).toEqual([{ type: "text", text: "s", cache_control: { type: "ephemeral", ttl: "1h" } }]);
    expect(hour.usage).toMatchObject({ cacheWriteTokens: 900, cacheWrite1hTokens: 900 });
    expect(bodies[1].system).toBe("s");
    expect(() => loadAIConfig({ ANTHROPIC_PROMPT_CACHE: "forever" })).toThrow(/ANTHROPIC_PROMPT_CACHE/);
    expect(loadAIConfig({}).promptCache).toBe("5m");
  });

  it("retries overload, but not an empty credit balance", async () => {
    const delays: number[] = [];
    const responses = [reply(529, { error: { type: "overloaded_error", message: "Overloaded" } }), reply(200, { content: [{ type: "text", text: "OK" }] })];
    const provider = new AnthropicProvider({ apiKey: "k", transport: async () => responses.shift()!, sleep: async (ms) => void delays.push(ms) });
    expect((await provider.generate({ model: "m", parts: [{ text: "x" }] })).text).toBe("OK");
    expect(delays).toEqual([2000]);
    const broke = new AnthropicProvider({ apiKey: "k", transport: async () => reply(400, { error: { type: "invalid_request_error", message: "Your credit balance is too low" } }), sleep: async () => {} });
    await expect(broke.generate({ model: "m", parts: [{ text: "x" }] })).rejects.toMatchObject({ status: 400, retryable: false, message: expect.stringMatching(/credit balance/) });
  });
});

describe("provider routing", () => {
  it("sends each role to its own provider with the bare model name", async () => {
    const gemini = fakeProvider(['{"answer":"B","confidence":0.9,"rationale":"x"}']);
    const nvidia = fakeProvider(['{"answer":"B","confidence":0.9,"rationale":"x"}']);
    const config = loadAIConfig({ GEMINI_API_KEY: "g", VERIFIER_MODEL: "nvidia:nvidia/judge", ANALYZER_MODEL: "gemini-a" });
    const service = createAIService(config, { gemini, nvidia });
    await service.verifier.solve({ number: 1, section: "sentence", layout: "blank", stimulusKey: null, stimulus: null, stem: "x ----.", options: { A: "a", B: "b", C: "c", D: "d", E: "e" }, translationDirection: null });
    expect(nvidia.calls.map((call) => call.model)).toEqual(["nvidia/judge"]);
    expect(gemini.calls).toHaveLength(0);
    expect(() => assertIndependent(loadAIConfig({ DISTRACTOR_MODEL: "nvidia:m", DISTRACTOR_JUDGE_MODEL: "nvidia:m" }))).toThrow(JudgeNotIndependent);
    expect(() => assertIndependent(loadAIConfig({ GENERATOR_MODEL: "gemini:x", FINAL_JUDGE_MODEL: "x" }))).toThrow(JudgeNotIndependent);
    expect(() => assertIndependent(loadAIConfig({ DISTRACTOR_JUDGE_MODEL: "nvidia:gemini-flash-lite-latest" }))).not.toThrow();
  });
});

describe("GeminiProvider", () => {
  it("sends the key as a header, never in the URL, and drops thought parts", async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    const transport: Transport = async (url, init) => {
      seen.push({ url, headers: init.headers, body: init.body });
      return ok('{"x":1}');
    };
    const provider = new GeminiProvider({ apiKey: "secret-key", transport });
    const response = await provider.generate({ model: "gemini-test", system: "sys", parts: [{ text: "hi" }, { image: { mimeType: "image/png", data: new Uint8Array([1, 2]) } }], jsonSchema: { type: "object" } });
    expect(response.text).toBe('{"x":1}');
    expect(response.usage).toEqual({ inputTokens: 10, outputTokens: 7, totalTokens: 17 });
    expect(seen[0].url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(seen[0].url).not.toContain("secret-key");
    expect(seen[0].headers["x-goog-api-key"]).toBe("secret-key");
    const body = JSON.parse(seen[0].body);
    expect(body.systemInstruction.parts[0].text).toBe("sys");
    expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: "image/png", data: "AQI=" });
    expect(body.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json", responseJsonSchema: { type: "object" } });
  });

  it("retries 429/503 using RetryInfo, then gives up", async () => {
    const delays: number[] = [];
    const events: number[] = [];
    const responses = [fail(503), fail(429, "3s"), ok("done")];
    const provider = new GeminiProvider({ apiKey: "k", transport: async () => responses.shift()!, sleep: async (ms) => void delays.push(ms), onRetry: (event) => events.push(event.status) });
    expect((await provider.generate({ model: "m", parts: [{ text: "x" }] })).text).toBe("done");
    expect(delays).toEqual([2000, 3500]);
    expect(events).toEqual([503, 429]);

    const stubborn = new GeminiProvider({ apiKey: "k", maxRetries: 1, transport: async () => fail(503), sleep: async () => {} });
    await expect(stubborn.generate({ model: "m", parts: [{ text: "x" }] })).rejects.toBeInstanceOf(AIRequestError);
    const denied = new GeminiProvider({ apiKey: "k", transport: async () => fail(403), sleep: async () => {} });
    await expect(denied.generate({ model: "m", parts: [{ text: "x" }] })).rejects.toMatchObject({ status: 403, retryable: false });
  });

  it("gives up at once when the quota asks for an hours-long wait", async () => {
    const delays: number[] = [];
    const exhausted = new GeminiProvider({ apiKey: "k", transport: async () => fail(429, "44073s"), sleep: async (ms) => void delays.push(ms) });
    await expect(exhausted.generate({ model: "m", parts: [{ text: "x" }] })).rejects.toMatchObject({ status: 429, retryable: false, message: expect.stringMatching(/quota exhausted/) });
    expect(delays).toEqual([]);
  });

  it("treats a timeout as retryable", async () => {
    let calls = 0;
    const provider = new GeminiProvider({
      apiKey: "k",
      maxRetries: 1,
      sleep: async () => {},
      transport: async () => {
        calls += 1;
        if (calls === 1) throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
        return ok("late");
      },
    });
    expect((await provider.generate({ model: "m", parts: [{ text: "x" }] })).text).toBe("late");
  });

  it("refuses to run without a key or in a browser", () => {
    expect(() => new GeminiProvider({ apiKey: "" })).toThrow(/GEMINI_API_KEY/);
    (globalThis as { window?: unknown }).window = {};
    try {
      expect(() => new GeminiProvider({ apiKey: "k" })).toThrow(/server-only/);
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it("omits optional generation settings", () => {
    expect(geminiBody({ model: "m", parts: [{ text: "x" }] }).generationConfig).toEqual({ temperature: 0 });
  });

  it("sends a thinking level only when one is set", () => {
    expect(geminiBody({ model: "m", parts: [{ text: "x" }], thinking: "minimal" }).generationConfig).toEqual({ temperature: 0, thinkingConfig: { thinkingLevel: "MINIMAL" } });
  });

  it("splits the implicitly cached prefix out of the prompt tokens", async () => {
    const usageMetadata = { promptTokenCount: 5000, cachedContentTokenCount: 4096, candidatesTokenCount: 10, thoughtsTokenCount: 5, totalTokenCount: 5015 };
    const transport: Transport = async () => ({ status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }], usageMetadata }) });
    const response = await new GeminiProvider({ apiKey: "k", transport }).generate({ model: "m", system: "rubric", parts: [{ text: "item" }] });
    expect(response.usage).toEqual({ inputTokens: 904, outputTokens: 15, totalTokens: 5015, cacheReadTokens: 4096 });
  });
});

describe("structuredCall", () => {
  const schema = z.object({ answer: z.enum(["A", "B"]) });

  it("caches by request hash so the same input is never sent twice", async () => {
    const provider = fakeProvider(['{"answer":"A"}']);
    const request = { model: "m", parts: [{ text: "q" }] };
    const first = await structuredCall(provider, "p.v1", schema, request);
    const second = await structuredCall(provider, "p.v1", schema, request);
    expect(first.value).toEqual({ answer: "A" });
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.requestHash).toBe(first.requestHash);
    expect(provider.calls).toHaveLength(1);
    await structuredCall(provider, "p.v2", schema, request);
    expect(provider.calls).toHaveLength(2);
  });

  it("repairs once, then fails loudly", async () => {
    const repaired = fakeProvider(['{"answer":"C"}', '{"answer":"B"}']);
    expect((await structuredCall(repaired, "p", schema, { model: "m", parts: [{ text: "q" }] })).value).toEqual({ answer: "B" });
    expect(repaired.calls[1].parts.at(-1)).toMatchObject({ text: expect.stringContaining("rejected") });
    const broken = fakeProvider(["not json"]);
    await expect(structuredCall(broken, "p", schema, { model: "m", parts: [{ text: "other" }] })).rejects.toBeInstanceOf(AIOutputError);
  });

  it("hashes images by content, not by bytes in the key", () => {
    const image = (data: number[]): ModelRequest => ({ model: "m", parts: [{ image: { mimeType: "image/png", data: new Uint8Array(data) } }] });
    expect(requestHash("g", "p", image([1]))).toBe(requestHash("g", "p", image([1])));
    expect(requestHash("g", "p", image([1]))).not.toBe(requestHash("g", "p", image([2])));
  });
});

describe("analyzer response schema", () => {
  it("turns reference fields into enums of allowed nodes and keeps nullable fields nullable", () => {
    const schema = analyzerResponseSchema() as { properties: Record<string, any> };
    const distractor = schema.properties.distractors.items.properties;
    expect(distractor.type.enum).toContain("distractor_type:wrong_discourse_relation");
    expect(distractor.type.enum.every((value: string) => value.startsWith("distractor_type:"))).toBe(true);
    expect(distractor.expresses.anyOf.find((option: any) => option.type === "null")).toBeTruthy();
    expect(distractor.expresses.anyOf.find((option: any) => option.enum).enum).toContain("connector:although");
    expect(schema.properties.prerequisites.items.enum).not.toContain("misconception:concession_vs_contrast");
    expect(JSON.stringify(schema).length).toBeLessThan(20_000);
    expect(() => withRefEnums({ type: "object", properties: { n: { type: "number" } } }, { n: "grammar" })).toThrow();
  });
});

describe("AIService roles", () => {
  it("exposes separate roles; explainer and tutor are not implemented yet", async () => {
    const service = createAIService(loadAIConfig({}), fakeProvider(["{}"]));
    expect(typeof service.generator.generate).toBe("function");
    expect(typeof service.judge.evaluate).toBe("function");
    await expect(service.explainer.explain("q", "A")).rejects.toBeInstanceOf(NotImplementedRole);
    await expect(service.tutor.respond("s", "hi")).rejects.toBeInstanceOf(NotImplementedRole);
    expect(typeof service.analyzer.analyze).toBe("function");
    expect(typeof service.verifier.solve).toBe("function");
  });

  it("adds a per-role thinking level to that role's requests only", async () => {
    expect(loadAIConfig({ FINAL_JUDGE_THINKING: "Low", DISTRACTOR_JUDGE_THINKING: "minimal" }).thinking).toEqual({ judge: "low", distractorJudge: "minimal" });
    expect(loadAIConfig({ JUDGE_THINKING: "high" }).thinking).toEqual({ judge: "high" });
    expect(() => loadAIConfig({ GENERATOR_THINKING: "none" })).toThrow(/GENERATOR_THINKING must be one of/);
    const provider = fakeProvider(['{"answer":"B","confidence":0.9,"rationale":"x"}']);
    const config = loadAIConfig({ VERIFIER_THINKING: "minimal" });
    const question = { number: 1, section: "sentence", layout: "blank", stimulusKey: null, stimulus: null, stem: "x ----.", options: { A: "a", B: "b", C: "c", D: "d", E: "e" }, translationDirection: null } as const;
    await createAIService(config, provider).verifier.solve(question);
    await createAIService(loadAIConfig({}), provider).verifier.solve({ ...question, stem: "y ----." });
    expect(provider.calls[0].thinking).toBe("minimal");
    expect("thinking" in provider.calls[1]).toBe(false);
  });
});
