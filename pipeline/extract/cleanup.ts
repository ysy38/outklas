import type { ColumnId, OcrColumn, StreamLine, Transcription } from "./types";

export const lowConfidence = 60;

const romanFix: Record<string, string> = { I: "I", II: "II", III: "III", IV: "IV", V: "V" };

/** Per-line normalisation shared by both readings; it never adds or removes words. */
export function cleanText(raw: string): string {
  let text = raw.normalize("NFC").trim();
  if (/^[.·…\s]+$/.test(text)) return "";
  const turn = /^[–—-]\s+(?=\S)/.test(text) && !/^[–—-]{2,}/.test(text) ? "– " : "";
  if (turn) text = text.replace(/^[–—-]\s+/, "");
  text = text.replace(/[‘’‚‛´`]/g, "'").replace(/[“”„]/g, '"');
  text = text.replace(/(?:[-–—_]*[—–][-–—_]*|-{2,}|_{3,}|\.{4,}|…{2,})/g, (match) => (/^\d*–\d*$/.test(match) ? match : "----"));
  text = text.replace(/(\d)----(\d)/g, "$1–$2");
  text = text.replace(/\((?:[IlV1|]{1,3})\)/g, (match) => {
    const roman = match.slice(1, -1).replace(/[l1|]/g, "I");
    return romanFix[roman] ? `(${roman})` : match;
  });
  text = text.replace(/^[|\s]+|[|\s]+$/g, "");
  text = text.replace(/^\(?([A-E])\s*[)}\]]\s*/, "$1) ");
  return `${turn}${text.replace(/\s+/g, " ").trim()}`.trim();
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const columnOrder: Record<ColumnId, number> = { left: 0, right: 1, full: 0 };

export const byReadingOrder = <T extends { page: number; column: ColumnId }>(a: T, b: T) => a.page - b.page || columnOrder[a.column] - columnOrder[b.column];

/** Tesseract lines in reading order, with gaps taken from the line boxes. */
export function ocrStream(columns: OcrColumn[]): StreamLine[] {
  const stream: StreamLine[] = [];
  for (const column of [...columns].sort(byReadingOrder)) {
    const heights = column.lines.map((line) => line.bbox[3] - line.bbox[1]);
    const lineHeight = median(heights);
    let previousBottom: number | null = null;
    column.lines.forEach((line, index) => {
      const text = cleanText(line.text);
      const gap = previousBottom === null || line.bbox[1] - previousBottom > lineHeight * 0.6;
      previousBottom = line.bbox[3];
      if (!text) return;
      const words = line.words.filter((word) => word.text.trim());
      stream.push({
        page: column.page,
        column: column.column,
        index,
        text,
        gap,
        words: words.length,
        confidenceSum: words.reduce((sum, word) => sum + word.confidence, 0),
        lowConfidenceWords: words.filter((word) => word.confidence < lowConfidence).length,
      });
    });
  }
  return stream;
}

/**
 * Model lines in reading order (the transcriber marks block gaps with empty lines; it renders the dotted filler at the
 * foot of a column as a run of bare "----" lines, which is dropped). Columns without an accepted
 * transcription keep their Tesseract lines, tagged so the checks know that part has only one reading.
 */
export function verifiedStream(transcriptions: Pick<Transcription, "page" | "column" | "status" | "lines">[], columns: OcrColumn[]): StreamLine[] {
  const stream: StreamLine[] = [];
  for (const column of [...columns].sort(byReadingOrder)) {
    const transcription = transcriptions.find((entry) => entry.page === column.page && entry.column === column.column);
    if (transcription?.status !== "ok") {
      stream.push(...ocrStream([column]).map((line) => ({ ...line, source: "ocr" as const })));
      continue;
    }
    let gap = true;
    const cleaned = transcription.lines.map(cleanText);
    const bare = (index: number) => cleaned[index] === "----";
    const filler = (index: number) => bare(index) && [-2, -1, 0].some((start) => [0, 1, 2].every((step) => bare(index + start + step)));
    cleaned.forEach((text, index) => {
      if (!text || filler(index)) {
        gap = true;
        return;
      }
      stream.push({ page: column.page, column: column.column, index, text, gap, source: "verified" });
      gap = false;
    });
  }
  return stream;
}
