import { describe, expect, it } from "vitest";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { charErrorRate, checkQuestion, structuralFlags, wordErrorRate } from "./checks";
import { cleanText, ocrStream, verifiedStream } from "./cleanup";
import { findGutter, splitColumns, type Gray } from "./image";
import { parseAnswerKey } from "./key";
import { markDialogueBlanks, reconstruct, recoverNumberedSentences, splitInlineOptions } from "./reconstruct";
import { detectColumns, joinGlyphs, layoutPage, type TextGlyph } from "./text-layer";
import { detectExams, parseExamHeader, parseTopicHeader } from "./inventory";
import { knownYds2013_2021Booklets } from "./known-booklets";
import { leadingQuestionNumber, questionNumber, segment } from "./segment";
import type { PageTextLayout, TextLayerExtract } from "./text-layer";
import type { OcrColumn, StreamLine } from "./types";

const line = (text: string, extra: Partial<StreamLine> = {}): StreamLine => ({ page: 2, column: "left", index: 0, text, gap: false, ...extra });

function page(width: number, height: number, draw: (x: number, y: number) => number): Gray {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) data[y * width + x] = draw(x, y);
  return { width, height, data };
}

describe("image", () => {
  it("finds a light grey column rule even when text crowds it", () => {
    const image = page(200, 100, (x, y) => (x === 104 ? 170 : x >= 60 && x <= 100 && y % 3 === 0 ? 0 : 255));
    expect(findGutter(image)).toMatchObject({ method: "rule", x: 104 });
    const { left, right } = splitColumns(image);
    expect(left.width).toBe(98);
    expect(right.width).toBe(200 - 110);
  });

  it("falls back to the emptiest band without a rule", () => {
    const image = page(200, 50, (x, y) => (x < 95 || x > 115 ? ((x + y) % 2 ? 0 : 255) : 255));
    const gutter = findGutter(image);
    expect(gutter.method).toBe("valley");
    expect(gutter.x).toBeGreaterThanOrEqual(95);
    expect(gutter.x).toBeLessThanOrEqual(115);
  });
});

describe("cleanup", () => {
  it("normalises dashes, quotes, numerals and option labels without dropping words", () => {
    expect(cleanText("The cat —— sat")).toBe("The cat ---- sat");
    expect(cleanText("pages 10-21 and 10–21")).toBe("pages 10-21 and 10–21");
    expect(cleanText("“quoted” ‘word’")).toBe("\"quoted\" 'word'");
    expect(cleanText("(Il) Second sentence")).toBe("(II) Second sentence");
    expect(cleanText("B} option")).toBe("B) option");
    expect(cleanText("– Speaker turn")).toBe("– Speaker turn");
    expect(cleanText("---- starts with a blank")).toBe("---- starts with a blank");
    expect(cleanText(" . . . ")).toBe("");
    expect(cleanText("……")).toBe("");
  });

  it("marks gaps from line boxes and falls back to Tesseract for columns the model did not transcribe", () => {
    const column = (page: number, side: "left" | "right", tops: number[]): OcrColumn => ({
      page,
      column: side,
      width: 100,
      height: 1000,
      offsetX: 0,
      engine: "t",
      psm: "4",
      confidence: 90,
      text: tops.map((top) => `line ${top}`).join("\n"),
      lines: tops.map((top) => ({ text: `line ${top}`, confidence: 90, bbox: [0, top, 50, top + 20], words: [{ text: "line", confidence: 90, bbox: [0, top, 20, top + 20] }] })),
    });
    const columns = [column(2, "right", [0, 22]), column(2, "left", [0, 22, 80])];
    const stream = ocrStream(columns);
    expect(stream.map((entry) => `${entry.column}:${entry.gap}`)).toEqual(["left:true", "left:false", "left:true", "right:true", "right:false"]);
    const merged = verifiedStream(
      [
        { page: 2, column: "left", status: "ok", lines: ["first", "", "second", "----", "----", "----"] },
        { page: 2, column: "right", status: "declined", lines: [] },
      ],
      columns,
    );
    expect(merged.map((entry) => [entry.text, entry.gap, entry.source])).toEqual([
      ["first", true, "verified"],
      ["second", true, "verified"],
      ["line 0", true, "ocr"],
      ["line 22", false, "ocr"],
    ]);
  });
});

describe("segment", () => {
  it("reads question numbers with common digit confusions", () => {
    expect(questionNumber("17")).toBe(17);
    expect(questionNumber("l7.")).toBe(17);
    expect(questionNumber("2O")).toBe(20);
    expect(questionNumber("Ill")).toBeNull();
    expect(questionNumber("A) 12")).toBeNull();
  });

  it("splits at in-order numbers, repairs a doubled digit read once and reports gaps", () => {
    const numbers = [...Array.from({ length: 10 }, (_, index) => String(index + 1)), "1", "13"];
    const stream = numbers.flatMap((number) => [line(number), line(`body ${number}`)]);
    const result = segment([line("instructions"), ...stream], 14);
    expect(result.preamble.map((entry) => entry.text)).toEqual(["instructions"]);
    expect(result.blocks.map((block) => block.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
    expect(result.missing).toEqual([12, 14]);
    expect(result.warnings[0]).toMatch(/question 11 printed as 1/);
  });

  it("splits a typeset stem that starts with the question number", () => {
    expect(leadingQuestionNumber("1. UNICEF is committed.")).toBe(1);
    expect(leadingQuestionNumber("B) although")).toBeNull();
    expect(leadingQuestionNumber("1. - 6. sorularda, cümlede")).toBeNull();
    expect(leadingQuestionNumber("1. A 21. D")).toBeNull();
    const result = segment([line("1. The cat ---- sat."), line("A) sat"), line("B) sits"), line("C) sitting"), line("D) sit"), line("E) sat down"), line("2. Dogs ----.")], 2);
    expect(result.blocks.map((block) => block.number)).toEqual([1, 2]);
    expect(result.blocks[0].lines[0].text).toBe("The cat ---- sat.");
  });

  it("does not treat an out-of-range number as a question", () => {
    const result = segment([line("1"), line("body"), line("40"), line("2"), line("more")], 2);
    expect(result.blocks[0].lines.map((entry) => entry.text)).toEqual(["body", "40"]);
  });

  it("never invents skipped numbers", () => {
    const result = segment([line("1. One."), line("A) a"), line("3. Three.")], 3);
    expect(result.blocks.map((block) => block.number)).toEqual([1, 3]);
    expect(result.missing).toEqual([2]);
  });

  it("keeps out-of-order unused numbers from two-column pages and ignores already-used false positives", () => {
    const early = Array.from({ length: 17 }, (_, index) => line(`${index + 1}. Stem ${index + 1}.`));
    const result = segment([...early, line("21. Cloze."), line("18. Second."), line("1. roman false positive"), line("19. Third.")], 21);
    expect(result.blocks.map((block) => block.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 18, 19]);
    expect(result.missing).toEqual([20]);
    expect(result.blocks.find((block) => block.number === 21)?.lines[0]?.text).toBe("Cloze.");
  });
});

describe("answer key", () => {
  it("places letters by position so a misread number cannot move them", () => {
    const rows = Array.from({ length: 20 }, (_, row) => [0, 1, 2, 3].map((column) => `${row + 1 + column * 20 === 11 ? 1 : row + 1 + column * 20} ${"ABCDE"[(row + column) % 5]}`).join("   "));
    const key = parseAnswerKey(["ANSWER KEY", ...rows], 80);
    expect(Object.keys(key.answers)).toHaveLength(80);
    expect(key.answers[11]).toBe("A");
    expect(key.answers[12]).toBe("B");
    expect(key.answers[80]).toBe("C");
    expect(key.warnings).toEqual(["key position 11 printed as 1"]);
  });

  it("reads a vertical one-pair-per-line key", () => {
    const lines = Array.from({ length: 80 }, (_, index) => `${index + 1}. ${"ABCDE"[index % 5]}`);
    const key = parseAnswerKey(["KEY:", ...lines], 80);
    expect(Object.keys(key.answers)).toHaveLength(80);
    expect(key.answers[1]).toBe("A");
    expect(key.answers[80]).toBe("E");
  });
});

describe("reconstruct", () => {
  it("splits options printed on one line", () => {
    expect(splitInlineOptions(line("A) I B) II C) III D) IV E) V")).map((entry) => entry.text)).toEqual(["A) I", "B) II", "C) III", "D) IV", "E) V"]);
    expect(splitInlineOptions(line("A) apples and B) pears"))).toHaveLength(2);
    expect(splitInlineOptions(line("The A) label later"))).toHaveLength(1);
  });

  const options = (prefix: string) => ["A", "B", "C", "D", "E"].map((label) => line(`${label}) ${prefix} ${label.toLowerCase()}`));

  it("attaches a cloze passage to every question in its group and keeps text after option E for the next passage", () => {
    const blocks = [
      { number: 16, lines: [line("The cat ---- on the mat."), ...options("word")], pages: [3] },
      { number: 17, lines: options("first"), pages: [3] },
      { number: 18, lines: [...options("second"), line("Next passage continues with enough invented words to count as a new cloze text.", { gap: true })], pages: [3] },
      { number: 19, lines: options("third"), pages: [3] },
    ];
    const passage = [line("A made-up passage (17)---- with"), line("blanks (18)---- in it.")];
    blocks[0].lines.push(...passage.map((entry, index) => ({ ...entry, gap: index === 0 })));
    const rebuilt = reconstruct({ preamble: [], blocks, missing: [], warnings: [] }, ydsBlueprint);
    expect(rebuilt[0].question.section).toBe("grammar");
    expect(rebuilt[0].question.options.E).toBe("word e");
    expect(rebuilt[1].question).toMatchObject({ section: "cloze", stimulusKey: "p17", stimulus: "A made-up passage (17)---- with blanks (18)---- in it." });
    expect(rebuilt[2].question.stimulusKey).toBe("p17");
    expect(rebuilt[3].question).toMatchObject({ stimulusKey: "p19", stimulus: "Next passage continues with enough invented words to count as a new cloze text." });
    expect(rebuilt[1].fallbackLines).toBe(0);
  });

  it("reads irrelevant-sentence options canonically and counts fallback lines", () => {
    const rebuilt = reconstruct(
      {
        preamble: [],
        blocks: [{ number: 76, lines: [line("(I) One. (II) Two. (III) Three. (IV) Four. (V) Five.", { source: "ocr" }), line("A) I B) Il C) lll D) IV E) V")], pages: [17] }],
        missing: [],
        warnings: [],
      },
      ydsBlueprint,
    );
    expect(rebuilt[0].question.options).toEqual({ A: "I", B: "II", C: "III", D: "IV", E: "V" });
    expect(rebuilt[0].question.stimulusKey).toBe("q76");
    expect(rebuilt[0].warnings).toEqual([]);
    expect(rebuilt[0].fallbackLines).toBe(1);
  });

  it("detects the translation direction", () => {
    const rebuilt = reconstruct({ preamble: [], blocks: [{ number: 37, lines: [line("Bu cümle çok güzel ve anlaşılır bir örnektir."), ...options("an English option")], pages: [6] }], missing: [], warnings: [] }, ydsBlueprint);
    expect(rebuilt[0].question.translationDirection).toBe("tr_en");
  });
});

describe("dialogue and numbered-sentence recovery", () => {
  it("turns a speaker line plus a bare dash into a blank", () => {
    const marked = markDialogueBlanks([line("Lee:"), line("–"), line("Christine:"), line("– That is interesting.")]);
    expect(marked.map((entry) => entry.text)).toEqual(["Lee:", "----", "Christine:", "– That is interesting."]);
    expect(markDialogueBlanks([line("Lee:"), line("Christine:"), line("– Later.")]).map((entry) => entry.text)).toEqual(["Lee:", "----", "Christine:", "– Later."]);
    const optionLines = ["A", "B", "C", "D", "E"].map((label) => line(`${label}) reply ${label.toLowerCase()}`));
    const rebuilt = reconstruct(
      { preamble: [], blocks: [{ number: 63, lines: [...marked, ...optionLines], pages: [13] }], missing: [], warnings: [] },
      ydsBlueprint,
    );
    expect(rebuilt[0].question.stem).toContain("----");
    expect(structuralFlags(rebuilt[0].question)).not.toContain("blank_count_0");
  });

  it("normalises look-alike roman numerals in irrelevant items", () => {
    expect(recoverNumberedSentences("(I) One. (Il) Two. (lll) Three. (lV) Four. (V) Five.")).toBe("(I) One. (II) Two. (III) Three. (IV) Four. (V) Five.");
  });
});

describe("text layer", () => {
  it("clusters glyphs into two columns left-then-right", () => {
    const glyph = (str: string, x: number, y: number): TextGlyph => ({ str, x, y, w: 40, h: 10 });
    const page = layoutPage(1, 400, 600, [
      glyph("left-a", 20, 40),
      glyph("right-a", 240, 40),
      glyph("left-b", 20, 60),
      glyph("right-b", 240, 60),
      glyph("left-c", 20, 80),
      glyph("right-c", 240, 80),
      glyph("left-d", 20, 100),
      glyph("right-d", 240, 100),
    ]);
    expect(page.columns).toBe(2);
    expect(page.lines.map((entry) => entry.text)).toEqual(["left-a", "left-b", "left-c", "left-d", "right-a", "right-b", "right-c", "right-d"]);
    expect(joinGlyphs([glyph("hel", 10, 10), glyph("lo", 28, 10)])).toBe("hello");
    expect(detectColumns([], 400)).toEqual({ columns: 1, gutterX: null });
  });

  it("reads exam titles without treating them as item text", () => {
    expect(parseExamHeader("2013 İLKBAHAR YDS")).toMatchObject({ kind: "yds", year: 2013, session: "2013-spring" });
    expect(parseExamHeader("e-YDS 12.05.2018")).toMatchObject({ kind: "e_yds", year: 2018, session: "2018-05-12" });
    expect(parseTopicHeader("e-YDS GEÇMİŞ YIL KELİME SORULARI")).toBe("kelime");
    expect(parseTopicHeader("e-YDS GEÇMİŞ YIL PREPOSITION 4. Lorem ipsum dolor sit amet")).toBe("preposition");
    expect(parseTopicHeader("e-YDS GEÇMİŞ YIL CÜMLE TAMAMLAMA SORULARI")).toBe("cümle tamamlama");
    expect(parseExamHeader("This is a long sentence that is clearly not a booklet title because it keeps going")).toBeNull();
  });

  it("finds the seven user-confirmed 2013–2016 page ranges without wrapping on Q1", () => {
    const page = (n: number, header = "", numbers: number[] = [], key = false): PageTextLayout => ({
      page: n,
      width: 595,
      height: 842,
      charCount: header || numbers.length || key ? 200 : 0,
      hasText: true,
      columns: numbers.length ? 2 : 1,
      gutterX: numbers.length ? 300 : null,
      headerLines: header ? [header] : [],
      footerLines: [],
      lines: [
        ...(header ? [{ page: n, column: "full" as const, index: 0, text: header, gap: true }] : []),
        ...numbers.map((number, index) => ({ page: n, column: "left" as const, index: index + 1, text: `${number}. The made-up stem ---- here.`, gap: true })),
        ...(key ? [{ page: n, column: "full" as const, index: 99, text: Array.from({ length: 40 }, (_, i) => `${i + 1}. A`).join(" "), gap: true }] : []),
      ],
    });
    const pages = Array.from({ length: 311 }, (_, index) => page(index + 1));
    const mark = (start: number, header: string, keyPage: number) => {
      pages[start - 1] = page(start, header, [1, 2, 3]);
      pages[start] = page(start + 1, header, [4, 5, 50, 80]);
      pages[keyPage - 1] = page(keyPage, header, [], true);
    };
    mark(2, "2013 İLKBAHAR YDS", 27);
    mark(28, "2013 SONBAHAR YDS", 50);
    mark(51, "2014 İLKBAHAR YDS", 74);
    mark(75, "2014 SONBAHAR YDS", 98);
    mark(99, "2015 İLKBAHAR YDS", 122);
    mark(123, "2015 SONBAHAR YDS", 147);
    mark(148, "2016 İLKBAHAR YDS", 171);
    mark(259, "2018-YDS Spring/English", 283);
    mark(287, "2018-YDS Fall/English", 311);
    const extract: TextLayerExtract = { pageCount: 311, pagesWithText: 311, pages, stream: pages.flatMap((entry) => entry.lines) };
    const inventory = detectExams(extract, "yds-2013-2021");
    const seven = knownYds2013_2021Booklets.slice(0, 7);
    for (const known of seven) {
      const exam = inventory.exams.find((entry) => entry.slug === known.slug);
      expect(exam, known.slug).toMatchObject({ pageStart: known.pageStart, pageEnd: known.pageEnd, declaredComplete: true });
      expect(exam?.sourceClass === "complete_exam" || exam?.sourceClass === "partial_exam").toBe(true);
    }
    expect(inventory.exams.filter((exam) => exam.slug.endsWith("-p29") || exam.slug.includes("-p52"))).toEqual([]);
  });
});

describe("checks", () => {
  const question = (patch: object) => ({ number: 2, section: "vocabulary" as const, layout: "blank" as const, stimulusKey: null, stimulus: null, stem: "The ---- was late.", options: { A: "bus", B: "train", C: "car", D: "ship", E: "plane" }, translationDirection: null, ...patch });

  it("flags structural problems without trusting the OCR", () => {
    expect(structuralFlags(question({}))).toEqual([]);
    expect(structuralFlags(question({ stem: "No blank (here." }))).toEqual(["blank_missing", "unbalanced_parentheses"]);
    expect(structuralFlags(question({ options: { A: "", B: "b", C: "c", D: "d", E: "e" } }))).toContain("empty_option_A");
    expect(structuralFlags(question({ stem: "The ---- was şimdi late." }))).toContain("unexpected_turkish_letter");
    expect(structuralFlags(question({ section: "cloze", stimulus: "Text without the marker.", number: 20 }))).toContain("cloze_blank_missing");
  });

  it("measures disagreement between readings and flags single-reading questions", () => {
    expect(charErrorRate("abcd", "abed")).toBe(0.25);
    expect(wordErrorRate("one two three", "one too three")).toBeCloseTo(1 / 3);
    const ok = { question: question({}), pages: [2], ocr: { words: 10, confidenceSum: 950, lowConfidenceWords: 0 }, fallbackLines: 0, warnings: [] };
    expect(checkQuestion(ok, ok, false).status).toBe("ok");
    expect(checkQuestion({ ...ok, warnings: ["unattached text before question (2 lines)"] }, ok, false).status).toBe("ok");
    expect(structuralFlags(question({ stem: "Lee: ----" }))).not.toContain("junk_token");
    const verified = { ...ok, question: question({ stem: "The ---- was very late indeed." }), fallbackLines: 1 };
    const check = checkQuestion(verified, ok, false);
    expect(check.flags).toEqual(expect.arrayContaining(["ocr_disagreement", "single_reading"]));
    expect(check.status).toBe("needs_review");
    const single = checkQuestion({ ...ok, question: { ...ok.question }, fallbackLines: 3 }, ok, false);
    expect(single).toMatchObject({ status: "ok", flags: ["single_reading"] });
    const shaky = { ...ok, ocr: { words: 10, confidenceSum: 700, lowConfidenceWords: 2 } };
    expect(checkQuestion({ ...ok, question: { ...ok.question } }, shaky, false).status).toBe("ok");
    expect(checkQuestion({ ...shaky, question: { ...ok.question }, fallbackLines: 1 }, shaky, false).flags).toEqual(["single_reading", "low_ocr_confidence", "many_low_confidence_words"]);
    expect(checkQuestion({ ...ok, question: question({ stem: "", options: { A: "", B: "", C: "", D: "", E: "" } }) }, ok, false).status).toBe("failed");
  });
});
