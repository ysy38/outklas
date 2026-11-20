import type { OptionLabel } from "@/modules/analysis/contract";
import { optionLabels } from "@/modules/analysis/contract";
import type { ObservedDifficulty, StudentResponse, TargetDifficulty } from "./contract";

export const unobservedDifficulty = (): ObservedDifficulty => ({
  correctRate: null,
  optionShares: null,
  discrimination: null,
  errorPatternByLevel: null,
  basis: "unobserved",
});

/**
 * Fills count fields from responses. Discrimination needs two ability bands.
 * The result is never a verified difficulty and never promotes the target band.
 */
export function observeResponses(correct: OptionLabel, responses: StudentResponse[] | null): ObservedDifficulty {
  if (!responses?.length) return unobservedDifficulty();
  const shares = Object.fromEntries(optionLabels.map((label) => [label, 0])) as Record<OptionLabel, number>;
  for (const response of responses) shares[response.option] += 1;
  const total = responses.length;
  const optionShares = Object.fromEntries(optionLabels.map((label) => [label, Math.round((shares[label] / total) * 1000) / 1000])) as Record<OptionLabel, number>;
  const bands = new Map<string, { correct: number; total: number }>();
  for (const response of responses) {
    if (!response.abilityBand) continue;
    const band = bands.get(response.abilityBand) ?? { correct: 0, total: 0 };
    band.total += 1;
    if (response.option === correct) band.correct += 1;
    bands.set(response.abilityBand, band);
  }
  const errorPatternByLevel = bands.size
    ? Object.fromEntries([...bands].map(([band, count]) => [band, Math.round((1 - count.correct / count.total) * 1000) / 1000]))
    : null;
  const rates = [...bands.values()].map((count) => count.correct / count.total);
  const discrimination = rates.length >= 2 ? Math.round((Math.max(...rates) - Math.min(...rates)) * 1000) / 1000 : null;
  return {
    correctRate: Math.round((shares[correct] / total) * 1000) / 1000,
    optionShares,
    discrimination,
    errorPatternByLevel,
    basis: "observed_counts",
  };
}

/** Target band and observed counts stay apart. There is no verified-difficulty state. */
export function verifiedDifficulty(_target: TargetDifficulty, observed: ObservedDifficulty): null {
  void _target;
  void observed;
  return null;
}
