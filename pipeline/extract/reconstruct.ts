import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { looksTurkish, type ReconstructedQuestion } from "@/modules/analysis/surface";
import { bandForSlot, type Blueprint } from "@/modules/exam/blueprint";
import { isChromeLine } from "./inventory";
import type { Block, Segmentation } from "./segment";
import type { StreamLine } from "./types";

export type OcrStats = { words: number; confidenceSum: number; lowConfidenceWords: number };

export type Rebuilt = {
  question: ReconstructedQuestion;
  pages: number[];
  ocr: OcrStats;
  /** Lines (passage included) that came from the Tesseract fallback inside the verified reading. */
  fallbackLines: number;
  warnings: string[];
};

const labelAt = /(?:^|\s)([A-E])\)\s?/g;

/** "A) I B) II C) III D) IV E) V" printed on one line becomes five option lines. */
export function splitInlineOptions(line: StreamLine): StreamLine[] {
  const starts = [...line.text.matchAll(labelAt)].map((match) => ({ label: match[1], at: match.index + (match[0].startsWith(" ") ? 1 : 0) }));
  if (starts.length < 2 || starts[0].at !== 0) return [line];
  const sequential = starts.every((start, index) => index === 0 || start.label.charCodeAt(0) === starts[index - 1].label.charCodeAt(0) + 1);
  if (!sequential) return [line];
  return starts.map((start, index) => ({ ...line, text: line.text.slice(start.at, starts[index + 1]?.at ?? undefined).trim(), gap: index === 0 ? line.gap : false }));
}

/** Joins printed lines, keeping a hyphen that ends a line attached to the next word. */
export function joinLines(lines: StreamLine[], keepParagraphs = false): string {
  let text = "";
  for (const line of lines) {
    if (!text) text = line.text;
    else if (/\p{L}-$/u.test(text)) text += line.text;
    else text += (keepParagraphs && line.gap ? "\n" : " ") + line.text;
  }
  return text.trim();
}

const stats = (lines: StreamLine[]): OcrStats => ({
  words: lines.reduce((sum, line) => sum + (line.words ?? 0), 0),
  confidenceSum: lines.reduce((sum, line) => sum + (line.confidenceSum ?? 0), 0),
  lowConfidenceWords: lines.reduce((sum, line) => sum + (line.lowConfidenceWords ?? 0), 0),
});

type Split = { pre: StreamLine[]; options: Partial<Record<OptionLabel, StreamLine[]>>; trailing: StreamLine[]; warnings: string[] };

const numerals = ["I", "II", "III", "IV", "V"];
const numeralOption = /(?:^|\s|\))[A-E]?\)?\s?(?:I|II|III|IV|V|Il|lI|ll|lll|lV|1I|I1)\b/g;
const speakerOnly = /^[A-Za-z][A-Za-z .'-]{0,28}:\s*$/;
const dashOnly = /^[–—−-]\s*$/;
const speakerBlank = /^([A-Za-z][A-Za-z .'-]{0,28}:)\s*[–—−-]\s*$/;

/** Dialogue items print the blank as a speaker line plus a bare dash, not as ----. */
export function markDialogueBlanks(lines: StreamLine[]): StreamLine[] {
  const marked: StreamLine[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1];
    if (speakerOnly.test(line.text) && next && dashOnly.test(next.text)) {
      marked.push(line, { ...next, text: "----" });
      i += 1;
      continue;
    }
    if (speakerOnly.test(line.text) && next && speakerOnly.test(next.text)) {
      marked.push(line, { ...line, text: "----", gap: true });
      continue;
    }
    const blank = speakerBlank.exec(line.text);
    if (blank) {
      marked.push({ ...line, text: `${blank[1]} ----` });
      continue;
    }
    marked.push(line);
  }
  return marked;
}

const romanVariants: Record<string, string> = {
  I: "I",
  "1": "I",
  l: "I",
  II: "II",
  Il: "II",
  lI: "II",
  ll: "II",
  "11": "II",
  III: "III",
  lll: "III",
  IlI: "III",
  IIl: "III",
  IV: "IV",
  lV: "IV",
  IY: "IV",
  V: "V",
};

/** Recovers (I)–(V) markers that OCR or a text layer printed with look-alike glyphs. */
export function recoverNumberedSentences(text: string): string {
  return text.replace(/\(([A-Za-z0-9]{1,3})\)/g, (match, inner: string) => {
    const roman = romanVariants[inner] ?? romanVariants[inner.replace(/[l1]/g, "I")];
    return roman ? `(${roman})` : match;
  });
}

/** Irrelevant-sentence items always print "A) I B) II C) III D) IV E) V" on one line; OCR often garbles it. */
function numberedOptionLine(line: StreamLine): boolean {
  return /^(?:\(?A\)?|\\\)|\))/.test(line.text) && (line.text.match(numeralOption) ?? []).length >= 3 && line.text.length < 40;
}

function splitNumbered(block: Block): Split | null {
  const at = block.lines.findIndex(numberedOptionLine);
  if (at < 0) return null;
  const line = block.lines[at];
  return {
    pre: block.lines.slice(0, at),
    options: Object.fromEntries(optionLabels.map((label, index) => [label, [{ ...line, text: numerals[index] }]])),
    trailing: block.lines.slice(at + 1),
    warnings: [],
  };
}

function splitBlock(block: Block, section: string): Split {
  if (section === "irrelevant") {
    const numbered = splitNumbered(block);
    if (numbered) return numbered;
  }
  const lines = block.lines.flatMap(splitInlineOptions);
  const pre: StreamLine[] = [];
  const options: Partial<Record<OptionLabel, StreamLine[]>> = {};
  const trailing: StreamLine[] = [];
  const warnings: string[] = [];
  let next = 0;
  let current: OptionLabel | null = null;
  for (const line of lines) {
    const label = /^([A-E])\) ?/.exec(line.text)?.[1] as OptionLabel | undefined;
    if (label && label === optionLabels[next]) {
      current = label;
      options[label] = [{ ...line, text: line.text.replace(/^[A-E]\) ?/, "") }];
      next += 1;
      continue;
    }
    if (label) warnings.push(`option ${label} out of order`);
    if (current === null) pre.push(line);
    else if (current === "E" && (line.gap || trailing.length)) trailing.push(line);
    else options[current]!.push(line);
  }
  return { pre, options, trailing, warnings };
}

const takesSharedPassage = (section: string | undefined) => section === "cloze" || section === "reading";

const substantialPending = (lines: StreamLine[]) => {
  const body = lines.filter((line) => !isChromeLine(line.text));
  return { body, text: joinLines(body, true), chars: joinLines(body, true).replace(/\s/g, "").length };
};

/** Turns question blocks into questions; passages shared by a group are attached to every member. Never invents missing items. */
export function reconstruct(segmentation: Segmentation, blueprint: Blueprint): Rebuilt[] {
  const rebuilt: Rebuilt[] = [];
  let passage: { key: string; text: string; lines: StreamLine[] } | null = null;
  let pending: StreamLine[] = segmentation.preamble;
  for (const block of segmentation.blocks) {
    const band = bandForSlot(block.number, blueprint);
    const warnings: string[] = [];
    if (!band) {
      warnings.push("outside the blueprint");
      continue;
    }
    const leftover = substantialPending(pending);
    if (takesSharedPassage(band.section)) {
      if (leftover.chars >= 40) passage = { key: `p${block.number}`, text: leftover.text, lines: leftover.body };
      else if (!passage) warnings.push("no passage before this question");
    } else {
      passage = null;
      if (leftover.chars >= 12) warnings.push(`unattached text before question (${leftover.body.length} lines)`);
    }

    const split = splitBlock(block, band.section);
    warnings.push(...split.warnings);
    const pre = band.section === "dialogue" ? markDialogueBlanks(split.pre) : split.pre;
    const options = Object.fromEntries(optionLabels.map((label) => [label, joinLines(split.options[label] ?? [])])) as Record<OptionLabel, string>;
    for (const label of optionLabels) if (!split.options[label]) warnings.push(`option ${label} missing`);

    const ownPassage = band.section === "paragraph" || band.section === "irrelevant";
    const stemText = joinLines(pre, ownPassage || band.section === "dialogue");
    const recovered = band.section === "irrelevant" ? recoverNumberedSentences(stemText) : stemText;
    const question: ReconstructedQuestion = {
      number: block.number,
      section: band.section,
      layout: band.layout,
      stimulusKey: ownPassage ? `q${block.number}` : takesSharedPassage(band.section) ? (passage?.key ?? null) : null,
      stimulus: ownPassage ? recovered : takesSharedPassage(band.section) ? (passage?.text ?? null) : null,
      stem: ownPassage ? "" : recovered,
      options,
      translationDirection: band.section === "translation" ? (looksTurkish(recovered) ? "tr_en" : "en_tr") : null,
    };
    const counted = [...pre, ...optionLabels.flatMap((label) => split.options[label] ?? [])];
    const shared = takesSharedPassage(band.section) ? (passage?.lines ?? []) : [];
    const fallbackLines = [...shared, ...counted].filter((line) => line.source === "ocr").length;
    rebuilt.push({ question, pages: block.pages, ocr: stats(counted), fallbackLines, warnings });
    pending = split.trailing;
  }
  return rebuilt;
}
