export const sections = [
  "vocabulary",
  "grammar",
  "cloze",
  "sentence",
  "translation",
  "reading",
  "dialogue",
  "restatement",
  "situation",
  "paragraph",
  "irrelevant",
] as const;

export const examCodes = ["yds", "ydt"] as const;
export type ExamCode = (typeof examCodes)[number];

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

/** YDT booklet order, stable since 2018: 80 questions, 120 minutes, four wrong answers cancel one net. */
export const ydtBlueprint: Blueprint = {
  code: "ydt-en",
  title: "YDT İngilizce",
  minutes: 120,
  questionCount: 80,
  choiceCount: 5,
  scoring: "net_penalty",
  bands: [
    {
      section: "vocabulary",
      from: 1,
      to: 5,
      title: "Kelime bilgisi",
      instruction: "1–5. sorularda, cümlede boş bırakılan yerlere uygun düşen sözcük veya ifadeyi bulunuz.",
      layout: "blank",
    },
    {
      section: "grammar",
      from: 6,
      to: 15,
      title: "Dil bilgisi",
      instruction: "6–15. sorularda, cümlede boş bırakılan yerlere uygun düşen sözcük veya ifadeyi bulunuz.",
      layout: "blank",
    },
    {
      section: "cloze",
      from: 16,
      to: 20,
      title: "Cloze test",
      instruction: "16–20. sorularda, parçada boş bırakılan yerlere uygun düşen sözcük veya ifadeyi bulunuz.",
      layout: "stimulus",
    },
    {
      section: "sentence",
      from: 21,
      to: 28,
      title: "Cümle tamamlama",
      instruction: "21–28. sorularda, verilen cümleyi uygun şekilde tamamlayan ifadeyi bulunuz.",
      layout: "blank",
    },
    {
      section: "reading",
      from: 29,
      to: 43,
      title: "Paragraf",
      instruction: "29–43. sorularda, verilen parçaya göre soruları cevaplayınız.",
      layout: "stimulus",
    },
    {
      section: "dialogue",
      from: 44,
      to: 48,
      title: "Diyalog tamamlama",
      instruction: "44–48. sorularda, konuşmada boş bırakılan yere uygun düşen ifadeyi bulunuz.",
      layout: "dialogue",
    },
    {
      section: "restatement",
      from: 49,
      to: 53,
      title: "Anlamca yakın cümle",
      instruction: "49–53. sorularda, verilen cümleye anlamca en yakın olan cümleyi bulunuz.",
      layout: "restatement",
    },
    {
      section: "situation",
      from: 54,
      to: 58,
      title: "Duruma uygun ifade",
      instruction: "54–58. sorularda, verilen durumda söylenebilecek ifadeyi bulunuz.",
      layout: "restatement",
    },
    {
      section: "paragraph",
      from: 59,
      to: 63,
      title: "Paragraf tamamlama",
      instruction: "59–63. sorularda, parçada boş bırakılan yere uygun düşen cümleyi bulunuz.",
      layout: "stimulus",
    },
    {
      section: "translation",
      from: 64,
      to: 75,
      title: "Çeviri",
      instruction: "64–69. sorularda İngilizce cümlenin Türkçe karşılığını, 70–75. sorularda Türkçe cümlenin İngilizce karşılığını bulunuz.",
      layout: "restatement",
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

/** Half of each YDS band, rounded so the test is 40 items: the same weights as the real booklet. */
export const diagnosticQuota: Record<SectionId, number> = {
  vocabulary: 3,
  grammar: 5,
  cloze: 5,
  sentence: 5,
  translation: 3,
  reading: 10,
  dialogue: 2,
  restatement: 2,
  situation: 0,
  paragraph: 2,
  irrelevant: 3,
};

/** Reading arrives as whole passages: two with four questions, one with two. */
export const diagnosticReadingGroups = [4, 4, 2] as const;

export function blueprintFor(exam: string | null | undefined): Blueprint {
  return exam === "ydt" ? ydtBlueprint : ydsBlueprint;
}

export function asExam(value: string | null | undefined): ExamCode {
  return value === "ydt" ? "ydt" : "yds";
}

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
