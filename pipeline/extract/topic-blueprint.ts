import type { Blueprint, Layout, SectionId } from "@/modules/exam/blueprint";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import type { SourceDocument } from "@/modules/analysis/sources";

const layoutFor = (section: SectionId): Layout => {
  if (section === "dialogue") return "dialogue";
  if (section === "translation" || section === "restatement" || section === "situation") return "restatement";
  if (section === "cloze" || section === "reading" || section === "paragraph") return "stimulus";
  if (section === "irrelevant") return "numbered";
  return "blank";
};

/** One-band blueprint so a topic slice is not scored against the 1–80 YDS map. */
export function topicBlueprint(section: SectionId, questionCount: number): Blueprint {
  const count = Math.max(1, questionCount);
  return {
    code: "yds-topic",
    title: `e-YDS ${section}`,
    minutes: 0,
    questionCount: count,
    choiceCount: 5,
    scoring: "correct_x_1_25",
    bands: [{ section, from: 1, to: count, title: section, instruction: "", layout: layoutFor(section) }],
  };
}

export function blueprintForDocument(document: SourceDocument): Blueprint {
  const exam = document.exam;
  if (exam?.sourceClass === "topic_slice" && exam.topicSection) return topicBlueprint(exam.topicSection, exam.questionCount);
  return ydsBlueprint;
}
