import { openPdf, readSourcePdf, renderPage } from "../lib/pdf";
import { runStage } from "../lib/artifacts";
import type { StageContext } from "./context";

export const renderDpi = 300;

export function pagesToRender(context: StageContext): number[] {
  const exam = context.document.exam;
  if (!exam) throw new Error(`${context.document.slug} has no exam layout to analyse.`);
  const pages: number[] = [];
  for (let page = exam.questionPages[0]; page <= exam.questionPages[1]; page += 1) pages.push(page);
  if (exam.answerKeyPage) pages.push(exam.answerKeyPage);
  return pages;
}

export const pageFile = (page: number) => `page-${String(page).padStart(2, "0")}.png`;

export async function render(context: StageContext) {
  const pages = pagesToRender(context);
  return runStage(
    { document: context.document.slug, stage: "render", version: "1", inputs: { pdf: context.document.sha256 }, params: { dpi: renderDpi, pages }, code: ["pipeline/stages/render.ts", "pipeline/lib/pdf.ts"], force: context.force },
    async () => {
      const pdf = await openPdf(readSourcePdf(context.document));
      const files: Record<string, Buffer> = {};
      for (const page of pages) {
        files[pageFile(page)] = await renderPage(pdf, page, renderDpi);
        context.log(`rendered page ${page}`);
      }
      await pdf.destroy();
      return { files, stats: { pages: pages.length, dpi: renderDpi } };
    },
  );
}
