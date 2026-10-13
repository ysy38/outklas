/**
 * Every tunable cut-off of the factory in one place. The pipeline may override them from the environment
 * (see pipeline/ai/config.ts); domain code receives them as a parameter and never reads the environment.
 */
export type FactoryThresholds = {
  /** A judge that thinks a wrong option is acceptable with at least this confidence rejects it; below it, a human looks. */
  distractorAcceptability: number;
  /** Share of a wrong option's content words also in the answer body (after the connector) that counts as reuse. */
  answerReuseTokenOverlap: number;
  /** Share of a wrong option's word trigrams also in the answer body that counts as reuse. */
  answerReuseTrigramOverlap: number;
  /** Content-word overlap above which reuse is worth a warning even when it is not a copy. */
  answerReuseTokenWarn: number;
  /** Content words a wrong option may share with the answer body before matching words gives the key away. */
  answerSharedContentWords: number;
  /** Content words a wrong option may repeat from the stem before it reads as a restatement of it. */
  stemSharedContentWords: number;
};

export const defaultFactoryThresholds: FactoryThresholds = {
  distractorAcceptability: 0.5,
  answerReuseTokenOverlap: 0.8,
  answerReuseTrigramOverlap: 0.5,
  answerReuseTokenWarn: 0.6,
  answerSharedContentWords: 4,
  stemSharedContentWords: 4,
};

/** Attempt ceilings per stage: a failing stage retries only itself. */
export const attemptLimits = { skeleton: 3, distractor: 3, explanation: 2 } as const;
