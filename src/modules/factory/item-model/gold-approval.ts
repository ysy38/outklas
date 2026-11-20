import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";

/** Six gates. Acceptance requires every one to be explicitly true. */
export const goldCriteria = [
  "meaning_equivalent",
  "no_second_answer",
  "distractors_natural",
  "two_plausible_misreadings",
  "no_form_clue",
  "measures_construct",
] as const;
export type GoldCriterion = (typeof goldCriteria)[number];
export type GoldCriteria = Record<GoldCriterion, boolean>;

export const goldSetDir = ".data/analysis/_factory/editorial-gold/v1";
export const goldSetVersion = "editorial-gold-set-v1";

export type GoldCandidate = {
  candidateId: string;
  sourceRecord: string;
  source: string;
  targetKey: string;
  correctOption: OptionLabel;
  options: Record<OptionLabel, string>;
  testedConstruct: string;
  testedRelations: string[];
  keyMeaningEvidence: string;
  distractorMisreadings: Record<string, string>;
  whyEachDistractorIsWrong: Record<string, string>;
  clueRisk: string;
  estimatedDemand: string;
  observedDifficulty: null;
  editorialReview: "ready_for_human_approval" | "revision_required";
  blockingDefect: string | null;
};

export type GoldApprovalRecord = {
  reviewerId: string;
  reviewedAt: string;
  criteria: GoldCriteria;
  decision: "accept" | "withhold";
  reason: string;
  questionVersion: string;
  contentHash: string;
};

export type GoldReviewed = GoldCandidate & {
  questionType: "restatement" | "translation";
  direction: "tr_en" | "en_tr" | null;
  title: string;
  questionVersion: string;
  contentHash: string;
  editorialStatus: "ready_for_human_approval" | "revision_required" | "editorially_accepted";
  humanApproval: "pending" | "withheld" | "accepted";
  publishState: "unpublished";
  observedDifficulty: null;
  approval: GoldApprovalRecord | null;
};

const queueMeta = {
  door: { title: "Kapı", questionType: "restatement" as const, direction: null },
  snow: { title: "Kar", questionType: "translation" as const, direction: "tr_en" as const },
  clinic: { title: "Klinik", questionType: "translation" as const, direction: "en_tr" as const },
};

/** Abstract features only. Item sentences are not part of this catalog. */
const abstractProfiles = {
  door: {
    questionType: "restatement",
    cognitiveOperation: "hold_a_concession_against_a_false_cause",
    preservedRelations: ["concession", "agent", "temporal_condition", "capacity"],
    misreadingGrounds: ["concession_read_as_cause", "extra_exclusive_agents", "reversed_permission", "fact_read_as_a_later_check"],
    noSurfaceClue: ["key_is_not_the_only_two_sentence_option", "key_is_not_uniquely_longest"],
  },
  snow: {
    questionType: "translation",
    cognitiveOperation: "preserve_time_quantity_and_contrast_across_languages",
    preservedRelations: ["time_before_event", "universal_agents", "distributive_possession", "contrast", "restricted_theme"],
    misreadingGrounds: ["narrowed_agent_count", "shifted_time", "shared_instead_of_distributive", "theme_reassigned_to_agent"],
    noSurfaceClue: ["key_is_not_uniquely_longest", "contrast_marker_is_not_unique_to_the_key"],
  },
  clinic: {
    questionType: "translation",
    cognitiveOperation: "preserve_possibility_sequence_and_negative_purpose",
    preservedRelations: ["concession", "past_possibility", "requested_sequence", "negative_purpose"],
    misreadingGrounds: ["possibility_read_as_completed", "sequence_read_as_replacement", "avoided_purpose_read_as_goal", "sequence_read_as_exclusive"],
    noSurfaceClue: ["a_full_wrong_option_matches_key_length", "key_is_not_the_only_complete_sentence"],
  },
} as const;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Hash covers the source, the key and the five options. A wording change is a new version. */
export function goldContentIdentity(item: Pick<GoldCandidate, "candidateId" | "source" | "targetKey" | "correctOption" | "options">): { questionVersion: string; contentHash: string } {
  const contentHash = createHash("sha256")
    .update(stable({ candidateId: item.candidateId, source: item.source, targetKey: item.targetKey, correctOption: item.correctOption, options: optionLabels.map((label) => [label, item.options[label]]) }))
    .digest("hex");
  return { contentHash, questionVersion: `${goldSetVersion}/${item.candidateId}/${contentHash.slice(0, 12)}` };
}

function readCandidate(dir: string, id: string): GoldCandidate {
  return JSON.parse(readFileSync(path.join(dir, `${id}.json`), "utf8")) as GoldCandidate;
}

export function loadGoldReview(dir = goldSetDir): { pending: GoldReviewed[]; held: GoldReviewed[] } {
  const pending = (["door", "snow", "clinic"] as const).map((id) => presentCandidate(readCandidate(path.join(dir, "approval-pending"), id), queueMeta[id]));
  const held = (["ferry", "harbor"] as const).map((id) => {
    const item = readCandidate(path.join(dir, "held"), id);
    if (item.editorialReview !== "revision_required") throw new Error(`${id} is no longer revision_required`);
    return presentCandidate(item, { title: id === "ferry" ? "Feribot" : "Liman", questionType: "restatement", direction: null });
  });
  return { pending, held };
}

function presentCandidate(item: GoldCandidate, meta: { title: string; questionType: "restatement" | "translation"; direction: "tr_en" | "en_tr" | null }): GoldReviewed {
  const identity = goldContentIdentity(item);
  return {
    ...item,
    ...meta,
    ...identity,
    editorialStatus: item.editorialReview,
    humanApproval: "pending",
    publishState: "unpublished",
    observedDifficulty: null,
    approval: null,
  };
}

const modelReviewer = /sonnet|claude|haiku|judge|gpt|gemini|openrouter/i;

export function submitGoldReview(
  item: GoldReviewed,
  input: { reviewerId: string; reviewerKind: "human"; reviewedAt: string; criteria: Partial<GoldCriteria>; decision: "accept" | "withhold"; reason: string },
): GoldReviewed {
  if (item.editorialReview !== "ready_for_human_approval") throw new Error("revision_required items stay out of the approval queue");
  if (input.reviewerKind !== "human" || !input.reviewerId.trim() || modelReviewer.test(input.reviewerId)) throw new Error("a model verdict is not human approval");
  if (!input.reviewedAt.trim()) throw new Error("reviewedAt is required");
  if (!input.reason.trim()) throw new Error("a concrete reason is required");
  const missing = goldCriteria.filter((key) => typeof input.criteria[key] !== "boolean");
  if (missing.length) throw new Error(`missing criteria: ${missing.join(",")}`);
  const criteria = input.criteria as GoldCriteria;
  const identity = goldContentIdentity(item);
  if (input.decision === "accept" && goldCriteria.some((key) => criteria[key] !== true)) throw new Error("acceptance requires all six criteria");
  const accepted = input.decision === "accept";
  const approval: GoldApprovalRecord = { reviewerId: input.reviewerId.trim(), reviewedAt: input.reviewedAt, criteria, decision: input.decision, reason: input.reason.trim(), ...identity };
  return {
    ...item,
    ...identity,
    editorialStatus: accepted ? "editorially_accepted" : item.editorialReview,
    humanApproval: accepted ? "accepted" : "withheld",
    publishState: "unpublished",
    observedDifficulty: null,
    approval,
  };
}

/** An approval belongs to one hash. Changed wording does not inherit it. */
export function approvalApplies(item: Pick<GoldCandidate, "candidateId" | "source" | "targetKey" | "correctOption" | "options">, approval: GoldApprovalRecord): boolean {
  const identity = goldContentIdentity(item);
  return approval.decision === "accept" && approval.contentHash === identity.contentHash && approval.questionVersion === identity.questionVersion && goldCriteria.every((key) => approval.criteria[key] === true);
}

export type GoldReferenceRule = {
  questionType: "restatement" | "translation";
  cognitiveOperation: string;
  preservedRelations: readonly string[];
  misreadingGrounds: readonly string[];
  noSurfaceClue: readonly string[];
};

/** Rules from accepted items only. Unaccepted drafts are not quality proof. */
export function goldReferenceRules(items: readonly { candidateId: string; editorialStatus: string }[]): { qualityProof: boolean; rules: GoldReferenceRule[] } {
  const rules = items
    .filter((item) => item.editorialStatus === "editorially_accepted" && item.candidateId in abstractProfiles)
    .map((item) => abstractProfiles[item.candidateId as keyof typeof abstractProfiles]);
  return { qualityProof: rules.length > 0, rules };
}
