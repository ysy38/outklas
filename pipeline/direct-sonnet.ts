import { z } from "zod";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { generatedQuestionCandidate, type GeneratedQuestionCandidate } from "@/modules/factory/candidate";
import { validateDistractor, type PlacedOption } from "@/modules/factory/distractor";
import { buildDistractorSpecs } from "@/modules/factory/distractor-spec";
import { connectorsForFamily } from "@/modules/factory/families";
import { connectorSurface } from "@/modules/factory/spec-engine";
import { judgeDecision, type JudgeDecision, type OptionAcceptability } from "@/modules/factory/judge";
import type { QuestionSpec } from "@/modules/factory/spec";
import { distractorBlueprint, distractorPlanIssues, scenarioPlan, type DistractorBlueprint, type QuestionSkeleton, type ScenarioPlan } from "@/modules/factory/skeleton";
import { defaultFactoryThresholds } from "@/modules/factory/thresholds";
import { validateCandidate, type OriginalityIndex, type ValidationIssue } from "@/modules/factory/validator";
import { BudgetExceeded } from "./ai/budget";
import { parseModel, type AIConfig } from "./ai/config";
import { priceFor } from "./ai/prices";
import { responseSchema, withRefEnums } from "./ai/prompts/schema";
import type { AIResult, JudgeEvaluation } from "./ai/types";

export const directSonnetPromptVersion = "direct-sonnet.v1";
export const directSonnetLimits = { maxCostUsd: 0.1, maxCalls: 6 } as const;
export const directSonnetSpecId = "sentence_completion.concession.hard.004";

/** The Smoke 03 b2 archive situation. The plan check reads these facts, not a scenario the writer invents. */
export const archiveBrief =
  "Actor: the clerks of a harbour archive. Obstacle: salt air in the store crumbles unprotected paper. A reader would expect the eighteenth-century logbooks to be unreadable. Outcome: those logbooks can still be read. Salt air harms paper; it does not preserve it. Whatever lets the logbooks survive belongs on the outcome side of the concession, not as the obstacle. No real archive and no real person.";

export const archiveScenario: ScenarioPlan = scenarioPlan.parse({
  domain: "history",
  actor: "the clerks of a harbour archive",
  obstacle: "salt air in the store crumbles unprotected paper",
  expected: "the eighteenth-century logbooks would be unreadable",
  outcome: "those logbooks can still be read",
  relation: "concession",
});

const rationale = generatedQuestionCandidate.shape.distractorRationales.element;

/** One writer call. Taxonomy fields are the ones validateCandidate already requires. */
export const directSonnetOutput = z.object({
  stem: z.string().min(1).max(500),
  correctOption: z.enum(optionLabels),
  options: z.object(Object.fromEntries(optionLabels.map((label) => [label, z.string().min(1).max(300)])) as Record<OptionLabel, z.ZodString>),
  explanation: z.string().min(1).max(1200),
  distractorRationales: z.array(rationale).length(4),
  targetConcept: generatedQuestionCandidate.shape.targetConcept,
  targetSkill: generatedQuestionCandidate.shape.targetSkill,
  metadata: z.object({
    connectorByOption: generatedQuestionCandidate.shape.metadata.shape.connectorByOption,
    selfRatedDifficulty: generatedQuestionCandidate.shape.metadata.shape.selfRatedDifficulty,
  }),
  distractorBlueprints: z.array(distractorBlueprint).length(4),
});
export type DirectSonnetOutput = z.infer<typeof directSonnetOutput>;

export const directSonnetResponseSchema = () =>
  withRefEnums(responseSchema(directSonnetOutput), {
    "distractorRationales.[].distractorType": "distractor_type",
    "distractorRationales.[].misconception": "misconception",
    targetConcept: "primary_concept",
    targetSkill: "skill_primary",
  });

/**
 * Provider prefix and creator prefix are aliases. Dot and hyphen version marks are the same id.
 * `gateway:anthropic/claude-sonnet-5.5` and `anthropic:claude-sonnet-5-5` are one base model.
 */
export function baseModel(setting: string): string {
  const { model } = parseModel(setting);
  const bare = model.includes("/") ? model.slice(model.lastIndexOf("/") + 1) : model;
  return bare.toLowerCase().replaceAll(".", "-");
}

export function writerJudgeSplit(writer: string, judge: string): { independent: boolean; writerBase: string; judgeBase: string } {
  const writerBase = baseModel(writer);
  const judgeBase = baseModel(judge);
  return { independent: writerBase !== judgeBase, writerBase, judgeBase };
}

export type DirectSonnetPreflight = { ok: true; writerBase: string; judgeBase: string } | { ok: false; reason: string };

/** Refuses the run before any provider call when the price gate, the call cap, or the model split is not the one this pilot locked. */
export function directSonnetPreflight(config: AIConfig, writerSetting: string, judgeSetting: string): DirectSonnetPreflight {
  if (config.thinking && Object.keys(config.thinking).length > 0) return { ok: false, reason: "thinking is set, so reasoning effort would not be none" };
  if (config.limits?.maxCostUsd !== directSonnetLimits.maxCostUsd || config.limits?.maxCalls !== directSonnetLimits.maxCalls) {
    return { ok: false, reason: "cost or call limit is not the pilot cap" };
  }
  if (!config.prices) return { ok: false, reason: "FACTORY_PRICES is not set, so the cost limit cannot be enforced" };
  const missing = [writerSetting, judgeSetting].filter((setting) => {
    const parsed = parseModel(setting, config.provider);
    return !priceFor(config.prices!.table, `${parsed.provider}:${parsed.model}`);
  });
  if (missing.length) return { ok: false, reason: `no price for ${missing.join(", ")}` };
  const split = writerJudgeSplit(writerSetting, judgeSetting);
  if (!split.independent) return { ok: false, reason: `writer and judge are the same base model ${split.writerBase}` };
  if (split.writerBase !== "claude-sonnet-5-5") return { ok: false, reason: `writer base is ${split.writerBase}` };
  if (split.judgeBase !== "claude-haiku-5-5") return { ok: false, reason: `judge base is ${split.judgeBase}` };
  return { ok: true, writerBase: split.writerBase, judgeBase: split.judgeBase };
}

export const familyForSlot = (expresses: string | null): "near_concession" | "cause" | "condition" | "time" => {
  if (expresses === "discourse_relation:cause") return "cause";
  if (expresses === "discourse_relation:condition") return "condition";
  if (expresses === "discourse_relation:sequence") return "time";
  return "near_concession";
};

export function directSonnetSystem(): string {
  return `You write one original YDS sentence-completion item in a single JSON object.
When the blank is at the start, the stem is exactly ----, <main clause>.
The comma comes immediately after the blank. The main clause states only the unexpected outcome.
Each option is only the clause that fills that blank: a connector, then a subject, then one finite predicate. Natural academic English. The option starts with a capital letter. It has no comma or full stop at the end.
The option does not repeat the stem's main clause, does not carry a second main clause or a result of its own, and does not copy the stem's continuation. Join the option to the stem in your head before you write it. The join is one grammatical English sentence.
The correct option is the obstacle that makes the stem's outcome unexpected. It builds the concession. The connector alone must not give the answer away: at least one wrong option also opens with although, even though, or though, and that option states a different proposition the stem does not support.
Each wrong option targets a different misreading of a fact in the stem. A different wording of the same misreading is not a different option. Reversing one word of the stem is not enough. A wrong option is not eliminated only by a wrong connector, a grammar error, or an obvious contradiction. The misreading uses information written in the stem, not information that appears only in the correct option.
Quote the stem span the misreading uses. proposition, whyPlausible and decisiveFailureReason may be full explanation sentences. The option texts are not those sentences. Do not copy a blueprint explanation into an option. Each wrong option realizes its own blueprint.
Do not treat your own explanation or your difficulty guess as evidence.
Do not reproduce a real exam item. Return JSON only.`;
}

export function directSonnetUser(spec: QuestionSpec, brief: string): string {
  const key = spec.answerConstraints.correctOption;
  const keyConnectors = spec.answerConstraints.connectors.map((connector) => connectorSurface(connector)).join(", ");
  const slots = spec.distractorPlan.map((slot) => {
    const family = familyForSlot(slot.expresses);
    const menu = connectorsForFamily(family);
    const surfaces = (menu?.connectors ?? slot.connectors).map((connector) => connectorSurface(connector)).join(", ");
    return `${slot.option}: relationFamily ${family}; connectorStrategy natural; open with one of ${surfaces}; distractorType ${slot.distractorType}; misconception ${slot.misconception ?? "null"}`;
  });
  return [
    `BRIEF\n${brief}`,
    `SPEC ${spec.id}. Domain ${spec.contextConstraints.domain}. Blank ${spec.contextConstraints.blankPosition}. Stem ${spec.contextConstraints.stemWords.min}-${spec.contextConstraints.stemWords.max} words. Each option ${spec.contextConstraints.optionWords.min}-${spec.contextConstraints.optionWords.max} words.`,
    ...(spec.contextConstraints.blankPosition === "start" ? ["STEM SHAPE: ----, <main clause>. The main clause is the unexpected outcome and nothing else."] : []),
    `Correct letter ${key}. It opens with one of: ${keyConnectors}. It states only the obstacle. It does not restate the main clause.`,
    `Wrong letters, each with its own misreading:\n${slots.join("\n")}`,
    `targetConcept ${spec.primaryConcept}. targetSkill ${spec.targetSkill}. Copy these and the distractorType and misconception values exactly.`,
    "distractorBlueprints: four plans, one per wrong letter. proposition, whyPlausible and decisiveFailureReason are full explanation sentences, not the option text. stemEvidenceAnchor is a verbatim span of the stem, not a span of the correct option. The reason uses a word from that span. connectorStrategy is natural. Write options A-E as the blank's single clause only.",
    "explanation: Turkish, address the learner as sen, name the correct connector in English, and describe the concession. No greeting and no exclamation mark.",
    "metadata.selfRatedDifficulty is your own guess. It is not a measurement and it is not the decision.",
  ].join("\n\n");
}

export function toCandidate(output: DirectSonnetOutput): GeneratedQuestionCandidate {
  return {
    question: { stem: output.stem, options: output.options },
    correctOption: output.correctOption,
    explanation: output.explanation,
    distractorRationales: output.distractorRationales,
    targetConcept: output.targetConcept,
    targetSkill: output.targetSkill,
    metadata: { connectorByOption: output.metadata.connectorByOption, selfRatedDifficulty: output.metadata.selfRatedDifficulty },
  };
}

export function toSkeleton(output: DirectSonnetOutput, scenario: ScenarioPlan = archiveScenario): QuestionSkeleton {
  return {
    context: null,
    stem: output.stem,
    correctAnswer: output.options[output.correctOption],
    difficultyStrategy: "relational_inference",
    scenario,
    distractorBlueprints: output.distractorBlueprints,
  };
}

export type DirectCheck = {
  candidate: GeneratedQuestionCandidate;
  skeleton: QuestionSkeleton;
  validation: ReturnType<typeof validateCandidate>;
  planIssues: ValidationIssue[];
  distractorIssues: ValidationIssue[];
  critical: ValidationIssue[];
  /** Existing cross-option plan codes. They stay critical when the validator says so. */
  visibleConcerns: { code: string; option?: OptionLabel; detail?: string }[];
  /** The deterministic checks do not prove that a clause carries its blueprint. */
  semanticPlanMatch: "not_proven";
};

export function checkDirectItem(spec: QuestionSpec, output: DirectSonnetOutput, originality?: OriginalityIndex, scenario: ScenarioPlan = archiveScenario): DirectCheck {
  const candidate = toCandidate(output);
  const skeleton = toSkeleton(output, scenario);
  const validation = validateCandidate({ spec, candidate, ...(originality ? { originality } : {}), blueprints: output.distractorBlueprints });
  const planIssues = distractorPlanIssues(spec, skeleton);
  const accepted: PlacedOption[] = [];
  const distractorIssues: ValidationIssue[] = [];
  for (const dspec of buildDistractorSpecs(spec, defaultFactoryThresholds, { blueprints: output.distractorBlueprints })) {
    const checked = validateDistractor({ dspec, skeleton, text: output.options[dspec.option], accepted, strategy: "relational_inference" });
    distractorIssues.push(...checked.issues);
    accepted.push({ option: dspec.option, text: output.options[dspec.option] });
  }
  const critical = [...validation.issues.filter((issue) => issue.severity === "critical"), ...planIssues, ...distractorIssues.filter((issue) => issue.severity === "critical")];
  const cross = [...planIssues, ...distractorIssues].filter((issue) => issue.code === "plan_repeats_sibling" || issue.code === "plan_duplicate_proposition");
  return {
    candidate,
    skeleton,
    validation,
    planIssues,
    distractorIssues,
    critical,
    visibleConcerns: [
      ...cross.map((issue) => ({ code: issue.code, ...(issue.option ? { option: issue.option } : {}), ...(issue.detail ? { detail: issue.detail } : {}) })),
      { code: "plan_realization_unverified", detail: "The existing checks do not prove that the written clause realizes its blueprint." },
    ],
    semanticPlanMatch: "not_proven",
  };
}

export const skippedAudits = [
  { stage: "planReview", status: "not_applicable" as const, reason: "The plan-review role would be the writer's model. Sonnet does not review its own plan." },
  { stage: "distractorVerdict", status: "not_applicable" as const, reason: "The four options were written in the same call. A per-option verdict was not run." },
];

export type DirectStatus = "ACCEPT" | "REVIEW" | "REJECT" | "INCOMPLETE" | "INCOMPLETE_BUDGET";

export type DirectSonnetRecord = {
  specId: string;
  brief: string;
  writerSetting: string;
  judgeSetting: string;
  writerBase: string;
  judgeBase: string;
  promptVersion: string;
  selfRatingIsEvidence: false;
  reviewIndependence: { calls: 0 | 3; independentReviews: 0 | 1; family: string; note: string };
  skippedAudits: typeof skippedAudits;
  stem: string | null;
  options: Record<OptionLabel, string> | null;
  key: OptionLabel | null;
  correctAnswer: string | null;
  blueprints: DistractorBlueprint[] | null;
  selfRatedDifficulty: string | null;
  deterministic: { validation: DirectCheck["validation"]; planIssues: ValidationIssue[]; distractorIssues: ValidationIssue[] } | null;
  visibleConcerns: DirectCheck["visibleConcerns"];
  semanticPlanMatch: "not_proven";
  judgesStarted: boolean;
  blindAnswer: OptionLabel | null;
  blindConfidence: number | null;
  blindRationale: string | null;
  stemEvidence: string | null;
  equallyDefensible: OptionLabel | null;
  uncertain: boolean | null;
  acceptability: OptionAcceptability | null;
  finalReport: JudgeEvaluation["report"]["value"] | null;
  factoryVerdict: JudgeDecision["verdict"] | null;
  status: DirectStatus;
  cache: { stage: string; requestHash: string; cached: boolean }[];
  error: string | null;
};

const familyNote = "Blind solve, acceptability and the final report are three calls of one model. They are one review, not three independent verifications.";

export function directStatus(verdict: JudgeDecision["verdict"]): DirectStatus {
  if (verdict === "APPROVE") return "ACCEPT";
  if (verdict === "REVIEW") return "REVIEW";
  return "REJECT";
}

export async function runDirectSonnet(input: {
  spec: QuestionSpec;
  brief: string;
  writerSetting: string;
  judgeSetting: string;
  write: () => Promise<AIResult<DirectSonnetOutput>>;
  evaluate: (candidate: GeneratedQuestionCandidate, spec: QuestionSpec, validation: DirectCheck["validation"]) => Promise<JudgeEvaluation>;
  originality?: OriginalityIndex;
  scenario?: ScenarioPlan;
}): Promise<DirectSonnetRecord> {
  const split = writerJudgeSplit(input.writerSetting, input.judgeSetting);
  const scenario = input.scenario ?? archiveScenario;
  const base = {
    specId: input.spec.id,
    brief: input.brief,
    writerSetting: input.writerSetting,
    judgeSetting: input.judgeSetting,
    writerBase: split.writerBase,
    judgeBase: split.judgeBase,
    promptVersion: directSonnetPromptVersion,
    selfRatingIsEvidence: false as const,
    skippedAudits,
    semanticPlanMatch: "not_proven" as const,
    visibleConcerns: [{ code: "plan_realization_unverified", detail: "The existing checks do not prove that the written clause realizes its blueprint." }],
  };
  const empty = (status: DirectStatus, error: string | null, extra: Partial<DirectSonnetRecord> = {}): DirectSonnetRecord => ({
    ...base,
    reviewIndependence: { calls: 0, independentReviews: 0, family: split.judgeBase, note: familyNote },
    stem: null,
    options: null,
    key: null,
    correctAnswer: null,
    blueprints: null,
    selfRatedDifficulty: null,
    deterministic: null,
    judgesStarted: false,
    blindAnswer: null,
    blindConfidence: null,
    blindRationale: null,
    stemEvidence: null,
    equallyDefensible: null,
    uncertain: null,
    acceptability: null,
    finalReport: null,
    factoryVerdict: null,
    status,
    cache: [],
    error,
    ...extra,
  });
  if (!split.independent) return empty("INCOMPLETE", `writer and judge are the same base model ${split.writerBase}`);

  let written: AIResult<DirectSonnetOutput>;
  try {
    written = await input.write();
  } catch (error) {
    if (error instanceof BudgetExceeded) return empty("INCOMPLETE_BUDGET", error.message);
    return empty("INCOMPLETE", (error as Error).message);
  }
  const output = written.value;
  const checked = checkDirectItem(input.spec, output, input.originality, scenario);
  const cache = [{ stage: "writer", requestHash: written.requestHash, cached: written.cached }];
  const drafted = {
    stem: output.stem,
    options: output.options,
    key: output.correctOption,
    correctAnswer: output.options[output.correctOption],
    blueprints: output.distractorBlueprints,
    selfRatedDifficulty: output.metadata.selfRatedDifficulty,
    deterministic: { validation: checked.validation, planIssues: checked.planIssues, distractorIssues: checked.distractorIssues },
    visibleConcerns: checked.visibleConcerns,
    cache,
  };
  if (checked.critical.length) {
    return empty("REJECT", null, drafted);
  }
  let evaluation: JudgeEvaluation;
  try {
    evaluation = await input.evaluate(checked.candidate, input.spec, checked.validation);
  } catch (error) {
    if (error instanceof BudgetExceeded) return empty("INCOMPLETE_BUDGET", error.message, { ...drafted, judgesStarted: true });
    return empty("INCOMPLETE", (error as Error).message, { ...drafted, judgesStarted: true });
  }
  const decision = judgeDecision({ spec: input.spec, validation: checked.validation, judge: {
    blindAnswer: evaluation.blind.value.answer,
    blindConfidence: evaluation.blind.value.confidence,
    blindEvidence: evaluation.blind.value.stemEvidence ?? "",
    blindUncertain: evaluation.blind.value.uncertain === true,
    blindAlternative: evaluation.blind.value.equallyDefensible ?? null,
    acceptability: evaluation.acceptability.value,
    report: evaluation.report.value,
    distractorReviews: [],
    planConcerns: [],
  } });
  return empty(directStatus(decision.verdict), null, {
    ...drafted,
    judgesStarted: true,
    reviewIndependence: { calls: 3, independentReviews: 1, family: split.judgeBase, note: familyNote },
    blindAnswer: evaluation.blind.value.answer,
    blindConfidence: evaluation.blind.value.confidence,
    blindRationale: evaluation.blind.value.rationale,
    stemEvidence: evaluation.blind.value.stemEvidence ?? null,
    equallyDefensible: evaluation.blind.value.equallyDefensible ?? null,
    uncertain: evaluation.blind.value.uncertain === true,
    acceptability: evaluation.acceptability.value,
    finalReport: evaluation.report.value,
    factoryVerdict: decision.verdict,
    cache: [
      ...cache,
      { stage: "blindSolve", requestHash: evaluation.blind.requestHash, cached: evaluation.blind.cached },
      { stage: "acceptability", requestHash: evaluation.acceptability.requestHash, cached: evaluation.acceptability.cached },
      { stage: "finalJudge", requestHash: evaluation.report.requestHash, cached: evaluation.report.cached },
    ],
  });
}
