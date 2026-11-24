import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { requestHash } from "./ai/cache";
import { OpenRouterProvider, openrouterUsage } from "./ai/openrouter";
import {
  excludeTrueIsNotDisabled,
  existingReasoningHidesOutput,
  nextControlledQualityComparison,
  openrouterOutputBudgetOk,
  openrouterVisibleOutputTokens,
  resolveOpenRouterReasoning,
  selectOpenRouterReasoningProfile,
  UnsupportedReasoningProfileError,
  v6WriterExperimentReasoningProfiles,
} from "./ai/openrouter-reasoning";
import {
  assessModelReasoningConfig,
  modelReasoningConfigOutputDir,
  openrouterReasoningProfileSchema,
  writeModelReasoningConfigReport,
} from "./model-reasoning-config";

const reply = (status: number, body: unknown) => ({
  status,
  text: async () => JSON.stringify(body),
  headers: { get: () => null },
});

const jsonSchema = {
  type: "object",
  properties: {
    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
  },
  required: ["options"],
  additionalProperties: false,
};

async function captureBody(input: {
  model: string;
  reasoningProfile?: "disabled" | "low" | "default" | "existing";
  reasoningProfiles?: Record<string, "disabled" | "low" | "default" | "existing">;
  apiKey?: string;
}) {
  const seen: { headers: Record<string, string>; body: string }[] = [];
  const apiKey = input.apiKey ?? "or-key";
  const provider = new OpenRouterProvider({
    apiKey,
    reasoningProfiles: input.reasoningProfiles,
    transport: async (_url, init) => {
      seen.push({ headers: init.headers, body: init.body });
      return reply(200, {
        choices: [{ message: { content: '{"options":["A","B","C","D"]}' }, finish_reason: "stop" }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 40,
          total_tokens: 140,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
        model: input.model,
      });
    },
  });
  const response = await provider.generate({
    model: input.model,
    system: "stable rules",
    parts: [{ text: "item" }],
    jsonSchema,
    maxOutputTokens: 512,
    ...(input.reasoningProfile ? { reasoningProfile: input.reasoningProfile } : {}),
  });
  return { response, headers: seen[0].headers, body: JSON.parse(seen[0].body) as Record<string, unknown>, raw: seen[0].body };
}

describe("model-specific reasoning configuration v1", () => {
  it("does not treat exclude=true as reasoning-disabled", () => {
    const existing = resolveOpenRouterReasoning({ model: "tencent/hy4", profile: "existing" });
    const disabled = resolveOpenRouterReasoning({ model: "tencent/hy4", profile: "disabled" });
    expect(excludeTrueIsNotDisabled).toBe(true);
    expect(existing.namedDisabled).toBe(false);
    expect(existing.reasoning).toEqual(existingReasoningHidesOutput);
    expect(existing.reasoning).toEqual({ exclude: true });
    expect(disabled.namedDisabled).toBe(true);
    expect(disabled.reasoning).toEqual({ effort: "none" });
    expect(disabled.reasoning).not.toEqual(existing.reasoning);
    expect(openrouterReasoningProfileSchema.profiles.existing).toMatch(/Does not disable/);
    expect(openrouterReasoningProfileSchema.profiles.disabled).toMatch(/effort none/);
  });

  it("sends effort none for HY4 and flash-1017 on the v6 Writer map", async () => {
    for (const model of ["tencent/hy4", "deepseek/deepseek-v4.1-flash-1017"] as const) {
      expect(v6WriterExperimentReasoningProfiles[model]).toBe("disabled");
      const captured = await captureBody({ model, reasoningProfiles: v6WriterExperimentReasoningProfiles });
      expect(captured.body.reasoning).toEqual({ effort: "none" });
      expect(captured.body.reasoning).not.toEqual({ exclude: true });
      expect(captured.body).not.toHaveProperty(["reasoning", "max_tokens"]);
      expect(JSON.stringify(captured.body.reasoning)).not.toContain("max_tokens");
      expect(captured.body.response_format).toEqual({
        type: "json_schema",
        json_schema: { name: "output", strict: true, schema: jsonSchema },
      });
      expect(captured.body.max_tokens).toBe(4096);
      expect(captured.response.usage.reasoningTokens).toBe(0);
      expect(openrouterVisibleOutputTokens(captured.response.usage)).toBe(captured.response.usage.outputTokens);
    }
  });

  it("keeps legacy Haiku Writer and Sonnet Judge payloads on existing", async () => {
    const haiku = await captureBody({ model: "anthropic/claude-haiku-5.5" });
    const sonnet = await captureBody({ model: "anthropic/claude-sonnet-5.5" });
    for (const captured of [haiku, sonnet]) {
      expect(captured.body.reasoning).toEqual({ exclude: true });
      expect(captured.body.max_tokens).toBe(4096);
      expect(captured.body.temperature).toBe(0);
      expect(captured.body.response_format).toEqual({
        type: "json_schema",
        json_schema: { name: "output", strict: true, schema: jsonSchema },
      });
      expect(Object.keys(captured.body.reasoning as object)).toEqual(["exclude"]);
    }
    const withMap = await captureBody({
      model: "anthropic/claude-haiku-5.5",
      reasoningProfiles: v6WriterExperimentReasoningProfiles,
    });
    expect(withMap.body.reasoning).toEqual({ exclude: true });
  });

  it("sends low only when listed and omits reasoning on default", async () => {
    const low = await captureBody({ model: "tencent/hy4", reasoningProfile: "low" });
    expect(low.body.reasoning).toEqual({ effort: "low" });
    const omitted = await captureBody({ model: "tencent/hy4", reasoningProfile: "default" });
    expect(omitted.body).not.toHaveProperty("reasoning");
  });

  it("rejects unsupported effort and does not remap", async () => {
    expect(() => resolveOpenRouterReasoning({ model: "tencent/hy4", profile: "medium" })).toThrow(UnsupportedReasoningProfileError);
    expect(() => resolveOpenRouterReasoning({ model: "anthropic/claude-haiku-5.5", profile: "disabled" })).toThrow(/no registered reasoning capability/);
    expect(() =>
      resolveOpenRouterReasoning({
        model: "tencent/hy4",
        profile: "low",
        capabilities: {
          "tencent/hy4": {
            id: "tencent/hy4",
            supportedEfforts: ["high", "none"],
            mandatory: false,
            defaultEffort: "high",
            defaultEnabled: true,
            supportsMaxTokens: false,
          },
        },
      }),
    ).toThrow(/does not list effort low/);
    expect(() =>
      resolveOpenRouterReasoning({
        model: "forced/mandatory",
        profile: "disabled",
        capabilities: {
          "forced/mandatory": {
            id: "forced/mandatory",
            supportedEfforts: ["high", "none"],
            mandatory: true,
            defaultEffort: "high",
            defaultEnabled: true,
            supportsMaxTokens: false,
          },
        },
      }),
    ).toThrow(/mandatory reasoning/);

    let posts = 0;
    const provider = new OpenRouterProvider({
      apiKey: "or-key",
      transport: async () => {
        posts += 1;
        return reply(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
      },
    });
    await expect(provider.generate({ model: "tencent/hy4", parts: [{ text: "x" }], reasoningProfile: "medium" as "low" })).rejects.toThrow(
      UnsupportedReasoningProfileError,
    );
    expect(posts).toBe(0);
  });

  it("reports reasoning tokens separately and enforces the combined output budget", () => {
    const usage = openrouterUsage({
      prompt_tokens: 200,
      completion_tokens: 4096,
      total_tokens: 4296,
      completion_tokens_details: { reasoning_tokens: 4000 },
    });
    expect(usage.outputTokens).toBe(4096);
    expect(usage.reasoningTokens).toBe(4000);
    expect(openrouterVisibleOutputTokens(usage)).toBe(96);
    expect(openrouterOutputBudgetOk({ maxTokens: 4096, outputTokens: usage.outputTokens })).toBe(true);
    expect(openrouterOutputBudgetOk({ maxTokens: 4096, outputTokens: 4097 })).toBe(false);
  });

  it("does not write secrets into the request body or retry log payload", async () => {
    const captured = await captureBody({ model: "anthropic/claude-haiku-5.5", apiKey: "or-secret-live-key" });
    expect(captured.headers.authorization).toBe("Bearer or-secret-live-key");
    expect(captured.raw).not.toContain("or-secret-live-key");
    expect(JSON.stringify(captured.body)).not.toContain("or-secret-live-key");
    expect(JSON.stringify(captured.body)).not.toContain("Bearer");
  });

  it("keeps production, Recovery, Haiku v6 pilot, and frozen bake-off off the v6 map", () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(Object.keys(v6WriterExperimentReasoningProfiles).sort()).toEqual(["deepseek/deepseek-v4.1-flash-1017", "tencent/hy4"]);
    expect(selectOpenRouterReasoningProfile({ model: "anthropic/claude-haiku-5.5", experimentProfiles: v6WriterExperimentReasoningProfiles })).toBe(
      "existing",
    );

    const service = readFileSync("pipeline/ai/service.ts", "utf8");
    expect(service).toContain("new OpenRouterProvider");
    expect(service).not.toContain("reasoningProfiles");
    expect(readFileSync("pipeline/recovery/active.ts", "utf8")).not.toContain("reasoningProfiles");
    expect(readFileSync("pipeline/stages/factory-v6-live-pilot.ts", "utf8")).not.toContain("reasoningProfiles");
    expect(readFileSync("pipeline/stages/writer-bakeoff-smoke.ts", "utf8")).not.toContain("reasoningProfiles");
    expect(readFileSync("pipeline/stages/writer-bakeoff-compare.ts", "utf8")).not.toContain("reasoningProfiles");
    expect(readFileSync("pipeline/stages/factory-v6-writer-challenge.ts", "utf8")).toContain("reasoningProfiles: v6WriterExperimentReasoningProfiles");
    expect(qualityFirstPilotForbiddenDirs).toContain(modelReasoningConfigOutputDir);
  });

  it("does not change legacy OpenRouter cache keys when the profile is unset", () => {
    const legacy = { model: "anthropic/claude-haiku-5.5", parts: [{ text: "q" }], jsonSchema, maxOutputTokens: 4096 };
    expect(requestHash("openrouter", "cognitive-trap.options.v5", legacy)).toBe(
      requestHash("openrouter", "cognitive-trap.options.v5", { ...legacy }),
    );
    expect(requestHash("openrouter", "cognitive-trap.options.v5", { ...legacy, reasoningProfile: "disabled" })).not.toBe(
      requestHash("openrouter", "cognitive-trap.options.v5", legacy),
    );
  });

  it("writes the offline pack and is ready for a later controlled quality comparison", () => {
    const v1Before = writerBakeoffV1Fingerprint();
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(`${writerBakeoffOutputDir}/freeze.json`, "utf8");

    const report = writeModelReasoningConfigReport();
    expect(assessModelReasoningConfig().liveGenerate).toBe(0);
    expect(report.legacyPayloads.haikuWriter).toEqual({ exclude: true });
    expect(report.legacyPayloads.sonnetJudge).toEqual({ exclude: true });
    expect(report.v6WriterPayloads.hy4).toEqual({ effort: "none" });
    expect(report.v6WriterPayloads.flash).toEqual({ effort: "none" });
    expect(report.hashes.ok).toBe(true);
    expect(report.readyForControlledQualityComparison).toBe(true);
    expect(nextControlledQualityComparison.decision).toBe("ready");
    expect(report.forbiddenDirsIncludeOutput).toBe(true);
    expect(JSON.parse(readFileSync(`${modelReasoningConfigOutputDir}/summary.json`, "utf8")).liveGenerate).toBe(0);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(`${writerBakeoffOutputDir}/freeze.json`, "utf8")).toBe(freezeBefore);
  });
});
