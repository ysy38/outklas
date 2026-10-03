export const sections = [
  "vocabulary",
  "grammar",
  "cloze",
  "sentence",
  "translation",
  "reading",
  "dialogue",
  "restatement",
  "paragraph",
  "irrelevant",
] as const;

export type SectionId = (typeof sections)[number];

export const layouts = ["blank", "stimulus", "dialogue", "restatement", "numbered"] as const;
export type Layout = (typeof layouts)[number];

export type ScoringRule = "correct_x_1_25" | "net_penalty";

export type Band = {
  section: SectionId;
  from: number;
  to: number;
  title: string;
  instruction: string;
  layout: Layout;
};

export type Blueprint = {
  code: string;
  title: string;
  minutes: number;
  questionCount: number;
  choiceCount: number;
  scoring: ScoringRule;
  bands: Band[];
};

export const ydsBlueprint: Blueprint = {
  code: "yds-en",
  title: "YDS / e-YDS İngilizce",
  minutes: 180,
  questionCount: 80,
  choiceCount: 5,
  scoring: "correct_x_1_25",
  bands: [
    {
      section: "vocabulary",
      from: 1,
      to: 6,
      title: "Kelime bilgisi",
      instruction: "1–6. sorularda, cümlede boş bırakılan yerlere uygun düşen sözcük veya ifadeyi bulunuz.",
      layout: "blank",
    },
    {
      section: "grammar",
      from: 7,
      to: 16,
      title: "Dil bilgisi ve yapı",
      instruction: "7–16. sorularda, cümlede boş bırakılan yerlere uygun düşen sözcük veya ifadeyi bulunuz.",
      layout: "blank",
    },
    {
      section: "cloze",
      from: 17,
      to: 26,
      title: "Paragrafta boşluk doldurma",
      instruction: "17–26. sorularda, parçada boş bırakılan yerlere uygun düşen sözcük veya ifadeyi bulunuz.",
      layout: "stimulus",
    },
    {
      section: "sentence",
      from: 27,
      to: 36,
      title: "Cümle tamamlama",
      instruction: "27–36. sorularda, verilen cümleyi uygun şekilde tamamlayan ifadeyi bulunuz.",
      layout: "blank",
    },
    {
      section: "translation",
      from: 37,
      to: 42,
      title: "Çeviri",
      instruction: "37–42. sorularda, verilen cümlenin anlamca en yakın karşılığını bulunuz.",
      layout: "restatement",
    },
    {
      section: "reading",
      from: 43,
      to: 62,
      title: "Okuduğunu anlama",
      instruction: "43–62. sorularda, verilen parçaya göre soruları cevaplayınız.",
      layout: "stimulus",
    },
    {
      section: "dialogue",
      from: 63,
      to: 67,
      title: "Diyalog tamamlama",
      instruction: "63–67. sorularda, konuşmada boş bırakılan yere uygun düşen ifadeyi bulunuz.",
      layout: "dialogue",
    },
    {
      section: "restatement",
      from: 68,
      to: 71,
      title: "Anlamca yakın cümle",
      instruction: "68–71. sorularda, verilen cümleye anlamca en yakın olan cümleyi bulunuz.",
      layout: "restatement",
    },
    {
      section: "paragraph",
      from: 72,
      to: 75,
      title: "Paragraf tamamlama",
      instruction: "72–75. sorularda, parçada boş bırakılan yere uygun düşen cümleyi bulunuz.",
      layout: "stimulus",
    },
    {
      section: "irrelevant",
      from: 76,
      to: 80,
      title: "Anlam bütünlüğünü bozan cümle",
      instruction: "76–80. sorularda, parçada anlam bütünlüğünü bozan cümleyi bulunuz.",
      layout: "numbered",
    },
  ],
};

/** YDT is a different exam: 120 minutes, wrong answers reduce the net. No learner surface yet. */
export const ydtBlueprint: Blueprint = {
  code: "ydt-en",
  title: "YDT İngilizce",
  minutes: 120,
  questionCount: 80,
  choiceCount: 5,
  scoring: "net_penalty",
  bands: [],
};

export const diagnosticQuota: Record<SectionId, number> = {
  vocabulary: 2,
  grammar: 3,
  cloze: 3,
  sentence: 3,
  translation: 2,
  reading: 6,
  dialogue: 1,
  restatement: 1,
  paragraph: 1,
  irrelevant: 2,
};

export function bandForSlot(slot: number, blueprint: Blueprint = ydsBlueprint): Band | undefined {
  return blueprint.bands.find((band) => slot >= band.from && slot <= band.to);
}

export function bandCoverage(blueprint: Blueprint = ydsBlueprint): { ok: boolean; gaps: number[] } {
  const seen = new Set<number>();
  const gaps: number[] = [];
  for (const band of blueprint.bands) {
    for (let slot = band.from; slot <= band.to; slot += 1) {
      if (seen.has(slot)) gaps.push(slot);
      seen.add(slot);
    }
  }
  for (let slot = 1; slot <= blueprint.questionCount; slot += 1) {
    if (!seen.has(slot)) gaps.push(slot);
  }
  return { ok: gaps.length === 0 && seen.size === blueprint.questionCount, gaps };
}
