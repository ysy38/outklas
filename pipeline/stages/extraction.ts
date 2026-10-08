import { extractionFreezeMetrics } from "@/modules/analysis/freeze";
import { blueprintForDocument } from "../extract/topic-blueprint";
import { readJson, readManifest, runStage } from "../lib/artifacts";
import { checkQuestion, type QuestionCheck } from "../extract/checks";
import { ocrStream, verifiedStream } from "../extract/cleanup";
import { parseAnswerKey, type AnswerKey } from "../extract/key";
import { reconstruct, type Rebuilt } from "../extract/reconstruct";
import { segment, type Segmentation } from "../extract/segment";
import type { OcrColumn, Reading, StreamLine, Transcription } from "../extract/types";
import type { StageContext } from "./context";

const code = ["pipeline/stages/extraction.ts"];

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

function exam(context: StageContext) {
  const value = context.document.exam;
  if (!value) throw new Error(`${context.document.slug} has no exam layout.`);
  return value;
}

function readings(context: StageContext): Reading[] {
  const slug = context.document.slug;
  if (readManifest(slug, "ocr-verify")) return ["verified", "ocr"];
  if (readManifest(slug, "ocr")) return ["ocr"];
  if (readManifest(slug, "cleanup")?.files["stream-text.json"] || readManifest(slug, "text-extract")) return ["text"];
  return ["ocr"];
}

/** OCR cleanup: both readings become normalised line streams; the raw OCR and Gemini artifacts stay untouched. */
export async function cleanup(context: StageContext) {
  const slug = context.document.slug;
  const ocr = readManifest(slug, "ocr");
  const text = readManifest(slug, "text-extract");
  if (!ocr && !text) throw new Error("Run the ocr or text-extract stage first.");
  const verify = readManifest(slug, "ocr-verify");
  return runStage(
    { document: slug, stage: "cleanup", version: "3", inputs: { ocr: ocr?.outputHash ?? "none", verify: verify?.outputHash ?? "none", text: text?.outputHash ?? "none" }, code: [...code, "pipeline/extract/cleanup.ts"], force: context.force },
    async () => {
      const files: Record<string, string> = {};
      if (ocr) {
        const columns = Object.keys(ocr.files)
          .filter((name) => /^page-\d+-(left|right|full)\.json$/.test(name))
          .map((name) => readJson<OcrColumn>(slug, "ocr", name));
        files["stream-ocr.json"] = json(ocrStream(columns));
        if (verify) {
          const transcriptions = Object.keys(verify.files).map((name) => readJson<Transcription>(slug, "ocr-verify", name));
          files["stream-verified.json"] = json(verifiedStream(transcriptions, columns));
        }
      }
      if (text) files["stream-text.json"] = json(readJson<StreamLine[]>(slug, "text-extract", "stream.json"));
      return { files, stats: Object.fromEntries(Object.entries(files).map(([name, content]) => [name, (JSON.parse(content) as unknown[]).length])) };
    },
  );
}

export async function segmentStage(context: StageContext) {
  const slug = context.document.slug;
  const layout = exam(context);
  const cleaned = readManifest(slug, "cleanup");
  if (!cleaned) throw new Error("Run the cleanup stage first.");
  return runStage({ document: slug, stage: "segment", version: "2", inputs: { cleanup: cleaned.outputHash }, params: { questionCount: layout.questionCount, sourceClass: layout.sourceClass }, code: [...code, "pipeline/extract/segment.ts", "pipeline/extract/key.ts"], force: context.force }, async () => {
    const files: Record<string, string> = {};
    const stats: Record<string, unknown> = {};
    for (const reading of readings(context)) {
      const streamFile = reading === "text" && !readManifest(slug, "cleanup")?.files["stream-text.json"] ? "stream.json" : `stream-${reading}.json`;
      const stage = reading === "text" && streamFile === "stream.json" ? "text-extract" : "cleanup";
      const stream = readJson<StreamLine[]>(slug, stage, streamFile);
      const questions = stream.filter((line) => line.page !== layout.answerKeyPage);
      const segmentation = segment(questions, layout.questionCount);
      const key = parseAnswerKey(
        stream.filter((line) => line.page === layout.answerKeyPage).map((line) => line.text),
        layout.questionCount,
      );
      files[`blocks-${reading}.json`] = json(segmentation);
      files[`key-${reading}.json`] = json(key);
      stats[reading] = { blocks: segmentation.blocks.length, missing: segmentation.missing, keyAnswers: Object.keys(key.answers).length, keyWarnings: key.warnings.length };
    }
    return { files, stats };
  });
}

export async function reconstructStage(context: StageContext) {
  const slug = context.document.slug;
  const layout = exam(context);
  const segmented = readManifest(slug, "segment");
  if (!segmented) throw new Error("Run the segment stage first.");
  return runStage({ document: slug, stage: "reconstruct", version: "2", inputs: { segment: segmented.outputHash }, params: { blueprint: layout.blueprint, sourceClass: layout.sourceClass }, code: [...code, "pipeline/extract/reconstruct.ts", "pipeline/extract/inventory.ts", "src/modules/analysis/surface.ts"], force: context.force }, async () => {
    const files: Record<string, string> = {};
    const stats: Record<string, unknown> = {};
    const blueprint = blueprintForDocument(context.document);
    for (const reading of readings(context)) {
      const rebuilt = reconstruct(readJson<Segmentation>(slug, "segment", `blocks-${reading}.json`), blueprint);
      files[`questions-${reading}.json`] = json(rebuilt);
      stats[reading] = { questions: rebuilt.length, withWarnings: rebuilt.filter((entry) => entry.warnings.length).length };
    }
    return { files, stats };
  });
}

export type KeyDecision = {
  answers: AnswerKey["answers"];
  readings: Reading[];
  disagreements: number[];
  warnings: string[];
};

export type ValidationReport = {
  primary: Reading;
  sourceClass: import("@/modules/analysis/acceptance").SourceClass;
  key: KeyDecision;
  questions: (QuestionCheck & { keyAgreed: boolean })[];
  summary: { ok: number; needsReview: number; failed: number; missing: number[]; meanDisagreement: number | null; meanExtractionConfidence: number | null };
};

/** Deterministic extraction validation; the answer key is accepted only where every reading agrees. */
export async function validateStage(context: StageContext) {
  const slug = context.document.slug;
  const layout = exam(context);
  const rebuilt = readManifest(slug, "reconstruct");
  if (!rebuilt) throw new Error("Run the reconstruct stage first.");
  return runStage({ document: slug, stage: "validate", version: "2", inputs: { reconstruct: rebuilt.outputHash, segment: readManifest(slug, "segment")!.outputHash }, params: { sourceClass: layout.sourceClass }, code: [...code, "pipeline/extract/checks.ts", "src/modules/analysis/acceptance.ts", "src/modules/analysis/surface.ts"], force: context.force }, async () => {
    const available = readings(context);
    const primary = available[0];
    const byReading = Object.fromEntries(available.map((reading) => [reading, readJson<Rebuilt[]>(slug, "reconstruct", `questions-${reading}.json`)])) as Record<Reading, Rebuilt[]>;
    const keys = available.map((reading) => readJson<AnswerKey>(slug, "segment", `key-${reading}.json`));
    const segmentation = readJson<Segmentation>(slug, "segment", `blocks-${primary}.json`);

    const answers: AnswerKey["answers"] = {};
    const disagreements: number[] = [];
    for (let number = 1; number <= layout.questionCount; number += 1) {
      const letters = new Set(keys.map((key) => key.answers[number]).filter(Boolean));
      if (letters.size === 1 && keys.every((key) => key.answers[number])) answers[number] = [...letters][0];
      else disagreements.push(number);
    }

    const questions = byReading[primary].map((entry) => {
      const ocrReading = primary === "text" ? entry : byReading.ocr?.find((other) => other.question.number === entry.question.number);
      const check = checkQuestion(entry, ocrReading, segmentation.missing.includes(entry.question.number));
      const keyAgreed = Boolean(answers[entry.question.number]);
      if (!keyAgreed) {
        check.flags.push("answer_key_disagreement");
        if (check.status === "ok") check.status = "needs_review";
      }
      return { ...check, keyAgreed };
    });
    const disagreementsByQuestion = questions.map((question) => question.disagreement).filter((value): value is number => value !== null);
    const extractionScores = questions.map((question) => question.extractionConfidence);
    const report: ValidationReport = {
      primary,
      sourceClass: layout.sourceClass,
      key: { answers, readings: available, disagreements, warnings: keys.flatMap((key, index) => key.warnings.map((warning) => `${available[index]}: ${warning}`)) },
      questions,
      summary: {
        ok: questions.filter((question) => question.status === "ok").length,
        needsReview: questions.filter((question) => question.status === "needs_review").length,
        failed: questions.filter((question) => question.status === "failed").length,
        missing: segmentation.missing,
        meanDisagreement: disagreementsByQuestion.length ? Math.round((disagreementsByQuestion.reduce((sum, value) => sum + value, 0) / disagreementsByQuestion.length) * 10_000) / 10_000 : null,
        meanExtractionConfidence: extractionScores.length ? Math.round((extractionScores.reduce((sum, value) => sum + value, 0) / extractionScores.length) * 1000) / 1000 : null,
      },
    };
    const flagCounts: Record<string, number> = {};
    for (const question of questions) for (const flag of question.flags) flagCounts[flag.replace(/:.*/, "")] = (flagCounts[flag.replace(/:.*/, "")] ?? 0) + 1;
    const freeze = extractionFreezeMetrics({ expected: layout.questionCount, missing: segmentation.missing, questions });
    return { files: { "report.json": json(report) }, stats: { ...report.summary, keyDisagreements: disagreements, flagCounts, freeze } };
  });
}
