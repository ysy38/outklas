import { analysisSchemaVersion } from "@/modules/analysis/contract";
import { deriveFamilies, toDnaQuestion } from "@/modules/analysis/dna";
import { sourceDocuments, sourceProviders } from "@/modules/analysis/sources";
import { normalizeForHash } from "@/modules/analysis/surface";
import { itemText, quotedRun } from "@/modules/analysis/validate";
import { knowledgeVersion } from "@/modules/knowledge/seed";
import type { DnaBundle } from "@/db/analysis-import";
import { analyzerPromptVersion } from "../ai/prompts/analyzer.v2";
import { solvePromptVersion } from "../ai/prompts/verifier.v1";
import { readJson, readManifest, runStage, sha256 } from "../lib/artifacts";
import { assertTextFree } from "../lib/text-free";
import type { Rebuilt } from "../extract/reconstruct";
import type { AnalysisRecord } from "./analyze";
import type { StageContext } from "./context";
import type { ValidationReport } from "./extraction";

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

/** YDS DNA + knowledge-graph mapping: accepted analyses only, references and numbers only; unknown concepts stay proposals. */
export async function dna(context: StageContext) {
  const slug = context.document.slug;
  const exam = context.document.exam!;
  const analyzed = readManifest(slug, "analyze");
  if (!analyzed) throw new Error("Run the analyze stage first.");
  return runStage(
    {
      document: slug,
      stage: "dna",
      version: "1",
      inputs: { analyze: analyzed.outputHash },
      code: ["pipeline/stages/dna.ts", "src/modules/analysis/dna.ts", "src/db/analysis-import.ts", "pipeline/lib/text-free.ts"],
      force: context.force,
    },
    async () => {
      const report = readJson<ValidationReport>(slug, "validate", "report.json");
      const questions = readJson<Rebuilt[]>(slug, "reconstruct", `questions-${report.primary}.json`);
      const records = Object.keys(analyzed.files)
        .filter((name) => /^q-\d+\.json$/.test(name))
        .map((name) => readJson<AnalysisRecord>(slug, "analyze", name))
        .sort((a, b) => a.number - b.number);
      const summary = readJson<{ models: { analyzer: string; verifier: string }; usage: { inputTokens: number; outputTokens: number } }>(slug, "analyze", "summary.json");

      const withheld: { number: number; type: string; slug: string; reason: string }[] = [];
      const accepted = records.filter((record) => record.status === "accepted" && record.analysis);
      const rows = accepted.map((record) => {
        const { question } = questions.find((entry) => entry.question.number === record.number)!;
        const text = itemText(question);
        const proposals = record.proposals.filter((proposal) => {
          if (!quotedRun(proposal.slug.replaceAll("_", " "), text, 4)) return true;
          withheld.push({ number: record.number, type: proposal.type, slug: proposal.slug, reason: "slug repeats item wording" });
          return false;
        });
        return toDnaQuestion({
          document: slug,
          question,
          analysis: record.analysis!,
          answer: record.answerKey as "A",
          textSha256: sha256(normalizeForHash(question)),
          proposals: proposals.map(({ type, slug: proposalSlug }) => ({ type, slug: proposalSlug })),
        });
      });

      const proposalMap = new Map<string, { type: string; slug: string; name: string; questions: number[] }>();
      for (const row of rows) {
        for (const proposal of row.proposals) {
          const key = `${proposal.type}:${proposal.slug}`;
          const entry = proposalMap.get(key) ?? { type: proposal.type, slug: proposal.slug, name: proposal.slug.replaceAll("_", " "), questions: [] };
          entry.questions.push(row.number);
          proposalMap.set(key, entry);
        }
      }

      const bundle: DnaBundle = {
        sources: sourceProviders,
        sourceDocuments,
        document: { slug, exam: exam.code, year: exam.year, session: exam.session, blueprint: exam.blueprint, questionCount: exam.questionCount },
        run: {
          stage: "analyze",
          stageVersion: analyzed.stageVersion,
          provider: "gemini",
          model: `${summary.models.analyzer}+${summary.models.verifier}`,
          promptVersion: `${analyzerPromptVersion}+${solvePromptVersion}`,
          schemaVersion: analysisSchemaVersion,
          knowledgeVersion: knowledgeVersion.version,
          inputHash: analyzed.inputHash,
          outputHash: analyzed.outputHash,
          status: records.some((record) => record.status === "failed") ? "partial" : "succeeded",
          itemCount: records.length,
          acceptedCount: accepted.length,
          reviewCount: records.filter((record) => record.status === "needs_review").length,
          failedCount: records.filter((record) => record.status === "failed").length,
          inputTokens: summary.usage.inputTokens,
          outputTokens: summary.usage.outputTokens,
          startedAt: analyzed.createdAt,
          finishedAt: new Date(Date.parse(analyzed.createdAt) + analyzed.durationMs).toISOString(),
        },
        questions: rows,
        proposals: [...proposalMap.values()].sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.slug < b.slug ? -1 : 1)),
      };
      assertTextFree(bundle);

      const queue = records.flatMap((record) =>
        record.proposals.map((proposal) => ({ number: record.number, status: record.status, ...proposal, inDatabase: record.status === "accepted" && !withheld.some((entry) => entry.number === record.number && entry.slug === proposal.slug) })),
      );
      return {
        files: { "rows.json": json(bundle), "families.json": json(deriveFamilies(rows)), "proposals.json": json({ queue, withheld }) },
        stats: { questions: rows.length, proposals: bundle.proposals.length, families: deriveFamilies(rows).length, withheld: withheld.length },
      };
    },
  );
}
