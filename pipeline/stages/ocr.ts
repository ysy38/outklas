import { mkdirSync } from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createWorker, PSM, type Page, type Worker } from "tesseract.js";
import { cached, dataRoot, readArtifactBytes, readManifest, runStage, sha256, storeCached } from "../lib/artifacts";
import { redChannel, splitColumns, toRgba, type Gray } from "../extract/image";
import type { ColumnId, OcrColumn, OcrLine } from "../extract/types";
import { pageFile, pagesToRender } from "./render";
import type { StageContext } from "./context";

const languages = ["eng", "tur"];
const engine = `tesseract.js@7 ${languages.join("+")} lstm`;

export const ocrFile = (page: number, column: ColumnId) => `page-${String(page).padStart(2, "0")}-${column}.json`;

function toPng(image: Gray): Buffer {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  const data = context.createImageData(image.width, image.height);
  data.data.set(toRgba(image));
  context.putImageData(data, 0, 0);
  return canvas.toBuffer("image/png");
}

async function grayPage(png: Buffer): Promise<Gray> {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return redChannel(context.getImageData(0, 0, image.width, image.height).data, image.width, image.height);
}

const round = (value: number) => Math.round(value * 10) / 10;

function toColumn(page: number, column: ColumnId, image: Gray, offsetX: number, psm: string, result: Page): OcrColumn {
  const lines: OcrLine[] = (result.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        text: line.text.replace(/\n$/, ""),
        confidence: round(line.confidence),
        bbox: [line.bbox.x0, line.bbox.y0, line.bbox.x1, line.bbox.y1] as OcrLine["bbox"],
        words: line.words.map((word) => ({ text: word.text, confidence: round(word.confidence), bbox: [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1] as OcrLine["bbox"] })),
      })),
    ),
  );
  return { page, column, width: image.width, height: image.height, offsetX, engine, psm, confidence: round(result.confidence), text: result.text, lines };
}

export async function ocr(context: StageContext) {
  const slug = context.document.slug;
  const rendered = readManifest(slug, "render");
  if (!rendered) throw new Error("Run analysis:render first.");
  const pages = pagesToRender(context);
  const keyPage = context.document.exam?.answerKeyPage;

  return runStage(
    { document: slug, stage: "ocr", version: "2", inputs: { render: rendered.outputHash }, params: { engine, columns: "split-at-grey-rule", watermark: "red-channel" }, code: ["pipeline/stages/ocr.ts", "pipeline/extract/image.ts"], immutable: true, force: context.force },
    async () => {
      const cachePath = path.join(dataRoot(), "cache", "tessdata");
      mkdirSync(cachePath, { recursive: true });
      const workers: Worker[] = await Promise.all([0, 1].map(() => createWorker(languages, 1, { cachePath })));
      const jobs: { page: number; column: ColumnId; image: Gray; offsetX: number; psm: PSM }[] = [];
      const gutters: Record<number, unknown> = {};
      for (const page of pages) {
        const gray = await grayPage(readArtifactBytes(slug, "render", pageFile(page)));
        if (page === keyPage) {
          jobs.push({ page, column: "full", image: gray, offsetX: 0, psm: PSM.SINGLE_BLOCK });
          continue;
        }
        const { left, right, gutter } = splitColumns(gray);
        gutters[page] = gutter;
        jobs.push({ page, column: "left", image: left, offsetX: 0, psm: PSM.SINGLE_COLUMN });
        jobs.push({ page, column: "right", image: right, offsetX: gray.width - right.width, psm: PSM.SINGLE_COLUMN });
      }

      const files: Record<string, string | Buffer> = {};
      let next = 0;
      await Promise.all(
        workers.map(async (worker) => {
          while (next < jobs.length) {
            const job = jobs[next];
            next += 1;
            const png = toPng(job.image);
            const key = sha256(`${engine}|${job.psm}|${sha256(png)}`);
            let column = cached<OcrColumn>("ocr", key);
            if (!column) {
              await worker.setParameters({ tessedit_pageseg_mode: job.psm, preserve_interword_spaces: "1", user_defined_dpi: "300" });
              const { data } = await worker.recognize(png, {}, { text: true, blocks: true });
              column = toColumn(job.page, job.column, job.image, job.offsetX, job.psm, data);
              storeCached("ocr", key, column);
            }
            files[ocrFile(job.page, job.column)] = `${JSON.stringify(column, null, 1)}\n`;
            files[ocrFile(job.page, job.column).replace(".json", ".txt")] = column.text;
            files[`images/${ocrFile(job.page, job.column).replace(".json", ".png")}`] = png;
            context.log(`ocr page ${job.page} ${job.column}: confidence ${column.confidence}`);
          }
        }),
      );
      await Promise.all(workers.map((worker) => worker.terminate()));

      const columns = Object.entries(files)
        .filter(([name]) => name.endsWith(".json"))
        .map(([, content]) => JSON.parse(content as string) as OcrColumn);
      const words = columns.flatMap((column) => column.lines.flatMap((line) => line.words));
      return {
        files,
        stats: {
          columns: columns.length,
          words: words.length,
          meanWordConfidence: round(words.reduce((sum, word) => sum + word.confidence, 0) / Math.max(1, words.length)),
          wordsBelow60: words.filter((word) => word.confidence < 60).length,
          wordsBelow80: words.filter((word) => word.confidence < 80).length,
          gutters,
        },
      };
    },
  );
}
