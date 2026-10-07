import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { dataRoot } from "../lib/artifacts";
import { analysisDraft, blindSolution, coerceAnalysisJson, transcription } from "@/modules/analysis/contract";
import { cachedGenerate } from "./cache";
import { loadAIConfig, type AIConfig } from "./config";
import { GeminiProvider } from "./gemini";
import { analyzerPromptVersion, analyzerResponseSchema, analyzerSystem, analyzerUser } from "./prompts/analyzer.v2";
import { responseSchema } from "./prompts/schema";
import { solvePromptVersion, solveSystem, solveUser, transcribePromptVersion, transcribeSystem, transcribeUser } from "./prompts/verifier.v1";
import type { AIProvider, AIResult, AIRole, AIService, ModelRequest, Usage } from "./types";

export class AIOutputError extends Error {
  constructor(
    message: string,
    readonly finishReason?: string,
  ) {
    super(message);
  }
}

/** Finish reasons where asking again cannot help: the provider declined to produce the content. */
const declined = new Set(["RECITATION", "SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"]);

export class NotImplementedRole extends Error {
  constructor(role: AIRole) {
    super(`The ${role} role is not implemented in Phase 2.`);
  }
}

const notImplemented = (role: AIRole) => async (): Promise<never> => {
  throw new NotImplementedRole(role);
};

const addUsage = (a: Usage, b: Usage): Usage => ({ inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens, totalTokens: a.totalTokens + b.totalTokens });

function parse<T>(text: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, error: "output is not valid JSON" };
  }
  const result = schema.safeParse(coerceAnalysisJson(json));
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
}

/** One JSON call with Zod validation and a single repair attempt; every request is cached by its hash. */
export async function structuredCall<T>(provider: AIProvider, promptVersion: string, schema: z.ZodType<T>, request: ModelRequest): Promise<AIResult<T>> {
  const full: ModelRequest = { ...request, jsonSchema: request.jsonSchema ?? responseSchema(schema) };
  const first = await cachedGenerate(provider, promptVersion, full);
  if (first.response.finishReason && declined.has(first.response.finishReason)) {
    throw new AIOutputError(`${promptVersion}: the model declined (${first.response.finishReason})`, first.response.finishReason);
  }
  let usage = first.response.usage;
  let outcome = parse(first.response.text, schema);
  let last = first;
  if (!outcome.ok) {
    const repair: ModelRequest = {
      ...full,
      parts: [...full.parts, { text: `Your previous output:\n${first.response.text.slice(0, 20_000)}\n\nIt was rejected: ${outcome.error}. Return the corrected JSON only.` }],
    };
    last = await cachedGenerate(provider, promptVersion, repair);
    usage = addUsage(usage, last.response.usage);
    outcome = parse(last.response.text, schema);
  }
  if (!outcome.ok) throw new AIOutputError(`${promptVersion}: ${outcome.error}`, last.response.finishReason);
  return { value: outcome.value, provider: provider.name, model: last.response.model, promptVersion, requestHash: last.requestHash, usage, cached: first.cached && last.cached };
}

/** Retries are logged for the pilot's pipeline-error count; the key never appears in them. */
function logRetry(event: object) {
  const dir = path.join(dataRoot(), "logs");
  mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, "ai-retries.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
}

export function createProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider({ apiKey: config.apiKey ?? "", maxRetries: config.maxRetries, onRetry: logRetry });
  }
}

export function createAIService(config: AIConfig = loadAIConfig(), provider: AIProvider = createProvider(config)): AIService {
  return {
    analyzer: {
      analyze: (input) =>
        structuredCall(provider, analyzerPromptVersion, analysisDraft, {
          model: config.models.analyzer,
          system: analyzerSystem(),
          parts: [{ text: analyzerUser(input) }],
          jsonSchema: analyzerResponseSchema(),
          temperature: 0,
          maxOutputTokens: 16_384,
        }),
    },
    verifier: {
      transcribe: (input) =>
        structuredCall(provider, transcribePromptVersion, transcription, {
          model: config.models.verifier,
          system: transcribeSystem,
          parts: [{ image: { mimeType: "image/png", data: input.image } }, { text: transcribeUser(input.label) }],
          temperature: 0,
          maxOutputTokens: 32_768,
        }),
      solve: (question) =>
        structuredCall(provider, solvePromptVersion, blindSolution, {
          model: config.models.verifier,
          system: solveSystem,
          parts: [{ text: solveUser(question) }],
          temperature: 0,
          maxOutputTokens: 4096,
        }),
    },
    generator: { generate: notImplemented("generator") },
    judge: { evaluate: notImplemented("judge") },
    explainer: { explain: notImplemented("explainer") },
    tutor: { respond: notImplemented("tutor") },
  };
}
