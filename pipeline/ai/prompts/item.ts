import { optionLabels } from "@/modules/analysis/contract";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";

export function formatItem(question: ReconstructedQuestion): string {
  const blank = question.section === "cloze" ? `\nThis item is blank (${question.number}) in the passage.` : "";
  return [
    question.stimulus ? `PASSAGE:\n${question.stimulus}${blank}` : null,
    question.stem ? `${question.number}. ${question.stem}` : `${question.number}.`,
    optionLabels.map((label) => `${label}) ${question.options[label]}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}
