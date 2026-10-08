import { extractionFreezeThresholds } from "./thresholds";

export type FreezeQuestion = { status: "ok" | "needs_review" | "failed"; flags: string[] };

export type FreezeMetrics = {
  expected: number;
  found: number;
  missing: number;
  segmentation: number;
  optionCompleteness: number;
  reconstruction: number;
  acceptRate: number;
  freeze: boolean;
};

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Last extraction benchmark. Reconstruction is “the item was rebuilt” (not failed),
 * not “every structural flag is clean”. Accept rate is reported separately.
 */
export function extractionFreezeMetrics(input: { expected: number; missing: number[]; questions: FreezeQuestion[] }): FreezeMetrics {
  const found = input.questions.length;
  const missing = input.missing.length;
  const segmentation = input.expected ? (input.expected - missing) / input.expected : 0;
  const complete = input.questions.filter((question) => !question.flags.some((flag) => flag.startsWith("empty_option"))).length;
  const optionCompleteness = found ? complete / found : 0;
  const reconstructed = input.questions.filter((question) => question.status !== "failed").length;
  const reconstruction = found ? reconstructed / found : 0;
  const ok = input.questions.filter((question) => question.status === "ok").length;
  const acceptRate = input.expected ? ok / input.expected : 0;
  return {
    expected: input.expected,
    found,
    missing,
    segmentation: round3(segmentation),
    optionCompleteness: round3(optionCompleteness),
    reconstruction: round3(reconstruction),
    acceptRate: round3(acceptRate),
    freeze:
      segmentation >= extractionFreezeThresholds.segmentation &&
      optionCompleteness >= extractionFreezeThresholds.optionCompleteness &&
      reconstruction >= extractionFreezeThresholds.reconstruction,
  };
}
