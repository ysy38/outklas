import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { judgeDecision, type JudgeDecision, type JudgeInput, type JudgeValidationView } from "../judge";
import { generatorJudgeIndependent } from "../provenance";
import { integrityProblems, normalized } from "../validator";
import { referenceFailures } from "./core";
import type { ItemCore, ItemSource, SemanticClaim } from "./contract";
import { screenExamSurface } from "./gold";

export type DeterministicReport = JudgeValidationView & {
  /** Shared-wording hits are a rights screen. They do not establish semantic equivalence. */
  overlapIsNotSemanticProof: true;
};

/** Form, count, source pointers and official-surface overlap. Not a semantic decision. */
export function deterministicReport(input: {
  source: ItemSource;
  core: ItemCore;
  options: Record<OptionLabel, string>;
  correctOption: OptionLabel;
  officialTexts: string[];
}): DeterministicReport {
  const issues: DeterministicReport["issues"] = [];
  const add = (code: string) => issues.push({ code, severity: "critical" });
  const texts = optionLabels.map((label) => input.options[label] ?? "");
  if (texts.length !== 5 || texts.some((text) => !text.trim())) add("option_count");
  const seen = new Set<string>();
  for (const text of texts) {
    const key = normalized(text);
    if (key && seen.has(key)) add("duplicate_option");
    seen.add(key);
    for (const problem of integrityProblems(text)) add(problem);
  }
  for (const problem of integrityProblems(input.core.stem)) add(problem);
  if (input.source.kind === "reading") for (const problem of integrityProblems(input.source.passage)) add(problem);
  if (!optionLabels.includes(input.correctOption)) add("answer_letter");
  if (normalized(input.options[input.correctOption] ?? "") !== normalized(input.core.correctAnswer)) add("answer_mismatch");
  const plannedEvidenceId = input.source.kind === "reading" && input.core.reading ? input.source.questionPlan.find((entry) => entry.propositionId === input.core.reading?.propositionId)?.evidenceSpanId : undefined;
  for (const failure of referenceFailures(input.source, input.core.sourceReferences, plannedEvidenceId ? [plannedEvidenceId] : [])) add(failure);
  const overlap = screenExamSurface(
    { instructions: input.core.stem, content: [input.core.correctAnswer, ...texts, input.source.kind === "reading" ? input.source.passage : ""].join("\n") },
    input.officialTexts,
  );
  if (overlap.status === "overlap") add("official_surface_overlap");
  return { status: issues.length ? "reject" : "pass", issues, overlapIsNotSemanticProof: true };
}

export type SemanticEvaluation = {
  judge: JudgeDecision | null;
  claims: SemanticClaim[];
  independent: boolean;
  failure: string | null;
};

/**
 * Runs the existing judge combiner on an independent packet.
 * A writer's own score is stored and is never passed in as the judge report.
 */
export function evaluateSemantics(input: {
  correctOption: OptionLabel;
  targetBand: "easy" | "medium" | "hard";
  validation: JudgeValidationView;
  generatorModel: string;
  judgeModel: string | null;
  judge: JudgeInput | null;
  selfScoreClaim: string | null;
}): SemanticEvaluation {
  const claims: SemanticClaim[] = [];
  if (input.selfScoreClaim) claims.push({ source: "model_rationale", claim: input.selfScoreClaim, treatedAsProof: false });
  if (!input.judge || !input.judgeModel) return { judge: null, claims, independent: false, failure: "judge_missing" };
  const independent = generatorJudgeIndependent({ generatorModel: input.generatorModel, judgeModel: input.judgeModel });
  if (!independent) return { judge: null, claims, independent: false, failure: "judge_not_independent" };
  const decision = judgeDecision({
    spec: { answerConstraints: { correctOption: input.correctOption }, difficulty: { band: input.targetBand } },
    validation: input.validation,
    judge: input.judge,
  });
  claims.push({ source: "judge_report", claim: input.judge.report.reasons.join(" "), treatedAsProof: false });
  return { judge: decision, claims, independent: true, failure: decision.verdict === "REJECT" ? "judge_rejected" : null };
}
