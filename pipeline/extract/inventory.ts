import { classifySource, type SourceClass } from "@/modules/analysis/acceptance";
import { knownBookletsFor, type KnownBooklet } from "./known-booklets";
import { leadingQuestionNumber, questionNumber } from "./segment";
import type { PageTextLayout, TextLayerExtract } from "./text-layer";
import type { StreamLine } from "./types";

export type ExamKind = "yds" | "e_yds";

export type PageInspection = {
  page: number;
  columns: 1 | 2;
  charCount: number;
  lineCount: number;
  hasText: boolean;
  quality: "empty" | "sparse" | "readable";
};

export type DetectedExam = {
  slug: string;
  kind: ExamKind;
  year: number;
  session: string;
  sessionLabel: string;
  pageStart: number;
  pageEnd: number;
  questionPages: [number, number];
  answerKeyPage: number | null;
  questionCount: number;
  questionsFound: number;
  missing: number[];
  sourceClass: SourceClass;
  hasAnswerKey: boolean;
  header: string;
  twoColumnPages: number;
  declaredComplete: boolean;
};

export type CollectionInventory = {
  parentSlug: string;
  pageCount: number;
  pagesWithText: number;
  twoColumnPages: number;
  pages: PageInspection[];
  exams: DetectedExam[];
  unscoredPages: number[];
};

const months: Record<string, string> = {
  ocak: "01",
  subat: "02",
  şubat: "02",
  mart: "03",
  nisan: "04",
  mayis: "05",
  mayıs: "05",
  haziran: "06",
  temmuz: "07",
  agustos: "08",
  ağustos: "08",
  eylul: "09",
  eylül: "09",
  ekim: "10",
  kasim: "11",
  kasım: "11",
  aralik: "12",
  aralık: "12",
  ilkbahar: "spring",
  sonbahar: "fall",
};

const fold = (text: string) => text.toLocaleLowerCase("tr").normalize("NFC");

export type ExamHeader = { kind: ExamKind; year: number; session: string; sessionLabel: string; header: string };

const topicNames = [
  "cümle tamamlama",
  "anlam bütünlüğü",
  "paragraf tamamlama",
  "dil bilgisi",
  "preposition",
  "kelime",
  "tense",
  "bağlaç",
  "çeviri",
  "diyalog",
  "okuma",
  "cloze",
] as const;

const asciiI = (value: string) => value.replaceAll("ı", "i").replaceAll("İ", "i");

/** Section titles like "e-YDS GEÇMİŞ YIL KELİME SORULARI" — never the following stem. */
export function parseTopicHeader(text: string): string | null {
  const folded = fold(text);
  const match = folded.match(/e-?yds\s+ge[cç]mi[sş]\s+y[iı]l\s+(.+)/);
  const raw = (match ? match[1] : folded).replace(/sorular[ıi]?.*$/, "").replace(/\s+\d+[.)].*$/, "").replace(/\s+/g, " ").trim();
  const body = asciiI(raw);
  const named = topicNames.find((topic) => {
    const foldedTopic = asciiI(fold(topic));
    return body === foldedTopic || body.startsWith(`${foldedTopic} `);
  });
  if (named) return named;
  if (!match) return null;
  return null;
}

export function parseExamHeader(text: string): ExamHeader | null {
  const value = text.replace(/\s+/g, " ").trim();
  if (value.length > 80) return null;
  const folded = fold(value);
  if (!/yds/.test(folded)) return null;
  const kind: ExamKind = /e-?\s*yds/.test(folded) ? "e_yds" : "yds";
  const date = value.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
  if (date) {
    const year = Number(date[3]);
    const month = date[2].padStart(2, "0");
    const day = date[1].padStart(2, "0");
    return { kind, year, session: `${year}-${month}-${day}`, sessionLabel: `${day}.${month}.${year}`, header: value };
  }
  const yearMatch = value.match(/20\d{2}/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);
  for (const [name, code] of Object.entries(months)) {
    if (!folded.includes(name)) continue;
    const session = `${year}-${code}`;
    const label = `${year} ${name[0].toLocaleUpperCase("tr")}${name.slice(1)}`;
    return { kind, year, session, sessionLabel: label, header: value };
  }
  const period = folded.match(/(\d)\.?\s*(d[oö]nem|oturum|session)/);
  if (period) return { kind, year, session: `${year}-${period[1]}`, sessionLabel: `${year} ${period[1]}. dönem`, header: value };
  return { kind, year, session: String(year), sessionLabel: String(year), header: value };
}

export function isAnswerKeyPage(lines: string[]): boolean {
  const joined = lines.join(" ");
  const pairs = joined.match(/\b\d{1,2}\s*[.)]?\s*[A-E]\b/g) ?? [];
  if (/cevap\s*anahtar|answer\s*key/i.test(joined) && pairs.length >= 8) return true;
  if (pairs.length >= 30) return true;
  const numberedLetters = lines.filter((line) => /^\d{1,2}\s*[.)]?\s*[A-E]\b/.test(line.trim())).length;
  return numberedLetters >= 20;
}

/** Running headers, band instructions and answer-key chrome — not stems. */
export function isChromeLine(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return true;
  const folded = fold(trimmed);
  if (/sorularda|aşağıdaki parç|ingilizce testi|test of english/.test(folded)) return true;
  if (/which of the following (completes|is the)/.test(folded) && trimmed.length < 120) return true;
  if (/^\d{1,2}\s*[.)]?\s*[-–—]\s*\d{1,2}\s*[.)]/.test(trimmed)) return true;
  if (parseExamHeader(trimmed)) return true;
  if (parseTopicHeader(trimmed)) return true;
  if (/^www\.|^http|yayınevi|yayınları/.test(folded)) return true;
  return false;
}

function pageNumbers(page: PageTextLayout): number[] {
  return page.lines
    .map((line) => (isChromeLine(line.text) ? null : (leadingQuestionNumber(line.text) ?? questionNumber(line.text))))
    .filter((value): value is number => value !== null && value <= 80);
}

function slugFor(header: ExamHeader, used: Set<string>): string {
  const prefix = header.kind === "e_yds" ? "e-yds" : "yds";
  let slug = `${prefix}-${header.session}`;
  if (!used.has(slug)) return slug;
  let n = 2;
  while (used.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

type OpenExam = DetectedExam & { numbers: Set<number> };

function closeExam(open: OpenExam, expected = open.questionCount): DetectedExam {
  const found = [...open.numbers].sort((a, b) => a - b);
  const missing = Array.from({ length: expected }, (_, index) => index + 1).filter((number) => !open.numbers.has(number));
  const topic = open.session.startsWith("topic-") || open.sourceClass === "topic_slice";
  const sourceClass = classifySource({
    topic,
    questionsFound: found.length,
    expected,
    trustworthy: found.length > 0 || open.hasAnswerKey,
  });
  return {
    slug: open.slug,
    kind: open.kind,
    year: open.year,
    session: open.session,
    sessionLabel: open.sessionLabel,
    pageStart: open.pageStart,
    pageEnd: open.pageEnd,
    questionPages: open.questionPages,
    answerKeyPage: open.answerKeyPage,
    questionCount: expected,
    questionsFound: found.length,
    missing,
    sourceClass: topic ? "topic_slice" : open.declaredComplete && found.length > 0 ? (found.length >= 80 ? "complete_exam" : "partial_exam") : sourceClass,
    hasAnswerKey: open.hasAnswerKey,
    header: open.header,
    twoColumnPages: open.twoColumnPages,
    declaredComplete: open.declaredComplete,
  };
}

function beginExam(page: number, header: ExamHeader, used: Set<string>, extra?: Partial<OpenExam>): OpenExam {
  const slug = extra?.slug ?? slugFor(header, used);
  used.add(slug);
  return {
    slug,
    kind: header.kind,
    year: header.year,
    session: header.session,
    sessionLabel: header.sessionLabel,
    pageStart: page,
    pageEnd: page,
    questionPages: [page, page],
    answerKeyPage: null,
    questionCount: extra?.questionCount ?? 80,
    questionsFound: 0,
    missing: [],
    sourceClass: extra?.sourceClass ?? "partial_exam",
    hasAnswerKey: false,
    header: header.header,
    twoColumnPages: 0,
    declaredComplete: extra?.declaredComplete ?? false,
    numbers: extra?.numbers ?? new Set<number>(),
  };
}

export function inspectPage(page: PageTextLayout): PageInspection {
  const quality: PageInspection["quality"] = page.charCount === 0 ? "empty" : page.charCount < 80 ? "sparse" : "readable";
  return {
    page: page.page,
    columns: page.columns,
    charCount: page.charCount,
    lineCount: page.lines.length,
    hasText: page.hasText,
    quality,
  };
}

function examFromKnown(known: KnownBooklet, extract: TextLayerExtract): DetectedExam {
  const pages = extract.pages.filter((page) => page.page >= known.pageStart && page.page <= known.pageEnd);
  const numbers = new Set<number>();
  let questionStart = known.pageStart;
  let questionEnd = known.pageStart;
  let key: number | null = null;
  let twoColumnPages = 0;
  let sawQuestion = false;
  for (const page of pages) {
    if (page.columns === 2) twoColumnPages += 1;
    const keyPage = isAnswerKeyPage(page.lines.map((line) => line.text));
    const found = pageNumbers(page);
    if (keyPage) {
      key = page.page;
      continue;
    }
    if (found.length) {
      if (!sawQuestion) questionStart = page.page;
      sawQuestion = true;
      questionEnd = page.page;
      for (const number of found) numbers.add(number);
    }
  }
  const expected = known.declared === "topic_slice" ? Math.max(numbers.size, 1) : 80;
  return closeExam(
    beginExam(known.pageStart, {
      kind: known.kind,
      year: known.year,
      session: known.session,
      sessionLabel: known.sessionLabel,
      header: known.sessionLabel,
    }, new Set(), {
      slug: known.slug,
      sourceClass: known.declared,
      declaredComplete: known.declared === "complete_exam",
      questionCount: expected,
      numbers,
    }),
    expected,
  );
}

function detectExamsHeuristic(extract: TextLayerExtract, parentSlug: string, skip: Set<number>): DetectedExam[] {
  const used = new Set<string>();
  const exams: DetectedExam[] = [];
  let open: OpenExam | null = null;
  const start = (page: number, header: ExamHeader, current: OpenExam | null): OpenExam => {
    if (current) exams.push(closeExam(current));
    return beginExam(page, header, used);
  };

  for (const page of extract.pages) {
    if (skip.has(page.page)) {
      if (open) {
        exams.push(closeExam(open));
        open = null;
      }
      continue;
    }
    const first = page.lines[0]?.text ?? "";
    if (/uyulacak kurallar/i.test(first)) continue;
    const header = [...page.headerLines, ...page.lines.slice(0, 6).map((line) => line.text)].map(parseExamHeader).find(Boolean) ?? null;
    const key = isAnswerKeyPage(page.lines.map((line) => line.text));
    const numbers = pageNumbers(page);
    if (key && open) {
      open.hasAnswerKey = true;
      open.answerKeyPage = page.page;
      open.pageEnd = page.page;
      exams.push(closeExam(open));
      open = null;
      continue;
    }

    const topic = [...page.headerLines, ...page.lines.slice(0, 3).map((line) => line.text)].map(parseTopicHeader).find(Boolean) ?? null;
    const bookletStart = /80 soru|consists of 80 questions/i.test(page.lines.slice(0, 8).map((line) => line.text).join(" "));
    const newHeader = Boolean(header && open && (header.session !== open.session || header.kind !== open.kind));
    if (topic && (!open || open.header !== topic)) {
      open = start(page.page, { kind: "e_yds", year: 0, session: `topic-${topic.slice(0, 10).replace(/\s+/g, "-")}`, sessionLabel: topic, header: topic }, open);
    } else if (newHeader && header) {
      open = start(page.page, header, open);
    } else if ((bookletStart || (numbers.includes(1) && !open)) && header) {
      open = start(page.page, header, open);
    } else if ((bookletStart || numbers.includes(1)) && !open) {
      open = start(page.page, header ?? { kind: parentSlug.startsWith("e-yds") ? "e_yds" : "yds", year: 0, session: `p${page.page}`, sessionLabel: `page ${page.page}`, header: "" }, open);
    }

    if (!open) continue;
    open.pageEnd = page.page;
    if (page.columns === 2) open.twoColumnPages += 1;
    if (key) {
      open.hasAnswerKey = true;
      open.answerKeyPage = page.page;
      exams.push(closeExam(open));
      open = null;
      continue;
    }
    if (numbers.length) {
      open.questionPages = [open.questionPages[0], page.page];
      for (const number of numbers) open.numbers.add(number);
    }
  }
  if (open) exams.push(closeExam(open));
  return exams;
}

/**
 * Prefers user-verified page ranges when the parent compilation has them.
 * Heuristic detection no longer splits a booklet because Q1 appears after Q50 (that was wrapping cover/key pages).
 */
export function detectExams(extract: TextLayerExtract, parentSlug: string): CollectionInventory {
  const known = knownBookletsFor(parentSlug);
  const skip = new Set(known.flatMap((entry) => Array.from({ length: entry.pageEnd - entry.pageStart + 1 }, (_, index) => entry.pageStart + index)));
  const fromKnown = known.map((entry) => {
    const detected = examFromKnown(entry, extract);
    return {
      ...detected,
      pageStart: entry.pageStart,
      pageEnd: entry.pageEnd,
      sourceClass: entry.declared === "topic_slice" ? "topic_slice" : detected.sourceClass,
      declaredComplete: entry.declared === "complete_exam",
      questionCount: entry.declared === "topic_slice" ? Math.max(detected.questionsFound, 1) : 80,
    };
  });
  const heuristic = detectExamsHeuristic(extract, parentSlug, skip);
  const exams = [...fromKnown, ...heuristic].sort((a, b) => a.pageStart - b.pageStart);
  const covered = new Set(exams.flatMap((exam) => Array.from({ length: exam.pageEnd - exam.pageStart + 1 }, (_, index) => exam.pageStart + index)));
  const pages = extract.pages.map(inspectPage);
  return {
    parentSlug,
    pageCount: extract.pageCount,
    pagesWithText: extract.pagesWithText,
    twoColumnPages: extract.pages.filter((page) => page.columns === 2).length,
    pages,
    exams,
    unscoredPages: extract.pages.filter((page) => !covered.has(page.page) && page.charCount > 0).map((page) => page.page),
  };
}

export const streamOnPages = (stream: StreamLine[], from: number, to: number, extra?: number | null) =>
  stream.filter((line) => (line.page >= from && line.page <= to) || (extra != null && line.page === extra));
