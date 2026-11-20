import { z } from "zod";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import {
  assembleContrastiveCandidate,
  canonicalReview,
  contrastiveDecision,
  contrastiveGates,
  presentOptions,
  presentationOrder,
  type ContrastiveDecision,
  type ContrastiveGates,
  type ContrastiveOutcome,
  type ContrastiveReview,
} from "@/modules/factory/contrastive";
import { distractorMoveTypes, stampConcessionContract, type DiscourseContract } from "@/modules/factory/discourse";
import { optionAcceptability, type OptionAcceptability } from "@/modules/factory/judge";
import type { QuestionSpec } from "@/modules/factory/spec";
import { hasPhrase, type ValidationIssue } from "@/modules/factory/validator";
import { BudgetExceeded } from "./ai/budget";
import { cachedGenerate } from "./ai/cache";
import { parseModel, type AIConfig } from "./ai/config";
import { priceFor } from "./ai/prices";
import { acceptabilitySystem, acceptabilityUser } from "./ai/prompts/acceptability.v1";
import { responseSchema } from "./ai/prompts/schema";
import type { AIProvider, Usage } from "./ai/types";
import { baseModel, isIndependentMainClause, joinCompleteFirst, splitConcessionSentence } from "./complete-first";

export const contrastiveStemVersion = "contrastive-stem.v1";
export const contrastiveDistractorVersion = "contrastive-distractor.v1";
export const contrastiveReviewVersion = "contrastive-review.v1";
export const contrastiveLimits = { maxCostUsd: 0.08, maxCalls: 4 } as const;
export const contrastiveRunLimits = { maxCostUsd: 0.24, maxCalls: 12 } as const;

const stemDraft = z.object({
  stemFrame: z.string().min(1).max(300),
  scopeCue: z.string().min(1).max(80),
  expectedDiscourseMove: z.string().min(1).max(300),
  keyDiscourseMove: z.string().min(1).max(300),
  distractorMoves: z
    .array(
      z.object({
        type: z.enum(distractorMoveTypes),
        expectedRelationToStem: z.string().min(1).max(300),
        whyPlausible: z.string().min(1).max(300),
        whyInferiorToKey: z.string().min(1).max(300),
      }),
    )
    .length(4),
  stem: z.string().min(1).max(500),
  correctOption: z.string().min(1).max(300),
  fullSentence: z.string().min(1).max(800),
  keyCue: z.string().min(1).max(80),
});
export type StemDraft = z.infer<typeof stemDraft>;

const distractorDraft = z.object({
  options: z.array(z.object({ text: z.string().min(1).max(300), whyInferiorToKey: z.string().min(1).max(300) })).length(4),
});

const reviewDraft = z.object({
  best: z.enum(optionLabels),
  second: z.enum(optionLabels).nullable(),
  difference: z.string().max(300),
  stemCue: z.string().max(80),
  multipleDefensible: z.boolean(),
  grammarNotes: z.array(z.object({ option: z.enum(optionLabels), note: z.string().max(200) })).max(5),
  easilyEliminated: z.array(z.enum(optionLabels)).max(4),
  nearOptions: z.array(z.enum(optionLabels)).max(4),
  hardSupported: z.boolean(),
  hardReason: z.string().max(300),
  confidence: z.number().min(0).max(1),
  uncertain: z.boolean(),
});

export function contrastiveStemSystem(): string {
  return `You write one original English sentence-completion core in a single JSON object.
Archetype: Although <subordinate clause>, ----. The subordinate clause has no internal comma. Even though and Though are allowed.
First write fullSentence as that concession plus one independent main clause. Then split it.
stem is only the concession clause and the blank. correctOption is that main clause, unchanged, so stem with the blank replaced by correctOption is fullSentence again.
correctOption does not start with which, who, whom, or whose, and it is not "which shows", "which means", or "which suggests".
The correct option is the best discourse continuation of the stem. It does not have to be logically entailed by the stem. Name keyCue as a short phrase copied from the stem, the signal that continuation answers. scopeCue is the limit copied from the stem.
Choose four distractor moves for this stem. Each type is one of: ${distractorMoveTypes.join(", ")}. A type may be used more than once. A move is a weaker continuation, not a negation of the correct option. Do not assign one cause, one condition, one time, and one contrast as a quota.
whyPlausible and whyInferiorToKey are one short sentence each. They are claims, not proof. Do not call the item hard. Return JSON only.`;
}

export function contrastiveStemUser(brief: string): string {
  return [`BRIEF\n${brief}`, "Write the stem, the best continuation, the joined sentence, and four weaker-move descriptions.", "Do not write the four wrong options in this call."].join("\n\n");
}

export function contrastiveDistractorSystem(): string {
  return `You write four wrong options for one existing sentence-completion item. Return JSON only.
Each text is an independent main clause in the same slot as the correct option: lowercase start, no leading connector, no final period.
Stay inside the stem's topic. Do not invent an unrelated event. Do not write a new stem or a new correct option.
Do not write the open negation of the correct option. A wrong option may restate the stem's appearance, stop short of the expected move, or offer a related point that does not carry that move through.
None of the four may be as suitable a continuation as the correct option.
whyInferiorToKey is one short sentence about the sentence you wrote. It is a claim for a later reviewer, not proof.`;
}

export function contrastiveDistractorUser(input: { stem: string; correct: string; contract: DiscourseContract }): string {
  const moves = input.contract.distractorMoves
    .map((move, index) => `${index + 1}. ${move.type}. ${move.expectedRelationToStem} Plausible because: ${move.whyPlausible} Weaker because: ${move.whyInferiorToKey}`)
    .join("\n");
  return [`STEM\n${input.stem}`, `CORRECT OPTION\n${input.correct}`, `DISCOURSE MOVES\n${moves}`, "Write exactly four wrong options, in this move order."].join("\n\n");
}

export function contrastiveReviewSystem(): string {
  return `You are taking one YDS sentence-completion item. You see the stem and five options. You are not told which letter is correct, and you are not given anyone's rationale.
Compare all five as continuations of this stem.
best is the most suitable letter. second is the next most suitable letter, or null when the others fall away together.
difference is the concrete stem wording that makes best more suitable than second. Leave it empty when you cannot name that wording.
multipleDefensible is true only when second is as suitable as best. A grammatical sentence is not, by itself, as suitable.
stemCue is a short phrase copied from the stem that the choice rests on.
grammarNotes lists only real grammar problems, each with its letter. easilyEliminated lists letters a reader drops from one surface clash. nearOptions lists letters that remain plausible after that clash and are still worse than best.
hardSupported is true only when best cannot be found from the connector or from one word alone, at least two letters are near, and difference names a real distinction. This is not a verified difficulty.
confidence is 0 to 1. uncertain is true when the stem does not settle the choice. Return JSON only.`;
}

export function contrastiveReviewUser(stem: string, options: Record<OptionLabel, string>): string {
  return ["ITEM", stem, optionLabels.map((label) => `${label}) ${options[label]}`).join("\n")].join("\n");
}

export function stemCoreIssues(draft: StemDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const split = splitConcessionSentence(draft.fullSentence);
  if (!split || split.stem !== draft.stem.trim() || split.correctOption !== draft.correctOption.trim()) issues.push({ code: "rejoin_mismatch", severity: "critical" });
  if (!isIndependentMainClause(draft.correctOption)) issues.push({ code: "not_main_clause", severity: "critical", detail: "correct" });
  if (joinCompleteFirst(draft.stem, draft.correctOption) !== draft.fullSentence.trim()) issues.push({ code: "rejoin_mismatch", severity: "critical", detail: "join" });
  const frame = draft.stem.replace(/----\s*[.!?]?$/, "");
  if (!hasPhrase(frame, draft.scopeCue) && !frame.toLowerCase().includes(draft.scopeCue.trim().toLowerCase())) issues.push({ code: "scope_cue_not_in_stem", severity: "critical" });
  if (!hasPhrase(frame, draft.keyCue) && !frame.toLowerCase().includes(draft.keyCue.trim().toLowerCase())) issues.push({ code: "key_cue_not_in_stem", severity: "critical" });
  if (frame.toLowerCase().includes(draft.correctOption.trim().replace(/[.]+$/, "").trim().toLowerCase())) issues.push({ code: "judgment_already_in_stem", severity: "critical" });
  return issues;
}

export function optionFormIssues(options: Record<OptionLabel, string>): ValidationIssue[] {
  return optionLabels.flatMap((label) => (isIndependentMainClause(options[label]) ? [] : [{ code: "not_main_clause", severity: "critical" as const, option: label }]));
}

type DraftCall = { text: string; model: string; finishReason: string | null; usage: Usage; cached: boolean; requestHash: string };

export type ContrastiveRecord = {
  briefId: string;
  brief: string;
  status: "ACCEPT_CANDIDATE" | "REVIEW" | "REJECT" | "SHAPE_FAILED" | "INCOMPLETE" | "INCOMPLETE_BUDGET";
  outcome: ContrastiveOutcome | null;
  contract: DiscourseContract | null;
  stem: string | null;
  fullSentence: string | null;
  options: Record<OptionLabel, string> | null;
  correctOption: OptionLabel | null;
  keyCue: string | null;
  gates: ContrastiveGates | null;
  review: ContrastiveReview | null;
  acceptability: OptionAcceptability | null;
  decision: ContrastiveDecision | null;
  hardVerified: false;
  calls: { stage: string; model: string; cached: boolean; requestHash: string; usage: Usage }[];
  error: string | null;
};

function fail(base: Omit<ContrastiveRecord, "status" | "error">, status: ContrastiveRecord["status"], error: string | null): ContrastiveRecord {
  return { ...base, status, error };
}

function readJson<T>(schema: z.ZodType<T>, text: string): { value: T | null; error: string | null } {
  try {
    const parsed = schema.safeParse(JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")));
    if (!parsed.success) return { value: null, error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
    return { value: parsed.data, error: null };
  } catch (error) {
    return { value: null, error: (error as Error).message };
  }
}

export async function runContrastiveItem(input: {
  briefId: string;
  brief: string;
  spec: QuestionSpec;
  allow: () => void;
  generate: (stage: "stem" | "distractors" | "review" | "acceptability", request: { version: string; system: string; user: string; schema: Record<string, unknown>; temperature: number }) => Promise<DraftCall>;
}): Promise<ContrastiveRecord> {
  const calls: ContrastiveRecord["calls"] = [];
  let current: Omit<ContrastiveRecord, "status" | "error"> = {
    briefId: input.briefId,
    brief: input.brief,
    outcome: null,
    contract: null,
    stem: null,
    fullSentence: null,
    options: null,
    correctOption: input.spec.answerConstraints.correctOption,
    keyCue: null,
    gates: null,
    review: null,
    acceptability: null,
    decision: null,
    hardVerified: false as const,
    calls,
  };
  const take = async (stage: "stem" | "distractors" | "review" | "acceptability", request: { version: string; system: string; user: string; schema: Record<string, unknown>; temperature: number }) => {
    input.allow();
    const draft = await input.generate(stage, request);
    calls.push({ stage, model: draft.model, cached: draft.cached, requestHash: draft.requestHash, usage: draft.usage });
    return draft;
  };
  try {
    const stemCall = await take("stem", {
      version: contrastiveStemVersion,
      system: contrastiveStemSystem(),
      user: contrastiveStemUser(input.brief),
      schema: responseSchema(stemDraft),
      temperature: 0.4,
    });
    const written = readJson(stemDraft, stemCall.text);
    if (!written.value) return fail(current, "INCOMPLETE", written.error);
    const core = written.value;
    const shape = stemCoreIssues(core);
    let contract: DiscourseContract;
    try {
      contract = stampConcessionContract(core);
    } catch (error) {
      return fail({ ...current, stem: core.stem, fullSentence: core.fullSentence, keyCue: core.keyCue }, "SHAPE_FAILED", (error as Error).message);
    }
    current = { ...current, contract, stem: core.stem, fullSentence: core.fullSentence, keyCue: core.keyCue };
    if (shape.length) return fail(current, "SHAPE_FAILED", shape.map((issue) => issue.code).join(","));
    const distractorCall = await take("distractors", {
      version: contrastiveDistractorVersion,
      system: contrastiveDistractorSystem(),
      user: contrastiveDistractorUser({ stem: core.stem, correct: core.correctOption, contract }),
      schema: responseSchema(distractorDraft),
      temperature: 0.4,
    });
    const wrong = readJson(distractorDraft, distractorCall.text);
    if (!wrong.value) return fail(current, "INCOMPLETE", wrong.error);
    const candidate = assembleContrastiveCandidate({
      spec: input.spec,
      stem: core.stem,
      correct: core.correctOption,
      keyCue: core.keyCue,
      distractors: wrong.value.options.map((option, index) => ({
        text: option.text,
        whyPlausible: contract.distractorMoves[index]!.whyPlausible,
        whyInferior: option.whyInferiorToKey,
      })),
    });
    const gates = contrastiveGates({ spec: input.spec, candidate, formIssues: optionFormIssues(candidate.question.options) });
    current = { ...current, options: candidate.question.options, gates };
    if (gates.applicable.status !== "pass") return { ...fail(current, "REJECT", "applicable structural gate rejected"), outcome: "REJECT" };
    const order = presentationOrder(input.briefId);
    const reviewCall = await take("review", {
      version: contrastiveReviewVersion,
      system: contrastiveReviewSystem(),
      user: contrastiveReviewUser(candidate.question.stem, presentOptions(order, candidate.question.options)),
      schema: responseSchema(reviewDraft),
      temperature: 0,
    });
    const reviewed = readJson(reviewDraft, reviewCall.text);
    if (!reviewed.value) return fail(current, "INCOMPLETE", reviewed.error);
    const review = canonicalReview(reviewed.value, order);
    const acceptabilityCall = await take("acceptability", {
      version: "acceptability.v1",
      system: acceptabilitySystem,
      user: acceptabilityUser(candidate),
      schema: responseSchema(optionAcceptability),
      temperature: 0,
    });
    const accepted = readJson(optionAcceptability, acceptabilityCall.text);
    if (!accepted.value) return fail({ ...current, review }, "INCOMPLETE", accepted.error);
    const decision = contrastiveDecision({ spec: input.spec, validation: gates.applicable, review, acceptability: accepted.value });
    return { ...current, status: decision.outcome, outcome: decision.outcome, review, acceptability: accepted.value, decision, error: null };
  } catch (error) {
    const status = error instanceof BudgetExceeded ? "INCOMPLETE_BUDGET" : "INCOMPLETE";
    return fail(current, status, (error as Error).message);
  }
}

export function contrastivePreflight(config: AIConfig, writer: string, judge: string): { ok: true; writerBase: string; judgeBase: string } | { ok: false; reason: string } {
  if (config.thinking && Object.keys(config.thinking).length > 0) return { ok: false, reason: "thinking is set, so reasoning effort would not be none" };
  if (!config.prices) return { ok: false, reason: "FACTORY_PRICES is not set, so the cost limit cannot be enforced" };
  const writerBase = baseModel(writer);
  const judgeBase = baseModel(judge);
  if (writerBase !== "claude-sonnet-5-5") return { ok: false, reason: `writer base is ${writerBase}` };
  if (judgeBase !== "claude-haiku-5-5") return { ok: false, reason: `judge base is ${judgeBase}` };
  for (const setting of [writer, judge]) {
    const parsed = parseModel(setting, config.provider);
    if (!priceFor(config.prices.table, `${parsed.provider}:${parsed.model}`)) return { ok: false, reason: `no price for ${setting}` };
  }
  return { ok: true, writerBase, judgeBase };
}

export function contrastiveCaller(input: { provider: AIProvider; modelFor: (stage: "stem" | "distractors" | "review" | "acceptability") => string; salt: string }) {
  return (stage: "stem" | "distractors" | "review" | "acceptability", request: { version: string; system: string; user: string; schema: Record<string, unknown>; temperature: number }) =>
    cachedGenerate(input.provider, request.version, {
      model: input.modelFor(stage),
      system: request.system,
      parts: [{ text: request.user }],
      jsonSchema: request.schema,
      temperature: request.temperature,
      maxOutputTokens: 4096,
      cacheSalt: `${input.salt}:${stage}`,
    }).then((generated) => ({
      text: generated.response.text,
      model: generated.response.model,
      finishReason: generated.response.finishReason ?? null,
      usage: generated.response.usage,
      cached: generated.cached,
      requestHash: generated.requestHash,
    }));
}
