/** Contract versions for the question factory. Prompt versions live next to the prompts in pipeline/ai/prompts. */
export const factoryVersions = {
  examProfile: "yds-profile.v1",
  questionSpec: "question-spec.v2",
  distractorSpec: "distractor-spec.v2",
  pipeline: "atomic.v1",
  generation: "generation.v1",
  candidate: "candidate.v2",
  validator: "validator.v4",
  judge: "judge-contract.v3",
  distractorJudge: "distractor-judge.v2",
  originality: "shingle5.v1",
  review: "review.v1",
} as const;

export const dnaVersion = "1";
