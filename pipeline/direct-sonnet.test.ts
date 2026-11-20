import { describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { familyBlueprints } from "@/modules/factory/families";
import type { JudgeReport, OptionAcceptability } from "@/modules/factory/judge";
import { buildQuestionSpec, connectorSurface } from "@/modules/factory/spec-engine";
import { factoryProfile } from "./stages/factory";
import { loadAIConfig } from "./ai/config";
import { BudgetExceeded } from "./ai/budget";
import { loadPrices } from "./ai/prices";
import type { AIResult, JudgeEvaluation } from "./ai/types";
import {
  archiveBrief,
  baseModel,
  checkDirectItem,
  directSonnetLimits,
  directSonnetOutput,
  directSonnetPreflight,
  directSonnetSpecId,
  directSonnetSystem,
  directSonnetUser,
  familyForSlot,
  runDirectSonnet,
  type DirectSonnetOutput,
} from "./direct-sonnet";

const { profile } = factoryProfile();
const spec = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 4, band: "hard" });
const writer = "gateway:anthropic/claude-sonnet-5.5";
const judge = "gateway:anthropic/claude-haiku-5.5";

const prices = loadPrices({ FACTORY_PRICES: "pipeline/ai/prices.gateway.json" });

function pilotConfig(patch: Record<string, string> = {}) {
  return loadAIConfig({
    FACTORY_PRICES: "pipeline/ai/prices.gateway.json",
    FACTORY_MAX_COST_USD: "0.1",
    FACTORY_MAX_CALLS: "6",
    GENERATOR_MODEL: writer,
    DISTRACTOR_MODEL: writer,
    FINAL_JUDGE_MODEL: judge,
    ...patch,
  });
}

const clause: Record<ReturnType<typeof familyForSlot>, string> = {
  near_concession: "salty storeroom air crumbles loose sheets into dust",
  cause: "the catalogue drawers stayed sealed against moisture during winter",
  condition: "visiting scholars request a dried copy beforehand",
  time: "the upper gallery stayed closed for years",
};

function capital(surface: string): string {
  return surface.charAt(0).toUpperCase() + surface.slice(1);
}

function sample(): DirectSonnetOutput {
  const key = spec.answerConstraints.correctOption;
  const options = Object.fromEntries(optionLabels.map((label) => [label, ""])) as Record<OptionLabel, string>;
  options[key] = "Although salt air had weakened the unprotected paper for decades";
  const connectorByOption = Object.fromEntries(optionLabels.map((label) => [label, ""])) as Record<OptionLabel, string>;
  connectorByOption[key] = "although";
  const blueprints = [];
  const rationales = [];
  for (const slot of spec.distractorPlan) {
    const family = familyForSlot(slot.expresses);
    const surfaces = slot.connectors.map((connector) => connectorSurface(connector));
    const opener = family === "near_concession" ? surfaces.find((surface) => surface === "even though" || surface === "though" || surface === "although") ?? surfaces[0] : surfaces[0];
    options[slot.option] = `${capital(opener)} ${clause[family]}`;
    connectorByOption[slot.option] = opener;
    blueprints.push({
      option: slot.option,
      relationFamily: family,
      proposition:
        family === "near_concession"
          ? "Salt air crumbles the paper so the clerks could not read the logbooks."
          : family === "cause"
            ? "Sealed catalogue drawers survived the winter because moisture never entered them."
            : family === "condition"
              ? "Scholars must request a dried copy before any page is handled."
              : "The upper gallery opened only after the roof repair ended.",
      intendedMisconception: `Misreads the stem as ${family}.`,
      whyPlausible: "A reader who stops at one familiar word can accept this clause.",
      stemEvidenceAnchor: "could still be read",
      failureMechanism: "contradicts_outcome" as const,
      decisiveFailureReason: "The stem says the logbooks could still be read, which contradicts this misreading.",
      failureAnchor: "outcome" as const,
      connectorStrategy: "natural" as const,
      propositionStatus: "not_entailed" as const,
      inferenceClaim: "invalid_inference" as const,
    });
    rationales.push({
      option: slot.option,
      distractorType: slot.distractorType,
      misconception: slot.misconception,
      whyPlausible: "Bu seçenek ilk bakışta ilgili görünür.",
      whyWrong: "Kökün sonucunu tersine çevirir.",
    });
  }
  return directSonnetOutput.parse({
    stem: "----, the clerks found that the eighteenth-century logbooks could still be read.",
    correctOption: key,
    options,
    explanation: "Although bağlacı beklenen sonucu kırar. Sen tuzlu havanın kâğıdı bozacağını beklersin; kök ise defterlerin okunabildiğini söyler.",
    distractorRationales: rationales,
    targetConcept: spec.primaryConcept,
    targetSkill: spec.targetSkill,
    metadata: { connectorByOption, selfRatedDifficulty: "hard" },
    distractorBlueprints: blueprints,
  });
}

const report: JudgeReport = {
  scores: { correctness: 0.9, ambiguityRisk: 0.1, distractorQuality: 0.8, targetAlignment: 0.8, difficultyFit: 0.7, grammar: 0.9, semantic: 0.9, ydsAlignment: 0.8, originalityRisk: 0.1, clueRisk: 0.1 },
  alternativeDefensibleOptions: [],
  estimatedDifficulty: "hard",
  verdict: "APPROVE",
  reasons: ["The concession is the only defensible completion."],
};

const acceptability: OptionAcceptability = {
  sentences: optionLabels.map((option) => ({ option, acceptable: option === spec.answerConstraints.correctOption, relationCoherent: true, confidence: 0.8, reason: "Checked on its own." })),
};

function evaluation(patch: Partial<JudgeReport> = {}): JudgeEvaluation {
  const value = { ...report, ...patch };
  const result = <T>(body: T, hash: string): AIResult<T> => ({ value: body, provider: "gateway", model: "anthropic/claude-haiku-5.5", promptVersion: "test", requestHash: hash, usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }, cached: false });
  return {
    blind: result({ answer: spec.answerConstraints.correctOption, confidence: 0.9, rationale: "The stem outcome survives the obstacle.", stemEvidence: "could still be read", equallyDefensible: null, uncertain: false }, "blind"),
    acceptability: result(acceptability, "accept"),
    report: result(value, "final"),
  };
}

describe("direct sonnet pilot", () => {
  it("treats provider aliases of Sonnet as one base model and keeps Haiku apart", () => {
    expect(baseModel("gateway:anthropic/claude-sonnet-5.5")).toBe("claude-sonnet-5-5");
    expect(baseModel("anthropic:claude-sonnet-5-5")).toBe("claude-sonnet-5-5");
    expect(baseModel(writer)).not.toBe(baseModel(judge));
    expect(directSonnetPreflight(pilotConfig(), writer, "anthropic:claude-sonnet-5-5").ok).toBe(false);
    expect(directSonnetPreflight(pilotConfig(), writer, judge)).toEqual({ ok: true, writerBase: "claude-sonnet-5-5", judgeBase: "claude-haiku-5-5" });
    expect(prices).not.toBeNull();
  });

  it("refuses a run whose price gate or call cap is missing", () => {
    expect(directSonnetPreflight(pilotConfig({ FACTORY_MAX_COST_USD: "1" }), writer, judge).ok).toBe(false);
    expect(directSonnetPreflight(pilotConfig({ FACTORY_MAX_CALLS: "40" }), writer, judge).ok).toBe(false);
    expect(directSonnetLimits).toEqual({ maxCostUsd: 0.1, maxCalls: 6 });
  });

  it("asks for four distinct misreadings and does not treat the writer's difficulty guess as evidence", () => {
    const prompt = `${directSonnetSystem()}\n${directSonnetUser(spec, archiveBrief)}`;
    expect(prompt).toContain(archiveBrief);
    expect(prompt).toContain("different misreading");
    expect(prompt).toContain("not a measurement");
    expect(spec.id).toBe(directSonnetSpecId);
  });

  it("keeps a critical deterministic reject from starting the judge, and does not call the writer again", async () => {
    let writes = 0;
    let judged = 0;
    const broken = sample();
    broken.stem = "no blank here";
    const record = await runDirectSonnet({
      spec,
      brief: archiveBrief,
      writerSetting: writer,
      judgeSetting: judge,
      write: async () => {
        writes += 1;
        return { value: broken, provider: "gateway", model: "anthropic/claude-sonnet-5.5", promptVersion: "direct-sonnet.v1", requestHash: "writer", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, cached: false };
      },
      evaluate: async () => {
        judged += 1;
        return evaluation();
      },
    });
    expect(writes).toBe(1);
    expect(judged).toBe(0);
    expect(record.judgesStarted).toBe(false);
    expect(record.status).toBe("REJECT");
    expect(record.deterministic?.validation.issues.some((issue) => issue.code === "blank_count")).toBe(true);
    expect(record.semanticPlanMatch).toBe("not_proven");
    expect(record.skippedAudits.map((audit) => audit.status)).toEqual(["not_applicable", "not_applicable"]);
    expect(record.selfRatingIsEvidence).toBe(false);
  });

  it("runs the three Haiku calls as one review family after the existing checks pass", async () => {
    const output = sample();
    const checked = checkDirectItem(spec, output);
    expect(checked.critical.map((issue) => `${issue.code}${issue.option ? `(${issue.option})` : ""}`)).toEqual([]);
    const record = await runDirectSonnet({
      spec,
      brief: archiveBrief,
      writerSetting: writer,
      judgeSetting: judge,
      write: async () => ({ value: output, provider: "gateway", model: "anthropic/claude-sonnet-5.5", promptVersion: "direct-sonnet.v1", requestHash: "writer", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, cached: false }),
      evaluate: async () => evaluation(),
    });
    expect(record.status).toBe("ACCEPT");
    expect(record.judgesStarted).toBe(true);
    expect(record.reviewIndependence).toMatchObject({ calls: 3, independentReviews: 1, family: "claude-haiku-5-5" });
    expect(record.blindAnswer).toBe(spec.answerConstraints.correctOption);
    expect(record.stemEvidence).toBe("could still be read");
    expect(record.equallyDefensible).toBeNull();
    expect(record.uncertain).toBe(false);
    expect(record.semanticPlanMatch).toBe("not_proven");
    expect(record.visibleConcerns.some((concern) => concern.code === "plan_realization_unverified")).toBe(true);
    expect(record.cache.map((entry) => entry.stage)).toEqual(["writer", "blindSolve", "acceptability", "finalJudge"]);
  });

  it("records a sibling plan clash from the existing check and stops before the judge", async () => {
    const output = sample();
    const [first, second] = output.distractorBlueprints;
    output.options[second.option] = output.options[first.option];
    const checked = checkDirectItem(spec, output);
    expect(checked.distractorIssues.some((issue) => issue.code === "plan_repeats_sibling" || issue.code === "option_duplicate")).toBe(true);
    let judged = 0;
    const record = await runDirectSonnet({
      spec,
      brief: archiveBrief,
      writerSetting: writer,
      judgeSetting: judge,
      write: async () => ({ value: output, provider: "gateway", model: "anthropic/claude-sonnet-5.5", promptVersion: "direct-sonnet.v1", requestHash: "w", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, cached: false }),
      evaluate: async () => {
        judged += 1;
        return evaluation();
      },
    });
    expect(judged).toBe(0);
    expect(record.status).toBe("REJECT");
  });

  it("stops on the budget and does not write a second candidate", async () => {
    let writes = 0;
    const blocked = await runDirectSonnet({
      spec,
      brief: archiveBrief,
      writerSetting: writer,
      judgeSetting: judge,
      write: async () => {
        writes += 1;
        throw new BudgetExceeded("spend limit: max estimated cost ($0.1) reached");
      },
      evaluate: async () => evaluation(),
    });
    expect(writes).toBe(1);
    expect(blocked.status).toBe("INCOMPLETE_BUDGET");
    expect(blocked.judgesStarted).toBe(false);

    const output = sample();
    const duringJudge = await runDirectSonnet({
      spec,
      brief: archiveBrief,
      writerSetting: writer,
      judgeSetting: judge,
      write: async () => ({ value: output, provider: "gateway", model: "anthropic/claude-sonnet-5.5", promptVersion: "direct-sonnet.v1", requestHash: "w", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, cached: false }),
      evaluate: async () => {
        throw new BudgetExceeded("spend limit: max calls (6) reached");
      },
    });
    expect(duringJudge.status).toBe("INCOMPLETE_BUDGET");
    expect(duringJudge.judgesStarted).toBe(true);
    expect(duringJudge.stem).toBe(output.stem);
  });

  it("does not call the writer when the judge alias is the same Sonnet", async () => {
    let writes = 0;
    const record = await runDirectSonnet({
      spec,
      brief: archiveBrief,
      writerSetting: writer,
      judgeSetting: "anthropic:claude-sonnet-5-5",
      write: async () => {
        writes += 1;
        return { value: sample(), provider: "gateway", model: "x", promptVersion: "v", requestHash: "w", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, cached: false };
      },
      evaluate: async () => evaluation(),
    });
    expect(writes).toBe(0);
    expect(record.status).toBe("INCOMPLETE");
    expect(record.writerBase).toBe(record.judgeBase);
  });
});
