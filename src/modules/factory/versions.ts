/** Contract versions for the question factory. Prompt versions live next to the prompts in pipeline/ai/prompts. */
export const factoryVersions = {
  examProfile: "yds-profile.v1",
  questionSpec: "question-spec.v2",
  candidate: "candidate.v1",
  validator: "validator.v2",
  judge: "judge-contract.v1",
  originality: "shingle5.v1",
  review: "review.v1",
} as const;

export const dnaVersion = "1";
