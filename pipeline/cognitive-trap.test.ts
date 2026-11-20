import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { optionLabels } from "@/modules/analysis/contract";
import { benchmarkAuthorization, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { recommendIntegration, selectEligible, surfaceEdit, trapCallGraph, trapItems, trapMaxCostUsd, trapRetry } from "@/modules/factory/item-model/cognitive-trap";
import { screenExamSurface } from "@/modules/factory/item-model/gold";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { precheckCeilings } from "@/modules/factory/item-model/precheck";
import { modelDefaults } from "./ai/config";
import { loadPrices } from "./ai/prices";
import { distractorUser, judgeUser } from "./ai/prompts/item-model.v1";
import { misreadingOptionsPromptVersion, misreadingOptionsSystem, misreadingOptionsUser, misreadingPromptVersion, misreadingSystem, misreadingUser } from "./ai/prompts/cognitive-trap.v1";
import { selectMisreadingMechanisms } from "@/modules/factory/item-model/misreading-mechanisms";
import type { AIProvider, ModelResponse } from "./ai/types";
import { executeCognitiveTrap } from "./stages/cognitive-trap";
import { itemFactoryBenchmark } from "./stages/item-factory";
import { loadOfficialComparisonCorpus, openrouterPrecheckModels } from "./stages/item-precheck";
import { restatementModel, translationModel } from "@/modules/factory/item-model/registry";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

function packet(letter: (typeof optionLabels)[number]) {
  return {
    blindAnswer: letter,
    blindConfidence: 0.42,
    blindEvidence: "fixture",
    blindUncertain: false,
    blindAlternative: null,
    acceptability: { sentences: optionLabels.map((option) => ({ option, acceptable: option === letter, confidence: 0.4, reason: "fixture" })) },
    report: {
      scores: { correctness: 0.5, ambiguityRisk: 0.4, distractorQuality: 0.5, targetAlignment: 0.5, difficultyFit: 0.4, grammar: 0.9, semantic: 0.5, ydsAlignment: 0.5, originalityRisk: 0.2, clueRisk: 0.4 },
      alternativeDefensibleOptions: [],
      estimatedDifficulty: "easy",
      verdict: "REVIEW",
      reasons: ["fixture"],
    },
  };
}

function candidates(prefix: string, mechanisms: readonly string[], count: number) {
  return {
    candidates: mechanisms.slice(0, count).map((errorMechanism, index) => ({
      candidateText: `${prefix} full clause ${index} changes who did what and why the outcome follows.`,
      errorMechanism,
      shiftTarget: "cause",
      whyPlausible: "Both clauses are visible, so the cause can look attached to the wrong one.",
      whyInferior: "The source keeps the original cause and does not make that clause the reason.",
      sourceEvidence: "source",
      semanticRisk: "none",
      studentMisreading: `A reader treats clause ${index} as the cause of the other clause.`,
      temptingEvidence: "Both clauses are in the sentence.",
      actualSemanticDifference: "The cause and the result trade places.",
      whyIncorrect: "The source keeps the original direction.",
    })),
  };
}

function readings(user: string) {
  const ids = [...user.matchAll(/^- ([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1]!).filter((id) => id !== "NONE");
  const cycle = ids.length > 0 ? ids : ["TEMPORAL_ORDER"];
  return {
    meaningMap: {
      roles: "The same actors stay in place.",
      quantity: "The same quantities stay in place.",
      modality: "The same modality stays in place.",
      polarity: "The same polarity stays in place.",
      tense: "The same time relation stays in place.",
      cause: "The same cause stays in place.",
      reference: "The same connector stays in place.",
    },
    preservedRelations: ["concession", "quantity"],
    readings: [0, 1, 2, 3].map((index) => ({
      studentMisreading: `A reader treats clause ${index} as the cause of the other clause.`,
      temptingEvidence: "Both clauses sit in the same sentence.",
      actualSemanticDifference: "The cause and the result trade places.",
      whyIncorrect: "The source keeps the original direction.",
      prevalence: "unmeasured",
      misreadingMechanism: cycle[index % cycle.length]!,
    })),
  };
}

describe("cognitive trap comparison", () => {
  it("keeps the six fixed keys and does not replace a bad one", () => {
    const corpus = loadOfficialComparisonCorpus() ?? [];
    expect(corpus.length).toBeGreaterThan(0);
    const gated = selectEligible(trapItems());
    expect(gated.dropped).toEqual([]);
    expect(gated.kept.map((item) => item.id)).toEqual(["restatement-1", "restatement-2", "restatement-3", "translation-en_tr-1", "translation-en_tr-2", "translation-tr_en-1"]);
    for (const item of gated.kept) {
      const text = item.source.kind === "translation" ? item.source.sourceSentence : item.source.kind === "restatement" ? item.source.proposition : "";
      expect(screenExamSurface({ instructions: "", content: `${text}\n${item.core.correctAnswer}` }, corpus).status).toBe("clear");
    }
    const broken = trapItems();
    broken[1] = { ...broken[1]!, core: { ...broken[1]!.core, correctAnswer: "The harbor needed the delay only because the inspectors were late." } };
    const shrunk = selectEligible(broken);
    expect(shrunk.kept.map((item) => item.id)).toEqual(["restatement-1", "restatement-3", "translation-en_tr-1", "translation-en_tr-2", "translation-tr_en-1"]);
    expect(shrunk.dropped.map((row) => row.id)).toEqual(["restatement-2"]);
    expect(surfaceEdit(broken[1]!.core.stem, broken[1]!.core.stem.replace("would", "must"))).toBe(true);
  });

  it("does not put the catalog, the method name, or the editorial notes into a prompt", () => {
    const item = trapItems()[0]!;
    const sentence = item.source.kind === "restatement" ? item.source.proposition : "";
    const prompts = [
      misreadingSystem,
      misreadingOptionsSystem,
      misreadingUser(sentence, item.core.correctAnswer),
      misreadingOptionsUser(restatementModel, sentence, item.core.correctAnswer, []),
      distractorUser(restatementModel, item.source, { stem: item.core.stem, correctAnswer: item.core.correctAnswer }),
      judgeUser(restatementModel, item.core.stem, { A: "a", B: "b", C: "c", D: "d", E: "e" }, item.source),
    ].join("\n");
    expect(prompts).not.toMatch(/belief_holder_swap|rank_scope|cognitive trap|baseline|method [ab]/i);
    expect(prompts).not.toContain("some coaches versus certain drills");
    expect(misreadingOptionsSystem).not.toMatch(/exactly eight|four different mechanisms/);
    expect(misreadingPromptVersion).toBe("cognitive-trap.misreading.v4");
    expect(misreadingOptionsPromptVersion).toBe("cognitive-trap.options.v5");
    expect(distractorUser(restatementModel, item.source, { stem: item.core.stem, correctAnswer: item.core.correctAnswer })).not.toContain("TEMPORAL_ORDER");
    expect(misreadingSystem).not.toContain("TEMPORAL_ORDER");
    expect(misreadingSystem).toContain("1. State the source meaning that must stay.");
    expect(misreadingSystem).toContain("A mechanism label is not that explanation.");
    const grounded = selectMisreadingMechanisms(sentence, "restatement");
    const groundedPrompt = misreadingUser(sentence, item.core.correctAnswer, grounded.mechanisms);
    expect(groundedPrompt).toContain(grounded.mechanisms[0]?.id);
    expect(groundedPrompt.split("\n").filter((line) => line.startsWith("- "))).toHaveLength(grounded.mechanisms.length);
    expect(groundedPrompt).not.toContain("COUNTERFACTUAL_FACTUAL");
    for (const id of ["TEMPORAL_ORDER", "TEMPORAL_SCOPE", "CONCESSION_CAUSE", "CAUSE_CONCESSION", "QUANTITY_SCOPE", "FOCUS_SCOPE", "AGENT_ROLE", "ACTION_SUBSTITUTION", "CONDITION_DIRECTION", "COUNTERFACTUAL_FACTUAL", "MODALITY_STRENGTH", "EVIDENCE_CERTAINTY", "PURPOSE_RESULT", "PURPOSE_TIME", "NEGATION_SCOPE", "REFERENCE_SHIFT"]) {
      if (!grounded.mechanisms.some((entry) => entry.id === id)) expect(groundedPrompt).not.toContain(id);
    }
  });

  it("locks the call graph, the dollar cap, retry, the bank, and the 90-item benchmark", () => {
    expect(trapCallGraph(6)).toEqual({ writerCalls: 18, judgeCalls: 12, maxCalls: 30 });
    expect(trapMaxCostUsd).toBe(1);
    expect(trapRetry).toBe(0);
    expect(precheckCeilings.maxCalls).toBe(41);
    expect(precheckCeilings.totalUsdCap).toBe(2.05);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(itemFactoryBenchmark("not-the-token").started).toBe(false);
    expect(itemFactoryBenchmark("not-the-token").lock).toBe("authorization");
    const plan = freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge });
    const locked = runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan });
    expect(locked.started).toBe(false);
    expect(locked.reason).toMatch(/not started/);
    expect(recommendIntegration({ winners: ["B", "B", "B", "B", "A", "A"], editorialPasses: 2 })).toMatchObject({ integrate: false, propose: "B" });
    expect(recommendIntegration({ winners: ["B", "B", "B", "A", "A", "A"], editorialPasses: 2 }).propose).toBeNull();
    expect(recommendIntegration({ winners: ["APPROVE" as "B"], editorialPasses: 2 }).propose).toBeNull();
  });

  it("runs both arms offline without a bank write or a retry", async () => {
    const calls: string[] = [];
    const provider: AIProvider = {
      name: "openrouter",
      async generate(request): Promise<ModelResponse> {
        const system = request.system ?? "";
        const user = request.parts.map((part) => ("text" in part ? part.text : "")).join("\n");
        calls.push(system.slice(0, 24));
        expect(user).not.toMatch(/cognitive trap|baseline|method [ab]/i);
        const mechanisms = user.includes("omitted_qualifier") ? translationModel.errorMechanisms : restatementModel.errorMechanisms;
        const body = system.startsWith("ITEM MODEL DISTRACTOR")
          ? candidates("Shifted", mechanisms, 8)
          : system.startsWith("MISREADING PATHS")
            ? readings(user)
            : system.startsWith("MISREADING OPTIONS")
              ? candidates("Misreading", mechanisms, 4)
              : packet("C");
        return { text: JSON.stringify(body), model: request.model, usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 } };
      },
    };
    const out = mkdtempSync(path.join(tmpdir(), "tomo-trap-"));
    try {
      const run = await executeCognitiveTrap({
        authorization: "cognitive-trap-v1",
        providerFor: () => provider,
        prices,
        models: { ...openrouterPrecheckModels },
        outDir: out,
        cacheSalt: `cognitive-trap-test-${Date.now()}`,
        officialTexts: loadOfficialComparisonCorpus() ?? [],
      });
      expect(run.started).toBe(true);
      expect(run.studentBankWrites).toBe(0);
      expect(run.qualityProven).toBe(false);
      expect(run.benchmarkStarted).toBe(false);
      expect(run.retry).toBe(0);
      expect(run.maxCostUsd).toBe(1);
      expect(run.providerCalls).toBe(26);
      expect(run.recoveryMode).toBe("off");
      expect(run.recoveryProviderCalls).toBe(0);
      expect(run.recoveryCostUsd).toBe(0);
      expect(run.records.every((record) => record.recovery?.mode === "off" && record.recovery.providerCalls === 0 && record.recovery.rows.length === 0)).toBe(true);
      expect(run.droppedKeys).toEqual([]);
      expect(run.records).toHaveLength(6);
      expect(run.records.every((record) => record.arms.A.status === "five_options" && record.arms.B.status === "five_options")).toBe(true);
      const wrongLanguage = run.records.filter((record) => record.direction === "en_tr");
      expect(wrongLanguage).toHaveLength(2);
      expect(wrongLanguage.every((record) => record.arms.A.qualityDecision === "fail" && record.arms.B.qualityDecision === "fail" && record.arms.B.failures.includes("target_language_mismatch") && record.arms.B.modelVerdict === null)).toBe(true);
      expect(run.records.map((record) => record.arms.A.keyLetter)).not.toEqual(run.records.map((record) => record.arms.B.keyLetter));
      expect(run.decision).toMatchObject({ integrate: false, propose: null });
      expect(calls.filter((call) => call.startsWith("INDEPENDENT"))).toHaveLength(8);
      expect(run.records[0]?.arms.A.droppedDistractors.length).toBeGreaterThan(0);
      expect(run.records[0]?.arms.A.droppedDistractors.every((row) => row.candidateText.length > 0 && row.mechanismId.length > 0 && row.reason.length > 0 && row.sourceVersion.length === 12 && row.keyVersion.length === 12)).toBe(true);
      expect(run.records.every((record) => record.observedDifficulty === null)).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
