/**
 * Restatement HARD quality contract.
 * Does not apply to translation or other types. Does not assign HARD from strong-count alone.
 * structurallyComplete is not qualityAccepted. An editorial revision is not qualityAccepted.
 */

export const restatementHardQualityVersion = "restatement-hard-quality-v1";
export const restatementHardQualityOutputDir = ".data/analysis/_factory/cognitive-trap/restatement-hard-quality-editorial-v1";
export const restatementHardMinBlindConfidence = 0.6;
export const restatementHardMinStrongDistractors = 2;
export const restatementHardDistractorCount = 4;

export const restatementHardQualityContract = {
  version: restatementHardQualityVersion,
  scope: "restatement_hard" as const,
  minStrongDistractors: restatementHardMinStrongDistractors,
  distractorCount: restatementHardDistractorCount,
  moderateAllowed: true,
  allFourMustBeValid: true,
  requireGrammaticalNaturalWrong: true,
  requireSourceHostedMisreading: true,
  rejectFiller: true,
  rejectArtificialOptions: true,
  rejectInternalInconsistency: true,
  rejectMultipleIndependentShifts: true,
  rejectSecondAnswer: true,
  rejectInventedEventsOrAssumptions: true,
  hardLabelRequiresBlindSolveAndCalibration: true,
  structurallyCompleteIsNotQualityAccepted: true,
  editorialRevisionIsNotQualityAccepted: true,
  fourStrongNotRequired: true,
} as const;

export type RestatementHardStrength = "strong" | "moderate" | "invalid";
export type RestatementHardCalibrationStatus = "not_run" | "pending" | "hard" | "medium" | "easy" | "defective" | "uncalibrated";

export type RestatementHardDistractorRating = {
  id: string;
  strength: RestatementHardStrength;
  natural: boolean;
  grammaticallyCorrect: boolean;
  semanticallyWrong: boolean;
  sourceHostedMisreading: boolean;
  filler: boolean;
  artificial: boolean;
  multipleIndependentShifts: boolean;
  secondAnswer: boolean;
  internalInconsistency: boolean;
  inventedEventOrAssumption: boolean;
};

export type RestatementHardBlindSolve = {
  ran: boolean;
  agrees?: boolean;
  confidence?: number;
};

export type RestatementHardCalibration = {
  ran: boolean;
  band?: "hard" | "medium" | "easy" | "defective" | null;
};

export function restatementHardQualityInScope(input: { questionType: string; designTarget: string }): boolean {
  return input.questionType === "restatement" && input.designTarget === "hard";
}

export function computedRestatementHardStrength(row: RestatementHardDistractorRating): RestatementHardStrength {
  const valid =
    row.natural &&
    row.grammaticallyCorrect &&
    row.semanticallyWrong &&
    row.sourceHostedMisreading &&
    !row.filler &&
    !row.artificial &&
    !row.multipleIndependentShifts &&
    !row.secondAnswer &&
    !row.internalInconsistency &&
    !row.inventedEventOrAssumption;
  if (!valid) return "invalid";
  if (row.strength === "invalid") return "invalid";
  return row.strength;
}

export function evaluateRestatementHardQuality(input: {
  questionType: string;
  designTarget: string;
  structurallyComplete: boolean;
  keyMeaningEquivalent: boolean;
  singleCorrectAnswer: boolean;
  distractors: RestatementHardDistractorRating[];
  humanEditorialApproved: boolean;
  editorialRevisionApplied: boolean;
  blindSolve?: RestatementHardBlindSolve;
  calibration?: RestatementHardCalibration;
}) {
  const inScope = restatementHardQualityInScope(input);
  const computed = input.distractors.map((row) => ({ id: row.id, claimed: row.strength, computed: computedRestatementHardStrength(row) }));
  const strongCount = computed.filter((row) => row.computed === "strong").length;
  const moderateCount = computed.filter((row) => row.computed === "moderate").length;
  const invalidCount = computed.filter((row) => row.computed === "invalid").length;
  const constructionBarMet = Boolean(
    inScope &&
      input.distractors.length === restatementHardDistractorCount &&
      invalidCount === 0 &&
      strongCount >= restatementHardMinStrongDistractors &&
      strongCount + moderateCount === restatementHardDistractorCount &&
      input.keyMeaningEquivalent &&
      input.singleCorrectAnswer,
  );
  const blind = input.blindSolve ?? { ran: false };
  const calibration = input.calibration ?? { ran: false };
  const blindOk = Boolean(blind.ran && blind.agrees === true && (blind.confidence ?? 0) >= restatementHardMinBlindConfidence);
  const calibrationHard = Boolean(calibration.ran && calibration.band === "hard");
  /** Revision completion is deliberately omitted. */
  const qualityAccepted = Boolean(
    inScope && constructionBarMet && input.humanEditorialApproved === true && blindOk && calibrationHard,
  );
  let hardCalibrationStatus: RestatementHardCalibrationStatus = "not_run";
  if (!inScope) hardCalibrationStatus = "not_run";
  else if (!blind.ran || !calibration.ran) hardCalibrationStatus = "not_run";
  else if (calibration.band === "hard" && !blindOk) hardCalibrationStatus = "uncalibrated";
  else if (calibration.band === "hard") hardCalibrationStatus = "hard";
  else if (calibration.band === "medium") hardCalibrationStatus = "medium";
  else if (calibration.band === "easy") hardCalibrationStatus = "easy";
  else if (calibration.band === "defective") hardCalibrationStatus = "defective";
  else if (calibration.band == null) hardCalibrationStatus = "uncalibrated";
  else hardCalibrationStatus = "pending";

  const reasons: string[] = [];
  if (!inScope) reasons.push("out_of_scope_not_restatement_hard");
  if (inScope && input.distractors.length !== restatementHardDistractorCount) reasons.push("distractor_count");
  if (inScope && invalidCount > 0) reasons.push("invalid_distractor");
  if (inScope && strongCount < restatementHardMinStrongDistractors) reasons.push("fewer_than_two_strong");
  if (inScope && !input.keyMeaningEquivalent) reasons.push("key_not_equivalent");
  if (inScope && !input.singleCorrectAnswer) reasons.push("second_answer_or_not_single_correct");
  if (inScope && constructionBarMet && !input.humanEditorialApproved) reasons.push("human_editorial_not_approved");
  if (inScope && constructionBarMet && !blindOk) reasons.push("blind_solve_not_run_or_not_agreed");
  if (inScope && constructionBarMet && !calibrationHard) reasons.push("hard_calibration_not_run");
  if (input.editorialRevisionApplied && !qualityAccepted) reasons.push("editorial_revision_is_not_quality_accepted");
  if (input.structurallyComplete && !qualityAccepted) reasons.push("structurally_complete_is_not_quality_accepted");
  if (strongCount >= restatementHardDistractorCount && hardCalibrationStatus !== "hard") reasons.push("four_strong_is_not_hard_label");

  return {
    version: restatementHardQualityVersion,
    inScope,
    structurallyComplete: input.structurallyComplete,
    constructionBarMet,
    qualityAccepted,
    editoriallyAccepted: false as const,
    qualityProven: false as const,
    meaningProven: false as const,
    studentBankWrites: 0 as const,
    strongDistractorCount: strongCount,
    moderateDistractorCount: moderateCount,
    invalidDistractorCount: invalidCount,
    singleCorrectAnswer: input.singleCorrectAnswer,
    keyMeaningEquivalent: input.keyMeaningEquivalent,
    hardCalibrationStatus,
    editorialRevisionApplied: input.editorialRevisionApplied,
    humanEditorialApproved: input.humanEditorialApproved,
    distractors: computed,
    reasons,
    contract: restatementHardQualityContract,
  };
}
