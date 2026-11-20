import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleItem } from "@/modules/factory/item-model/assemble";
import { benchmarkAuthorization, benchmarkCeilings, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { cognitiveTrapStrategyAuthorization } from "@/modules/factory/item-model/distractor-strategy";
import { selectCognitiveDistractors } from "@/modules/factory/item-model/distractor-strategy";
import { assessMeaningIntegrity } from "@/modules/factory/item-model/core";
import { assessParaphraseKey } from "@/modules/factory/item-model/paraphrase-key";
import { assertPrecheckStart, precheckAuthorization, precheckCeilings } from "@/modules/factory/item-model/precheck";
import { qualityProfileReady } from "@/modules/factory/item-model/quality-profile";
import { restatementModel } from "@/modules/factory/item-model/registry";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { screenExamSurface } from "@/modules/factory/item-model/gold";
import { assessWholeSet, classifyOption } from "@/modules/factory/item-model/whole-set";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { modelDefaults } from "./ai/config";
import { loadPrices } from "./ai/prices";
import { coreSystem, distractorSystem } from "./ai/prompts/item-model.v1";
import { keyParaphraseSystem, misreadingOptionsOutput, misreadingOptionsPromptVersion, misreadingOptionsResponseSchema } from "./ai/prompts/cognitive-trap.v1";
import { itemFactoryQualityRepair, qualityCallGraph, qualityCostEstimate } from "./stages/cognitive-trap";
import { loadOfficialComparisonCorpus } from "./stages/item-precheck";

const first = ".data/analysis/_factory/cognitive-trap/openrouter-v1";
const pilot = ".data/analysis/_factory/cognitive-trap/pilot-v1";

function record(dir: string, id: string) {
  return JSON.parse(readFileSync(`${dir}/${id}.json`, "utf8")) as {
    source: string;
    key: string;
    arms: { A: { options: Record<string, string> | null }; B: { options: Record<string, string> | null; keyLetter: string | null } };
  };
}

function cognitive(text: string, mechanism: string, reading: string) {
  return {
    candidateText: text,
    errorMechanism: mechanism,
    shiftTarget: "cause" as const,
    whyPlausible: "A reader can attach the clause to the wrong relation.",
    whyInferior: "The source keeps the original relation.",
    sourceEvidence: "source",
    semanticRisk: "none" as const,
    studentMisreading: reading,
    temptingEvidence: "Both parts of the sentence are visible.",
    actualSemanticDifference: "The relation between the parts changes.",
    whyIncorrect: "The source does not say that.",
  };
}

describe("quality production repair", () => {
  it("stops a second answer, a narrowed key, a long key, an and/but swap, and a short pool", () => {
    const issue = record(pilot, "pilot-restatement-3");
    const issueGate = assessWholeSet({ source: issue.source, key: issue.key, options: issue.arms.B.options!, correct: issue.arms.B.keyLetter as "E" });
    expect(issueGate.failure).toBeNull();
    expect(issueGate.decision).toBe("review");
    expect(issueGate.options.find((entry) => entry.label === "A")?.relation).toBe("unresolved");
    expect(issueGate.approvesTarget).toBe(false);

    const hall = record(pilot, "pilot-translation-en_tr-1");
    const hallKey = assessParaphraseKey(hall.source, hall.key);
    expect(hallKey.failures).toContain("scope_not_carried");
    expect(hallKey.meaningProven).toBe(false);

    const trains = record(pilot, "pilot-translation-en_tr-2");
    const trainsGate = assessWholeSet({ source: trains.source, key: trains.key, options: trains.arms.B.options!, correct: trains.arms.B.keyLetter as "B" });
    expect(trainsGate.risks.whole_set_clue_risk).toContain("key_length_clue");
    expect(trainsGate.approvesTarget).toBe(false);
    expect(trainsGate.failure).toBeNull();
    expect(trainsGate.decision).toBe("review");

    const boats = record(pilot, "pilot-translation-tr_en-1");
    const boatsGate = assessWholeSet({ source: boats.source, key: boats.key, options: boats.arms.A.options!, correct: "A" });
    expect(boatsGate.options.find((entry) => entry.label === "B")?.relation).toBe("unresolved");
    expect(boatsGate.failure).toBeNull();
    expect(boatsGate.decision).toBe("review");
    expect(boatsGate.risks.distractor_equivalence_risk.some((risk) => risk.startsWith("B:"))).toBe(true);

    const depotKey = "The clinic would not have missed the morning delivery if the drivers had left the depot before dawn.";
    const drafts = [
      cognitive("Did the drivers leave the depot before dawn, and would the clinic have missed the morning delivery?", "modality_shift", "The inversion is a question."),
      cognitive("The drivers left the depot before dawn, and the clinic did not miss the morning delivery.", "modality_shift", "The sentence reports actual past facts."),
      cognitive("The clinic would not have missed the morning delivery only if the drivers had left the depot before dawn.", "scope_widening", "Early departure is the only condition."),
      cognitive("The clinic would have missed the morning delivery even if the drivers had left the depot before dawn.", "polarity_reversal", "The clinic would have missed the delivery anyway."),
      cognitive("The drivers will leave the depot before dawn tomorrow, so the clinic will not miss the morning delivery.", "tense_shift", "The departure is in the future."),
    ];
    const pool = selectCognitiveDistractors({ candidates: drafts, keyText: depotKey, allowedMechanisms: restatementModel.errorMechanisms });
    expect(pool.removed.map((entry) => entry.reason)).toContain("surface_edit");
    expect(pool.status).toBe("insufficient");
    const repeated = selectCognitiveDistractors({
      candidates: [
        drafts[0]!,
        { ...drafts[1]!, studentMisreading: drafts[0]!.studentMisreading },
        drafts[2]!,
        drafts[4]!,
      ],
      keyText: depotKey,
      allowedMechanisms: restatementModel.errorMechanisms,
    });
    expect(repeated.removed.map((entry) => entry.reason)).toContain("repeated_misreading");

    const firstRestatement = record(first, "restatement-2");
    const firstTranslation = record(first, "translation-en_tr-2");
    expect(assessParaphraseKey(firstRestatement.source, firstRestatement.key).failures).toContain("key_near_copy");
    expect(assessParaphraseKey(firstRestatement.source, firstRestatement.key).approvesTarget).toBe(false);
    const firstSet = assessWholeSet({ source: firstTranslation.source, key: firstTranslation.key, options: firstTranslation.arms.B.options!, correct: firstTranslation.arms.B.keyLetter as "B" });
    expect(firstSet.approvesTarget).toBe(false);
    expect([...firstSet.risks.whole_set_clue_risk, ...firstSet.risks.key_semantic_risk].some((clue) => clue === "key_length_clue" || clue === "only_complete_option" || clue === "key_near_copy")).toBe(true);
  });

  it("matches five with beş and does not treat should or meli as an automatic mismatch", () => {
    const numbers = assessMeaningIntegrity("The clinic opened five wards.", "Klinik beş servis açtı.");
    expect(numbers.failures).not.toContain("quantity_shift");
    expect(numbers.status).not.toBe("pass");
    const digits = assessMeaningIntegrity("There were 5 wards.", "Beş servis vardı.");
    expect(digits.failures).not.toContain("quantity_shift");
    const three = assessMeaningIntegrity("Three auditors stayed.", "Üç denetçi kaldı.");
    expect(three.failures).not.toContain("quantity_shift");
    const mismatch = assessMeaningIntegrity("Three auditors stayed.", "Beş denetçi kaldı.");
    expect(mismatch.failures).toContain("quantity_shift");
    const advice = assessMeaningIntegrity("The clerk should lock the door.", "Görevli kapıyı kilitlemeli.");
    expect(advice.failures).not.toContain("modality_shift");
    expect(advice.status).toBe("unverified");
    const sameLanguage = assessMeaningIntegrity("The clerk should lock the door.", "The clerk locked the door.");
    expect(sameLanguage.failures).toContain("modality_shift");
    const strength = assessMeaningIntegrity("The clerk must lock the door.", "The clerk should lock the door.");
    expect(strength.failures).not.toContain("modality_shift");
    const possible = assessMeaningIntegrity("The clerk could lock the door.", "The clerk must lock the door.");
    expect(possible.failures).toContain("modality_shift");
    const discourse = assessMeaningIntegrity("Every fisher gathered a net, but only two boats returned.", "Every fisher gathered a net, and only two boats returned.");
    expect(discourse.failures).not.toContain("polarity_shift");
    expect(discourse.status).toBe("unverified");
    const cause = assessMeaningIntegrity("The door stayed locked although the yard was empty.", "The door stayed locked because the yard was empty.");
    expect(cause.failures).toContain("causal_added");
  });

  it("keeps the baseline path and prepares the four-item profile without calling it", async () => {
    expect(coreSystem).toContain("The source is fixed");
    expect(coreSystem).not.toContain("Had X, Y");
    expect(keyParaphraseSystem).toContain("Had X, Y");
    expect(distractorSystem).toContain("Return exactly eight candidates");
    expect(() => assertPrecheckStart({ authorization: precheckAuthorization, distractorStrategy: "cognitive_trap_first" })).toThrow(/baseline_v34/);
    expect(precheckCeilings.maxCalls).toBe(41);
    expect(benchmarkCeilings.maxCalls).toBe(360);
    const plan = freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge });
    expect(runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan }).started).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    const ready = qualityProfileReady();
    expect(ready.failures).toEqual([]);
    const corpus = loadOfficialComparisonCorpus() ?? [];
    const { qualityItems } = await import("@/modules/factory/item-model/quality-profile");
    for (const entry of qualityItems()) {
      const text = entry.item.source.kind === "translation" ? entry.item.source.sourceSentence : entry.item.source.kind === "restatement" ? entry.item.source.proposition : "";
      expect(screenExamSurface({ instructions: "", content: `${text}\n${entry.item.core.correctAnswer}` }, corpus).status).toBe("clear");
    }
    const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
    const estimate = qualityCostEstimate(prices!, 4);
    const graph = qualityCallGraph(4);
    expect(graph).toEqual({ writerCalls: 8, judgeCalls: 4, maxCalls: 12 });
    expect(estimate).not.toBeNull();
    expect(estimate!).toBeGreaterThan(0);
    expect(estimate!).toBeLessThan(1);
    const refused = await itemFactoryQualityRepair("not-authorized");
    expect(refused.started).toBe(false);
    expect(refused.providerCalls).toBe(0);
    const baseline = assembleItem({
      id: "baseline-check",
      modelId: "restatement.meaning_equivalence",
      source: { kind: "restatement", proposition: "The council delayed the vote on the harbor plan.", frame: { scope: "the harbor plan only", modality: "stated fact", polarity: "affirmative", tense: "past", argumentStructure: "council delayed vote" } },
      core: {
        stem: "The council delayed the vote on the harbor plan.",
        correctAnswer: "The harbor vote was postponed.",
        constructEvidence: "The postponed vote is the same event.",
        correctnessRationale: "Scope and polarity stay intact.",
        sourceReferences: ["proposition"],
        modelVersion: "writer-test",
        promptVersion: restatementModel.promptVersion,
        meaningDelta: "preserved",
      },
      distractors: [
        cognitive("The council delayed every infrastructure vote.", "scope_widening", "Every vote was delayed."),
        cognitive("The council may have delayed the harbor vote.", "modality_shift", "The delay is only possible."),
        cognitive("The council refused to delay the harbor vote.", "polarity_reversal", "The council refused the delay."),
        cognitive("The council will delay the harbor vote.", "tense_shift", "The delay is in the future."),
      ],
      correctOption: "A",
      generatorModel: "writer-test",
      judgeModel: null,
      judge: null,
      officialTexts: [],
      selfScoreClaim: null,
      distractorStrategy: "baseline_v34",
    });
    expect(baseline.production.distractorStrategy).toBe("baseline_v34");
    expect(baseline.qualityGate).toBeNull();
    expect(baseline.failure).toBeNull();
    const blocked = assembleItem({
      id: "near-key",
      modelId: "restatement.meaning_equivalence",
      source: { kind: "restatement", proposition: "Had the inspectors finished the coastal survey earlier, the harbor would not have needed to request a delay.", frame: { scope: "the coastal survey", modality: "counterfactual", polarity: "negative", tense: "past", argumentStructure: "An earlier finish would have removed the need for a delay." } },
      core: {
        stem: "Had the inspectors finished the coastal survey earlier, the harbor would not have needed to request a delay.",
        correctAnswer: "The harbor would not have needed to request a delay if the inspectors had finished the coastal survey earlier.",
        constructEvidence: "The counterfactual stays in place.",
        correctnessRationale: "Clause order is not an independent paraphrase.",
        sourceReferences: ["proposition"],
        modelVersion: "writer-test",
        promptVersion: restatementModel.promptVersion,
        meaningDelta: "preserved",
      },
      distractors: [
        cognitive("The inspectors did finish the coastal survey earlier, so the harbor did not need a delay.", "causal_direction", "The finish already happened."),
        cognitive("The harbor requested a delay because the inspectors finished the coastal survey earlier.", "modality_shift", "The finish caused the request."),
        cognitive("The inspectors will finish the coastal survey earlier, so the harbor will not need a delay.", "tense_shift", "The finish is in the future."),
        cognitive("Finishing the coastal survey earlier was only one condition, so the harbor might still have requested a delay.", "polarity_reversal", "The finish was only one reason."),
      ],
      correctOption: "A",
      generatorModel: "writer-test",
      judgeModel: null,
      judge: null,
      officialTexts: [],
      selfScoreClaim: null,
      distractorStrategy: "cognitive_trap_first",
      strategyAuthorization: cognitiveTrapStrategyAuthorization,
    });
    expect(blocked.failure).toBeNull();
    expect(blocked.qualityGate?.approvesTarget).toBe(false);
    expect(blocked.qualityGate?.risks.key_semantic_risk).toContain("key_near_copy");
    expect(blocked.core?.correctAnswer).toContain("if the inspectors had finished");
    expect(blocked.options?.A).toContain("if the inspectors had finished");
  });

  it("keeps shown differences, overlap, and a cut response from becoming an approval", () => {
    const quality = ".data/analysis/_factory/cognitive-trap/quality-v1";
    const saved = (id: string) => JSON.parse(readFileSync(`${quality}/${id}.json`, "utf8")) as {
      source: string;
      key: string;
      arms: { B: { options: Record<OptionLabel, string> | null; keyLetter: OptionLabel | null; status: string } };
    };
    const byText = (options: Record<OptionLabel, string>, pattern: RegExp) => Object.entries(options).find(([, text]) => pattern.test(text))?.[0] as OptionLabel | undefined;

    const door = saved("quality-restatement-medium");
    const doorOptions = door.arms.B.options!;
    const so = byText(doorOptions, /\bso\b/i);
    expect(so).toBeDefined();
    const doorGate = assessWholeSet({ source: door.source, key: door.key, options: doorOptions, correct: door.arms.B.keyLetter! });
    expect(doorGate.options.find((entry) => entry.label === so)?.relation).toBe("confirmed_difference");
    expect(doorGate.options.find((entry) => entry.label === so)?.evidence).toBe("concession_to_cause");
    expect(doorGate.failure).not.toBe("confirmed_equivalent");
    expect(doorGate.risks.whole_set_clue_risk).toContain("two_sentence_key");
    expect(doorGate.approvesTarget).toBe(false);
    expect(doorGate.meaningProven).toBe(false);

    const snow = saved("quality-translation-tr_en");
    const snowOptions = snow.arms.B.options!;
    const during = byText(snowOptions, /\bduring\b/i);
    expect(during).toBeDefined();
    const snowGate = assessWholeSet({ source: snow.source, key: snow.key, options: snowOptions, correct: snow.arms.B.keyLetter! });
    expect(snowGate.options.find((entry) => entry.label === during)?.relation).toBe("confirmed_difference");
    expect(snowGate.options.find((entry) => entry.label === during)?.evidence).toBe("before_to_during");
    expect(snowGate.decision).not.toBe("fail");

    const ferry = saved("quality-restatement-hard");
    const ferryOptions = ferry.arms.B.options!;
    const factual = byText(ferryOptions, /^Because\b/i);
    const sent = byText(ferryOptions, /\bsent\b/i);
    const ferryGate = assessWholeSet({ source: ferry.source, key: ferry.key, options: ferryOptions, correct: ferry.arms.B.keyLetter! });
    expect(ferryGate.options.find((entry) => entry.label === factual)?.evidence).toBe("counterfactual_to_factual");
    expect(ferryGate.options.find((entry) => entry.label === sent)?.evidence).toBe("recipient_to_sender");
    expect(ferryGate.risks.key_semantic_risk).toEqual(expect.arrayContaining(["stood_to_prospective", "once_may_be_temporal"]));
    expect(ferryGate.risks.whole_set_clue_risk).toContain("key_length_clue");
    expect(ferryGate.decision).toBe("review");
    expect(ferryGate.failure).toBeNull();

    const only = classifyOption("Every shepherd counted a flock.", "Every shepherd counted a flock.", "Only two shepherds counted a flock.");
    expect(only.relation).toBe("confirmed_difference");
    expect(only.evidence).toBe("all_to_only");
    const connector = classifyOption("The boats returned, but the nets stayed.", "The boats returned, but the nets stayed.", "The boats returned, and the nets stayed.");
    expect(connector.relation).toBe("unresolved");
    const copy = "The night clerk kept the side door locked.";
    const equivalent = assessWholeSet({
      source: "The night clerk kept the side door locked until dawn.",
      key: copy,
      options: { A: copy, B: "The night clerk opened the side door.", C: "The day clerk kept the front door locked.", D: "The night clerk kept every door locked.", E: "The night clerk kept the side door open." },
      correct: "E",
    });
    expect(equivalent.options.find((entry) => entry.label === "A")?.relation).toBe("confirmed_equivalent");
    expect(equivalent.decision).toBe("fail");
    expect(equivalent.failure).toBe("confirmed_equivalent");

    const schema = JSON.stringify(misreadingOptionsResponseSchema(restatementModel.errorMechanisms));
    expect(misreadingOptionsPromptVersion).toBe("cognitive-trap.options.v5");
    expect(schema).not.toContain("whyPlausible");
    expect(schema).not.toContain("temptingEvidence");
    expect(schema).not.toContain("actualSemanticDifference");
    expect(schema).toContain("studentMisreading");
    const cut = readdirSync(".data/analysis/cache/ai")
      .map((file) => readFileSync(path.join(".data/analysis/cache/ai", file), "utf8"))
      .filter((text) => text.includes("\"cognitive-trap.options.v3\"") && text.includes("\"finishReason\":\"LENGTH\""))
      .map((text) => JSON.parse(text) as { response?: { text?: string; finishReason?: string; usage?: { outputTokens?: number; reasoningTokens?: number } } })
      .find((entry) => entry.response?.finishReason === "LENGTH");
    expect(cut?.response?.text?.trim().endsWith("}")).toBe(false);
    expect(() => JSON.parse(cut?.response?.text ?? "")).toThrow();
    expect(misreadingOptionsOutput(restatementModel.errorMechanisms).safeParse(cut?.response?.text).success).toBe(false);
    expect(cut?.response?.usage?.outputTokens).toBe(4096);
    expect(cut?.response?.usage?.reasoningTokens).not.toBe(cut?.response?.usage?.outputTokens);

    const summary = JSON.parse(readFileSync(`${quality}/summary.json`, "utf8")) as { providerCalls: number; studentBankWrites: number; retry: number; benchmarkStarted: boolean };
    expect(summary.providerCalls).toBe(8);
    expect(summary.studentBankWrites).toBe(0);
    expect(summary.retry).toBe(0);
    expect(summary.benchmarkStarted).toBe(false);
    expect(optionLabels).toHaveLength(5);
  }, 15000);
});
