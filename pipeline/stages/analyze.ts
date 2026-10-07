import { analysisSchemaVersion, type AnalysisDraft, type BlindSolution } from "@/modules/analysis/contract";
import { expectedQuestionType } from "@/modules/analysis/surface";
import { validateAnalysis, type Flag, type Proposal, type ValidationStatus } from "@/modules/analysis/validate";
import { blueprintForDocument } from "../extract/topic-blueprint";
import { knowledgeVersion } from "@/modules/knowledge/seed";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadAIConfig } from "../ai/config";
import { dataRoot } from "../lib/artifacts";
import { analyzerPromptVersion } from "../ai/prompts/analyzer.v2";
import { solvePromptVersion } from "../ai/prompts/verifier.v1";
import { AIRequestError } from "../ai/gemini";
import { AIOutputError, createAIService } from "../ai/service";
import type { AIResult, Usage } from "../ai/types";
import { readJson, readManifest, runStage } from "../lib/artifacts";
import { mapLimit } from "../lib/limit";
import { warningFlags } from "../extract/checks";
import type { Rebuilt } from "../extract/reconstruct";
import type { StageContext } from "./context";
import type { ValidationReport } from "./extraction";

export type AnalysisRecord = {
  number: number;
  status: ValidationStatus;
  extraction: { status: string; flags: string[] };
  expectedType: string | null;
  answerKey: string | null;
  flags: Flag[];
  error?: string;
  draft?: AnalysisDraft;
  analysis?: AnalysisDraft;
  blind?: BlindSolution | null;
  proposals: Proposal[];
  models: { analyzer?: string; verifier?: string };
  requests: string[];
  usage: Usage;
  cached: boolean;
};

const zero: Usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
const add = (a: Usage, b: Usage): Usage => ({ inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens, totalTokens: a.totalTokens + b.totalTokens });

export const analysisFile = (number: number) => `q-${String(number).padStart(2, "0")}.json`;

export async function analyze(context: StageContext) {
  const slug = context.document.slug;
  const exam = context.document.exam;
  if (!exam) throw new Error(`${slug} has no exam layout.`);
  const rebuilt = readManifest(slug, "reconstruct");
  const validated = readManifest(slug, "validate");
  if (!rebuilt || !validated) throw new Error("Run the validate stage first.");
  const config = loadAIConfig();
  const smokeFile = path.join(dataRoot(), "gemini-smoke", "result.json");
  const smokeOk = existsSync(smokeFile) && (JSON.parse(readFileSync(smokeFile, "utf8")) as { ok?: boolean }).ok === true;
  const disabled = !config.apiKey || process.env.AI_DISABLED === "1" || !smokeOk;
  const ai = disabled ? null : createAIService(config);
  const blueprint = blueprintForDocument(context.document);
  const examLabel = `${exam.code.toUpperCase()} ${exam.session}`;

  return runStage(
    {
      document: slug,
      stage: "analyze",
      version: "1",
      inputs: { reconstruct: rebuilt.outputHash, validate: validated.outputHash },
      params: {
        provider: config.provider,
        analyzer: config.models.analyzer,
        verifier: config.models.verifier,
        prompts: [analyzerPromptVersion, solvePromptVersion],
        schema: analysisSchemaVersion,
        knowledge: knowledgeVersion.version,
      },
      code: ["pipeline/stages/analyze.ts", "pipeline/extract/checks.ts", "src/modules/analysis/validate.ts", "src/modules/analysis/contract.ts", "pipeline/ai/prompts/analyzer.v2.ts", "pipeline/ai/prompts/schema.ts", "pipeline/ai/prompts/verifier.v1.ts"],
      force: context.force,
    },
    async () => {
      const report = readJson<ValidationReport>(slug, "validate", "report.json");
      const questions = readJson<Rebuilt[]>(slug, "reconstruct", `questions-${report.primary}.json`);
      const records = await mapLimit(questions, 1, async ({ question }): Promise<AnalysisRecord> => {
        const check = report.questions.find((entry) => entry.number === question.number)!;
        const expectedType = expectedQuestionType(question.number, blueprint, question.translationDirection);
        const answerKey = report.key.answers[question.number] ?? null;
        const base = { number: question.number, extraction: { status: check.status, flags: check.flags }, expectedType, answerKey, proposals: [], models: {}, requests: [], usage: zero, cached: true };
        if (check.status === "failed") return { ...base, status: "failed", flags: [{ code: "extraction_failed", severity: "block" }] };
        if (check.status !== "ok") return { ...base, status: "needs_review", flags: [{ code: "extraction_needs_review", severity: "block" }] };
        if (!ai) return { ...base, status: "needs_review", flags: [{ code: "ai_skipped", severity: "warn" }], cached: true };

        let analyzed: AIResult<AnalysisDraft>;
        try {
          analyzed = await ai.analyzer.analyze({ question, questionType: expectedType ?? "unknown", answerKey: answerKey ?? "unknown", examLabel });
        } catch (error) {
          if (error instanceof AIRequestError) return { ...base, status: "needs_review", flags: [{ code: "ai_unavailable", severity: "warn" }], error: error.message, cached: false };
          if (!(error instanceof AIOutputError)) throw error;
          return { ...base, status: "failed", flags: [{ code: "analysis_invalid", severity: "block" }], error: error.message };
        }
        let blind: AIResult<BlindSolution> | null = null;
        try {
          blind = await ai.verifier.solve(question);
        } catch (error) {
          if (error instanceof AIOutputError || error instanceof AIRequestError) blind = null;
          else throw error;
        }
        const result = validateAnalysis({
          draft: analyzed.value,
          question,
          expectedType,
          answerKey: answerKey as AnalysisDraft["correct_option"] | null,
          blind: blind?.value ?? null,
          extractionFlags: [],
        });
        for (const code of check.flags.filter((flag) => warningFlags.has(flag))) result.flags.push({ code, severity: "warn" });
        context.log(`q${question.number}: ${result.status}${result.flags.some((flag) => flag.severity === "block") ? ` (${result.flags.filter((flag) => flag.severity === "block").map((flag) => flag.code).join(", ")})` : ""}`);
        return {
          ...base,
          status: result.status,
          flags: result.flags,
          draft: analyzed.value,
          analysis: result.analysis,
          blind: blind?.value ?? null,
          proposals: result.proposals,
          models: { analyzer: analyzed.model, verifier: blind?.model },
          requests: [analyzed.requestHash, ...(blind ? [blind.requestHash] : [])],
          usage: add(analyzed.usage, blind?.usage ?? zero),
          cached: analyzed.cached && (blind?.cached ?? true),
        };
      });

      const count = (status: ValidationStatus) => records.filter((record) => record.status === status).length;
      const usage = records.reduce((sum, record) => add(sum, record.usage), zero);
      const summary = {
        items: records.length,
        accepted: count("accepted"),
        needsReview: count("needs_review"),
        failed: count("failed"),
        cached: records.filter((record) => record.cached).length,
        models: { analyzer: config.models.analyzer, verifier: config.models.verifier },
        usage,
      };
      return {
        files: { ...Object.fromEntries(records.map((record) => [analysisFile(record.number), `${JSON.stringify(record, null, 1)}\n`])), "summary.json": `${JSON.stringify(summary, null, 1)}\n` },
        stats: summary,
      };
    },
  );
}
