import { describe, expect, it } from "vitest";
import { diagnosisConfidence, errorClassFromFactory, errorUpdates, lessonGaps, type Lesson } from "./lesson";
import { buildSentenceLesson, locateSpan, spanFits } from "./xray";

function lesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    version: 1,
    task: "closest_meaning",
    relation: "paraphrase",
    xray: null,
    moves: [{ title: "Anlam", body: "Kaynak cümle daralmadan ve neden eklenmeden kurulur." }],
    choices: [
      { letter: "A", error: null, whyWrong: "" },
      { letter: "B", error: "added_cause", whyWrong: "Metinde olmayan bir neden ekler." },
      { letter: "C", error: "scope", whyWrong: "Birçoğu ifadesini herkese çıkarır." },
      { letter: "D", error: "time_shift", whyWrong: "Olayın zamanını tersine çevirir." },
      { letter: "E", error: "negation", whyWrong: "Olumlu sonucu olumsuza çevirir." },
    ],
    ...overrides,
  };
}

describe("lesson", () => {
  it("accepts a closest-meaning item for filtering while the x-ray layer is still empty", () => {
    const gaps = lessonGaps(lesson());
    expect(gaps.filter).toEqual([]);
    expect(gaps.xray).toEqual([]);
  });

  it("asks a sentence item for the x-ray layer, and an empty layer is not enough", () => {
    expect(lessonGaps(lesson({ task: "sentence_completion", relation: "concession" })).xray).toEqual(["röntgen katmanı yok"]);
    const gaps = lessonGaps(lesson({ task: "sentence_completion", relation: "concession", xray: { raw: [], skeleton: [], syntax: [], diagnosis: { raw: "", skeleton: "", syntax: "" } } }));
    expect(gaps.xray).toContain("ham cümle yok");
    expect(gaps.xray).toContain("dolgu silme yok");
    expect(gaps.xray).toContain("sözdizimi yok");
  });

  it("maps factory codes onto the closed error list", () => {
    expect(errorClassFromFactory("distractor_type:wrong_discourse_relation")).toBe("discourse_relation");
    expect(errorClassFromFactory("quantifier")).toBe("scope");
    expect(errorClassFromFactory("faithful")).toBeNull();
  });

  it("accepts a span that is copied from the sentence and rejects one that is not", () => {
    const source = "Although the chamber that had turned anoxic stayed closed, the team kept the log.";
    const found = locateSpan(source, "that had turned anoxic");
    expect(found && spanFits(source, found)).toBe(true);
    expect(spanFits(source, { text: "that had turned anoxic", start: 0, end: 4 })).toBe(false);
  });

  it("builds a sentence lesson from located spans and keeps the diagnosis below certainty", () => {
    const built = buildSentenceLesson({
      stem: "The survey team kept a full night of spectra ----.",
      options: {
        A: "because the sky stayed clouded over",
        B: "if the guide star drifted off the slit",
        C: "whereas most surveys wait for winter",
        D: "as soon as the dome froze shut",
        E: "although the spectrograph sat in a cryostat that had lost its vacuum seal",
      },
      correct: "E",
      relation: "concession",
      explanation: "Although beklenmedik sonucu bağlar. Diğer bağlaçlar neden, koşul, zıtlık ve zaman kurar.",
      rationales: [
        { option: "A", distractorType: "distractor_type:wrong_discourse_relation", whyPlausible: "Bulut bir engel gibi durur.", whyWrong: "Because neden kurar, ama bulut spektrumu açıklamaz." },
        { option: "B", distractorType: "distractor_type:wrong_discourse_relation", whyPlausible: "Kayma bir koşul gibi durur.", whyWrong: "If koşul kurar, kayıt ise bitmiş bir iştir." },
        { option: "C", distractorType: "distractor_type:wrong_discourse_relation", whyPlausible: "Kış gerçek bir fark gibi durur.", whyWrong: "Whereas zıtlık kurar, ama burada karşıt bir olgu yok." },
        { option: "D", distractorType: "distractor_type:logical_incompatibility", whyPlausible: "Donma bir zaman gibi durur.", whyWrong: "As soon as zaman kurar, donmuş kubbe kaydı başlatamaz." },
      ],
    });
    expect(lessonGaps(built).xray).toEqual([]);
    expect(built.xray?.raw[0]?.start).toBe(0);
    expect(built.choices.find((choice) => choice.letter === "A")?.error).toBe("discourse_relation");
    expect(built.choices.find((choice) => choice.letter === "A")?.confidence).toBeLessThan(1);
    expect(diagnosisConfidence(built, "A", false)).toBeLessThan(1);
    expect(diagnosisConfidence(built, "E", true)).toBeNull();
    const broken = lessonGaps(lesson({ task: "sentence_completion", relation: "concession", xray: { raw: [{ text: "The team stayed.", role: "core", start: 0, end: 3 }], skeleton: [{ text: "team", kind: "core", start: 4, end: 8 }], syntax: [{ text: "stayed", tone: "idea", start: 0, end: 6 }], diagnosis: { raw: "although bağlacı taviz ilişkisini kurar.", skeleton: "although bağlacı taviz ilişkisini kurar.", syntax: "although bağlacı taviz ilişkisini kurar." } } }));
    expect(broken.xray).toContain("kanıt aralığı metinle uyuşmuyor");
  });

  it("moves only the chosen class on a miss, and leaves trap classes untouched on a hit", () => {
    expect(errorUpdates({ correct: false, chosen: "scope", present: ["scope", "added_cause"] })).toEqual([{ errorClass: "scope", correct: false }]);
    expect(errorUpdates({ correct: true, chosen: null, present: ["scope", "added_cause"] })).toEqual([]);
  });
});
