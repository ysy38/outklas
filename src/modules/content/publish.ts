import type { Layout } from "../exam/blueprint";

export type PublishChoice = {
  body: string;
  correct: boolean;
  distractorType: string | null;
};

export type PublishDraft = {
  stem: string;
  explanation: string;
  difficulty: number;
  skillIds: string[];
  layout: Layout;
  choices: PublishChoice[];
};

export function publishBlockers(draft: PublishDraft): string[] {
  const blockers: string[] = [];
  if (draft.stem.trim().length < 8 && draft.layout !== "stimulus" && draft.layout !== "numbered") {
    blockers.push("Kök çok kısa.");
  }
  if (draft.explanation.trim().length < 12) blockers.push("Açıklama gerekli.");
  if (draft.difficulty < 1 || draft.difficulty > 5) blockers.push("Zorluk 1–5 olmalı.");
  if (draft.skillIds.length === 0) blockers.push("En az bir beceri gerekli.");
  const correct = draft.choices.filter((choice) => choice.correct);
  if (correct.length !== 1) blockers.push("Tam olarak bir doğru şık olmalı.");
  if (draft.choices.length !== 5) blockers.push("Beş şık olmalı.");
  if (draft.choices.some((choice) => choice.body.trim().length === 0)) blockers.push("Boş şık var.");
  for (const choice of draft.choices) {
    if (!choice.correct && !choice.distractorType) blockers.push("Yanlış şıkta çeldirici tipi yok.");
  }
  if (draft.layout === "blank" && !draft.stem.includes("----")) {
    blockers.push("Boşluk yerleşiminde ---- olmalı.");
  }
  if (draft.layout === "numbered") {
    const labels = draft.choices.map((choice) => choice.body.trim());
    const expected = ["I", "II", "III", "IV", "V"];
    if (expected.some((label, index) => labels[index] !== label)) blockers.push("Numaralı yerleşimde şıklar I–V olmalı.");
  }
  return [...new Set(blockers)];
}
