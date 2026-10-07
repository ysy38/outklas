/** Gate for scaling past a single booklet. Defined before measurement, not fitted after. */
export const analysisScaleThresholds = {
  blindSolve: 0.93,
  schemaFail: 0.02,
  quotingNotes: 0,
  misconceptionsEvidenced: 1,
  questionTypeMatch: 1,
  segmentation: 1,
  connectorRelationMismatch: 0,
  extractionOk: 0.85,
} as const;

export type ScaleThresholds = typeof analysisScaleThresholds;
