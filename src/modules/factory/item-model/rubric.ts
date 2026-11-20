/** First-benchmark acceptance bar. These are Outklas engineering criteria, not an academic standard. */
export const editorialThresholds = {
  structuralCompletion: 0.9,
  editorialAcceptance: 0.7,
  singleBestAnswer: 1,
  functionalDistractors: 0.8,
} as const;

export type RubricItem = {
  structurallyComplete: boolean;
  editorAccepted: boolean;
  singleBestAnswer: boolean;
  functionalDistractors: number;
};

export type RubricScore = {
  structuralCompletion: number;
  editorialAcceptance: number;
  singleBestAnswer: boolean;
  functionalDistractors: number;
  meets: boolean;
  standard: "outklas_engineering";
};

export function scoreRubric(items: RubricItem[]): RubricScore {
  const total = items.length;
  if (!total) {
    return { structuralCompletion: 0, editorialAcceptance: 0, singleBestAnswer: false, functionalDistractors: 0, meets: false, standard: "outklas_engineering" };
  }
  const accepted = items.filter((item) => item.editorAccepted);
  const structuralCompletion = items.filter((item) => item.structurallyComplete).length / total;
  const editorialAcceptance = accepted.length / total;
  const singleBestAnswer = accepted.length > 0 && accepted.every((item) => item.singleBestAnswer);
  const functionalDistractors = accepted.length ? accepted.filter((item) => item.functionalDistractors >= 2).length / accepted.length : 0;
  const bar = editorialThresholds;
  return {
    structuralCompletion,
    editorialAcceptance,
    singleBestAnswer,
    functionalDistractors,
    meets: structuralCompletion >= bar.structuralCompletion && editorialAcceptance >= bar.editorialAcceptance && singleBestAnswer && functionalDistractors >= bar.functionalDistractors,
    standard: "outklas_engineering",
  };
}
