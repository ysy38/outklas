import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  architectureV2WriterTokenCeiling,
  callCeilingUsd,
  type CatalogPrice,
  type PriceCatalog,
} from "./architecture-v2";
import { incompleteOption } from "./misreading-mechanisms";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs, qualityFirstPilotOutputDir } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { assessWholeSet, classifyOption } from "./whole-set";
import {
  allowBakeoffCall,
  bakeoffHardBlocks,
  freezeWriterBakeoffTasks,
  parseBakeoffWriterOutput,
  smokeReusable,
  writerBakeoffOutputDir,
  writerBakeoffSmokeSourceId,
  type BakeoffPlan,
} from "./writer-bakeoff";

export const writerBakeoffSmokeAuthorization = "writer-bakeoff-technical-smoke-v1";
export const writerBakeoffSmokeOutputDir = ".data/analysis/_factory/cognitive-trap/writer-bakeoff-smoke-v1";
export const writerBakeoffSmokeLiveAuthorized = true;
export const writerBakeoffSmokeSpendCapUsd = 0.1;
export const writerBakeoffSmokeRetry = 0;
export const writerBakeoffSmokeMaxCalls = 4;
export const writerBakeoffSmokeOutputTokens = architectureV2WriterTokenCeiling.output;

export type JsonSchemaHonor = {
  schemaSent: true;
  honored: boolean;
  path: "content_json" | "salvaged_extract" | "salvaged_reasoning" | "failed";
};

export type OptionPreview = {
  planId: string;
  expectedPlanId: string | null;
  candidateText: string;
  writerStudentMisreading: string;
  writerSemanticRisk: string;
  writerClaimIsNotProof: true;
  coverageRetention: "fail" | "unverified";
  singleDominantMutation: "fail" | "unverified";
  naturalness: "fail" | "unverified";
  formalCue: "yes" | "no" | "unverified";
  semanticStatus: "confirmed_difference" | "confirmed_equivalent" | "unverified" | "unresolved";
  hardBlocks: string[];
};

export function fingerprintFiles(dir: string, names: string[]): string {
  return createHash("sha256")
    .update(names.map((name) => `${name}:${existsSync(path.join(dir, name)) ? readFileSync(path.join(dir, name), "utf8") : ""}`).join("\n"))
    .digest("hex");
}

export function writerBakeoffV1Fingerprint(): string {
  return fingerprintFiles(writerBakeoffOutputDir, ["summary.json", "freeze.json", "plan.json", "openrouter-catalog.json"]);
}

export function qualityFirstPilotFingerprint(): string {
  return fingerprintFiles(qualityFirstPilotOutputDir, ["summary.json"]);
}

export function platesSmokeTask() {
  const task = freezeWriterBakeoffTasks().find((row) => row.id === writerBakeoffSmokeSourceId);
  if (!task || task.role !== "scoring") throw new Error("smoke source is not a frozen scoring plates item");
  return task;
}

export function smokeCeilingUsd(prices: PriceCatalog, models: readonly string[]): { perModel: { setting: string; perCallUsd: number | null }[]; totalUsd: number | null; fitsCap: boolean } {
  const perModel = models.map((setting) => {
    const row = prices[setting];
    const usd = row ? callCeilingUsd({ in: row.in, out: row.out, cacheWrite: row.cacheWrite ?? undefined } satisfies CatalogPrice, architectureV2WriterTokenCeiling) : null;
    return { setting, perCallUsd: usd };
  });
  const totalUsd = perModel.every((row) => row.perCallUsd != null) ? perModel.reduce((sum, row) => sum + (row.perCallUsd ?? 0), 0) : null;
  return { perModel, totalUsd, fitsCap: totalUsd != null && totalUsd <= writerBakeoffSmokeSpendCapUsd };
}

function peelJson(text: string): string {
  let cleaned = text.trim().replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) return cleaned;
  const start = cleaned.indexOf("{");
  return start < 0 ? cleaned : cleaned.slice(start);
}

export function assessJsonSchemaHonor(input: {
  contentText: string;
  reasoningText: string;
  combinedText: string;
  planCount: number;
}): JsonSchemaHonor {
  const contentParse = parseBakeoffWriterOutput(input.contentText, input.planCount);
  if (contentParse.status === "ok") return { schemaSent: true, honored: true, path: "content_json" };
  const reasoningParse = parseBakeoffWriterOutput(input.reasoningText, input.planCount);
  if (!input.contentText.trim() && reasoningParse.status === "ok") return { schemaSent: true, honored: false, path: "salvaged_reasoning" };
  const peeled = parseBakeoffWriterOutput(peelJson(input.contentText || input.combinedText), input.planCount);
  if (peeled.status === "ok") return { schemaSent: true, honored: false, path: "salvaged_extract" };
  return { schemaSent: true, honored: false, path: "failed" };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function previewOptions(input: {
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  plans: BakeoffPlan[];
  candidates: { candidateText: string; planId: string; studentMisreading: string; semanticRisk: string }[];
}): { options: OptionPreview[]; setFormalCues: string[]; writerClaimIsNotProof: true } {
  const keyWords = wordCount(input.key);
  const sourceWords = wordCount(input.source);
  const options = input.candidates.map((row, index) => {
    const plan = input.plans[index];
    const classified = classifyOption(input.source, input.key, row.candidateText);
    const blocks = bakeoffHardBlocks({ source: input.source, key: input.key, option: row.candidateText, targetLanguage: input.targetLanguage });
    const short = wordCount(row.candidateText) <= keyWords * 0.7 || incompleteOption(row.candidateText);
    const dropped = wordCount(row.candidateText) < sourceWords * 0.7 || incompleteOption(row.candidateText);
    return {
      planId: row.planId,
      candidateText: row.candidateText,
      writerStudentMisreading: row.studentMisreading,
      writerSemanticRisk: row.semanticRisk,
      writerClaimIsNotProof: true as const,
      coverageRetention: dropped ? ("fail" as const) : ("unverified" as const),
      singleDominantMutation: blocks.includes("key_equivalence") || blocks.includes("second_defensible") ? ("fail" as const) : ("unverified" as const),
      naturalness: incompleteOption(row.candidateText) ? ("fail" as const) : ("unverified" as const),
      formalCue: short ? ("yes" as const) : ("unverified" as const),
      semanticStatus: classified.relation,
      hardBlocks: blocks,
      expectedPlanId: plan?.planId ?? null,
    };
  });
  const letters = ["B", "C", "D", "E"] as const;
  const packed = Object.fromEntries([["A", input.key], ...options.map((row, index) => [letters[index], row.candidateText])]) as Record<"A" | "B" | "C" | "D" | "E", string>;
  const set = options.length === 4
    ? assessWholeSet({ source: input.source, key: input.key, options: packed, correct: "A" })
    : null;
  return { options, setFormalCues: set?.risks.whole_set_clue_risk ?? [], writerClaimIsNotProof: true };
}

export function technicalSmokeSuccess(input: { providerCallOk: boolean; fourOptionTexts: boolean }): boolean {
  return input.providerCallOk && input.fourOptionTexts;
}

export function reuseDecision(input: {
  raw: unknown;
  planCount: number;
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  expectedPlanIds: string[];
  technicalSuccess: boolean;
}) {
  const reuse = smokeReusable({
    raw: input.raw,
    planCount: input.planCount,
    source: input.source,
    key: input.key,
    targetLanguage: input.targetLanguage,
    expectedPlanIds: input.expectedPlanIds,
  });
  return {
    reusable: input.technicalSuccess && reuse.reusable,
    blocks: reuse.blocks,
    parse: reuse.parse,
    weakOptionsDoNotFailTechnicalSmoke: true as const,
  };
}

export function refuseWriterBakeoffSmoke(reason: string, lock: "authorization" | "budget" | "output" | "credentials" | "runner" | "completed" = "authorization") {
  return {
    started: false as const,
    executed: false as const,
    liveAuthorized: writerBakeoffSmokeLiveAuthorized,
    lock,
    reason,
    providerCalls: 0 as const,
    studentBankWrites: 0 as const,
    judgeCalls: 0 as const,
    recoveryCalls: 0 as const,
    retry: writerBakeoffSmokeRetry,
    bakeoffStarted: false as const,
    productionWriterUnchanged: qualityFirstFrozenModels.writer,
    productionJudgeUnchanged: qualityFirstFrozenModels.judge,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
    meaningProven: false as const,
    qualityProven: false as const,
  };
}

export function smokeProtectedDirs(): string[] {
  return qualityFirstPilotForbiddenDirs.filter((dir) => dir !== writerBakeoffSmokeOutputDir);
}

export function nextCallAllowed(spentUsd: number, nextCallCeilingUsd: number): boolean {
  return allowBakeoffCall(spentUsd, nextCallCeilingUsd, writerBakeoffSmokeSpendCapUsd);
}
