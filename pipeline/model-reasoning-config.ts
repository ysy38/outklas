import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { frozenHashesUnchanged } from "@/modules/factory/item-model/factory-v6-writer-challenge";
import {
  excludeTrueIsNotDisabled,
  existingReasoningHidesOutput,
  nextControlledQualityComparison,
  openrouterReasoningCapabilities,
  openrouterReasoningProfiles,
  resolveOpenRouterReasoning,
  v6WriterExperimentReasoningProfiles,
} from "./ai/openrouter-reasoning";

export const modelReasoningConfigVersion = "model-specific-reasoning-configuration-v1";
export const modelReasoningConfigOutputDir = ".data/analysis/_factory/cognitive-trap/model-reasoning-config-v1";

export const openrouterReasoningProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["profile", "model"],
  properties: {
    profile: { type: "string", enum: [...openrouterReasoningProfiles] },
    model: { type: "string" },
  },
  profiles: {
    disabled: "Documented reasoning.effort none. Not exclude=true.",
    low: "reasoning.effort low when the model lists low. No silent substitute.",
    default: "Omit the reasoning field; provider default applies.",
    existing: "Current production wire: reasoning.exclude=true. Hides reasoning text. Does not disable reasoning.",
  },
} as const;

export const v6WriterReasoningCompatibility = {
  "tencent/hy4": {
    experimentProfile: v6WriterExperimentReasoningProfiles["tencent/hy4"],
    payload: resolveOpenRouterReasoning({ model: "tencent/hy4", profile: "disabled" }).reasoning,
    jsonSchemaPreserved: true,
    reasoningMaxTokensSent: false,
    facultyTechnicalJsonProven: true,
    qualityProven: false,
  },
  "deepseek/deepseek-v4.1-flash-1017": {
    experimentProfile: v6WriterExperimentReasoningProfiles["deepseek/deepseek-v4.1-flash-1017"],
    payload: resolveOpenRouterReasoning({ model: "deepseek/deepseek-v4.1-flash-1017", profile: "disabled" }).reasoning,
    jsonSchemaPreserved: true,
    reasoningMaxTokensSent: false,
    facultyTechnicalJsonProven: true,
    qualityProven: false,
  },
} as const;

export function assessModelReasoningConfig() {
  const hashes = frozenHashesUnchanged();
  const hy4 = resolveOpenRouterReasoning({ model: "tencent/hy4", profile: "disabled" });
  const flash = resolveOpenRouterReasoning({ model: "deepseek/deepseek-v4.1-flash-1017", profile: "disabled" });
  const haiku = resolveOpenRouterReasoning({ model: "anthropic/claude-haiku-5.5", profile: "existing" });
  const sonnet = resolveOpenRouterReasoning({ model: "anthropic/claude-sonnet-5.5", profile: "existing" });
  return {
    version: modelReasoningConfigVersion,
    liveGenerate: 0 as const,
    factoryRootCauseFixEnabled,
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionJudgeUnchanged: qualityFirstFrozenModels.judge,
    recoveryDefault: recoveryDefaultEnabled,
    studentBankWrites: 0 as const,
    winnerDeclared: false as const,
    meaningProven: false as const,
    qualityProven: false as const,
    excludeTrueIsNotDisabled,
    existingPayload: existingReasoningHidesOutput,
    schema: openrouterReasoningProfileSchema,
    capabilities: openrouterReasoningCapabilities,
    v6WriterExperimentReasoningProfiles,
    v6WriterReasoningCompatibility,
    legacyPayloads: {
      haikuWriter: haiku.reasoning,
      sonnetJudge: sonnet.reasoning,
    },
    v6WriterPayloads: {
      hy4: hy4.reasoning,
      flash: flash.reasoning,
    },
    hashes,
    nextControlledQualityComparison,
    readyForControlledQualityComparison:
      nextControlledQualityComparison.ready && hashes.ok && !factoryRootCauseFixEnabled && !recoveryDefaultEnabled,
    forbiddenDirsIncludeOutput: (qualityFirstPilotForbiddenDirs as readonly string[]).includes(modelReasoningConfigOutputDir),
  };
}

export function writeModelReasoningConfigReport() {
  const report = assessModelReasoningConfig();
  mkdirSync(modelReasoningConfigOutputDir, { recursive: true });
  writeFileSync(path.join(modelReasoningConfigOutputDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(modelReasoningConfigOutputDir, "reasoning-profile.schema.json"), `${JSON.stringify(openrouterReasoningProfileSchema, null, 2)}\n`);
  return report;
}
