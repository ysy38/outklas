import type { Count } from "./dna";
import { typeSaturationCount } from "./thresholds";

export type TypedItem = { questionType: string; extractionStatus?: string };

export type CoverageDecision = "ocr" | "archive";

export type CoverageReport = {
  decision: CoverageDecision;
  reason: string;
  candidateOk: number;
  byType: { type: string; candidate: number; corpus: number; saturated: boolean; novel: boolean }[];
  novelTypes: string[];
};

const countTypes = (items: TypedItem[]) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.questionType, (counts.get(item.questionType) ?? 0) + 1);
  return counts;
};

/** OCR a thin native extract only when ACCEPT rows include unsaturated question types. */
export function coverageDecision(input: { candidate: TypedItem[]; corpus: Count[]; saturation?: number }): CoverageReport {
  const saturation = input.saturation ?? typeSaturationCount;
  const corpus = new Map(input.corpus.map((entry) => [entry.key, entry.count]));
  const ok = input.candidate.filter((item) => !item.extractionStatus || item.extractionStatus === "ok");
  const types = [...countTypes(ok).entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const byType = types.map(([type, candidate]) => {
    const corpusCount = corpus.get(type) ?? 0;
    const saturated = corpusCount >= saturation;
    return { type, candidate, corpus: corpusCount, saturated, novel: !saturated };
  });
  const novelTypes = byType.filter((row) => row.novel).map((row) => row.type);
  if (!ok.length) {
    return { decision: "archive", reason: "No ACCEPT rows to recover.", candidateOk: 0, byType, novelTypes };
  }
  if (!novelTypes.length) {
    return {
      decision: "archive",
      reason: `Every ACCEPT type already has ≥${saturation} DNA rows. OCR would not add a new question family.`,
      candidateOk: ok.length,
      byType,
      novelTypes,
    };
  }
  return {
    decision: "ocr",
    reason: `ACCEPT rows include unsaturated types: ${novelTypes.join(", ")}.`,
    candidateOk: ok.length,
    byType,
    novelTypes,
  };
}
