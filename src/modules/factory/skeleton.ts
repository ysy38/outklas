import { z } from "zod";
import { inferenceClaims, inferenceReward, propositionStatuses, undemonstratedExempt } from "./plan-logic";
import { looksTurkish, words } from "@/modules/analysis/surface";
import { shingles } from "@/modules/analysis/validate";
import { knowledgeEdges } from "@/modules/knowledge/seed";
import { relationConnectors } from "./families";
import { connectorSurface } from "./spec-engine";
import { knownLemmas } from "./known-lemmas";
import type { QuestionSpec } from "./spec";
import { factoryVersions } from "./versions";
import { optionLabels } from "@/modules/analysis/contract";
import { blankPosition, clauseReuse, contentWords, hasPhrase, integrityProblems, leadingConnector, normalized, sharedWording, stageValidation, type IssueSeverity, type OriginalityIndex, type StageValidation, type ValidationIssue } from "./validator";

/** How a hard concession item is meant to be difficult. Medium and easy items leave this unset. */
export const difficultyStrategies = ["lexical_pivot", "relational_inference"] as const;
export type DifficultyStrategy = (typeof difficultyStrategies)[number];

/** The event, not the topic. Same domain with a different event is not a copy. */
export const scenarioPlan = z.object({
  domain: z.string().max(60),
  actor: z.string().max(80),
  obstacle: z.string().max(140),
  expected: z.string().max(140),
  outcome: z.string().max(140),
  /** Free label of the link, not an enum. Forty characters rejected real plans such as a clause-length concession note. */
  relation: z.string().max(120),
});
export type ScenarioPlan = z.infer<typeof scenarioPlan>;

/** Menu for one wrong option. The same family may be used more than once. Near concession is one choice, not a quota. */
export const relationFamilies = ["near_concession", "cause", "condition", "time", "contrast"] as const;
export type RelationFamily = (typeof relationFamilies)[number];

/** Where the full sentence stops being a concession a careful reader could defend. */
export const failureAnchors = ["actor", "scope", "time", "outcome", "reference"] as const;
export type FailureAnchor = (typeof failureAnchors)[number];

/** How the stem evidence makes the full sentence indefensible. Not a quota, and not "this is not a concession". */
export const failureMechanisms = ["actor_mismatch", "time_mismatch", "reference_mismatch", "scope_mismatch", "causal_direction", "contradicts_outcome", "wrong_expectation"] as const;
export type FailureMechanism = (typeof failureMechanisms)[number];

/**
 * One wrong option, decided before its English clause. Optional on the skeleton so older responses and lexical items still parse.
 * Relational validation requires the four plans. The writer does not invent the failure after the clause.
 */
export const distractorBlueprint = z.object({
  option: z.enum(optionLabels),
  relationFamily: z.enum(relationFamilies),
  /** Set only when this belief's failure turns on the subject. */
  actor: z.string().max(80).optional(),
  /** Set only when this belief's failure turns on the period. */
  time: z.string().max(80).optional(),
  /** Set only when this belief's failure turns on the event or group. */
  scope: z.string().max(120).optional(),
  proposition: z.string().min(1).max(240),
  intendedMisconception: z.string().max(160),
  whyPlausible: z.string().min(1).max(300),
  /** A fact quoted from the shared stem, the clause the student sees. The correct option is not evidence. */
  stemEvidenceAnchor: z.string().min(1).max(300),
  failureMechanism: z.enum(failureMechanisms),
  decisiveFailureReason: z.string().min(1).max(300),
  failureAnchor: z.enum(failureAnchors),
  connectorStrategy: z.literal("natural"),
  /**
   * The planner's label for the proposition. Absent means the old checks stay in force.
   * The label is not evidence that the logic holds.
   */
  propositionStatus: z.enum(propositionStatuses).optional(),
  /** Set only when the plan offers this proposition as an invalid inference. Absent makes no such offer. */
  inferenceClaim: z.enum(inferenceClaims).optional(),
});
export type DistractorBlueprint = z.infer<typeof distractorBlueprint>;

/** The four wrong beliefs, planned after the stem and the correct continuation are already accepted. */
export const distractorPlanOutput = z.object({
  distractorBlueprints: z.array(distractorBlueprint).length(4),
});
export type DistractorPlanOutput = z.infer<typeof distractorPlanOutput>;

/**
 * Stage 1 output: the item without wrong options. The plan fields are optional so an older response still parses.
 * They are written in the same call as the sentence. No explanation, no taxonomy.
 */
export const questionSkeleton = z.object({
  /** Only for formats with a passage; sentence completion has none. */
  context: z.string().max(1500).nullable(),
  stem: z.string().min(1).max(500),
  correctAnswer: z.string().min(1).max(300),
  difficultyStrategy: z.enum(difficultyStrategies).optional(),
  targetLexeme: z.string().max(40).optional(),
  neutralSubstitute: z.string().max(40).optional(),
  scenario: scenarioPlan.optional(),
  /** Relational planning notes. Evidence only after the same fact is written in the stem. */
  facts: z.array(z.string().min(1).max(180)).min(3).max(5).optional(),
  distractorBlueprints: z.array(distractorBlueprint).length(4).optional(),
});
export type QuestionSkeleton = z.infer<typeof questionSkeleton>;

export const plannerDecisions = ["produce", "decline"] as const;

/**
 * One relational planner call. `produce` is a full item. `decline` is an explicit refusal, not a broken item.
 * The provider schema lists every field. Zod applies the produce/decline conditions after the call.
 */
export const relationalPlannerOutput = z
  .object({
    decision: z.enum(plannerDecisions),
    stem: z.string().min(1).max(500).nullable(),
    /** The correct option clause. Null when the call declines. */
    correctBlueprint: z.string().min(1).max(300).nullable(),
    distractorBlueprints: z.array(distractorBlueprint).max(4).nullable(),
    /** Letters that could not be given a defensible plan. Empty when the call produces. */
    missingDistractors: z.array(z.object({ option: z.enum(optionLabels), reason: z.string().min(1).max(300) })).max(4),
    declineReason: z.string().min(1).max(400).nullable(),
    context: z.string().max(1500).nullable(),
    difficultyStrategy: z.enum(difficultyStrategies).nullable(),
    targetLexeme: z.string().max(40).nullable(),
    neutralSubstitute: z.string().max(40).nullable(),
    scenario: scenarioPlan.nullable(),
    facts: z.array(z.string().min(1).max(180)).min(3).max(5).nullable(),
  })
  .superRefine((value, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (value.decision === "decline") {
      if (!value.stem) issue("stem", "decline includes the redesigned stem");
      if (!value.correctBlueprint) issue("correctBlueprint", "decline includes the correct option");
      if (!value.distractorBlueprints || value.distractorBlueprints.length > 3) issue("distractorBlueprints", "decline includes only the plans that could be defended");
      const found = value.distractorBlueprints ?? [];
      const missing = value.missingDistractors;
      if (found.length + missing.length !== 4) issue("missingDistractors", "decline accounts for all four distractor letters");
      const letters = new Set([...found.map((plan) => plan.option), ...missing.map((gap) => gap.option)]);
      if (letters.size !== found.length + missing.length) issue("missingDistractors", "decline does not repeat a letter");
      if (missing.length === 0) issue("missingDistractors", "decline names the plans it could not defend");
      if (!value.declineReason) issue("declineReason", "decline says why another stem design still cannot yield four");
      return;
    }
    if (value.declineReason !== null) issue("declineReason", "produce leaves declineReason null");
    if (value.missingDistractors.length !== 0) issue("missingDistractors", "produce leaves missingDistractors empty");
    if (!value.stem) issue("stem", "produce includes the stem");
    if (!value.correctBlueprint) issue("correctBlueprint", "produce includes the correct option");
    if (!value.distractorBlueprints || value.distractorBlueprints.length !== 4) issue("distractorBlueprints", "produce includes four distractor plans");
    if (!value.facts) issue("facts", "produce includes three to five facts");
    if (!value.scenario) issue("scenario", "produce includes the scenario");
    if (value.difficultyStrategy !== "relational_inference") issue("difficultyStrategy", "produce keeps relational_inference");
  });
export type RelationalPlannerOutput = z.infer<typeof relationalPlannerOutput>;

export type PlannerDecline = {
  decision: "decline";
  declineReason: string;
  stem: string;
  correctBlueprint: string;
  distractorBlueprints: DistractorBlueprint[];
  missingDistractors: { option: (typeof optionLabels)[number]; reason: string }[];
};

export function isPlannerDecline(value: QuestionSkeleton | PlannerDecline): value is PlannerDecline {
  return "decision" in value && value.decision === "decline";
}

/** Maps a valid relational call onto the skeleton the rest of the pipeline already reads, or a terminal decline. */
export function settleRelationalPlanner(value: RelationalPlannerOutput): QuestionSkeleton | PlannerDecline {
  if (value.decision === "decline") {
    return {
      decision: "decline",
      declineReason: value.declineReason ?? "",
      stem: value.stem ?? "",
      correctBlueprint: value.correctBlueprint ?? "",
      distractorBlueprints: value.distractorBlueprints ?? [],
      missingDistractors: value.missingDistractors,
    };
  }
  return {
    context: value.context,
    stem: value.stem ?? "",
    correctAnswer: value.correctBlueprint ?? "",
    difficultyStrategy: "relational_inference",
    ...(value.targetLexeme ? { targetLexeme: value.targetLexeme } : {}),
    ...(value.neutralSubstitute ? { neutralSubstitute: value.neutralSubstitute } : {}),
    scenario: value.scenario ?? undefined,
    facts: value.facts ?? undefined,
    distractorBlueprints: value.distractorBlueprints ?? undefined,
  };
}

/** Hard items alternate. Even ordinals connect two propositions; odd ordinals turn on one academic word. */
import { assignedStrategy } from "./strategy";
export { assignedStrategy };

const contextFormats = new Set<string>(["passage_numbered_blank", "passage_question", "passage_sentence_blank", "numbered_sentences", "dialogue_blank"]);
const english = (text: string) => !/[çğıöşüÇĞİÖŞÜ]/.test(text) && !looksTurkish(text);
const capitalised = (text: string) => {
  const first = text.trim().charAt(0);
  return first !== "" && first === first.toLocaleUpperCase("en") && first !== first.toLocaleLowerCase("en");
};

/** The completed sentence a learner reads with `option` in the blank. */
export const completeStem = (stem: string, option: string) => stem.replace("----", option.trim());

const clauseVerb =
  /\b(?:is|are|was|were|has|have|had|do|does|did|will|would|can|could|held|made|left|grew|rose|fell|kept|paid|cut|read|slept|went|came|took|gave|found|led|built|became|began|ran|lost|meant|met|spent|told|[a-z]+ed)\b/i;
const clauseSubject = /^(?:\s*)(?:it|its|they|their|he|his|she|her|we|our|you|the|a|an|this|that|these|those|most|many|some|several|both|each|all|no|one)\b/i;

/** Two finite clauses joined by and/or: two obstacles stacked into one option. Noun pairs ("headaches and tiredness") stay. */
export function stackedObstacle(answer: string): boolean {
  return answer.split(/\b(?:and|or)\b/i).slice(1).some((part) => clauseSubject.test(part) && clauseVerb.test(part));
}

/** A relative or complement clause. The concession clause itself does not count unless it contains one of these. */
export function hasEmbedding(text: string): boolean {
  if (/\b(?:which|who|whom|whose)\b/i.test(text)) return true;
  return /\bthat\s+(?:[\w'-]+\s+){0,5}(?:is|are|was|were|has|have|had|did|would|could|can)\b/i.test(text);
}

const ordinaryTerm = new Set(
  "although though because whereas unless until before after during within between against without through already several another further general specific available necessary possible recent previous current local major similar various common particular significant effective positive negative primary individual additional traditional original potential financial industrial cultural medical scientific historical political economic annual entire single public private human natural physical mental social early late long high large small first second third final main only many much most some other such same both each every study result report government company increase decrease important different following according research university student teacher hospital patient treatment disease history century development management production population environment information education situation condition decision agreement committee department community evidence process system program programme policy problem question change support provide include consider suggest indicate require remain become therefore council resident petition approved experiment volunteer accuracy recall farmland colony district treasury clerk harbour harbor town city year time people group area level number rate cost fund staff plan work case fact form side part point state order value power water land headache medicine clinical doctor nurse prescribed continue month complaint week tiredness mild national health authority drug trial side effect file journal morning evening injection nurse result published respected".split(
    /\s+/,
  ),
);

const wordIn = (text: string, word: string) => word !== "" && new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);

const auxiliaryVerb = new Set("is are was were has have had do does did will would can could be been being".split(" "));
const adverbBeforeThat = new Set("already still also clearly recently just even only later then never not now often once newly fully".split(" "));
const irregularReportingVerb = new Set("said told knew saw heard thought felt found wrote made gave meant read led shown known seen given written taken proved".split(" "));

/** A finite verb that can introduce a that-complement. Auxiliaries are excluded so "noun that was" stays a relative. */
function isReportingVerb(word: string): boolean {
  const bare = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!bare || auxiliaryVerb.has(bare)) return false;
  if (irregularReportingVerb.has(bare)) return true;
  return bare.length >= 5 && bare.endsWith("ed");
}

/**
 * The precise term sits in a that-clause whose head is a reporting verb ("showed that", "knew clearly that").
 * A that-clause on a noun ("a chamber that had turned anoxic") is a relative and does not match.
 */
export function reportingComplementHoldsTerm(option: string, term: string): boolean {
  if (!term) return false;
  const pattern = /\bthat\b/gi;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(option))) {
    const suffix = option.slice(found.index);
    if (!hasEmbedding(suffix)) continue;
    const before = option.slice(0, found.index).trim().split(/\s+/);
    while (before.length && adverbBeforeThat.has(before[before.length - 1].toLowerCase().replace(/[^a-z]/g, ""))) before.pop();
    if (!isReportingVerb(before.at(-1) ?? "")) continue;
    const boundary = suffix.slice(4).search(/,|\bwhich\b|\bwho\b|\bwhom\b|\bwhose\b/i);
    const span = boundary < 0 ? suffix : suffix.slice(0, boundary + 4);
    if (wordIn(span, term)) return true;
  }
  return false;
}

/** Writer-facing line for a gate code. Other codes stay as their names. */
export function gateFailureNote(code: string): string {
  const notes: Record<string, string> = {
    hard_complement: "hard_complement: put the uncommon word and the obstacle in a which, who, or that clause on the noun. A that-clause after a reporting verb does not count.",
    hard_decorative_clause:
      "hard_decorative_clause: replace the academic word with a plain verb such as affect. The concession has to become clearly weaker. It does not have to become impossible. If other words already state the same obstacle, write a new situation in which they do not.",
    hard_calendar_stamp:
      "hard_calendar_stamp: a month, a year, or a season sits outside the which, who, or that clause. Remove that time stamp. Leave a detail that belongs to this situation, and use a different clause shape.",
    hard_no_term: "hard_no_term: name one academic verb, adjective, or abstract noun that carries the concession, such as curtail, undermine, or impede. A corner noun, an archaic word, or an intensifier such as severely does not count.",
    hard_no_embedding: "hard_no_embedding: the correct option needs a clause that begins with which, who, or that. whose does not count. A that-clause after showed, found, reported, or said does not count.",
    hard_term_outside_clause: "hard_term_outside_clause: the uncommon word sits outside the which, who, or that clause. Move that word into the clause.",
    planned_second_answer: "planned_second_answer: a planned wrong option is a second defensible completion of this stem. Replace that belief. Other natural completions that are not among the planned options are not this failure.",
    plan_restatement_as_inference: "plan_restatement_as_inference: a planned wrong only repeats the stem or what the stem already requires, and the plan offers that repeat as an invalid inference. Plan a step the stem does not entail, or stop calling the repeat an inference.",
    plan_ground_unanchored: "plan_ground_unanchored: the planned failure is not tied to an expression in the stem. Quote the stem expression the misreading comes from, or drop the belief.",
  };
  return notes[code] ?? code;
}

/** Writer-facing line for a joint-plan code. Other codes stay as their names. */
export function planFailureNote(code: string): string {
  const notes: Record<string, string> = {
    plan_missing: "plan_missing: before the sentence, plan the four wrong options. Each needs its own proposition, why a learner would consider it, and why the full sentence is indefensible.",
    plan_incomplete: "plan_incomplete: a plan field is too thin to guide the clause. State the proposition and the failure in full sentences.",
    plan_option_set: "plan_option_set: the four plans must use the four wrong-option letters, each once, and not the key.",
    plan_duplicate_proposition: "plan_duplicate_proposition: two options restate the same proposition. Give each its own.",
    plan_connector_only: "plan_connector_only: a different connector is not why the option is wrong. Name the proposition that fails once it is joined to the stem.",
    plan_anchor_missing: "plan_anchor_missing: the event named as stem evidence is not in the narrative. Name an event the stem tells, or drop the belief. A specialist fact the stem does not state is not evidence.",
    plan_key_evidence: "plan_key_evidence: this proof uses the correct option, which the student does not see. A proposition that explains the outcome is not made wrong by the key. Quote a stem fact that already rules it out, or drop the option.",
    plan_reason_unanchored: "plan_reason_unanchored: the failure reason must use that stem evidence. Do not give a reason that never mentions the fact that makes the option wrong.",
    plan_relation_only: "plan_relation_only: saying the option is not a concession, names no obstacle, or is the wrong relation does not prove the full sentence is indefensible. Name the actor, time, reference, scope, or causal clash.",
    plan_undemonstrated: "plan_undemonstrated: saying the stem does not support the proposition, or that the option is not a concession, is not a reason. Name the visible clash, the reversed cause, the expectation the clause actually creates, or the question it answers instead. A declared not_entailed invalid inference is the exception: name the stem expression and the step that does not follow. Do not add a contradiction word just to pass.",
    plan_restatement_as_inference: "plan_restatement_as_inference: this plan labels the proposition as entailed or as a restatement and still offers it as an invalid inference. A restatement of the stem, or of what the stem already requires, is not that kind of distractor. Relabel the claim, or plan a step the stem does not entail.",
    plan_supports_outcome: "plan_supports_outcome: this proposition explains the outcome, so a careful reader could choose it. Do not write it. Plan a proposition the stem evidence rules out, or redesign the set.",
    plan_second_concession: "plan_second_concession: this near concession adds another real obstacle, so the concession can still hold. Name a wrong actor, time, reference, or scope, or drop the near concession.",
    plan_absurd: "plan_absurd: an option that is wrong only because it is absurd is not a distractor. Use a realistic clause and a specific failure.",
    plan_near_concession_unsupported: "plan_near_concession_unsupported: this near concession does not compete with the real obstacle, or its failure is not decisive. Name the actor, time, scope, reference, or outcome link that makes the full sentence indefensible. If you cannot, drop the near concession and design a new situation. Do not fill the slot with another connector.",
    plan_time_stamp: "plan_time_stamp: the main clause is ongoing. Do not plan a time option around a month, a year, or a fixed past date. Choose another proposition or another family.",
    plan_mismatch: "plan_mismatch: the clause does not state the planned proposition. Rewrite only this option so it carries that proposition and fails for the planned reason.",
    plan_polarity_shift: "plan_polarity_shift: the clause reverses the planned proposition. Rewrite it so the scope and direction stay the same, and it still fails for the planned reason.",
    plan_repeats_sibling: "plan_repeats_sibling: this clause restates another option's proposition. Write the proposition assigned to this letter.",
  };
  return notes[code] ?? code;
}

const connectorLexicon = new Set("although though even despite whereas while because unless until before after once when provided connector concessive concession relation different another only instead rather using uses".split(" "));
const absurdLexicon = new Set("absurd impossible nonsense nonsensical ridiculous illogical silly".split(" "));
/** The reason only says the option missed the target relation. That does not make the full sentence indefensible. */
const relationOnlyFailure = /\b(?:cannot complete a concession|does not form a concession|do not form a concession|not a concession|never becomes a concession|names no obstacle|does not oppose|doesn't oppose|not an obstacle|wrong relation|different relation)\b/i;
/** "The stem does not support this" is not a demonstrated failure. A contradiction claim is left for the distractor judge. */
const unsupportedFailure = /\b(?:does not support|doesn't support|do not support|not supported|unsupported|does not say|doesn't say|did not say|not stated|never states|no evidence|not mentioned|stem alone does not|does not rule|doesn't rule|points? to|implies?|suggests?)\b/i;
/** The plan admits the proposition accounts for the outcome, so a careful reader could select it. */
const supportsOutcome = /\b(?:gives a reason|reason for confidence|explains (?:the|why|how)|can explain|could explain|does explain|would explain|accounts for|supports the (?:outcome|result|dating))\b/i;
/** A concrete clash keeps a reason that also uses one of the phrases above. */
const concreteClash = /\b(?:cannot explain|can't explain|does not explain|doesn't explain|opposite|fewer|contradicts|contradict|removes|removed|instead|wrong actor|different (?:actor|time|site|station|group|harbour|harbor)|would (?:reduce|prevent|remove|lower))\b/i;
/** Another unresolved obstacle joined by a concession connector. The outcome can still be unexpected. */
const addedObstacle = /\bonly once\b|\bshortage\b|\berratic\b|\bdamaged\b|\bunreliable\b|\binsufficient\b|\bfailed to\b|\bnever been calibrated\b|\black of\b/i;

const substantive = (text: string) => [...contentWords(text)].filter((word) => !connectorLexicon.has(word));

/** Same stem under a trailing inflection: legible/legibility, reopened/reopening, handle/handling. */
const sameForm = (left: string, right: string) => {
  if (left === right) return true;
  const [longer, shorter] = left.length >= right.length ? [left, right] : [right, left];
  if (shorter.length < 5) return false;
  const stem = longer.replace(/(?:ility|ness|ing|ed|es|ly|s)$/i, "");
  return stem.length >= 5 && (stem === shorter || shorter.startsWith(stem) || stem.startsWith(shorter));
};
/** Words a model uses to point at the stem, not words of the stem itself. */
const anchorMeta = new Set("stem says said fact facts clause option reader student shared main blank quotation quote".split(" "));

/** A month, year, or season, including forms the relative-clause calendar check does not see. */
const fixedPast = /\b(?:last|this)\s+(?:spring|summer|autumn|winter|year|january|february|march|april|may|june|july|august|september|october|november|december)\b|\b(?:19|20)\d{2}\b|\bmid-\d{4}s\b/i;

/** The main clause keeps happening. A time option must not hang it on one past date. */
export function ongoingMainClause(stem: string): boolean {
  return /\b(?:has|have)\s+(?:been\s+)?(?:\w+ing|spread|grown|kept|won|remained|continued)\b/i.test(stem) || /\beach\s+(?:year|season|month)\b/i.test(stem) || /\bcontinued to\b/i.test(stem) || /\bfor another\b/i.test(stem);
}

/**
 * Relational items plan four wrong propositions in the same call as the key. Lexical items never reach this.
 * A near concession without a real miss is rejected. A missing near concession is allowed: it is not a quota.
 */
export function distractorPlanIssues(spec: QuestionSpec, skeleton: QuestionSkeleton): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: string, detail?: string) => issues.push({ code, severity: "critical", ...(detail ? { detail } : {}) });
  const plans = skeleton.distractorBlueprints;
  if (!plans) {
    add("plan_missing");
    return issues;
  }
  const wrong = spec.distractorPlan.map((slot) => slot.option);
  const letters = plans.map((plan) => plan.option);
  if (letters.length !== 4 || new Set(letters).size !== 4 || wrong.some((option) => !letters.includes(option)) || letters.includes(spec.answerConstraints.correctOption)) add("plan_option_set");
  const obstacle = `${skeleton.scenario?.obstacle ?? ""} ${skeleton.scenario?.outcome ?? ""} ${skeleton.correctAnswer}`;
  const stemWords = contentWords(skeleton.stem);
  // Actor and domain labels may repeat. Obstacle, expected result, the key, and unstated facts are hidden until the stem says them.
  const hiddenInfo = new Set(
    [...contentWords([skeleton.scenario?.obstacle, skeleton.scenario?.expected, skeleton.correctAnswer, ...(skeleton.facts ?? [])].filter(Boolean).join(" "))].filter(
      (word) => !stemWords.has(word) && !connectorLexicon.has(word),
    ),
  );
  const leaks = (text: string, alsoVisible: Set<string> = new Set()) => [...contentWords(text)].filter((word) => hiddenInfo.has(word) && !alsoVisible.has(word));
  const repeatedProposition = (left: string, right: string) => {
    const shared = sharedWording(left, right);
    if (shared.length < 4) return false;
    if (shared.filter((word) => !stemWords.has(word)).length >= 4) return true;
    const smaller = Math.min(contentWords(left).size, contentWords(right).size);
    return smaller > 0 && shared.length / smaller >= 0.75;
  };
  for (const plan of plans) {
    const reasonWords = substantive(plan.decisiveFailureReason);
    const specific = reasonWords.filter((word) => !absurdLexicon.has(word));
    const anchorWords = contentWords(plan.stemEvidenceAnchor);
    const claim = [...anchorWords].filter((word) => !anchorMeta.has(word));
    const present = claim.filter((word) => stemWords.has(word));
    // A short quotation of the stem is evidence, not a missing proposition. Absence from the stem is plan_anchor_missing.
    if (words(plan.proposition).length < 6 || words(plan.whyPlausible).length < 6 || words(plan.decisiveFailureReason).length < 8) add("plan_incomplete", plan.option);
    if (claim.length === 0 || present.length === 0 || claim.length - present.length > present.length) add("plan_anchor_missing", plan.option);
    if (leaks(plan.stemEvidenceAnchor).length > 0 || leaks(plan.decisiveFailureReason, contentWords(plan.proposition)).length > 0) add("plan_key_evidence", plan.option);
    if (![...contentWords(plan.decisiveFailureReason)].some((word) => [...anchorWords].some((anchor) => sameForm(word, anchor)))) add("plan_reason_unanchored", plan.option);
    if (unsupportedFailure.test(plan.decisiveFailureReason) && !concreteClash.test(plan.decisiveFailureReason) && !undemonstratedExempt(plan.propositionStatus)) add("plan_undemonstrated", plan.option);
    if (inferenceReward(plan.propositionStatus, plan.inferenceClaim) === "withheld") add("plan_restatement_as_inference", plan.option);
    if (reasonWords.length < 4 || /different connector|connector alone|only the connector/i.test(plan.decisiveFailureReason)) add("plan_connector_only", plan.option);
    else if (specific.length < 3) add("plan_absurd", plan.option);
    if (relationOnlyFailure.test(plan.decisiveFailureReason) && !concreteClash.test(plan.decisiveFailureReason)) add("plan_relation_only", plan.option);
    if (supportsOutcome.test(plan.decisiveFailureReason) && !concreteClash.test(plan.decisiveFailureReason)) add("plan_supports_outcome", plan.option);
    const obstacleClaim = plan.proposition.replace(/\bincluding\b[\s\S]*$/i, " ");
    if (plan.relationFamily === "near_concession" && addedObstacle.test(obstacleClaim)) add("plan_second_concession", plan.option);
    if (repeatedProposition(skeleton.correctAnswer, plan.proposition)) add("plan_duplicate_proposition", plan.option);
    if (plan.relationFamily === "near_concession") {
      const competes = [...contentWords(plan.proposition)].some((word) => contentWords(obstacle).has(word));
      if (!competes || reasonWords.length < 4) add("plan_near_concession_unsupported", plan.option);
    }
    if (plan.relationFamily === "time" && ongoingMainClause(skeleton.stem) && (calendarStamp(plan.proposition) || fixedPast.test(plan.proposition))) add("plan_time_stamp", plan.option);
  }
  for (let i = 0; i < plans.length; i++) {
    for (const other of plans.slice(i + 1)) {
      if (repeatedProposition(plans[i].proposition, other.proposition)) add("plan_duplicate_proposition", other.option);
    }
  }
  return issues;
}

/**
 * A which/who clause that does not hold the precise term. The harm then sits in another clause,
 * so the relative is decoration. "cores, which had been taken at the site, showed that the bed had turned hypoxic".
 */
export function decorativeAside(option: string, term: string): boolean {
  const match = option.match(/\b(?:which|who|whom|whose)\b[^,]*/i);
  if (!match || !term) return false;
  return !wordIn(match[0], term) && wordIn(option, term);
}

const surfaceCodes = new Set(["stem_punctuation", "stem_capitalisation", "answer_capitalisation", "answer_punctuation"]);

/** Failures of the concession clause. The stem can stay; only the option is rewritten. */
const calendarWord = /\b(?:january|february|march|april|june|july|august|september|october|november|december|spring|summer|autumn|winter)\b|\b(?:19|20)\d\d\b/i;

/** A month, year, or season left outside the relative. The obstacle clause may still mention a time. */
export function calendarStamp(option: string): boolean {
  const outside = option.replace(/\b(?:which|who|whom|whose)\b[^,]*/gi, " ").replace(/\bthat\b[^,]*/gi, " ");
  return calendarWord.test(outside) || /\bMay\b/.test(outside);
}

export const clauseRepairCodes = new Set([
  "hard_complement",
  "hard_calendar_stamp",
  "hard_no_term",
  "hard_term_outside_clause",
  "hard_no_embedding",
  "key_not_true",
  "key_relation_weak",
  "key_ambiguous",
  "skeleton_unnatural",
  "skeleton_ungrammatical",
]);

export function clauseRepair(failures: string[]): boolean {
  return failures.length > 0 && failures.every((code) => clauseRepairCodes.has(code));
}

export function isSurfaceCode(code: string): boolean {
  return surfaceCodes.has(code);
}

function flipCase(text: string, upper: boolean): string {
  if (!text) return text;
  const first = text.charAt(0);
  const next = upper ? first.toLocaleUpperCase("en") : first.toLocaleLowerCase("en");
  return next + text.slice(1);
}

/**
 * Fixes blank punctuation and capitalisation without a model call.
 * Leaves a stem that has no blank untouched apart from trimmed space and a trailing mark on the option.
 */
export function repairSkeletonSurface(spec: QuestionSpec, skeleton: QuestionSkeleton): QuestionSkeleton {
  const position = spec.contextConstraints.blankPosition;
  let stem = skeleton.stem.trim().replace(/[ \t]+/g, " ");
  let answer = skeleton.correctAnswer.trim().replace(/[ \t]+/g, " ").replace(/[.,;:!?]+$/g, "");
  if (!stem.includes("----")) return { ...skeleton, stem, correctAnswer: answer };
  if (position === "start") {
    const rest = stem.replace(/^----\s*,?\s*/, "").trim();
    stem = `----, ${rest}`;
    if (!/[.!?]$/.test(stem)) stem += ".";
    answer = flipCase(answer, true);
  } else if (position === "end") {
    const main = flipCase(stem.replace(/\s*----\s*\.?$/, "").trim(), true);
    stem = `${main} ----.`;
    answer = flipCase(answer, false);
  }
  return { ...skeleton, stem, correctAnswer: answer };
}

const endings: [string, string][] = [
  ["ility", "le"],
  ["ation", "ate"],
  ["tion", "t"],
  ["ing", ""],
  ["ing", "e"],
  ["ed", ""],
  ["ed", "e"],
  ["es", ""],
  ["ly", ""],
  ["ity", ""],
  ["ity", "e"],
  ["ness", ""],
  ["ment", ""],
  ["ence", "e"],
  ["ance", ""],
  ["s", ""],
];

/** Lemma plus regular endings, so "commissioning" meets "commission" and "liquidity" meets "liquid". */
function termForms(term: string): string[] {
  const forms = [term];
  for (const [suffix, add] of endings) {
    if (term.endsWith(suffix) && term.length - suffix.length >= 4) forms.push(term.slice(0, -suffix.length) + add);
  }
  return forms;
}

/** Inflected and derived forms of one target word, including volatility/volatile and a plural in -ies. */
function lemmaForms(word: string): string[] {
  const term = word.toLowerCase().replace(/[^a-z]/g, "");
  const forms = new Set(termForms(term));
  if (term.endsWith("ies") && term.length > 6) for (const form of termForms(`${term.slice(0, -3)}y`)) forms.add(form);
  return [...forms];
}

/** True when two surface words are the same lexical family. Diversity uses this; it is not a difficulty proof. */
export function sameTargetLemma(a: string, b: string): boolean {
  const left = new Set(lemmaForms(a));
  return lemmaForms(b).some((form) => form.length >= 4 && left.has(form));
}

/**
 * Reserves one target lemma for the current slice. A repeat, including an inflected form, is not reserved.
 * An empty term reserves nothing: the gate did not name a word. The caller regenerates the skeleton.
 */
export function claimTargetLemma(used: string[], term: string): boolean {
  const key = term.trim().toLowerCase().match(/[a-z]+/)?.[0] ?? "";
  if (!key) return true;
  if (used.some((entry) => sameTargetLemma(entry, key))) return false;
  used.push(key);
  return true;
}

/**
 * Single-field journal words and archaic diction. They are not YDS C1.
 * A current academic word a candidate could meet in a textbook still qualifies.
 */
const cornerTerm = new Set(
  "lacunary deliquescent deliquesce bioturbate bioturbated hygroscopic prosopagnosia presbycusis dysphasia cytotoxin ferritic sanctionable consolidant erstwhile heretofore whilst whence amidst thence".split(/\s+/),
);

const blockedPrefix = ["un", "re", "non", "over", "under", "pre", "post", "mis", "dis"];

function blockedLemma(form: string): boolean {
  if (ordinaryTerm.has(form) || knownLemmas.has(form) || cornerTerm.has(form)) return true;
  for (const prefix of blockedPrefix) {
    if (!form.startsWith(prefix)) continue;
    const rest = form.slice(prefix.length);
    if (rest.length >= 4 && (ordinaryTerm.has(rest) || knownLemmas.has(rest) || cornerTerm.has(rest))) return true;
  }
  return false;
}

const intensifier = new Set("severely critically completely fatally totally entirely utterly destructively harshly".split(" "));
const cornerNoun = new Set([...cornerTerm, ..."aquifer dysarthria hypoxic anoxic cavitation alluvium cadmium leachate liquefaction hygroscopic".split(" ")]);

/** The hard load is an academic verb, adjective, or abstract noun. Corner nouns and bare intensifiers do not qualify. */
export function acceptableHardWord(word: string): boolean {
  const term = word.toLowerCase().replace(/[^a-z-]/g, "");
  if (term.length < 5 || intensifier.has(term)) return false;
  return termForms(term).every((form) => !cornerNoun.has(form));
}

/** A corner noun or an intensifier. Relational items may use an ordinary word; they may not use one of these. */
export function cornerOrIntensifier(word: string): boolean {
  const term = word.toLowerCase().replace(/[^a-z-]/g, "");
  if (!term || intensifier.has(term)) return intensifier.has(term);
  return termForms(term).some((form) => cornerNoun.has(form));
}

/** A textbook academic word can be the hard term. Basic words, single-field jargon, and archaic words cannot. */
export function isPreciseTerm(word: string): boolean {
  const term = word.toLowerCase().replace(/[^a-z-]/g, "");
  if (term.length < 6) return false;
  return termForms(term).every((form) => !blockedLemma(form));
}

/**
 * Deterministic checks on stage 1. Any critical issue discards the skeleton and the whole item is written again.
 * planCheck "later" skips the four-belief checks so a stem and its correct continuation can be accepted before those beliefs exist.
 * The default still requires them on a relational item.
 */
export function validateSkeleton(input: { spec: QuestionSpec; skeleton: QuestionSkeleton; originality?: OriginalityIndex; siblingStems?: string[]; planCheck?: "now" | "later" }): StageValidation {
  const { spec, skeleton } = input;
  const issues: ValidationIssue[] = [];
  const add = (code: string, severity: IssueSeverity, detail?: string) => issues.push({ code, severity, ...(detail ? { detail } : {}) });
  const stem = skeleton.stem.trim();
  const answer = skeleton.correctAnswer.trim();

  if (spec.questionType !== "question_type:sentence_completion" || spec.structuralFormat !== "sentence_stem_completion") add("unsupported_question_type", "critical", spec.questionType);
  const needsContext = contextFormats.has(spec.structuralFormat);
  if (needsContext && !skeleton.context?.trim()) add("empty_context", "critical");
  if (!needsContext && skeleton.context?.trim()) add("unexpected_context", "critical");

  const blanks = (stem.match(/----/g) ?? []).length;
  if (blanks !== 1) add("blank_count", "critical", String(blanks));
  const position = blankPosition(stem);
  if (blanks === 1 && position !== spec.contextConstraints.blankPosition) add("blank_position", "critical", position);
  for (const problem of integrityProblems(stem.replaceAll("----", "BLANK"))) add("text_integrity", "critical", `stem ${problem}`);
  if (!english(stem)) add("non_english_text", "critical", "stem");
  if (spec.contextConstraints.blankPosition === "start" && !/^----,\s+\S/.test(stem)) add("stem_punctuation", "critical", "start blank needs '----, '");
  if (spec.contextConstraints.blankPosition === "end" && !/\S\s+----\.$/.test(stem)) add("stem_punctuation", "critical", "end blank needs ' ----.'");
  if (spec.contextConstraints.blankPosition === "end" && !capitalised(stem)) add("stem_capitalisation", "critical");

  const stemWords = words(stem.replaceAll("----", " ")).length;
  const range = spec.contextConstraints.stemWords;
  if (stemWords < range.min * 0.5 || stemWords > range.max * 1.5) add("length_far_out", "critical", `stem ${stemWords}`);
  else if (stemWords < range.min || stemWords > range.max) add("length_out_of_range", "warn", `stem ${stemWords}`);

  if (answer.includes("----")) add("answer_contains_blank", "critical");
  for (const problem of integrityProblems(answer)) add("text_integrity", "critical", `answer ${problem}`);
  if (!english(answer)) add("non_english_text", "critical", "answer");
  if (/[.,;:!?]$/.test(answer)) add("answer_punctuation", "critical");
  if (capitalised(answer) !== (spec.contextConstraints.blankPosition === "start")) add("answer_capitalisation", "critical");
  const connector = leadingConnector(answer);
  if (!connector || !spec.answerConstraints.connectors.includes(connector)) add("answer_connector_not_allowed", "critical", connector ?? "none");
  if (connector && spec.grammarPattern && !knowledgeEdges.some((edge) => edge.type === "has_pattern" && edge.from === connector && edge.to === spec.grammarPattern)) {
    add("grammar_pattern_mismatch", "critical", connector);
  }
  const body = connector ? answer.slice(connectorSurface(connector).length).trim() : answer;
  if (words(body).length < 3) add("answer_not_clause", "critical");
  if (spec.discourseRelation === "discourse_relation:concession" && stackedObstacle(answer)) add("stacked_obstacle", "critical", "one obstacle, not two clauses joined by and");
  const sentence = blanks === 1 ? completeStem(stem, answer) : `${stem} ${answer}`;
  if (spec.difficulty.band === "easy" && hasEmbedding(sentence)) add("easy_not_plain", "critical", "easy is one plain clause");
  const answerWords = words(answer).length;
  const optionRange = spec.contextConstraints.optionWords;
  if (answerWords < optionRange.min * 0.5 || answerWords > optionRange.max * 1.5) add("length_far_out", "critical", `answer ${answerWords}`);
  else if (answerWords < optionRange.min || answerWords > optionRange.max) add("length_out_of_range", "warn", `answer ${answerWords}`);

  const leaks = [...(spec.discourseRelation ? relationConnectors(spec.discourseRelation).map(connectorSurface) : []), ...spec.vocabularyConstraints.forbiddenInDistractors];
  const leaked = leaks.find((marker) => hasPhrase(stem.replaceAll("----", " "), marker));
  if (leaked) add("answer_leak_in_stem", "critical", leaked);
  if (clauseReuse(answer, stem.replaceAll("----", " ")).level === "copy") add("answer_echoed_in_stem", "critical");

  if (input.originality) {
    const runs = [...shingles(completeStem(stem, answer), input.originality.size)].filter((shingle) => input.originality!.shingles.has(shingle)).length;
    if (runs > 0) add("source_overlap", "critical", String(runs));
  }
  if ((input.siblingStems ?? []).some((other) => normalized(other) === normalized(stem))) add("duplicate_of_sibling", "critical");
  if (assignedStrategy(spec) === "relational_inference" && input.planCheck !== "later") {
    for (const issue of distractorPlanIssues(spec, skeleton)) add(issue.code, "critical", issue.detail);
  }
  return stageValidation(issues);
}

const unit = z.number().min(0).max(1);

/**
 * Stage 2b: an independent reviewer's semantic check of the skeleton, before any wrong option exists. It answers only
 * what the deterministic checks cannot: whether the key, combined with the stem, is grammatical, true and natural,
 * whether it establishes the target relation, and whether the key is ambiguous on its own.
 * Optional review fields record the reviewer's reading of planned wrongs. They do not prove that reading.
 */
export const secondAnswerRisks = ["shown", "none", "uncertain"] as const;
export const anchorGroundings = ["quoted", "declared_only", "missing", "uncertain"] as const;

const plannedReview = z.object({
  option: z.enum(optionLabels),
  secondAnswerRisk: z.enum(secondAnswerRisks),
  propositionStatus: z.enum(propositionStatuses),
  presentedAsInference: z.boolean(),
  anchorGrounding: z.enum(anchorGroundings),
});

export const skeletonCheckReport = z.object({
  reasons: z.array(z.string().max(200)).max(4),
  grammatical: z.boolean(),
  natural: unit,
  /** The completed sentence is a true, sensible statement. */
  keyTrue: z.boolean(),
  /** How clearly the key establishes the target relation with the main clause. */
  targetRelation: unit,
  /** Chance that the key reads as another relation, or the sentence has an unresolved second reading. */
  keyAmbiguous: unit,
  confidence: unit,
  /** Exact span of one relative or complement clause, or empty when the sentence has none. */
  embedding: z.string().max(160).optional(),
  /**
   * One content word a B2 reader may not know, copied from inside the embedding. A phrase is cut to its first word
   * so a long answer does not discard the review.
   */
  preciseTerm: z
    .string()
    .max(500)
    .transform((value) => value.trim().split(/\s+/)[0] || undefined)
    .optional(),
  /**
   * True when replacing preciseTerm with a plain verb such as affect clearly weakens the concession.
   * False when other words already state the same obstacle. The sentence does not have to become impossible.
   */
  clauseCarriesClash: z.boolean().optional(),
  /**
   * True when some other natural completion of this stem can be named.
   * That fact alone is not a defect. Absent means the reviewer did not say.
   */
  otherContinuationsPossible: z.boolean().optional(),
  /**
   * One row per planned wrong, when the reviewer was shown those plans.
   * Absent or short is not a completed reading. The labels inside a row are the reviewer's declaration.
   */
  plannedReviews: z.array(plannedReview).max(4).optional(),
});
export type SkeletonCheckReport = z.infer<typeof skeletonCheckReport>;

export type SkeletonGateDecision = { version: typeof factoryVersions.skeletonGate; decision: "ACCEPT" | "REGENERATE"; failures: string[]; concerns: string[] };

/**
 * A failing skeleton is written again (within the skeleton attempt limit) or the item is dropped; distractors are never
 * generated to make up for it. An unsure reviewer's yes/no findings become concerns instead of rejections.
 * `plansShown` is how many planned wrongs were sent to this same check. A missing or short `plannedReviews` is then a
 * concern, not another model call. A `not_entailed` or `restatement` label stays the reviewer's declaration.
 * `focus: "plans"` reads only those planned-wrong rows. It does not reopen a stem and key that already passed.
 */
export function skeletonGateDecision(
  report: SkeletonCheckReport,
  threshold: number,
  language?: { band: "easy" | "medium" | "hard"; sentence: string; strategy?: DifficultyStrategy | null; plansShown?: number; focus?: "item" | "plans" },
): SkeletonGateDecision {
  const failures: string[] = [];
  const concerns: string[] = [];
  const sure = report.confidence >= threshold;
  const plansOnly = language?.focus === "plans";
  if (!plansOnly) {
    if (!report.grammatical) (sure ? failures : concerns).push("skeleton_ungrammatical");
    if (!report.keyTrue) (sure ? failures : concerns).push("key_not_true");
    if (report.natural < threshold) failures.push("skeleton_unnatural");
    if (report.targetRelation < threshold) failures.push("key_relation_weak");
    if (report.keyAmbiguous >= threshold) failures.push("key_ambiguous");
  }
  const reviews = report.plannedReviews ?? [];
  const plansShown = language?.plansShown ?? 0;
  if (plansShown > 0 && reviews.length < plansShown) concerns.push("review_missing");
  if (reviews.some((review) => review.secondAnswerRisk === "shown")) (sure ? failures : concerns).push("planned_second_answer");
  else if (reviews.some((review) => review.secondAnswerRisk === "uncertain")) concerns.push("planned_second_answer_uncertain");
  if (reviews.some((review) => inferenceReward(review.propositionStatus, review.presentedAsInference ? "invalid_inference" : "none") === "withheld")) {
    (sure ? failures : concerns).push("plan_restatement_as_inference");
  }
  if (reviews.some((review) => review.anchorGrounding === "missing" || review.anchorGrounding === "declared_only")) {
    (sure ? failures : concerns).push("plan_ground_unanchored");
  } else if (reviews.some((review) => review.anchorGrounding === "uncertain")) concerns.push("plan_ground_uncertain");
  if (!plansOnly && report.otherContinuationsPossible === true) concerns.push("other_continuations_open");
  if (!plansOnly && language?.band === "hard") {
    const term = (report.preciseTerm?.trim() ?? "").split(/\s+/)[0] ?? "";
    const strategy = language.strategy ?? "lexical_pivot";
    if (strategy === "relational_inference") {
      if (term && cornerOrIntensifier(term)) failures.push("hard_no_term");
      if (calendarStamp(language.sentence)) failures.push("hard_calendar_stamp");
      if (report.clauseCarriesClash === false) concerns.push("pivot_diagnostic");
    } else {
      if (!wordIn(language.sentence, term) || !acceptableHardWord(term)) failures.push("hard_no_term");
      if (calendarStamp(language.sentence)) failures.push("hard_calendar_stamp");
      if (report.clauseCarriesClash !== true) failures.push("hard_decorative_clause");
    }
  }
  if (!sure) concerns.push("low_confidence");
  return { version: factoryVersions.skeletonGate, decision: failures.length ? "REGENERATE" : "ACCEPT", failures, concerns };
}
