import { streamOnPages } from "../extract/inventory";
import { readJson, readManifest, runStage } from "../lib/artifacts";
import { compilationInventory, compilationStream, requireTextExtract } from "./text-extract";
import type { StageContext } from "./context";

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

/** Copies the parent compilation's text-layer lines for one exam into this document's cleanup stream. */
export async function examSlice(context: StageContext) {
  const document = context.document;
  const parent = document.parentSlug;
  if (!parent) throw new Error(`${document.slug} is not a compilation slice (missing parentSlug).`);
  const exam = document.exam;
  if (!exam) throw new Error(`${document.slug} has no exam layout.`);
  const parentManifest = requireTextExtract(parent);
  const inventory = compilationInventory(parent);
  const detected = inventory.exams.find((entry) => entry.slug === document.slug);
  return runStage(
    {
      document: document.slug,
      stage: "cleanup",
      version: "3",
      inputs: { parent: parentManifest.outputHash, exam: detected?.slug ?? document.slug },
      params: { parent, questionPages: exam.questionPages, answerKeyPage: exam.answerKeyPage ?? null },
      code: ["pipeline/stages/exam-slice.ts", "pipeline/extract/inventory.ts"],
      force: context.force,
    },
    async () => {
      const stream = streamOnPages(compilationStream(parent), exam.questionPages[0], exam.questionPages[1], exam.answerKeyPage ?? null);
      const files = { "stream-text.json": json(stream) };
      return { files, stats: { lines: stream.length, pages: exam.questionPages, key: exam.answerKeyPage ?? null, shape: detected?.shape ?? null } };
    },
  );
}
