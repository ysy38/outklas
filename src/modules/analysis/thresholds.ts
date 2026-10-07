/**
 * Quality targets for AI analysis of ACCEPTED questions. Extraction is question-level:
 * a partial booklet is analysable; missing numbers are never invented.
 */
export const analysisScaleThresholds = {
  blindSolve: 0.93,
  schemaFail: 0.02,
  quotingNotes: 0,
  misconceptionsEvidenced: 1,
  questionTypeMatch: 1,
  connectorRelationMismatch: 0,
} as const;

export type ScaleThresholds = typeof analysisScaleThresholds;
