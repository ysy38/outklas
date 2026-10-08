import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { requestHash } from "./cache";
import { loadAIConfig, modelDefaults } from "./config";
import { AIRequestError, GeminiProvider, geminiBody, type Transport } from "./gemini";
import { analyzerResponseSchema } from "./prompts/analyzer.v2";
import { withRefEnums } from "./prompts/schema";
import { AIOutputError, createAIService, NotImplementedRole, structuredCall } from "./service";
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
    const config = loadAIConfig({ ANALYZER_MODEL: "a", GENERATOR_MODEL: "same", JUDGE_MODEL: "same", AI_MAX_RETRIES: "2", GEMINI_API_KEY: " k " });
    expect(config.models.analyzer).toBe("a");
    expect(config.apiKey).toBe("k");
    expect(config.maxRetries).toBe(2);
    expect(config.warnings).toHaveLength(1);
    expect(loadAIConfig({}).apiKey).toBeNull();
    expect(() => loadAIConfig({ AI_PROVIDER: "openai" })).toThrow();
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
});
