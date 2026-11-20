/** Contract versions for the question factory. Prompt versions live next to the prompts in pipeline/ai/prompts. */
export const factoryVersions = {
  examProfile: "yds-profile.v1",
  questionSpec: "question-spec.v2",
  distractorSpec: "distractor-spec.v6",
  pipeline: "atomic.v1",
  generation: "generation.v1",
  candidate: "candidate.v2",
  validator: "validator.v5",
  judge: "judge-contract.v3",
  distractorJudge: "distractor-judge.v3",
  /** Decision contract when any FACTORY_EXPERIMENTS are switched on. */
  distractorJudgeExperimental: "distractor-judge.v4",
  /** Decision contract when any second-round experiment (opposition, compatibility, relation, overlap) is on. */
  distractorJudgeRevision: "distractor-judge.v6",
  /** Semantic skeleton check before any distractor is written. */
  skeletonGate: "skeleton-gate.v1",
  originality: "shingle5.v1",
  review: "review.v1",
  /** Item-model factory. It does not replace question-spec.v2 or the sentence-completion pipeline. */
  itemModel: "item-model.v1",
  itemReview: "item-review.v1",
  /** Frozen call contract for the 11-question precheck. It does not open the 90-item profile. */
  itemExecution: "item-model-execution.v3.4",
  itemJudgePrompt: "item-model.judge.v3.1",
  itemSchema: "item-model-schema.v3.4",
} as const;

export const dnaVersion = "1";
