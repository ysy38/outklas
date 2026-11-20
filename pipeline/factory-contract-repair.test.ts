import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { contentVersion, describeDroppedDistractors, selectCognitiveDistractors } from "@/modules/factory/item-model/distractor-strategy";
import { loadGoldReview, submitGoldReview, goldCriteria, type GoldCriteria } from "@/modules/factory/item-model/gold-approval";
import { assessTargetLanguage, optionScript } from "@/modules/factory/item-model/option-language";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { selectDistractors } from "@/modules/factory/item-model/pool";
import { restatementModel, translationModel } from "@/modules/factory/item-model/registry";
import { taxonomyLiveItems } from "@/modules/factory/item-model/taxonomy-live";
import { assessWholeSet } from "@/modules/factory/item-model/whole-set";
import { loadPrices } from "./ai/prices";
import { misreadingOptionsUser } from "./ai/prompts/cognitive-trap.v1";
import { judgeUser } from "./ai/prompts/item-model.v1";
import type { AIProvider, ModelResponse } from "./ai/types";
import { executeCognitiveTrap } from "./stages/cognitive-trap";
import { loadOfficialComparisonCorpus, openrouterPrecheckModels } from "./stages/item-precheck";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const taxonomyDir = ".data/analysis/_factory/cognitive-trap/taxonomy-live-v1";
const goldDir = ".data/analysis/_factory/editorial-gold/v1";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const watched = [...filesUnder(taxonomyDir), ...filesUnder(goldDir)].sort();
const fingerprint = () => watched.map((file) => createHash("sha256").update(readFileSync(file)).digest("hex")).join("\n");
const frozenRecords = fingerprint();

afterAll(() => {
  expect(fingerprint()).toBe(frozenRecords);
});

function readings(user: string, count = 4) {
  const ids = [...user.matchAll(/^- ([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1]!).filter((id) => id !== "NONE");
  const cycle = ids.length > 0 ? ids : ["TEMPORAL_ORDER"];
  return {
    meaningMap: { roles: "Actors stay.", quantity: "Quantities stay.", modality: "Modality stays.", polarity: "Polarity stays.", tense: "Time stays.", cause: "Cause stays.", reference: "Reference stays." },
    preservedRelations: ["concession", "quantity"],
    readings: Array.from({ length: count }, (_, index) => ({
      studentMisreading: `A reader treats clause ${index} as the cause of the other clause.`,
      temptingEvidence: "Both clauses sit in the same sentence.",
      actualSemanticDifference: "The cause and the result trade places.",
      whyIncorrect: "The source keeps the original direction.",
      prevalence: "unmeasured",
      misreadingMechanism: cycle[index % cycle.length]!,
    })),
  };
}

function optionPayload(texts: string[], mechanisms: readonly string[]) {
  return {
    candidates: texts.map((candidateText, index) => ({
      candidateText,
      errorMechanism: mechanisms[index % mechanisms.length]!,
      shiftTarget: "cause" as const,
      semanticRisk: "none" as const,
      studentMisreading: `A reader treats clause ${index} as the cause of the other clause.`,
    })),
  };
}

function judgePacket(letter: OptionLabel, patch: Record<string, unknown> = {}) {
  const verdict = (patch.verdict as string) ?? "REVIEW";
  const clueRisk = (patch.clueRisk as number) ?? 0.2;
  const rivals = (patch.rivals as OptionLabel[]) ?? [];
  const blindAnswer = (patch.blindAnswer as OptionLabel) ?? letter;
  const acceptable = (patch.acceptable as OptionLabel[]) ?? [letter];
  return {
    blindAnswer,
    blindConfidence: 0.9,
    blindEvidence: "fixture",
    blindUncertain: false,
    blindAlternative: (patch.blindAlternative as OptionLabel | null) ?? null,
    acceptability: { sentences: optionLabels.map((option) => ({ option, acceptable: acceptable.includes(option), confidence: 0.9, reason: "grammar only" })) },
    report: {
      scores: { correctness: 0.9, ambiguityRisk: 0.1, distractorQuality: 0.8, targetAlignment: 0.8, difficultyFit: 0.7, grammar: 0.9, semantic: 0.86, ydsAlignment: 0.8, originalityRisk: 0.1, clueRisk },
      alternativeDefensibleOptions: rivals,
      estimatedDifficulty: (patch.estimatedDifficulty as string) ?? "medium",
      verdict,
      reasons: ["fixture"],
    },
  };
}

async function runQuality(item: ReturnType<typeof taxonomyLiveItems>[number]["item"], texts: string[], judge: (letter: OptionLabel) => unknown, calls: string[]) {
  const mechanisms = item.questionType === "translation" ? translationModel.errorMechanisms : restatementModel.errorMechanisms;
  const users: string[] = [];
  const provider: AIProvider = {
    name: "openrouter",
    async generate(request): Promise<ModelResponse> {
      const system = request.system ?? "";
      const user = request.parts.map((part) => ("text" in part ? part.text : "")).join("\n");
      calls.push(system.slice(0, 20));
      users.push(user);
      const body = system.startsWith("MISREADING PATHS")
        ? readings(user, texts.length)
        : system.startsWith("MISREADING OPTIONS")
          ? optionPayload(texts, mechanisms)
          : judge("C");
      return { text: JSON.stringify(body), model: request.model, usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 } };
    },
  };
  const out = mkdtempSync(path.join(tmpdir(), "tomo-contract-"));
  try {
    const run = await executeCognitiveTrap({
      authorization: "cognitive-trap-v1",
      providerFor: () => provider,
      prices,
      models: { ...openrouterPrecheckModels },
      outDir: out,
      cacheSalt: `contract-repair-${Date.now()}-${Math.random()}`,
      officialTexts: loadOfficialComparisonCorpus() ?? [],
      items: [item],
      profile: "quality",
    });
    return { run, users };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

const turkishDistractors = [
  "Hakemler ekin birincil sonucu değiştirdiğini kanıt sayıp iki ikincil ölçütteki düşüşü kapattılar.",
  "Hakemler ekin birincil sonucu hiç etkilemediğini kesin yazıp ikincil ölçülerdeki düşüşü de reddettiler.",
  "Hakemler yalnızca birincil sonucu inceleyip ikincil ölçülerdeki yavaş düşüşü başka bir kurula bıraktılar.",
  "Hakemler ekin iki ikincil ölçütte hızlı yükseliş yarattığını yazıp birincil sonucu dosya dışında tuttular.",
];

describe("factory contract repair", () => {
  it("fails the saved EN→TR English distractors before any judge and lets a Turkish set through", () => {
    const saved = JSON.parse(readFileSync(path.join(taxonomyDir, "taxonomy-translation-en_tr.json"), "utf8")) as {
      key: string;
      arms: { B: { keyLetter: OptionLabel; options: Record<OptionLabel, string> } };
    };
    expect(assessTargetLanguage({ questionType: "translation", targetLanguage: "tr", options: saved.arms.B.options })).toEqual({ status: "fail", failures: ["target_language_mismatch"] });
    expect(optionScript(saved.arms.B.options.A)).toBe("en");
    expect(optionScript(saved.key)).toBe("tr");
    const turkish = { ...saved.arms.B.options, A: turkishDistractors[0]!, B: turkishDistractors[1]!, C: turkishDistractors[2]!, D: turkishDistractors[3]! };
    turkish[saved.arms.B.keyLetter] = saved.key;
    expect(assessTargetLanguage({ questionType: "translation", targetLanguage: "tr", options: turkish })).toEqual({ status: "pass", failures: [] });
    const unclear = { ...turkish, A: "Log sample twelve." };
    expect(assessTargetLanguage({ questionType: "translation", targetLanguage: "tr", options: unclear })).toEqual({ status: "review", failures: ["language_unverified"] });
    const restatement = JSON.parse(readFileSync(path.join(taxonomyDir, "taxonomy-restatement-medium.json"), "utf8")) as { arms: { B: { options: Record<OptionLabel, string> } } };
    expect(assessTargetLanguage({ questionType: "restatement", targetLanguage: null, options: restatement.arms.B.options })).toEqual({ status: "pass", failures: [] });
    const gate = assessWholeSet({ source: "source", key: saved.key, options: saved.arms.B.options, correct: saved.arms.B.keyLetter });
    expect(gate.meaningProven).toBe(false);
    expect(gate.approvesTarget).toBe(false);
  });

  it("stops wrong-language distractors before the judge and keeps the five options", async () => {
    const item = taxonomyLiveItems().find((entry) => entry.item.id === "taxonomy-translation-en_tr")!.item;
    const calls: string[] = [];
    const { run } = await runQuality(item, ["Because the referees found no evidence, they closed the secondary measures.", "Although the referees found no evidence, they closed every measure.", "Although the referees proved the supplement had no effect at all on the trial.", "Although the referees found no evidence, they dismissed a slower decline."], () => {
      throw new Error("judge called");
    }, calls);
    const arm = run.records[0]!.arms.B;
    expect(arm.status).toBe("five_options");
    expect(arm.qualityDecision).toBe("fail");
    expect(arm.failures).toContain("target_language_mismatch");
    expect(arm.modelVerdict).toBeNull();
    expect(arm.editorial).toBe("pending");
    expect(calls.some((call) => call.startsWith("INDEPENDENT"))).toBe(false);
    expect(run.qualityProven).toBe(false);
    expect(run.records[0]!.designTarget).toBe("medium");
    expect(run.records[0]!.observedDifficulty).toBeNull();
  });

  it("accepts Turkish distractors, keeps a surface edit out, and does not turn grammar into a second answer", async () => {
    const item = taxonomyLiveItems().find((entry) => entry.item.id === "taxonomy-translation-en_tr")!.item;
    const near = item.core.correctAnswer.replace("Hakemler", "Kurul");
    const calls: string[] = [];
    const { run, users } = await runQuality(item, [...turkishDistractors, near], (letter) => judgePacket(letter, { verdict: "REVIEW", acceptable: [...optionLabels] }), calls);
    const arm = run.records[0]!.arms.B;
    expect(arm.status).toBe("five_options");
    expect(arm.qualityDecision).toBe("needs_revision");
    expect(arm.qualityReasons).toContain("judge_review");
    expect(arm.secondAnswerOptions).toEqual([]);
    expect(arm.acceptableOptions).toEqual([...optionLabels]);
    expect(arm.editorial).toBe("pending");
    expect(arm.options ? Object.values(arm.options) : []).not.toContain(near);
    const dropped = arm.droppedDistractors.find((row) => row.candidateText === near);
    expect(dropped?.reason).toBe("surface_edit");
    expect(dropped?.sourceVersion).toBe(contentVersion(item.source.kind === "translation" ? item.source.sourceSentence : ""));
    expect(dropped?.keyVersion).toBe(contentVersion(item.core.correctAnswer));
    expect(users.some((user) => user.includes("TARGET LANGUAGE: tr"))).toBe(true);
    expect(calls.some((call) => call.startsWith("INDEPENDENT"))).toBe(true);
    expect(run.records[0]!.estimatedDifficulty).toBe("medium");
    expect(run.records[0]!.observedDifficulty).toBeNull();
  });

  it("sends the item design target to the judge and tightens review without approving", async () => {
    const medium = taxonomyLiveItems().find((entry) => entry.item.id === "taxonomy-restatement-medium")!.item;
    const hard = taxonomyLiveItems().find((entry) => entry.item.id === "taxonomy-translation-tr_en")!.item;
    const english = [
      "Because the registry held every laboratory log, the archivist filed the two withdrawn samples with them.",
      "Although the registry kept only some laboratory logs, the archivist discovered no trace of the two withdrawn samples.",
      "Although the registry kept every laboratory log, the archivist established that the two samples had never been filed.",
      "Although the registry kept every laboratory log, the archivist discovered a trace that the samples were absent.",
    ];
    const approvedCalls: string[] = [];
    const approved = await runQuality(medium, english, (letter) => judgePacket(letter, { verdict: "APPROVE", clueRisk: 0.2, estimatedDifficulty: "medium" }), approvedCalls);
    const approvedUser = approved.users.find((user) => user.includes("The key letter is hidden."));
    expect(approvedUser).toContain("TARGET DIFFICULTY REQUEST: medium");
    expect(approvedUser).not.toContain("TARGET DIFFICULTY REQUEST: hard");
    expect(approved.run.records[0]!.designTarget).toBe("medium");
    expect(approved.run.records[0]!.arms.B.modelVerdict).toBe("APPROVE");
    expect(approved.run.records[0]!.arms.B.qualityDecision).toBe("needs_revision");
    expect(approved.run.records[0]!.arms.B.qualityReasons).toContain("mechanism_unverified");
    expect(approved.run.records[0]!.arms.B.qualityReasons).not.toContain("unsupported_clause");
    expect(approved.run.records[0]!.arms.B.editorial).toBe("pending");
    expect(approved.run.records[0]!.arms.B.options?.A).toBeTruthy();
    expect(approved.run.records[0]!.arms.B.status).toBe("five_options");
    expect(approved.run.qualityProven).toBe(false);
    const mismatched = await runQuality(medium, english, (letter) => judgePacket(letter, { verdict: "APPROVE", blindAnswer: letter === "A" ? "B" : "A" }), []);
    expect(mismatched.run.records[0]!.arms.B.qualityDecision).toBe("needs_revision");
    expect(mismatched.run.records[0]!.arms.B.qualityReasons).toContain("blind_answer_mismatch");
    expect(mismatched.run.records[0]!.arms.B.status).toBe("five_options");
    const rival = await runQuality(medium, english, (letter) => judgePacket(letter, { verdict: "APPROVE", rivals: [letter === "A" ? "B" : "A"] }), []);
    expect(rival.run.records[0]!.arms.B.secondAnswerOptions).toEqual([letterOf(rival.run.records[0]!.arms.B.keyLetter)]);
    expect(rival.run.records[0]!.arms.B.qualityReasons).toContain("second_defensible");
    const clue = await runQuality(medium, english, (letter) => judgePacket(letter, { verdict: "APPROVE", clueRisk: 0.85 }), []);
    expect(clue.run.records[0]!.arms.B.qualityReasons).toContain("clue_risk_high");
    expect(clue.run.records[0]!.arms.B.qualityDecision).toBe("needs_revision");
    const hardRun = await runQuality(hard, english, (letter) => judgePacket(letter, { verdict: "APPROVE", clueRisk: 0.2, estimatedDifficulty: "hard" }), []);
    const hardUser = hardRun.users.find((user) => user.includes("The key letter is hidden."));
    expect(hardUser).toContain("TARGET DIFFICULTY REQUEST: hard");
    expect(hardRun.run.records[0]!.designTarget).toBe("hard");
    expect(hardRun.run.records[0]!.observedDifficulty).toBeNull();
    expect(judgeUser(restatementModel, medium.core.stem, { A: "a", B: "b", C: "c", D: "d", E: "e" }, medium.source, "medium")).toContain("TARGET DIFFICULTY REQUEST: medium");
    expect(misreadingOptionsUser(translationModel, "source", "key", [], [], "tr")).toContain("TARGET LANGUAGE: tr");
    expect(misreadingOptionsUser(restatementModel, "source", "key", [])).not.toContain("TARGET LANGUAGE");
  });

  it("keeps the old mechanism enum, records a surface edit without restoring it, and leaves the locks closed", () => {
    const rejected = selectDistractors({
      candidates: [{
        candidateText: "A later citation check would have released the appendices after the embargo had already ended.",
        errorMechanism: "TEMPORAL_ORDER",
        shiftTarget: "tense",
        whyPlausible: "The later event can look earlier.",
        whyInferior: "The source keeps the original order.",
        sourceEvidence: "source",
        semanticRisk: "none",
      }],
      keyText: "Only the two contested appendices would have been released to the preprint server if the editors had finished checking the citations ahead of the embargo.",
      allowedMechanisms: restatementModel.errorMechanisms,
    });
    expect(restatementModel.errorMechanisms).not.toContain("TEMPORAL_ORDER");
    expect(rejected.rejected[0]?.reason).toBe("unknown_mechanism");
    const key = "Although the registry kept every laboratory log from the trial, its archivist discovered no trace that the two withdrawn samples had been filed with those logs.";
    const near = key.replace("kept", "held");
    const selected = selectCognitiveDistractors({
      candidates: [near, "Because the registry held every laboratory log from the trial, the archivist found no filing trace for the two withdrawn samples.", "Although the registry kept only some laboratory logs, its archivist discovered no trace that the two withdrawn samples had been filed.", "Although the registry kept every laboratory log, its archivist established that the two withdrawn samples had never been filed with those logs.", "Although the registry kept every laboratory log, its archivist discovered a trace that the two withdrawn samples had not been filed with those logs."].map((candidateText, index) => ({
        candidateText,
        errorMechanism: restatementModel.errorMechanisms[index % restatementModel.errorMechanisms.length]!,
        shiftTarget: "cause" as const,
        whyPlausible: "Both clauses are visible, so the cause can look attached to the wrong one.",
        whyInferior: "The source keeps the original cause and does not make that clause the reason.",
        sourceEvidence: "source",
        semanticRisk: "none" as const,
        studentMisreading: `A reader treats clause ${index} as the cause of the other clause.`,
        temptingEvidence: "Both clauses are in the sentence.",
        actualSemanticDifference: "The cause and the result trade places.",
        whyIncorrect: "The source keeps the original direction.",
        misreadingMechanism: index === 0 ? "TEMPORAL_ORDER" : "CONCESSION_CAUSE",
      })),
      keyText: key,
      sourceText: "Although the registry held every laboratory log from the trial, the archivist found no trace that the two withdrawn samples had been filed with them.",
      allowedMechanisms: restatementModel.errorMechanisms,
    });
    expect(selected.selected.map((candidate) => candidate.candidateText)).not.toContain(near);
    const recorded = describeDroppedDistractors(selected.removed, { sourceVersion: contentVersion("source"), keyVersion: contentVersion(key) });
    expect(recorded.find((row) => row.candidateText === near)).toMatchObject({ reason: "surface_edit", mechanismId: "TEMPORAL_ORDER", keyVersion: contentVersion(key) });
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    const door = loadGoldReview().pending[0]!;
    const allTrue = Object.fromEntries(goldCriteria.map((key) => [key, true])) as GoldCriteria;
    expect(() => submitGoldReview(door, { reviewerId: "claude-sonnet", reviewerKind: "human", reviewedAt: "2026-11-17T08:00:00.000Z", criteria: allTrue, decision: "accept", reason: "model said approve" })).toThrow(/not human approval/);
    expect(door.editorialStatus).not.toBe("editorially_accepted");
    expect(door.publishState).toBe("unpublished");
  });
});

function letterOf(key: OptionLabel | null): OptionLabel {
  return key === "A" ? "B" : "A";
}
