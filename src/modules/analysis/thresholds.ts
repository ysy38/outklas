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

/** Last extraction benchmark (Mart 2024 OCR). Meet all three to freeze the extractor. */
export const extractionFreezeThresholds = {
  segmentation: 0.95,
  optionCompleteness: 0.95,
  reconstruction: 0.9,
} as const;

/** A question type is saturated in the DNA corpus above this many ACCEPT rows. */
export const typeSaturationCount = 8;

export type ScaleThresholds = typeof analysisScaleThresholds;
