import { classifyOption, type RelationVerdict } from "./whole-set";

/**
 * Semantic Preservation Contract v1.
 * Shared by restatement and translation. Language-direction details stay outside this file.
 * A writer self-assessment is stored, never treated as verification.
 */

export const semanticPreservationVersion = "semantic-preservation-contract-v1";

export const semanticRelations = [
  "actors",
  "main_actions",
  "quantity_scope",
  "time_order",
  "cause",
  "purpose",
  "condition_counterfactual",
  "negation",
  "modality_epistemic",
  "referents",
] as const;

export type SemanticRelation = (typeof semanticRelations)[number];

export type FrameSlotStatus = "present" | "absent" | "unverified";

export type SemanticFrameSlot = {
  relation: SemanticRelation;
  status: FrameSlotStatus;
  statement: string | null;
  basis: string;
};

export type SemanticFrame = {
  version: typeof semanticPreservationVersion;
  source: string;
  questionType: "restatement" | "translation";
  direction: "en_tr" | "tr_en" | null;
  slots: Record<SemanticRelation, SemanticFrameSlot>;
  writerClaimIsNotProof: true;
};

export type DistractorPlan = {
  dominantMisreading: string;
  changeRelation: SemanticRelation;
  preserveRelations: SemanticRelation[];
  forbiddenAdditions: string[];
  expectedStudentMisreading: string;
};

export type PlanContractFailure =
  | "multiple_change_relations"
  | "change_not_present_in_frame"
  | "preserve_omits_required_relation"
  | "preserve_includes_changed_relation"
  | "missing_forbidden_additions"
  | "missing_dominant_misreading"
  | "missing_expected_student_misreading";

export type TrapPlanReport = {
  status: "ok" | "source_insufficient_traps" | "plan_invalid";
  plans: DistractorPlan[];
  failures: PlanContractFailure[];
  naturalTrapCount: number;
  paddedToFour: false;
  writerSelfEvalIsNotProof: true;
};

export type SemanticStatus = "confirmed_difference" | "confirmed_equivalent" | "unverified";

const presentRelations = (frame: SemanticFrame): SemanticRelation[] =>
  semanticRelations.filter((relation) => frame.slots[relation].status === "present");

export function emptySlot(relation: SemanticRelation, status: FrameSlotStatus = "unverified"): SemanticFrameSlot {
  return { relation, status, statement: null, basis: status === "absent" ? "No wording in the source supports this relation." : "Not shown by a deterministic checker." };
}

export function buildSemanticFrame(input: {
  source: string;
  questionType: "restatement" | "translation";
  direction?: "en_tr" | "tr_en" | null;
  slots?: Partial<Record<SemanticRelation, Partial<SemanticFrameSlot>>>;
}): SemanticFrame {
  const slots = Object.fromEntries(
    semanticRelations.map((relation) => {
      const override = input.slots?.[relation];
      return [
        relation,
        {
          relation,
          status: override?.status ?? "unverified",
          statement: override?.statement ?? null,
          basis: override?.basis ?? "Not shown by a deterministic checker.",
        } satisfies SemanticFrameSlot,
      ];
    }),
  ) as Record<SemanticRelation, SemanticFrameSlot>;
  return {
    version: semanticPreservationVersion,
    source: input.source,
    questionType: input.questionType,
    direction: input.direction ?? null,
    slots,
    writerClaimIsNotProof: true,
  };
}

export function validateDistractorPlan(frame: SemanticFrame, plan: DistractorPlan): PlanContractFailure[] {
  const failures: PlanContractFailure[] = [];
  const required = presentRelations(frame);
  if (!plan.dominantMisreading.trim()) failures.push("missing_dominant_misreading");
  if (!plan.expectedStudentMisreading.trim()) failures.push("missing_expected_student_misreading");
  if (!plan.forbiddenAdditions.length) failures.push("missing_forbidden_additions");
  if (plan.preserveRelations.includes(plan.changeRelation)) failures.push("preserve_includes_changed_relation");
  if (frame.slots[plan.changeRelation]?.status === "absent") failures.push("change_not_present_in_frame");
  for (const relation of required) {
    if (relation === plan.changeRelation) continue;
    if (!plan.preserveRelations.includes(relation)) failures.push("preserve_omits_required_relation");
  }
  return [...new Set(failures)];
}

/**
 * Planner output gate. Natural traps only. Fewer than four is source_insufficient_traps.
 * This function never invents a fourth mechanism.
 */
export function reportTrapPlans(frame: SemanticFrame, plans: DistractorPlan[]): TrapPlanReport {
  const failures = plans.flatMap((plan) => validateDistractorPlan(frame, plan));
  if (failures.length) {
    return { status: "plan_invalid", plans, failures, naturalTrapCount: plans.length, paddedToFour: false, writerSelfEvalIsNotProof: true };
  }
  if (plans.length < 4) {
    return { status: "source_insufficient_traps", plans, failures: [], naturalTrapCount: plans.length, paddedToFour: false, writerSelfEvalIsNotProof: true };
  }
  return { status: "ok", plans, failures: [], naturalTrapCount: plans.length, paddedToFour: false, writerSelfEvalIsNotProof: true };
}

/** The only writer instruction that may be sent for one distractor. */
export function writerTask(plan: DistractorPlan): {
  changeRelation: SemanticRelation;
  preserveRelations: SemanticRelation[];
  forbiddenAdditions: string[];
  expectedStudentMisreading: string;
  allowOnlyTargetedRelationChange: true;
  writerSelfEvalIsNotProof: true;
} {
  return {
    changeRelation: plan.changeRelation,
    preserveRelations: plan.preserveRelations,
    forbiddenAdditions: plan.forbiddenAdditions,
    expectedStudentMisreading: plan.expectedStudentMisreading,
    allowOnlyTargetedRelationChange: true,
    writerSelfEvalIsNotProof: true,
  };
}

export function mapRelationVerdict(verdict: RelationVerdict): SemanticStatus {
  if (verdict === "confirmed_difference") return "confirmed_difference";
  if (verdict === "confirmed_equivalent") return "confirmed_equivalent";
  return "unverified";
}

/** Existing classifyOption only. No new semantic validator chain. */
export function optionSemanticStatus(source: string, key: string, option: string): { status: SemanticStatus; evidence: string | null } {
  const classified = classifyOption(source, key, option);
  return { status: mapRelationVerdict(classified.relation), evidence: classified.evidence };
}
