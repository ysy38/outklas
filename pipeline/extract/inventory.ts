import { leadingQuestionNumber, questionNumber } from "./segment";
import type { PageTextLayout, TextLayerExtract } from "./text-layer";
import type { StreamLine } from "./types";

export type ExamKind = "yds" | "e_yds";
export type BookletShape = "complete_80" | "incomplete" | "topic_sorted" | "key_only" | "front_matter";

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
  shape: BookletShape;
  hasAnswerKey: boolean;
  header: string;
};

export type CollectionInventory = {
  parentSlug: string;
  pageCount: number;
  pagesWithText: number;
  twoColumnPages: number;
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

/** Section titles like "e-YDS GEÇMİŞ YIL KELİME SORULARI" — never the following stem. */
export function parseTopicHeader(text: string): string | null {
  const folded = fold(text);
  const match = folded.match(/e-?yds\s+ge[cç]mi[sş]\s+y[iı]l\s+(.+)/);
  if (!match) return null;
  const rest = match[1].replace(/sorular[ıi]?.*$/, "").replace(/\s+\d+[.)].*$/, "").replace(/\s+/g, " ").trim();
  const asciiI = (value: string) => value.replaceAll("ı", "i");
  const named = topicNames.find((topic) => {
    const foldedTopic = asciiI(fold(topic));
    const body = asciiI(rest);
    return body === foldedTopic || body.startsWith(`${foldedTopic} `);
  });
  if (named) return named;
  const first = rest.split(" ")[0] ?? "";
  if (first && first.length <= 24 && !/\d/.test(first)) return first;
  return "topic";
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
  if (/cevap\s*anahtar|answer\s*key/i.test(joined) && (joined.match(/\b\d{1,2}\s*[.)]?\s*[A-E]\b/g) ?? []).length >= 10) return true;
  return (joined.match(/\b\d{1,2}\s*[.)]?\s*[A-E]\b/g) ?? []).length >= 40;
}

function pageNumbers(page: PageTextLayout): number[] {
  return page.lines
    .map((line) => leadingQuestionNumber(line.text) ?? questionNumber(line.text))
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

function closeExam(open: OpenExam): DetectedExam {
  const found = [...open.numbers].sort((a, b) => a - b);
  const expected = open.questionCount;
  const missing = Array.from({ length: expected }, (_, index) => index + 1).filter((number) => !open.numbers.has(number));
  const sequential = found.length > 0 && found[0] === 1 && found[found.length - 1] === found.length;
  let shape: BookletShape = "incomplete";
  if (open.session.startsWith("topic-") || open.shape === "topic_sorted") shape = "topic_sorted";
  else if (found.length === 0 && open.hasAnswerKey) shape = "key_only";
  else if (found.length >= 70 && sequential && missing.length <= 10) shape = "complete_80";
  else if (found.length >= 8 && found[0] === 1 && found[found.length - 1] <= 20 && open.numbers.size < 40) shape = "topic_sorted";
  else if (found.length === 0) shape = "front_matter";
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
    shape,
    hasAnswerKey: open.hasAnswerKey,
    header: open.header,
  };
}

/**
 * Walks pages in order. A new exam starts at a year/session header; an answer-key page closes the current booklet.
 * Topic-sorted compilations are those whose numbers never reach the official 80-question run.
 */
function beginExam(page: number, header: ExamHeader, used: Set<string>): OpenExam {
  const slug = slugFor(header, used);
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
    questionCount: 80,
    questionsFound: 0,
    missing: [],
    shape: "incomplete",
    hasAnswerKey: false,
    header: header.header,
    numbers: new Set<number>(),
  };
}

export function detectExams(extract: TextLayerExtract, parentSlug: string): CollectionInventory {
  const used = new Set<string>();
  const exams: DetectedExam[] = [];
  let open: OpenExam | null = null;
  const unscored: number[] = [];
  const start = (page: number, header: ExamHeader, current: OpenExam | null): OpenExam => {
    if (current) exams.push(closeExam(current));
    return beginExam(page, header, used);
  };

  for (const page of extract.pages) {
    const first = page.lines[0]?.text ?? "";
    if (/uyulacak kurallar/i.test(first)) continue;
    const header = [...page.headerLines, ...page.lines.slice(0, 6).map((line) => line.text)].map(parseExamHeader).find(Boolean) ?? null;
    const key = isAnswerKeyPage(page.lines.map((line) => line.text));
    const numbers = pageNumbers(page);
    if (key && open && !open.hasAnswerKey) {
      open.hasAnswerKey = true;
      open.answerKeyPage = page.page;
      open.pageEnd = page.page;
      continue;
    }

    const topic = [...page.headerLines, ...page.lines.slice(0, 3).map((line) => line.text)].map(parseTopicHeader).find(Boolean) ?? null;
    const bookletStart = /80 soru|consists of 80 questions/i.test(page.lines.slice(0, 8).map((line) => line.text).join(" "));
    const wrapped = Boolean(open && numbers.includes(1) && [...open.numbers].some((value) => value >= 50));
    if (topic && (!open || open.header !== topic)) {
      open = start(page.page, { kind: "e_yds", year: 0, session: `topic-${topic.slice(0, 24).replace(/\s+/g, "-")}`, sessionLabel: topic, header: topic }, open);
    } else if (header && (!open || header.session !== open.session || header.kind !== open.kind || wrapped)) {
      open = start(page.page, header, open);
    } else if (wrapped && open) {
      open = start(
        page.page,
        {
          kind: open.kind,
          year: open.year,
          session: `${open.year}-p${page.page}`,
          sessionLabel: `${open.sessionLabel} (${page.page})`,
          header: open.header,
        },
        open,
      );
    } else if ((bookletStart || numbers.includes(1)) && !open) {
      open = start(page.page, header ?? { kind: parentSlug.startsWith("e-yds") ? "e_yds" : "yds", year: 0, session: `p${page.page}`, sessionLabel: `page ${page.page}`, header: "" }, open);
    }

    if (!open) {
      if (!key && numbers.length === 0) unscored.push(page.page);
      continue;
    }
    open.pageEnd = page.page;
    if (key) {
      open.hasAnswerKey = true;
      open.answerKeyPage = page.page;
      continue;
    }
    if (numbers.length) {
      open.questionPages = [open.questionPages[0], page.page];
      for (const number of numbers) open.numbers.add(number);
    }
  }
  if (open) exams.push(closeExam(open));

  return {
    parentSlug,
    pageCount: extract.pageCount,
    pagesWithText: extract.pagesWithText,
    twoColumnPages: extract.pages.filter((page) => page.columns === 2).length,
    exams,
    unscoredPages: unscored,
  };
}

export const streamOnPages = (stream: StreamLine[], from: number, to: number, extra?: number | null) =>
  stream.filter((line) => (line.page >= from && line.page <= to) || (extra != null && line.page === extra));
