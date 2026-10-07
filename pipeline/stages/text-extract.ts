import { documentBySlug } from "@/modules/analysis/sources";
import { detectExams, type CollectionInventory } from "../extract/inventory";
import { extractPdfText, type PageTextLayout } from "../extract/text-layer";
import type { StreamLine } from "../extract/types";
import { readJson, readManifest, runStage, sha256 } from "../lib/artifacts";
import { openPdf, readSourcePdf } from "../lib/pdf";
import type { StageContext } from "./context";

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

const pageMeta = (page: PageTextLayout) => ({
  page: page.page,
  width: Math.round(page.width * 10) / 10,
  height: Math.round(page.height * 10) / 10,
  charCount: page.charCount,
  hasText: page.hasText,
  columns: page.columns,
  gutterX: page.gutterX == null ? null : Math.round(page.gutterX * 10) / 10,
  headerCount: page.headerLines.length,
  lineCount: page.lines.length,
});

/** Immutable raw text-layer extract. No OCR. Glyphs and lines stay local; inventory has no item text. */
export async function textExtract(context: StageContext) {
  const slug = context.document.slug;
  const bytes = readSourcePdf(context.document);
  return runStage(
    {
      document: slug,
      stage: "text-extract",
      version: "1",
      inputs: { source: context.document.sha256 },
      params: { file: context.document.file, pages: context.document.pageCount },
      code: ["pipeline/stages/text-extract.ts", "pipeline/extract/text-layer.ts", "pipeline/extract/inventory.ts", "pipeline/extract/known-booklets.ts", "pipeline/extract/segment.ts", "pipeline/extract/cleanup.ts"],
      immutable: true,
      force: context.force,
    },
    async () => {
      const pdf = await openPdf(bytes);
      try {
        const extracted = await extractPdfText(pdf);
        const inventory = detectExams(extracted, slug);
        const files: Record<string, string> = {
          "pages.json": json(extracted.pages.map(pageMeta)),
          "stream.json": json(extracted.stream),
          "inventory.json": json(inventory),
        };
        for (const page of extracted.pages) {
          files[`raw/page-${String(page.page).padStart(3, "0")}.json`] = json({
            page: page.page,
            width: page.width,
            height: page.height,
            columns: page.columns,
            lines: page.lines.map((line) => ({ column: line.column, text: line.text, gap: line.gap })),
          });
        }
        return {
          files,
          stats: {
            pages: extracted.pageCount,
            pagesWithText: extracted.pagesWithText,
            lines: extracted.stream.length,
            exams: inventory.exams.length,
            completeExam: inventory.exams.filter((exam) => exam.sourceClass === "complete_exam").length,
            partialExam: inventory.exams.filter((exam) => exam.sourceClass === "partial_exam").length,
            topicSlice: inventory.exams.filter((exam) => exam.sourceClass === "topic_slice").length,
            withKey: inventory.exams.filter((exam) => exam.hasAnswerKey).length,
          },
        };
      } finally {
        await pdf.destroy();
      }
    },
  );
}

export function compilationInventory(parentSlug: string): CollectionInventory {
  return readJson<CollectionInventory>(parentSlug, "text-extract", "inventory.json");
}

export function compilationStream(parentSlug: string): StreamLine[] {
  return readJson<StreamLine[]>(parentSlug, "text-extract", "stream.json");
}

export function parentOf(slug: string): string | null {
  const document = documentBySlug(slug);
  return document.parentSlug ?? null;
}

export const extractHash = (stream: StreamLine[]) => sha256(json(stream));

export function requireTextExtract(parentSlug: string) {
  const manifest = readManifest(parentSlug, "text-extract");
  if (!manifest) throw new Error(`Run text-extract for ${parentSlug} first.`);
  return manifest;
}
