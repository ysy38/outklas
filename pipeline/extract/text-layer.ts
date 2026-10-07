import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { cleanText } from "./cleanup";
import type { ColumnId, StreamLine } from "./types";

export type TextGlyph = { str: string; x: number; y: number; w: number; h: number };

export type PageTextLayout = {
  page: number;
  width: number;
  height: number;
  charCount: number;
  hasText: boolean;
  columns: 1 | 2;
  gutterX: number | null;
  headerLines: string[];
  footerLines: string[];
  lines: StreamLine[];
};

export type TextLayerExtract = {
  pageCount: number;
  pagesWithText: number;
  pages: PageTextLayout[];
  stream: StreamLine[];
};

const headerZone = 0.08;
const footerZone = 0.92;

export function joinGlyphs(items: TextGlyph[]): string {
  if (!items.length) return "";
  let text = items[0].str;
  for (let i = 1; i < items.length; i += 1) {
    const previous = items[i - 1];
    const gap = items[i].x - (previous.x + previous.w);
    const space = gap > Math.max(1.2, previous.h * 0.25);
    if (space && !text.endsWith(" ") && !items[i].str.startsWith(" ")) text += " ";
    text += items[i].str;
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Groups glyphs into visual lines by vertical overlap; origin is top-left. */
export function clusterLines(glyphs: TextGlyph[]): { y: number; items: TextGlyph[] }[] {
  const usable = glyphs.filter((glyph) => glyph.str.trim());
  const sorted = [...usable].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: { y: number; items: TextGlyph[] }[] = [];
  for (const glyph of sorted) {
    const current = lines[lines.length - 1];
    const tolerance = Math.max(glyph.h, current?.items[0]?.h ?? glyph.h, 6) * 0.55;
    if (current && Math.abs(glyph.y - current.y) <= tolerance) {
      current.items.push(glyph);
      current.y = (current.y * (current.items.length - 1) + glyph.y) / current.items.length;
    } else lines.push({ y: glyph.y, items: [glyph] });
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines;
}

export function detectColumns(lines: { y: number; items: TextGlyph[] }[], width: number): { columns: 1 | 2; gutterX: number | null } {
  const items = lines.flatMap((line) => line.items);
  if (items.length < 8) return { columns: 1, gutterX: null };
  const left = items.filter((item) => item.x + item.w / 2 < width * 0.42);
  const right = items.filter((item) => item.x > width * 0.58);
  if (left.length < 3 || right.length < 3) return { columns: 1, gutterX: null };
  const gutter = (Math.max(...left.map((item) => item.x + item.w)) + Math.min(...right.map((item) => item.x))) / 2;
  return { columns: 2, gutterX: gutter };
}

function splitByColumn(line: { y: number; items: TextGlyph[] }, columns: 1 | 2, gutterX: number | null): { column: ColumnId; items: TextGlyph[] }[] {
  if (columns === 1 || gutterX == null) return [{ column: "full", items: line.items }];
  const left = line.items.filter((item) => item.x + item.w / 2 < gutterX);
  const right = line.items.filter((item) => item.x + item.w / 2 >= gutterX);
  return [
    ...(left.length ? [{ column: "left" as const, items: left }] : []),
    ...(right.length ? [{ column: "right" as const, items: right }] : []),
  ];
}

const repeatingNoise = /^(www\.|http|©|copyright|yayınevi|yayınları|all rights reserved)/i;
const pageNumberLine = /^(?:sayfa\s*)?\d{1,3}(?:\s*\/\s*\d{1,3})?$/i;

export function isNoiseLine(text: string, y: number, height: number): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (repeatingNoise.test(trimmed)) return true;
  if (y < height * headerZone && (pageNumberLine.test(trimmed) || trimmed.length <= 3)) return true;
  if (y > height * footerZone && (pageNumberLine.test(trimmed) || trimmed.length <= 4)) return true;
  return false;
}

export function layoutPage(page: number, width: number, height: number, glyphs: TextGlyph[]): PageTextLayout {
  const clustered = clusterLines(glyphs);
  const { columns, gutterX } = detectColumns(clustered, width);
  const headerLines: string[] = [];
  const footerLines: string[] = [];
  const kept: { column: ColumnId; y: number; text: string; gap: boolean }[] = [];
  let previousY: Record<ColumnId, number | null> = { left: null, right: null, full: null };
  const lineHeight = clustered.length ? clustered.reduce((sum, line) => sum + (line.items[0]?.h ?? 10), 0) / clustered.length : 12;

  for (const line of clustered) {
    for (const part of splitByColumn(line, columns, gutterX)) {
      const text = cleanText(joinGlyphs(part.items));
      if (!text) continue;
      const y = line.y;
      if (y < height * headerZone) headerLines.push(text);
      if (y > height * footerZone) footerLines.push(text);
      if (isNoiseLine(text, y, height)) continue;
      const previous = previousY[part.column];
      const gap = previous === null || y - previous > lineHeight * 1.35;
      kept.push({ column: part.column, y, text, gap });
      previousY[part.column] = y;
    }
  }

  const order: ColumnId[] = columns === 2 ? ["left", "right"] : ["full"];
  const lines: StreamLine[] = [];
  let index = 0;
  for (const column of order) {
    for (const line of kept.filter((entry) => entry.column === column)) {
      lines.push({ page, column, index, text: line.text, gap: line.gap || index === 0 });
      index += 1;
    }
  }
  const charCount = glyphs.reduce((sum, glyph) => sum + glyph.str.length, 0);
  return { page, width, height, charCount, hasText: charCount >= 80, columns, gutterX, headerLines, footerLines, lines };
}

export async function extractPdfText(pdf: PDFDocumentProxy): Promise<TextLayerExtract> {
  const pages: PageTextLayout[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ includeMarkedContent: false });
    const glyphs: TextGlyph[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      glyphs.push({ str: item.str, x, y: y - item.height, w: item.width, h: item.height || 10 });
    }
    pages.push(layoutPage(pageNumber, viewport.width, viewport.height, glyphs));
    page.cleanup();
  }
  const repeats = new Map<string, number>();
  for (const page of pages) for (const text of [...page.headerLines, ...page.footerLines]) {
    const key = text.toLocaleLowerCase("tr");
    repeats.set(key, (repeats.get(key) ?? 0) + 1);
  }
  const drop = new Set([...repeats].filter(([, count]) => count >= Math.max(3, Math.floor(pages.length * 0.15))).map(([text]) => text));
  for (const page of pages) {
    page.lines = page.lines.filter((line) => !drop.has(line.text.toLocaleLowerCase("tr")));
    page.headerLines = page.headerLines.filter((text) => !drop.has(text.toLocaleLowerCase("tr")) || /20\d{2}|YDS|e-?YDS/i.test(text));
  }
  return {
    pageCount: pages.length,
    pagesWithText: pages.filter((page) => page.hasText).length,
    pages,
    stream: pages.flatMap((page) => page.lines),
  };
}
