import { usableForDistribution } from "@/modules/analysis/acceptance";
import { expectedQuestionType, normalizeForHash } from "@/modules/analysis/surface";
import { sha256 } from "../lib/artifacts";
import { readJson, readManifest, runStage } from "../lib/artifacts";
import { blueprintForDocument } from "../extract/topic-blueprint";
import type { Rebuilt } from "../extract/reconstruct";
import { assertTextFree } from "../lib/text-free";
import type { StageContext } from "./context";
import type { ValidationReport } from "./extraction";

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

/** Deterministic tags only: no Gemini, no invented questions, no item text. */
export async function dnaSkeleton(context: StageContext) {
  const slug = context.document.slug;
  const exam = context.document.exam;
  if (!exam) throw new Error(`${slug} has no exam layout.`);
  const validated = readManifest(slug, "validate");
  const rebuilt = readManifest(slug, "reconstruct");
  if (!validated || !rebuilt) throw new Error("Run validate first.");
  return runStage(
    {
      document: slug,
      stage: "dna-skeleton",
      version: "1",
      inputs: { validate: validated.outputHash, reconstruct: rebuilt.outputHash },
      code: ["pipeline/stages/dna-skeleton.ts", "src/modules/analysis/acceptance.ts", "src/modules/analysis/surface.ts"],
      force: context.force,
    },
    async () => {
      const report = readJson<ValidationReport>(slug, "validate", "report.json");
      const questions = readJson<Rebuilt[]>(slug, "reconstruct", `questions-${report.primary}.json`);
      const blueprint = blueprintForDocument(context.document);
      const rows = questions.map(({ question }) => {
        const check = report.questions.find((entry) => entry.number === question.number);
        return {
          document: slug,
          number: question.number,
          section: question.section,
          questionType: expectedQuestionType(question.number, blueprint, question.translationDirection),
          answer: report.key.answers[question.number] ?? null,
          extractionStatus: check?.status ?? "failed",
          extractionConfidence: check?.extractionConfidence ?? 0,
          textSha256: sha256(normalizeForHash(question)),
          sourceClass: exam.sourceClass,
          usableForDistribution: usableForDistribution(exam.sourceClass),
        };
      });
      const payload = {
        document: slug,
        sourceClass: exam.sourceClass,
        usableForDistribution: usableForDistribution(exam.sourceClass),
        summary: {
          ok: report.summary.ok,
          needsReview: report.summary.needsReview,
          failed: report.summary.failed,
          missingCount: report.summary.missing.length,
          meanExtractionConfidence: report.summary.meanExtractionConfidence,
        },
        rows,
      };
      assertTextFree(payload);
      return {
        files: { "skeleton.json": json(payload) },
        stats: {
          rows: rows.length,
          ok: rows.filter((row) => row.extractionStatus === "ok").length,
          review: rows.filter((row) => row.extractionStatus === "needs_review").length,
          failed: rows.filter((row) => row.extractionStatus === "failed").length,
          usableForDistribution: usableForDistribution(exam.sourceClass),
        },
      };
    },
  );
}
