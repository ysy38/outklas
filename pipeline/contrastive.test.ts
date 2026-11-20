import { describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { words } from "@/modules/analysis/surface";
import { assembleContrastiveCandidate, contrastiveDecision, contrastiveGates, presentationOrder } from "@/modules/factory/contrastive";
import { familyBlueprints } from "@/modules/factory/families";
import type { OptionAcceptability } from "@/modules/factory/judge";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import { factoryVersions } from "@/modules/factory/versions";
import type { CandidateValidation } from "@/modules/factory/validator";
import { BudgetExceeded } from "./ai/budget";
import { loadAIConfig } from "./ai/config";
import { factoryProfile } from "./stages/factory";
import {
  contrastiveDistractorSystem,
  contrastivePreflight,
  contrastiveReviewSystem,
  contrastiveStemSystem,
  runContrastiveItem,
  type StemDraft,
} from "./contrastive";

const { profile } = factoryProfile();
const spec = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 1, band: "medium" });
const writer = "gateway:anthropic/claude-sonnet-5.5";
const judge = "gateway:anthropic/claude-haiku-5.5";

function config(patch: Record<string, string> = {}) {
  return loadAIConfig({
    FACTORY_PRICES: "pipeline/ai/prices.gateway.json",
    FACTORY_MAX_COST_USD: "0.24",
    FACTORY_MAX_CALLS: "12",
    GENERATOR_MODEL: writer,
    JUDGE_MODEL: judge,
    ...patch,
  });
}

function pad(text: string, min: number, max: number): string {
  const extra = ["during", "quiet", "hours", "after", "posted", "board", "staff", "checked", "again", "later"];
  const parts = text.split(/\s+/);
  let index = 0;
  while (words(parts.join(" ")).length < min && words(parts.join(" ")).length < max) parts.push(`${extra[index % extra.length]}${index++}`);
  return parts.join(" ");
}

function core(): StemDraft {
  const stemMin = spec.contextConstraints.stemWords.min;
  const stemMax = spec.contextConstraints.stemWords.max;
  let body = "the studio fires the kiln only on listed nights";
  while (words(`Although ${body}`).length < stemMin) body = `${body} quietly`;
  expect(words(`Although ${body}`).length).toBeLessThanOrEqual(stemMax);
  const correct = pad("the shelf already holds one finished bowl", spec.contextConstraints.optionWords.min, spec.contextConstraints.optionWords.max);
  const stem = `Although ${body}, ----.`;
  return {
    stemFrame: "A limit looks like the whole event.",
    scopeCue: "only on listed",
    expectedDiscourseMove: "Show what still happened inside that limit.",
    keyDiscourseMove: "The finished bowl is already on the shelf.",
    distractorMoves: [
      { type: "restate_appearance", expectedRelationToStem: "Repeats the listed nights.", whyPlausible: "The nights are in the stem.", whyInferiorToKey: "It does not go beyond the limit." },
      { type: "same_change_result", expectedRelationToStem: "States a result of the firing.", whyPlausible: "A firing has a result.", whyInferiorToKey: "The result does not answer the limit." },
      { type: "related_undeveloped", expectedRelationToStem: "Mentions the studio without the move.", whyPlausible: "The studio is the topic.", whyInferiorToKey: "The contrast stays unfinished." },
      { type: "scope_overreach", expectedRelationToStem: "Widens listed nights.", whyPlausible: "The calendar is nearby.", whyInferiorToKey: "The stem's limit is dropped." },
    ],
    stem,
    correctOption: correct,
    fullSentence: `Although ${body}, ${correct}.`,
    keyCue: "only on listed",
  };
}

function wrongOptions() {
  const min = spec.contextConstraints.optionWords.min;
  const max = spec.contextConstraints.optionWords.max;
  return [
    pad("the board still prints those same nights", min, max),
    pad("heat leaves a pale mark on the clay", min, max),
    pad("visitors can read the studio name outside", min, max),
    pad("every evening becomes a firing evening", min, max),
  ];
}

function passedValidation(): CandidateValidation {
  const empty = Object.fromEntries(optionLabels.map((label) => [label, null])) as CandidateValidation["metrics"]["connectors"];
  const optionWords = Object.fromEntries(optionLabels.map((label) => [label, 12])) as CandidateValidation["metrics"]["optionWords"];
  return { version: factoryVersions.validator, status: "pass", critical: 0, warnings: 0, issues: [], metrics: { stemWords: 12, optionWords, connectors: empty, blankPosition: "end", sourceOverlapRuns: 0 } };
}

function acceptability(keyOk = true): OptionAcceptability {
  return {
    sentences: optionLabels.map((option) => ({
      option,
      acceptable: option === spec.answerConstraints.correctOption ? keyOk : true,
      relationCoherent: option === spec.answerConstraints.correctOption ? true : false,
      confidence: 0.8,
      reason: "The sentence stands on its own.",
    })),
  };
}

function review(patch: Partial<Parameters<typeof contrastiveDecision>[0]["review"]> = {}) {
  return {
    best: spec.answerConstraints.correctOption,
    second: "B" as OptionLabel,
    difference: "The limit only on listed still leaves the bowl on the shelf.",
    stemCue: "only on listed",
    multipleDefensible: false,
    grammarNotes: [],
    easilyEliminated: ["D" as OptionLabel],
    nearOptions: ["B" as OptionLabel, "C" as OptionLabel],
    hardSupported: true,
    hardReason: "Two continuations stay plausible.",
    confidence: 0.9,
    uncertain: false,
    ...patch,
  };
}

const blankUsage = { inputTokens: 1, outputTokens: 1, totalTokens: 2, reasoningTokens: 0 };

describe("contrastive item construction", () => {
  it("keeps Sonnet as the writer, Haiku as the reviewer, and reasoning off", () => {
    expect(contrastivePreflight(config(), writer, judge)).toMatchObject({ ok: true, writerBase: "claude-sonnet-5-5", judgeBase: "claude-haiku-5-5" });
    expect(contrastivePreflight(config({ GENERATOR_THINKING: "low" }), writer, judge).ok).toBe(false);
    expect(contrastivePreflight(config(), judge, judge).ok).toBe(false);
    expect(contrastivePreflight(config(), writer, writer).ok).toBe(false);
  });

  it("asks for a discourse continuation and forbids a negation quota", () => {
    const stem = contrastiveStemSystem();
    expect(stem).toContain("does not have to be logically entailed");
    expect(stem).toContain("not a negation of the correct option");
    expect(stem).toContain("Do not assign one cause");
    expect(contrastiveDistractorSystem()).toContain("Do not write the open negation");
    expect(contrastiveReviewSystem()).toContain("not told which letter is correct");
    expect(contrastiveReviewSystem()).not.toContain("KEY:");
  });

  it("reports the old connector contract as not applicable and still rejects a duplicate", () => {
    const draft = core();
    const candidate = assembleContrastiveCandidate({
      spec,
      stem: draft.stem,
      correct: draft.correctOption,
      keyCue: draft.keyCue,
      distractors: wrongOptions().map((text, index) => ({ text, whyPlausible: draft.distractorMoves[index]!.whyPlausible, whyInferior: draft.distractorMoves[index]!.whyInferiorToKey })),
    });
    const gates = contrastiveGates({ spec, candidate });
    expect(gates.raw.issues.map((issue) => issue.code)).toContain("answer_connector_not_allowed");
    expect(gates.notApplicable.map((issue) => issue.code)).toContain("answer_connector_not_allowed");
    expect(gates.applicable.issues.map((issue) => issue.code)).not.toContain("answer_connector_not_allowed");
    const copy = { ...candidate, question: { ...candidate.question, options: { ...candidate.question.options, B: candidate.question.options.C } } };
    const duplicated = contrastiveGates({ spec, candidate: copy });
    expect(duplicated.applicable.issues.map((issue) => issue.code)).toContain("option_duplicate");
    expect(duplicated.applicable.status).toBe("reject");
  });

  it("accepts a unique blind answer without treating scores or a hard claim as proof", () => {
    const decision = contrastiveDecision({ spec, validation: passedValidation(), review: review(), acceptability: acceptability() });
    expect(decision.outcome).toBe("ACCEPT_CANDIDATE");
    expect(decision.hardVerified).toBe(false);
    expect(decision.hardCandidate).toBe(true);
    expect(decision.scoresAreEvidence).toBe(false);
    expect(contrastiveDecision({ spec, validation: passedValidation(), review: review({ multipleDefensible: true }), acceptability: acceptability() }).outcome).toBe("REJECT");
    expect(contrastiveDecision({ spec, validation: passedValidation(), review: review({ best: "B" }), acceptability: acceptability() }).decision.failures).toContain("blind_answer_B");
    expect(contrastiveDecision({ spec, validation: passedValidation(), review: review({ difference: "" }), acceptability: acceptability() }).outcome).toBe("REVIEW");
    expect(contrastiveDecision({ spec, validation: passedValidation(), review: review({ confidence: 0.4 }), acceptability: acceptability() }).outcome).toBe("REVIEW");
  });

  it("stops a broken core before the distractor call and does not repair", async () => {
    const stages: string[] = [];
    const broken = await runContrastiveItem({
      briefId: "broken",
      brief: "A studio.",
      spec,
      allow: () => {},
      generate: async (stage) => {
        stages.push(stage);
        return { text: JSON.stringify({ ...core(), correctOption: "which shows the shelf is full" }), model: "mock", finishReason: "STOP", usage: blankUsage, cached: false, requestHash: stage };
      },
    });
    expect(broken.status).toBe("SHAPE_FAILED");
    expect(stages).toEqual(["stem"]);
  });

  it("runs one stem call, one distractor call, and one key-blind review", async () => {
    const draft = core();
    const stages: string[] = [];
    const order = presentationOrder("kiln");
    const shownKey = optionLabels[order.indexOf(spec.answerConstraints.correctOption)]!;
    const record = await runContrastiveItem({
      briefId: "kiln",
      brief: "A ceramics studio fires its kiln only on the nights printed on the board.",
      spec,
      allow: () => {},
      generate: async (stage) => {
        stages.push(stage);
        const text =
          stage === "stem"
            ? JSON.stringify(draft)
            : stage === "distractors"
              ? JSON.stringify({ options: wrongOptions().map((text) => ({ text, whyInferiorToKey: "This continuation stops short of the limit." })) })
              : stage === "review"
                ? JSON.stringify(review({ best: shownKey, second: shownKey === "B" ? "C" : "B", nearOptions: shownKey === "B" ? ["C", "D"] : ["B", "C"] }))
                : JSON.stringify(acceptability());
        return { text, model: stage === "review" || stage === "acceptability" ? "haiku" : "sonnet", finishReason: "STOP", usage: blankUsage, cached: false, requestHash: stage };
      },
    });
    expect(stages).toEqual(["stem", "distractors", "review", "acceptability"]);
    expect(record.gates?.applicable.issues).toEqual([]);
    expect(record.status).toBe("ACCEPT_CANDIDATE");
    expect(record.hardVerified).toBe(false);
    expect(record.review?.best).toBe(spec.answerConstraints.correctOption);
    expect(record.decision?.scoresAreEvidence).toBe(false);
  });

  it("stops when the spend guard refuses the next call", async () => {
    let checks = 0;
    const stopped = await runContrastiveItem({
      briefId: "stopped",
      brief: "A studio.",
      spec,
      allow: () => {
        checks += 1;
        if (checks > 1) throw new BudgetExceeded("spend limit: max estimated cost ($0.08) reached");
      },
      generate: async (stage) => ({ text: JSON.stringify(core()), model: "sonnet", finishReason: "STOP", usage: blankUsage, cached: false, requestHash: stage }),
    });
    expect(stopped.status).toBe("INCOMPLETE_BUDGET");
    expect(stopped.calls).toHaveLength(1);
  });
});
