import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { benchmarkAuthorization, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { sourceSentence } from "@/modules/factory/item-model/cognitive-trap";
import { screenExamSurface } from "@/modules/factory/item-model/gold";
import { selectMisreadingMechanisms } from "@/modules/factory/item-model/misreading-mechanisms";
import { qualityProfileReady } from "@/modules/factory/item-model/quality-profile";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { assessWholeSet } from "@/modules/factory/item-model/whole-set";
import {
  assessQualityFirstPilot,
  priorQualityFirstSources,
  qualityFirstActualCallOrder,
  qualityFirstFrozenModels,
  qualityFirstItems,
  qualityFirstKeyGate,
  qualityFirstMetricsPlaceholder,
  qualityFirstPilotAuthorization,
  qualityFirstPilotForbiddenDirs,
  qualityFirstPilotLiveAuthorized,
  qualityFirstPilotOutputDir,
  qualityFirstPilotPreflightFile,
  qualityFirstPilotPreparedCeilingUsd,
  qualityFirstPilotSpendCapUsd,
  qualityFirstTrEnPreviousKey,
  scoreQualityFirstItem,
  verifyQualityFirstPreflight,
} from "@/modules/factory/item-model/quality-first-pilot";
import { misreadingOptionsOutput } from "./ai/prompts/cognitive-trap.v1";
import { loadPrices } from "./ai/prices";
import { attachRecovery } from "./recovery/attach";
import { conservativeRecoveryCeiling } from "./recovery/budget";
import { loadOfficialComparisonCorpus } from "./stages/item-precheck";
import {
  itemFactoryQualityFirstPilot,
  itemFactoryQualityRepair,
  qualityCallGraph,
  qualityCostEstimate,
  qualityFirstPilotDryRun,
  qualityFirstPilotPlan,
  qualityFirstRepairCandidates,
  type TrapComparison,
} from "./stages/cognitive-trap";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

function mockFive(input: {
  key: string;
  qualityReasons?: string[];
  failures?: string[];
  secondAnswerOptions?: OptionLabel[];
  guards?: TrapComparison["arms"]["B"]["propositionGuards"];
}): TrapComparison {
  const options = {
    A: input.key,
    B: "A natural distractor that changes quantity.",
    C: "A natural distractor that changes time.",
    D: "A natural distractor that changes polarity.",
    E: "A natural distractor that changes reference.",
  };
  return {
    id: "quality-first-mock",
    questionType: "restatement",
    direction: null,
    source: "The census office showed that every household in the two coastal districts had been visited, yet it did not infer that the vacancy rate had fallen.",
    key: input.key,
    meaning: "unverified",
    keyFailures: [],
    designTarget: "medium",
    estimatedDifficulty: null,
    observedDifficulty: null,
    arms: {
      A: {
        method: "A",
        status: "not_run",
        failures: ["quality_profile_uses_cognitive_trap_only"],
        keyLetter: null,
        options: null,
        rationales: [],
        readings: [],
        meaningMap: null,
        preservedRelations: [],
        selectedMechanisms: [],
        supportableMisreadings: 0,
        relationEvaluations: [],
        judgeAgreesWithKey: null,
        decisionRisks: null,
        secondAnswerOptions: [],
        acceptableOptions: [],
        droppedDistractors: [],
        qualityDecision: "pending",
        qualityReasons: [],
        propositionGuards: [],
        modelVerdict: null,
        modelDifficulty: null,
        modelDifficultyIsNotMeasured: true,
        clueRisk: null,
        blindConfidence: null,
        editorial: "pending",
      },
      B: {
        method: "B",
        status: "five_options",
        failures: input.failures ?? [],
        keyLetter: "A",
        options,
        rationales: [],
        readings: [],
        meaningMap: null,
        preservedRelations: [],
        selectedMechanisms: [],
        supportableMisreadings: 4,
        relationEvaluations: [],
        judgeAgreesWithKey: true,
        decisionRisks: { key_semantic_risk: [], distractor_equivalence_risk: [], whole_set_clue_risk: [] },
        secondAnswerOptions: input.secondAnswerOptions ?? [],
        acceptableOptions: [...optionLabels],
        droppedDistractors: [
          { candidateText: "Dropped full distractor text is stored.", mechanismId: "QUANTITY_SCOPE", errorMechanism: "quantity_scope", reason: "surface_edit", sourceVersion: "aaaaaaaaaaaa", keyVersion: "bbbbbbbbbbbb" },
        ],
        qualityDecision: "needs_revision",
        qualityReasons: input.qualityReasons ?? [],
        propositionGuards: input.guards ?? [],
        modelVerdict: "REVIEW",
        modelDifficulty: "medium",
        modelDifficultyIsNotMeasured: true,
        clueRisk: 0.2,
        blindConfidence: 0.7,
        editorial: "pending",
      },
    },
  };
}

describe("quality-first production pilot preparation", () => {
  it("fixes four new medium keys before any distractor call", () => {
    const corpus = loadOfficialComparisonCorpus() ?? [];
    const plan = assessQualityFirstPilot(corpus);
    expect(plan.ready).toBe(true);
    expect(plan.failures).toEqual([]);
    expect(plan.providerCalls).toBe(0);
    expect(plan.studentBankWrites).toBe(0);
    expect(plan.goldApproved).toBe(false);
    expect(plan.humanApproval).toBe("closed");
    expect(plan.liveAuthorized).toBe(false);
    expect(plan.recoveryDefault).toBe("off");
    const entries = qualityFirstItems();
    expect(entries).toHaveLength(4);
    expect(entries.map((entry) => entry.designTarget)).toEqual(["medium", "medium", "medium", "medium"]);
    expect(entries.map((entry) => entry.item.direction)).toEqual([null, null, "en_tr", "tr_en"]);
    expect(entries.map((entry) => entry.observedDifficulty)).toEqual([null, null, null, null]);
    const used = priorQualityFirstSources();
    expect(corpus.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const sentence = sourceSentence(entry.item);
      expect(used.has(sentence)).toBe(false);
      expect(entry.meaningMap.preserved.length).toBeGreaterThan(0);
      expect(entry.meaningMap.relations.length).toBeGreaterThan(1);
      expect(entry.cognitiveTraps.length).toBeGreaterThan(1);
      expect(entry.priorStructuralDifference.length).toBeGreaterThan(20);
      const gate = qualityFirstKeyGate(entry.item);
      expect(gate.proceed).toBe(true);
      expect(gate.meaning).not.toBe("fail");
      expect(gate.meaningProven).toBe(false);
      expect(gate.approvesTarget).toBe(false);
      expect(gate.observedDifficulty).toBeNull();
      expect(gate.sourceHash).toHaveLength(12);
      expect(gate.keyHash).toHaveLength(12);
      expect(selectMisreadingMechanisms(sentence, entry.item.questionType).status).toBe("selected");
      expect(screenExamSurface({ instructions: "", content: `${sentence}\n${entry.item.core.correctAnswer}` }, corpus).status).toBe("clear");
      const score = scoreQualityFirstItem(entry.item);
      expect(score.source_key_meaning_equivalence).toBe("unverified");
      expect(Object.values(score).every((value) => value !== ("pass" as string))).toBe(true);
    }
    const trEn = entries.find((entry) => entry.item.id === qualityFirstTrEnPreviousKey.itemId)!;
    expect(sourceSentence(trEn.item)).toBe(qualityFirstTrEnPreviousKey.source);
    expect(trEn.item.core.correctAnswer).toBe("No complaints have been forwarded to the prosecutor's office; only two official records were read aloud at the hearing.");
    const trEnGate = qualityFirstKeyGate(trEn.item);
    expect(trEnGate.keyHash).not.toBe(qualityFirstTrEnPreviousKey.keyHash);
    expect(trEnGate.sourceHash).toBe(qualityFirstKeyGate({ ...trEn.item, core: { ...trEn.item.core, correctAnswer: qualityFirstTrEnPreviousKey.key } }).sourceHash);
    const copied = qualityFirstItems()[0]!;
    const blocked = qualityFirstKeyGate({ ...copied.item, core: { ...copied.item.core, correctAnswer: sourceSentence(copied.item) } });
    expect(blocked.proceed).toBe(false);
  });

  it("computes separated production and recovery ceilings and refuses live", async () => {
    expect(prices).not.toBeNull();
    expect(qualityFirstPilotLiveAuthorized).toBe(true);
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityFirstFrozenModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    const estimate = qualityCostEstimate(prices!, qualityFirstItems().length);
    const graph = qualityCallGraph(qualityFirstItems().length);
    expect(graph).toEqual({ writerCalls: 8, judgeCalls: 4, maxCalls: 12 });
    expect(estimate).not.toBeNull();
    expect(estimate!).toBeGreaterThan(0);
    expect(Math.abs(estimate! - qualityFirstPilotPreparedCeilingUsd)).toBeLessThan(1e-9);
    expect(estimate!).toBeLessThanOrEqual(qualityFirstPilotSpendCapUsd);
    const recovery = conservativeRecoveryCeiling(prices, []);
    expect(recovery.separateFromProduction).toBe(true);
    expect(recovery.liveAuthorized).toBe(false);
    expect(recovery.calls).toBe(0);
    expect(recovery.estimatedUsd).toBe(0);
    const schema = misreadingOptionsOutput(["scope_widening", "quantity_scope", "modality_shift", "polarity_reversal"]);
    const candidate = { candidateText: "x", errorMechanism: "quantity_scope" as const, shiftTarget: "quantity" as const, semanticRisk: "none" as const, studentMisreading: "y" };
    expect(schema.safeParse({ candidates: Array(3).fill(candidate) }).success).toBe(false);
    expect(schema.safeParse({ candidates: Array(4).fill(candidate) }).success).toBe(true);
    expect(schema.safeParse({ candidates: Array(6).fill(candidate) }).success).toBe(true);
    expect(schema.safeParse({ candidates: Array(7).fill(candidate) }).success).toBe(false);
    expect(qualityFirstActualCallOrder[0]).toBe("selectEligible.assessKey_and_assessMeaningIntegrity");
    expect(qualityFirstActualCallOrder).toContain("optional_one_blind_judge_if_five_options_and_not_fail_and_language_not_held");
    expect(qualityFirstActualCallOrder).toContain("attachRecovery_default_off");
    expect(qualityFirstMetricsPlaceholder.recoveryYield).toBe("not_measured");
    expect(qualityFirstMetricsPlaceholder.costPerReviewableItem).toBeNull();

    const unauthorized = await itemFactoryQualityFirstPilot("not-authorized");
    expect(unauthorized.started).toBe(false);
    expect(unauthorized.executed).toBe(false);
    expect(unauthorized.providerCalls).toBe(0);
    expect(unauthorized.studentBankWrites).toBe(0);

    const frozen = await itemFactoryQualityFirstPilot(qualityFirstPilotAuthorization, qualityFirstPilotForbiddenDirs[2]);
    expect(frozen.started).toBe(false);
    expect(frozen.reason).toMatch(/earlier experiment records stay unchanged/);

    const plan = qualityFirstPilotPlan(prices, loadOfficialComparisonCorpus() ?? []);
    expect(plan.ready_for_live).toBe(true);
    expect(plan.liveAuthorized).toBe(true);
    expect(plan.preparationComplete).toBe(true);
    expect(plan.keyHistory[qualityFirstTrEnPreviousKey.itemId]?.previous.key).toBe(qualityFirstTrEnPreviousKey.key);
    expect(plan.keyHistory[qualityFirstTrEnPreviousKey.itemId]?.previous.keyHash).toBe(qualityFirstTrEnPreviousKey.keyHash);
    expect(plan.keyHistory[qualityFirstTrEnPreviousKey.itemId]?.currentKeyHash).not.toBe(qualityFirstTrEnPreviousKey.keyHash);
    expect(plan.keyHistory[qualityFirstTrEnPreviousKey.itemId]?.sourceUnchanged).toBe(true);
    expect(plan.assessment.gates.every((gate) => gate.meaningProven === false)).toBe(true);
    const preflight = JSON.parse(readFileSync(path.join(qualityFirstPilotOutputDir, qualityFirstPilotPreflightFile), "utf8")) as { ready_for_live: boolean; executed: boolean; providerCalls: number; waitingAuthorization: boolean; meaningProven: false; assessment: { gates: { id: string; sourceHash: string; keyHash: string }[] }; items: { id: string; source: string; key: string }[] };
    expect(preflight.ready_for_live).toBe(true);
    expect(preflight.executed).toBe(false);
    expect(preflight.providerCalls).toBe(0);
    expect(preflight.waitingAuthorization).toBe(true);
    expect(preflight.meaningProven).toBe(false);
    expect(verifyQualityFirstPreflight(preflight)).toEqual({ ok: true, reason: null });
    expect(verifyQualityFirstPreflight({ ...preflight, assessment: { gates: preflight.assessment.gates.map((gate) => ({ ...gate, keyHash: "deadbeefdead" })) } }).ok).toBe(false);
    expect(plan.productionBudget.separateFromRecovery).toBe(true);
    expect(plan.recoveryBudget.separateFromProduction).toBe(true);
    expect(plan.recoveryBudget.active).toBe(false);
    expect(plan.items).toHaveLength(4);
    expect(qualityProfileReady().ready).toBe(true);
    const qualityRepair = await itemFactoryQualityRepair("not-authorized");
    expect(qualityRepair.started).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    const locked = runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan: freezeBenchmarkPlan({ generator: "writer-test", judge: "judge-test" }) });
    expect(locked.started).toBe(false);
  });

  it("wires recovery dry-run after production and does not auto-activate", () => {
    const key = qualityFirstItems()[0]!.item.core.correctAnswer;
    const off = attachRecovery(mockFive({ key }));
    expect(off.mode).toBe("off");
    expect(off.applied).toBe(false);
    expect(off.providerCalls).toBe(0);

    const repair = qualityFirstPilotDryRun(
      mockFive({
        key,
        guards: [
          {
            label: "C",
            text: "A natural distractor that changes time.",
            guard: { status: "unsupported_clause", mechanismStatus: "supported", signals: ["coordinate_clause"], reason: "added clause", semanticRiskClearsGuard: false },
          },
        ],
      }),
      0.12,
    );
    expect(repair.mode).toBe("dry_run");
    expect(repair.applied).toBe(false);
    expect(repair.providerCalls).toBe(0);
    expect(repair.recoveryCostUsd).toBe(0);
    expect(repair.productionCostUsd).toBe(0.12);
    expect(repair.blocked).toBeNull();
    expect(repair.rows.find((row) => row.optionId === "C")?.decision).toBe("repair");
    expect(qualityFirstRepairCandidates(repair)).toHaveLength(1);
    expect(qualityFirstRepairCandidates(repair)[0]).toMatchObject({
      scope: "option",
      optionId: "C",
      issueCode: "unsupported_extension",
      verificationStatus: "confirmed",
      repairEligible: true,
    });

    const ignored = qualityFirstPilotDryRun(
      mockFive({
        key,
        qualityReasons: ["mechanism_unverified", "low_confidence"],
        guards: [
          {
            label: "B",
            text: "A natural distractor that changes quantity.",
            guard: { status: "unverified", mechanismStatus: "mechanism_unverified", signals: [], reason: "label only", semanticRiskClearsGuard: false },
          },
        ],
      }),
    );
    expect(ignored.blocked).toBeNull();
    expect(ignored.rows.find((row) => row.optionId === "B")?.decision).toBe("insufficient_evidence");
    expect(qualityFirstRepairCandidates(ignored)).toHaveLength(0);

    const second = qualityFirstPilotDryRun(mockFive({ key, qualityReasons: ["second_defensible"], secondAnswerOptions: ["D"] }));
    expect(second.blocked).toBe("second_answer");
    expect(qualityFirstRepairCandidates(second)).toHaveLength(0);

    const keyRisk = qualityFirstPilotDryRun({ ...mockFive({ key }), keyFailures: ["key_equivalence_uncertain"] });
    expect(keyRisk.blocked).toBe("key_review");
    expect(qualityFirstRepairCandidates(keyRisk)).toHaveLength(0);

    const census = qualityFirstItems()[0]!;
    const whole = assessWholeSet({
      source: sourceSentence(census.item),
      key: census.item.core.correctAnswer,
      options: {
        A: census.item.core.correctAnswer,
        B: "The census office inferred that the vacancy rate had fallen after every household had been visited.",
        C: "Some households in one coastal district had been visited, so the vacancy rate had fallen.",
        D: "The census office showed that every household in the two coastal districts had been visited, yet it did not infer that the vacancy rate had fallen next year.",
        E: "No household in the two coastal districts had been visited, and the vacancy rate had fallen.",
      },
      correct: "A",
    });
    expect(whole.approvesTarget).toBe(false);
    expect(whole.meaningProven).toBe(false);
  });
});
