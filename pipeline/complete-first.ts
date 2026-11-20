import { z } from "zod";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import type { QuestionSpec } from "@/modules/factory/spec";
import { validateCandidate, type CandidateValidation } from "@/modules/factory/validator";
import { BudgetExceeded } from "./ai/budget";
import { parseModel, type AIConfig } from "./ai/config";
import { priceFor } from "./ai/prices";
import { responseSchema } from "./ai/prompts/schema";
import type { AIResult } from "./ai/types";

export const completeFirstPromptVersion = "complete-first.v1";
export const completeFirstForm = "concession_in_stem";
export const completeFirstLimits = { maxCostUsd: 0.06, maxCalls: 1 } as const;

/** One original situation. Not the archive, the bridge, or the cistern. */
export const completeFirstBrief =
  "A small observatory opens its dome only for scheduled research nights. On one of those nights the public gate still lets in a short queue of visitors. The concession turns on a scope phrase the student can see, such as only or scheduled.";

const errorNote = z.object({
  text: z.string().min(1).max(400),
  propositionError: z.string().min(1).max(400),
  decisiveFailureReason: z.string().min(1).max(400),
});

export const completeFirstOutput = z.object({
  fullSentence: z.string().min(1).max(800),
  stem: z.string().min(1).max(500),
  correctOption: z.string().min(1).max(400),
  distractors: z.array(errorNote).length(4),
  criticalScopeCue: z.string().min(1).max(200),
  correctnessRationale: z.string().min(1).max(600),
});
export type CompleteFirstOutput = z.infer<typeof completeFirstOutput>;

export const completeFirstResponseSchema = () => responseSchema(completeFirstOutput);

export function completeFirstSystem(): string {
  return `You write one original English sentence-completion item in a single JSON object.
Archetype: Although <subordinate clause>, ----.
First write fullSentence as that concession clause plus its independent main clause.
Then split it. stem is only the concession clause and the blank: Although <subordinate clause>, ----.
correctOption is the main clause of fullSentence, unchanged. stem with the blank replaced by correctOption is fullSentence again.
correctOption is an independent main clause. It does not start with which, who, whom, or whose. It is not "which shows", "which means", or "which suggests".
Write exactly four wrong options. Each is an independent main clause of the same kind, about this concession frame.
Each misreads a scope, a condition, or an inference that the stem already puts in play. Do not invent a separate event. Do not leave a second defensible judgment.
Do not assign them one cause, one condition, one time, and one contrast as a quota.
criticalScopeCue is the short scope phrase copied from the stem. propositionError and decisiveFailureReason are one short sentence each.
Do not call the item hard. Return JSON only.`;
}

export function completeFirstUser(brief: string): string {
  return [
    `BRIEF\n${brief}`,
    "Produce five complete clauses: one correct main clause and four wrong main clauses.",
    "fullSentence = concession clause + main clause. stem = concession clause + ----. correctOption = that main clause.",
    "distractors: exactly four objects. text is a main clause. propositionError and decisiveFailureReason are one short sentence each.",
  ].join("\n\n");
}

const stemArchetype = /^(Although|Even though|Though) [^,]+, ----\.$/i;
const relativeOpener = /^(?:which|who|whom|whose)\b/i;
const commentaryOpener = /^(?:which|that)\s+(?:shows|means|suggests)\b/i;

export type ShapeIssue = { code: string; detail?: string };

/** A continuation after the comma, not a relative comment on a judgment the stem already finished. */
export function isIndependentMainClause(text: string): boolean {
  const clause = text.trim().replace(/[.]+$/, "").trim();
  if (clause.split(/\s+/).length < 3) return false;
  if (relativeOpener.test(clause) || commentaryOpener.test(clause)) return false;
  return true;
}

/**
 * Splits `Although <subordinate>, <main>.` into the stem archetype and that same main clause.
 * The join of those two pieces is the original sentence.
 */
export function splitConcessionSentence(fullSentence: string): { stem: string; correctOption: string } | null {
  const text = fullSentence.trim();
  const match = text.match(/^(Although|Even though|Though) ([^,]+), (.+)\.$/i);
  if (!match) return null;
  const stem = `${match[1]} ${match[2]}, ----.`;
  const correctOption = match[3].trim();
  if (!isIndependentMainClause(correctOption)) return null;
  if (joinCompleteFirst(stem, correctOption) !== text) return null;
  return { stem, correctOption };
}

/** Surface checks for this form only. They are not the factory validator and they cannot pass an item. */
export function completeFirstShape(output: CompleteFirstOutput): { ok: boolean; issues: ShapeIssue[] } {
  const issues: ShapeIssue[] = [];
  const stem = output.stem.trim();
  const blanks = stem.match(/----/g) ?? [];
  if (blanks.length !== 1) issues.push({ code: "blank_count", detail: String(blanks.length) });
  if (!stemArchetype.test(stem)) issues.push({ code: "stem_not_concession_frame" });
  if (output.distractors.length !== 4) issues.push({ code: "distractor_count", detail: String(output.distractors.length) });
  const frame = stem.replace(/----\s*[.!?]?$/, "");
  const cue = output.criticalScopeCue.trim().toLowerCase();
  if (!cue || !frame.toLowerCase().includes(cue)) issues.push({ code: "scope_cue_not_in_stem" });
  if (!isIndependentMainClause(output.correctOption)) issues.push({ code: "not_main_clause", detail: "correct" });
  output.distractors.forEach((item, index) => {
    if (!isIndependentMainClause(item.text)) issues.push({ code: "not_main_clause", detail: String(index) });
  });
  if (frame.toLowerCase().includes(output.correctOption.trim().replace(/[.]+$/, "").trim().toLowerCase())) {
    issues.push({ code: "judgment_already_in_stem" });
  }
  if (joinCompleteFirst(stem, output.correctOption) !== output.fullSentence.trim()) issues.push({ code: "rejoin_mismatch" });
  const texts = [output.correctOption, ...output.distractors.map((item) => item.text)];
  if (texts.some((text) => text.includes("----"))) issues.push({ code: "option_contains_blank" });
  if (new Set(texts.map((text) => text.trim().toLowerCase())).size !== texts.length) issues.push({ code: "option_duplicate" });
  return { ok: issues.length === 0, issues };
}

export function joinCompleteFirst(stem: string, option: string): string {
  return stem.replace("----", option.trim());
}

export type CompleteFirstDraft = {
  fullSentence?: string;
  stem?: string;
  correctOption?: string;
  distractors?: { text?: string; propositionError?: string; decisiveFailureReason?: string }[];
  criticalScopeCue?: string;
  correctnessRationale?: string;
};

/**
 * Local gate. The response schema also requires four distractors, but a provider can ignore it.
 * A short list is incomplete output and does not start another generation.
 */
export function assessCompleteFirst(draft: CompleteFirstDraft): { status: CompleteFirstStatus; issues: ShapeIssue[]; output: CompleteFirstOutput | null } {
  const count = draft.distractors?.length ?? 0;
  if (count !== 4) return { status: "INCOMPLETE_OUTPUT", issues: [{ code: "distractor_count", detail: String(count) }], output: null };
  const parsed = completeFirstOutput.safeParse(draft);
  if (!parsed.success) return { status: "INCOMPLETE_OUTPUT", issues: [{ code: "distractor_fields" }], output: null };
  const shape = completeFirstShape(parsed.data);
  return { status: shape.ok ? "RECORDED" : "SHAPE_FAILED", issues: shape.issues, output: parsed.data };
}

/** One response text. Invalid JSON and a short option list stop here. */
export function completeFirstFromText(brief: string, text: string): CompleteFirstRecord {
  const base: Omit<CompleteFirstRecord, "status" | "output" | "shapeIssues" | "joins" | "error"> = {
    form: completeFirstForm,
    promptVersion: completeFirstPromptVersion,
    brief,
    hardVerified: false,
    factoryQualityVerdict: "not_applicable",
  };
  let draft: unknown;
  try {
    draft = JSON.parse(text);
  } catch (error) {
    return { ...base, status: "INCOMPLETE", output: null, shapeIssues: [], joins: null, error: (error as Error).message };
  }
  const assessed = assessCompleteFirst((draft ?? {}) as CompleteFirstDraft);
  const output = assessed.output;
  return {
    ...base,
    status: assessed.status,
    output,
    shapeIssues: assessed.issues,
    joins: output
      ? { correct: joinCompleteFirst(output.stem, output.correctOption), distractors: output.distractors.map((item) => joinCompleteFirst(output.stem, item.text)) }
      : null,
    error: null,
  };
}

/**
 * The factory validator still expects a connector clause in every option and a spec blank position.
 * Its result is a form mismatch, not a quality pass for this prototype.
 */
export function legacyFormProbe(spec: QuestionSpec, output: CompleteFirstOutput): { qualityVerdict: "not_applicable"; validation: CandidateValidation } {
  const labels = optionLabels.filter((label) => label !== spec.answerConstraints.correctOption);
  const options = Object.fromEntries(optionLabels.map((label) => [label, ""])) as Record<OptionLabel, string>;
  options[spec.answerConstraints.correctOption] = output.correctOption;
  output.distractors.forEach((item, index) => {
    options[labels[index]!] = item.text;
  });
  const candidate: GeneratedQuestionCandidate = {
    question: { stem: output.stem, options },
    correctOption: spec.answerConstraints.correctOption,
    explanation: "Probe only. This text is not a learner explanation.",
    distractorRationales: spec.distractorPlan.map((slot, index) => ({
      option: slot.option,
      distractorType: slot.distractorType,
      misconception: slot.misconception,
      whyPlausible: output.distractors[index]!.propositionError,
      whyWrong: output.distractors[index]!.decisiveFailureReason,
    })),
    targetConcept: spec.primaryConcept,
    targetSkill: spec.targetSkill,
    metadata: {
      connectorByOption: Object.fromEntries(optionLabels.map((label) => [label, ""])) as Record<OptionLabel, string>,
      selfRatedDifficulty: "medium",
    },
  };
  return { qualityVerdict: "not_applicable", validation: validateCandidate({ spec, candidate }) };
}

export function baseModel(setting: string): string {
  const { model } = parseModel(setting);
  const bare = model.includes("/") ? model.slice(model.lastIndexOf("/") + 1) : model;
  return bare.toLowerCase().replaceAll(".", "-");
}

export type CompleteFirstPreflight = { ok: true; writerBase: string } | { ok: false; reason: string };

export function completeFirstPreflight(config: AIConfig, writerSetting: string): CompleteFirstPreflight {
  if (config.thinking && Object.keys(config.thinking).length > 0) return { ok: false, reason: "thinking is set, so reasoning effort would not be none" };
  if (config.limits?.maxCostUsd !== completeFirstLimits.maxCostUsd || config.limits?.maxCalls !== completeFirstLimits.maxCalls) {
    return { ok: false, reason: "cost or call limit is not the prototype cap" };
  }
  if (!config.prices) return { ok: false, reason: "FACTORY_PRICES is not set, so the cost limit cannot be enforced" };
  const parsed = parseModel(writerSetting, config.provider);
  if (!priceFor(config.prices.table, `${parsed.provider}:${parsed.model}`)) return { ok: false, reason: `no price for ${writerSetting}` };
  const writerBase = baseModel(writerSetting);
  if (writerBase !== "claude-sonnet-5-5") return { ok: false, reason: `writer base is ${writerBase}` };
  return { ok: true, writerBase };
}

export type CompleteFirstStatus = "RECORDED" | "SHAPE_FAILED" | "INCOMPLETE_OUTPUT" | "INCOMPLETE" | "INCOMPLETE_BUDGET";

export type CompleteFirstRecord = {
  form: typeof completeFirstForm;
  promptVersion: string;
  brief: string;
  hardVerified: false;
  factoryQualityVerdict: "not_applicable";
  status: CompleteFirstStatus;
  output: CompleteFirstOutput | null;
  shapeIssues: ShapeIssue[];
  joins: { correct: string; distractors: string[] } | null;
  error: string | null;
};

export async function runCompleteFirst(input: {
  brief: string;
  write: () => Promise<AIResult<CompleteFirstOutput>>;
}): Promise<CompleteFirstRecord> {
  const base: Omit<CompleteFirstRecord, "status" | "output" | "shapeIssues" | "joins" | "error"> = {
    form: completeFirstForm,
    promptVersion: completeFirstPromptVersion,
    brief: input.brief,
    hardVerified: false,
    factoryQualityVerdict: "not_applicable",
  };
  let written: AIResult<CompleteFirstOutput>;
  try {
    written = await input.write();
  } catch (error) {
    const status: CompleteFirstStatus = error instanceof BudgetExceeded ? "INCOMPLETE_BUDGET" : "INCOMPLETE";
    return { ...base, status, output: null, shapeIssues: [], joins: null, error: (error as Error).message };
  }
  const output = written.value;
  const assessed = assessCompleteFirst(output);
  const checked = assessed.output;
  return {
    ...base,
    status: assessed.status,
    output: checked,
    shapeIssues: assessed.issues,
    joins: checked
      ? {
          correct: joinCompleteFirst(checked.stem, checked.correctOption),
          distractors: checked.distractors.map((item) => joinCompleteFirst(checked.stem, item.text)),
        }
      : null,
    error: null,
  };
}
