import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { benchmarkAuthorization, benchmarkCeilings, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { assessKey, assessMeaningIntegrity, assessOperationFit, assessReadingDiversity } from "@/modules/factory/item-model/core";
import type { DistractorCandidate, ItemCore, ItemSource } from "@/modules/factory/item-model/contract";
import { shingles } from "@/modules/analysis/validate";
import { screenExamSurface, standardInstructionShingles } from "@/modules/factory/item-model/gold";
import { buildRunRecord, precheckAuthorization, precheckCeilings, smokeCeilings } from "@/modules/factory/item-model/precheck";
import { acceptDistractorPool, selectDistractors } from "@/modules/factory/item-model/pool";
import { readingModel, restatementModel, translationModel } from "@/modules/factory/item-model/registry";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { modelDefaults } from "./ai/config";
import { distractorResponseSchema, distractorSystem } from "./ai/prompts/item-model.v1";
import type { AIProvider, ModelResponse } from "./ai/types";
import { executePrecheck, loadOfficialComparisonCorpus } from "./stages/item-precheck";

const precheckDir = ".data/analysis/_factory/item-precheck/openrouter-v1";

function savedText(id: string, stage: "source" | "core" | "distractors"): string {
  const record = JSON.parse(readFileSync(`${precheckDir}/${id}.json`, "utf8")) as { calls: { stage: string; requestHash: string }[] };
  const hash = record.calls.find((call) => call.stage === stage)?.requestHash;
  const cached = JSON.parse(readFileSync(`.data/analysis/cache/ai/${hash}.json`, "utf8")) as { response: { text: string } };
  return cached.response.text;
}

function candidate(mechanism: string, text: string, shift: DistractorCandidate["shiftTarget"] = "quantity"): DistractorCandidate {
  return { candidateText: text, errorMechanism: mechanism, shiftTarget: shift, whyPlausible: "It keeps the same actors.", whyInferior: "It changes the quantity.", sourceEvidence: "proposition", semanticRisk: "none" };
}

const mechanisms = restatementModel.errorMechanisms;

describe("distractor schema", () => {
  it("keeps a long mechanism explanation out of the enum and keeps the other candidates", () => {
    const raw = JSON.parse(savedText("restatement-1", "distractors")) as { candidates: { errorMechanism: string }[] };
    const split = acceptDistractorPool(raw, mechanisms);
    expect(split.accepted.length + split.rejected.length).toBe(raw.candidates.length);
    expect(split.accepted.every((entry) => mechanisms.includes(entry.errorMechanism))).toBe(true);
    expect(split.rejected.every((entry) => entry.reason === "invalid_mechanism" && !mechanisms.includes(entry.candidate.errorMechanism))).toBe(true);
    const seven = mechanisms.slice(0, 7).map((mechanism, index) => candidate(mechanism, `Shifted statement ${index}.`));
    const explained = candidate("quantity_scope: the universal three is weakened to some", "Some auditors had withdrawn the objection.");
    const mixed = acceptDistractorPool({ candidates: [...seven, explained] }, mechanisms);
    expect(mixed.accepted).toHaveLength(7);
    expect(mixed.accepted.every((entry) => entry.errorMechanism === "quantity_scope" || mechanisms.includes(entry.errorMechanism))).toBe(true);
    expect(mixed.rejected.map((entry) => entry.candidate.errorMechanism)).toEqual([explained.errorMechanism]);
    expect(selectDistractors({ candidates: mixed.accepted, keyText: "The key statement.", allowedMechanisms: mechanisms }).status).toBe("selected");
  });

  it("rejects a token outside the enum and stops when four reliable candidates are not left", () => {
    const foreign = acceptDistractorPool({ candidates: [candidate("word_order", "The vote was delayed by the council.")] }, translationModel.errorMechanisms);
    expect(foreign.rejected[0]?.reason).toBe("invalid_mechanism");
    expect(foreign.rejected[0]?.candidate.errorMechanism).toBe("word_order");
    const three = mechanisms.slice(0, 3).map((mechanism, index) => candidate(mechanism, `Different shift ${index}.`));
    expect(selectDistractors({ candidates: three, keyText: "The key statement.", allowedMechanisms: mechanisms })).toMatchObject({ status: "insufficient", selected: [] });
    const schema = JSON.stringify(distractorResponseSchema(mechanisms));
    expect(schema).toContain("quantity_scope");
    expect(distractorSystem).toContain("exactly one token");
    expect(distractorSystem).toContain("is not shortened");
  });
});

describe("key meaning integrity", () => {
  const restatement = (proposition: string, answer: string): ItemSource => ({
    kind: "restatement",
    proposition,
    frame: { scope: "the whole city", modality: "counterfactual", polarity: "affirmative", tense: "past perfect before past conditional", argumentStructure: "A missed review left the city in need of the loan." },
  });

  it("rejects an added only-because and does not treat a clean check as a pass", () => {
    const source = "Had the committee reviewed the budget before the deadline, the city would not have needed an emergency loan.";
    const key = "The city needed the emergency loan only because the committee did not review the budget in time before the deadline.";
    const meaning = assessMeaningIntegrity(source, key);
    expect(meaning.status).toBe("fail");
    expect(meaning.failures).toContain("exclusive_added");
    expect(meaning.areas.exclusivity).toBe("fail");
    expect(meaning.areas.condition).toBe("unverified");
    expect(Object.values(meaning.areas)).not.toContain("pass");
    const core: ItemCore = {
      stem: source,
      correctAnswer: key,
      constructEvidence: "The counterfactual is restated.",
      correctnessRationale: "The writer claims the meaning is preserved.",
      sourceReferences: ["proposition"],
      modelVersion: "writer-test",
      promptVersion: restatementModel.promptVersion,
      meaningDelta: "preserved",
      reading: null,
    };
    const assessment = assessKey(restatementModel, restatement(source, key), core);
    expect(assessment.valid).toBe(false);
    expect(assessment.meaning.status).toBe("fail");
    const record = buildRunRecord({
      id: "restatement-3",
      model: restatementModel,
      generatorModel: "writer-test",
      judgeModel: "judge-test",
      correctOption: "C",
      officialTexts: ["unrelated official booklet wording"],
      calls: [],
      costUsd: null,
      source: { called: true, value: restatement(source, key), error: null },
      core: { called: true, value: core, error: null },
      distractors: { called: true, value: mechanisms.slice(0, 4).map((mechanism, index) => candidate(mechanism, `Option ${index}`)), error: null },
      judge: { called: true, value: null, error: null },
    });
    expect(record.key.status).toBe("fail");
    expect(record.pool.status).toBe("not_run");
    expect(record.blind.status).toBe("not_run");
    expect(record.typeSemantic.status).toBe("not_run");
    expect(record.meaningIntegrity.status).not.toBe("pass");
  });

  it("rejects the analyst seeing what the manager saw, and keeps a matching role unverified", () => {
    const source = "Müdür, raporun cuma gününe kadar teslim edilmesini istemesine rağmen, analistlerin yalnızca üçte birinin veriyi temizlediğini gördü.";
    const shifted = "Although the manager asked for the report to be submitted by Friday, the analysts saw that only one third of them had cleaned the data.";
    const meaning = assessMeaningIntegrity(source, shifted);
    expect(meaning.status).toBe("fail");
    expect(meaning.failures).toContain("role_shift");
    const faithful = "Although the manager asked for the report to be submitted by Friday, the manager saw that only one third of the analysts had cleaned the data.";
    const kept = assessMeaningIntegrity(source, faithful);
    expect(kept.failures).not.toContain("role_shift");
    expect(kept.status).toBe("unverified");
    const argued = assessMeaningIntegrity(
      "Üç denetçi, şirketin geçen yıl harcadığı paranın yalnızca bir kısmının belgelendiğini, bu yüzden raporun henüz kesinleşmemesi gerektiğini savundu.",
      "Three auditors argued that only part of the money the company spent last year had been documented, so the report should not yet be finalized.",
    );
    expect(argued.failures).not.toContain("role_shift");
    expect(argued.status).toBe("unverified");
    const ordered = assessMeaningIntegrity(
      "Only after the audit had revealed the shortfall did the board cancel the contract.",
      "The board cancelled the contract only after the audit had revealed the shortfall.",
    );
    expect(ordered.status).toBe("unverified");
    expect(ordered.failures).not.toContain("exclusive_added");
  });
});

describe("reading quality", () => {
  it("records a verbatim inference as a lookup and does not call distinct ids cognitive proof", () => {
    const passage = JSON.parse(savedText("reading-1-q1", "source")).passage as string;
    const core = JSON.parse(savedText("reading-1-q2", "core")) as { correctAnswer: string; questionFunction: string };
    const fit = assessOperationFit(`Intro. ${core.correctAnswer} Ending.`, core.correctAnswer, "inference");
    expect(fit.observed).toBe("direct_lookup");
    expect(fit.labelAgrees).toBe(false);
    expect(fit.hardCandidate).toBe(false);
    const detail = assessOperationFit(passage, passage.split(/(?<=[.!?])\s+/)[0] ?? passage, "detail");
    expect(detail.observed).toBe("direct_lookup");
    expect(detail.labelAgrees).toBe(true);
    expect(detail.hardCandidate).toBe(false);
    const same = assessReadingDiversity([
      { propositionId: "p1", testedProposition: "A stop codon ends translation without an amino acid.", questionFunction: "inference" },
      { propositionId: "p2", testedProposition: "Without an amino acid, a stop codon ends translation.", questionFunction: "detail" },
      { propositionId: "p3", testedProposition: "Transcription happens inside the nucleus.", questionFunction: "detail" },
      { propositionId: "p4", testedProposition: "Messenger RNA leaves the nucleus for the cytoplasm.", questionFunction: "purpose" },
    ]);
    expect(same.status).toBe("review");
    expect(same.failures).toContain("same_meaning");
    expect(same.propositionIdentityIsNotCognitiveProof).toBe(true);
  });

  it("exempts a standard main-idea stem and still rejects a real official copy", () => {
    const corpus = loadOfficialComparisonCorpus() ?? [];
    expect(corpus.length).toBeGreaterThan(0);
    const stem = "Which statement best expresses the main idea of the passage?";
    expect(standardInstructionShingles).toContain("the main idea of the");
    const stemOnly = screenExamSurface({ instructions: stem, content: "Gene expression moves information from DNA to RNA to protein." }, corpus);
    expect(stemOnly.status).toBe("clear");
    const official = corpus.find((text) => text.toLowerCase().includes("the main idea of the"));
    expect(official).toBeTruthy();
    const run = [...shingles(official!, 5)].find((value) => !standardInstructionShingles.includes(value));
    expect(run).toBeTruthy();
    const copied = screenExamSurface({ instructions: stem, content: `The passage says ${run} in the same order.` }, corpus);
    expect(copied.status).toBe("overlap");
    expect(copied.sharedRun).not.toBe("the main idea of the");
  });
});

describe("old factory protections", () => {
  it("does not call distractors after the exclusive key, and leaves the ceilings locked", async () => {
    const calls: string[] = [];
    const provider: AIProvider = {
      name: "fixture",
      async generate(request): Promise<ModelResponse> {
        const system = request.system ?? "";
        const user = request.parts.map((part) => ("text" in part ? part.text : "")).join("\n");
        calls.push(system);
        const counterfactual = "Had the committee reviewed the budget before the deadline, the city would not have needed an emergency loan.";
        if (system.startsWith("ITEM MODEL SOURCE") && user.includes("Write source 3") && user.includes("restatement.meaning_equivalence")) {
          return { text: JSON.stringify({ proposition: counterfactual, scope: "the whole city", modality: "counterfactual", polarity: "affirmative", tense: "past perfect before past conditional", argumentStructure: "A missed review left the loan in place." }), model: request.model, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
        }
        if (system.startsWith("ITEM MODEL KEY") && user.includes(counterfactual)) {
          return { text: JSON.stringify({ stem: counterfactual, correctAnswer: "The city needed the emergency loan only because the committee did not review the budget before the deadline.", constructEvidence: "The writer restates the condition.", correctnessRationale: "The writer claims preservation.", sourceReferences: ["proposition"], meaningDelta: "preserved" }), model: request.model, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
        }
        if (system.startsWith("ITEM MODEL DISTRACTOR") && user.includes("only because")) throw new Error("distractor call started after a rejected key");
        const body = system.startsWith("ITEM MODEL SOURCE")
          ? user.includes("translation.meaning_preservation")
            ? user.includes("DIRECTION: en_tr")
              ? { sourceSentence: "The council delayed the vote on the harbor plan.", sourceLanguage: "en", targetLanguage: "tr", roles: ["agent:council"], scope: "harbor plan" }
              : { sourceSentence: "Kurul, liman planının oylamasını erteledi.", sourceLanguage: "tr", targetLanguage: "en", roles: ["agent:council"], scope: "harbor plan" }
            : user.includes("reading.evidence_based")
              ? { sourceId: "src-harbor", passage: `The council delayed the vote after the report. Harbor records remained limited to that plan. ${Array.from({ length: 150 }, (_, index) => `Note${index}`).join(" ")}.`, questionPlan: [1, 2, 3, 4].map((number) => ({ propositionId: `p${number}`, evidenceSpanId: `span-${number}`, testedProposition: [`The council delayed one harbor vote.`, `Records stayed limited to the plan.`, `The report arrived before the decision.`, `The limit covered that harbor plan.`][number - 1], cognitiveOperation: "locate", questionFunction: "detail" })) }
              : { proposition: "The council delayed the vote on the harbor plan.", scope: "the harbor plan", modality: "stated fact", polarity: "affirmative", tense: "past", argumentStructure: "council delayed vote" }
          : system.startsWith("ITEM MODEL KEY")
            ? { stem: "The council delayed the vote on the harbor plan.", correctAnswer: user.includes('"targetLanguage":"tr"') ? "Liman oylaması ertelendi." : "The harbor vote was postponed.", constructEvidence: "The postponed vote keeps the claim.", correctnessRationale: "The frame stays intact.", sourceReferences: user.includes("reading.evidence_based") ? [user.match(/THIS QUESTION'S EVIDENCE SPAN ID: (span-\d)/)?.[1] ?? "span-1"] : user.includes("translation.meaning_preservation") ? ["source_sentence"] : ["proposition"], meaningDelta: "preserved", ...(user.includes("reading.evidence_based") ? { questionFunction: "detail", evidenceSpan: { id: user.match(/THIS QUESTION'S EVIDENCE SPAN ID: (span-\d)/)?.[1] ?? "span-1", quote: "The council delayed the vote after the report." }, propositionId: `p${user.match(/QUESTION SLOT: (\d)/)?.[1] ?? "1"}`, testedProposition: [`The council delayed one harbor vote.`, `Records stayed limited to the plan.`, `The report arrived before the decision.`, `The limit covered that harbor plan.`][Number(user.match(/QUESTION SLOT: (\d)/)?.[1] ?? "1") - 1], cognitiveOperation: "locate" } : {}) }
            : system.startsWith("ITEM MODEL DISTRACTOR")
              ? { candidates: ["scope_widening", "modality_shift", "polarity_reversal", "tense_shift", "argument_swap", "predicate_meaning", "causal_direction", "quantity_scope"].map((errorMechanism, index) => ({ candidateText: `Different option ${index} about the harbor vote.`, errorMechanism: user.includes("reading.evidence_based") ? ["unsupported_detail", "opposite_claim", "out_of_passage", "partial_evidence", "wrong_operation", "unsupported_detail", "opposite_claim", "partial_evidence"][index] : user.includes("translation.meaning_preservation") ? ["scope_shift", "modality_shift", "polarity_reversal", "role_reversal", "tense_shift", "purpose_shift", "contrast_shift", "quantity_shift"][index] : errorMechanism, shiftTarget: "scope", whyPlausible: "It mentions the vote.", whyInferior: "It changes the frame.", sourceEvidence: "source", semanticRisk: index === 4 ? "second_answer" : "none" })) }
              : { blindAnswer: "A", blindConfidence: 0.9, blindEvidence: "One option keeps the claim.", blindUncertain: false, blindAlternative: null, acceptability: { sentences: ["A", "B", "C", "D", "E"].map((option) => ({ option, acceptable: option === "A", relationCoherent: option === "A", confidence: 0.9, reason: "checked" })) }, report: { scores: { correctness: 0.95, ambiguityRisk: 0.05, distractorQuality: 0.85, targetAlignment: 0.9, difficultyFit: 0.8, grammar: 0.95, semantic: 0.9, ydsAlignment: 0.85, originalityRisk: 0.05, clueRisk: 0.1 }, alternativeDefensibleOptions: [], estimatedDifficulty: "hard", verdict: "APPROVE", reasons: ["The frame holds."] } };
        return { text: JSON.stringify(body), model: request.model, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
      },
    };
    const run = await executePrecheck({
      authorization: precheckAuthorization,
      providerFor: () => provider,
      prices: { source: "test", table: { "writer-test": { in: 1, out: 1 }, "judge-test": { in: 1, out: 1 }, "fixture:writer-test": { in: 1, out: 1 }, "fixture:judge-test": { in: 1, out: 1 } } },
      models: { generator: "writer-test", judge: "judge-test" },
      officialTexts: ["zzz-official-comparison-corpus-marker"],
      sources: [{ sourceId: "src-harbor", locator: { kind: "doi", value: "10.1000/harbor" }, topic: "harbors", factNotes: "A council delayed one harbor vote after a report.", usageRights: "granted", role: "production_notes" }],
      cacheSalt: `quality-repair-${Date.now()}`,
    });
    const blocked = run.records.find((record) => record.id === "restatement-3");
    expect(blocked?.key.failures).toContain("exclusive_added");
    expect(blocked?.pool.status).toBe("not_run");
    expect(blocked?.calls.map((call) => call.stage)).toEqual(["source", "core"]);
    expect(calls.filter((system) => system.startsWith("ITEM MODEL DISTRACTOR"))).toHaveLength(10);
    expect(precheckCeilings).toMatchObject({ maxCalls: 41, totalUsdCap: 2.05, maxRegenerations: 0 });
    expect(smokeCeilings).toMatchObject({ maxCalls: 10, totalUsdCap: 0.5, maxRegenerations: 0 });
    expect(benchmarkCeilings).toMatchObject({ total: 90, maxCalls: 360, totalUsdCap: 18 });
    expect(runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan: freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge }) }).started).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(run.studentBankWrites).toBe(0);
  });
});
