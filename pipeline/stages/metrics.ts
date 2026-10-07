import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { optionLabels } from "@/modules/analysis/contract";
import { normalizeForHash, words } from "@/modules/analysis/surface";
import { dataRoot, readJson, readManifest, runStage, sha256 } from "../lib/artifacts";
import type { Rebuilt } from "../extract/reconstruct";
import type { Segmentation } from "../extract/segment";
import type { AnalysisRecord } from "./analyze";
import type { StageContext } from "./context";
import type { ValidationReport } from "./extraction";

const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const mean = (values: number[]) => (values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);
const quantile = (values: number[], q: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const tally = (values: string[]) => Object.fromEntries(Object.entries(values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]));

function ranks(values: number[]) {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j += 1;
    for (let k = i; k <= j; k += 1) result[order[k].index] = (i + j) / 2;
    i = j + 1;
  }
  return result;
}

export function spearman(a: number[], b: number[]): number | null {
  if (a.length < 3) return null;
  const ra = ranks(a);
  const rb = ranks(b);
  const ma = ra.reduce((sum, value) => sum + value, 0) / ra.length;
  const mb = rb.reduce((sum, value) => sum + value, 0) / rb.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i += 1) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? round(num / Math.sqrt(da * db)) : null;
}

const shingles = (text: string, size = 5) => {
  const tokens = words(text.toLowerCase());
  return new Set(tokens.slice(0, Math.max(0, tokens.length - size + 1)).map((_, index) => tokens.slice(index, index + size).join(" ")));
};

export function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const manualFile = (slug: string, name: string) => path.join(dataRoot(), slug, "manual", name);
const readManual = <T>(slug: string, name: string): T | null => (existsSync(manualFile(slug, name)) ? (JSON.parse(readFileSync(manualFile(slug, name), "utf8")) as T) : null);

export type ManualAnalysisReview = { reviewer: string; questions: { number: number; dimensions: Record<string, "correct" | "partial" | "wrong"> }[] };
export type ManualOcrCheck = { reviewer: string; questions: { number: number; words: number; errors: Record<string, number>; boundaries: boolean }[] };

/** Everything measurable for the 20 pilot metrics, computed from the stage artifacts and the optional manual review files. */
export async function metrics(context: StageContext) {
  const slug = context.document.slug;
  const stages = Object.fromEntries(["ocr", "segment", "reconstruct", "validate", "analyze", "dna", "import"].map((stage) => [stage, readManifest(slug, stage)]));
  for (const [stage, manifest] of Object.entries(stages)) if (!manifest) throw new Error(`Run the ${stage} stage first.`);
  const manual = ["ocr-check.json", "analysis-review.json", "live-duplicates.json"].map((name) => (existsSync(manualFile(slug, name)) ? sha256(readFileSync(manualFile(slug, name))) : "none"));
  return runStage(
    {
      document: slug,
      stage: "metrics",
      version: "1",
      inputs: { ...Object.fromEntries(Object.entries(stages).map(([stage, manifest]) => [stage, manifest!.outputHash])), manual: manual.join(",") },
      code: ["pipeline/stages/metrics.ts"],
      force: true,
    },
    async () => {
      const report = readJson<ValidationReport>(slug, "validate", "report.json");
      const questions = readJson<Rebuilt[]>(slug, "reconstruct", `questions-${report.primary}.json`).map((entry) => entry.question);
      const segmentation = readJson<Segmentation>(slug, "segment", `blocks-${report.primary}.json`);
      const records = Object.keys(stages.analyze!.files)
        .filter((name) => /^q-\d+\.json$/.test(name))
        .map((name) => readJson<AnalysisRecord>(slug, "analyze", name))
        .sort((a, b) => a.number - b.number);
      const analysed = records.filter((record) => record.draft);
      const accepted = records.filter((record) => record.status === "accepted" && record.analysis);
      const proposals = readJson<{ queue: { type: string; slug: string; source: string; inDatabase: boolean }[]; withheld: unknown[] }>(slug, "dna", "proposals.json");
      const uniqueProposals = readJson<{ proposals: { type: string; slug: string }[] }>(slug, "dna", "rows.json").proposals;
      const imported = readJson<{ before: Record<string, number>; after: Record<string, number> }>(slug, "import", "counts.json");
      const disagreements = report.questions.map((question) => question.disagreement).filter((value): value is number => value !== null);
      const ocrCheck = readManual<ManualOcrCheck>(slug, "ocr-check.json");
      const analysisReview = readManual<ManualAnalysisReview>(slug, "analysis-review.json");
      const liveDuplicates = readManual<unknown>(slug, "live-duplicates.json");
      const retries = existsSync(path.join(dataRoot(), "logs", "ai-retries.jsonl"))
        ? readFileSync(path.join(dataRoot(), "logs", "ai-retries.jsonl"), "utf8")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line) as { model: string; status: number })
        : [];
      const facet = (pick: (record: AnalysisRecord) => unknown[]) => {
        const counts = accepted.map((record) => pick(record).length);
        return { coverage: round(counts.filter(Boolean).length / Math.max(1, accepted.length)), meanPerQuestion: mean(counts), unique: new Set(accepted.flatMap((record) => pick(record).map(String))).size };
      };
      const analysis = (record: AnalysisRecord) => record.analysis!;
      const blindChecked = analysed.filter((record) => record.blind && record.answerKey);
      const hashes = questions.map((question) => sha256(normalizeForHash(question)));
      const ownText = questions.map((question) => shingles([question.stem, ...optionLabels.map((label) => question.options[label])].join(" ")));
      const fullText = questions.map((question) => shingles([question.stimulus, question.stem, ...optionLabels.map((label) => question.options[label])].join(" ")));
      const nearPairs: { a: number; b: number; jaccard: number }[] = [];
      for (let i = 0; i < questions.length; i += 1)
        for (let j = i + 1; j < questions.length; j += 1) {
          const sharedPassage = Boolean(questions[i].stimulus) && questions[i].stimulus === questions[j].stimulus;
          const value = sharedPassage ? jaccard(ownText[i], ownText[j]) : jaccard(fullText[i], fullText[j]);
          if (value >= 0.3) nearPairs.push({ a: questions[i].number, b: questions[j].number, jaccard: round(value) });
        }
      const difficultyRows = accepted.map((record) => {
        const question = questions.find((entry) => entry.number === record.number)!;
        return { overall: analysis(record).difficulty.overall, length: words(question.stimulus).length + words(question.stem).length + optionLabels.reduce((sum, label) => sum + words(question.options[label]).length, 0), blind: record.blind?.confidence ?? null };
      });
      const reviewSummary = analysisReview
        ? Object.fromEntries(
            [...new Set(analysisReview.questions.flatMap((question) => Object.keys(question.dimensions)))].map((dimension) => {
              const verdicts = analysisReview.questions.map((question) => question.dimensions[dimension]).filter(Boolean);
              return [dimension, { n: verdicts.length, correct: verdicts.filter((value) => value === "correct").length, partial: verdicts.filter((value) => value === "partial").length, wrong: verdicts.filter((value) => value === "wrong").length }];
            }),
          )
        : null;

      const result = {
        document: slug,
        items: questions.length,
        primaryReading: report.primary,
        "1_ocr": {
          tesseract: stages.ocr!.stats,
          crossReadingCer: { questions: disagreements.length, mean: mean(disagreements), median: quantile(disagreements, 0.5), p90: quantile(disagreements, 0.9), max: disagreements.length ? Math.max(...disagreements) : null, aboveThreshold: report.questions.filter((question) => question.flags.includes("ocr_disagreement")).length },
          manual: ocrCheck && {
            reviewer: ocrCheck.reviewer,
            questions: ocrCheck.questions.length,
            words: ocrCheck.questions.reduce((sum, question) => sum + question.words, 0),
            wordErrorRate: Object.fromEntries(
              [...new Set(ocrCheck.questions.flatMap((question) => Object.keys(question.errors)))].map((reading) => [reading, round(ocrCheck.questions.reduce((sum, question) => sum + (question.errors[reading] ?? 0), 0) / ocrCheck.questions.reduce((sum, question) => sum + question.words, 0), 4)]),
            ),
          },
        },
        "2_segmentation": {
          blocks: segmentation.blocks.length,
          missing: segmentation.missing,
          allFiveOptions: questions.filter((question) => optionLabels.every((label) => question.options[label].trim())).length,
          stimulusWhereExpected: questions.filter((question) => ["cloze", "reading", "dialogue", "paragraph", "irrelevant"].includes(question.section) ? Boolean(question.stimulus?.trim()) : true).length,
          extractionStatus: report.summary,
          answerKey: { answers: Object.keys(report.key.answers).length, disagreements: report.key.disagreements, warnings: report.key.warnings.length },
          manualBoundaries: ocrCheck && { checked: ocrCheck.questions.length, correct: ocrCheck.questions.filter((question) => question.boundaries).length },
        },
        "3_question_type": {
          analysed: analysed.length,
          agreesWithBlueprint: analysed.filter((record) => record.draft!.question_type === record.expectedType).length,
          translationParent: analysed.filter((record) => record.draft!.question_type === "question_type:translation" && record.expectedType?.startsWith("question_type:translation_")).length,
          mismatches: analysed.filter((record) => record.flags.some((flag) => flag.code === "question_type_mismatch" && flag.severity === "block")).map((record) => record.number),
        },
        "4_concepts": facet((record) => analysis(record).knowledge.primary_concepts),
        "4_secondary_concepts": facet((record) => analysis(record).knowledge.secondary_concepts),
        "5_skills": { primary: facet((record) => (analysis(record).skills.primary ? [analysis(record).skills.primary] : [])), secondary: facet((record) => analysis(record).skills.secondary), cognitive: facet((record) => analysis(record).skills.cognitive) },
        "6_grammar": facet((record) => analysis(record).knowledge.grammar),
        "7_vocabulary": { ...facet((record) => analysis(record).knowledge.vocabulary.map((item) => item.ref ?? item.lemma)), linked: accepted.reduce((sum, record) => sum + analysis(record).knowledge.vocabulary.filter((item) => item.ref).length, 0), roles: tally(accepted.flatMap((record) => analysis(record).knowledge.vocabulary.map((item) => item.role))) },
        "8_discourse": { ...facet((record) => analysis(record).knowledge.discourse_relations), answerExpresses: facet((record) => analysis(record).answer_expresses) },
        "9_distractors": {
          classified: accepted.reduce((sum, record) => sum + analysis(record).distractors.length, 0),
          expected: accepted.length * 4,
          types: tally(accepted.flatMap((record) => analysis(record).distractors.map((entry) => entry.type))),
          blindSolve: { checked: blindChecked.length, agreesWithKey: blindChecked.filter((record) => record.blind!.answer === record.answerKey).length, disagreements: blindChecked.filter((record) => record.blind!.answer !== record.answerKey).map((record) => record.number) },
        },
        "10_difficulty": {
          overall: { mean: mean(difficultyRows.map((row) => row.overall)), p10: quantile(difficultyRows.map((row) => row.overall), 0.1), p90: quantile(difficultyRows.map((row) => row.overall), 0.9) },
          spearmanWithLength: spearman(difficultyRows.map((row) => row.overall), difficultyRows.map((row) => row.length)),
          spearmanWithBlindConfidence: spearman(difficultyRows.filter((row) => row.blind !== null).map((row) => row.overall), difficultyRows.filter((row) => row.blind !== null).map((row) => row.blind!)),
        },
        "11_misconceptions": { ...facet((record) => analysis(record).misconceptions), onDistractors: accepted.reduce((sum, record) => sum + analysis(record).distractors.filter((entry) => entry.misconception).length, 0) },
        "12_confidence": {
          bins: [0.5, 0.6, 0.7, 0.8, 0.9, 1.01].map((upper, index, all) => ({ range: `${index ? all[index - 1] : 0}-${Math.min(upper, 1)}`, count: analysed.filter((record) => record.draft!.confidence < upper && record.draft!.confidence >= (index ? all[index - 1] : 0)).length })),
          mean: mean(analysed.map((record) => record.draft!.confidence)),
          modelNeedsReview: analysed.filter((record) => record.draft!.needs_review).length,
        },
        "13_human_review": {
          extractionNeedsReview: report.questions.filter((question) => question.status === "needs_review").map((question) => question.number),
          analysisNeedsReview: records.filter((record) => record.status === "needs_review").map((record) => record.number),
          blockingFlags: tally(records.flatMap((record) => [...new Set(record.flags.filter((flag) => flag.severity === "block").map((flag) => flag.code))])),
          warnings: tally(records.flatMap((record) => [...new Set(record.flags.filter((flag) => flag.severity === "warn").map((flag) => flag.code))])),
        },
        "14_duplicates": { exactWithinBooklet: hashes.length - new Set(hashes).size, nearPairsWithinBooklet: nearPairs, live: liveDuplicates },
        "15_kg_nodes": { canonicalCreated: imported.after.knowledge_nodes - imported.before.knowledge_nodes, knowledgeNodes: imported.after.knowledge_nodes, proposalsInDatabase: uniqueProposals.length, proposalsByType: tally(uniqueProposals.map((proposal) => proposal.type)), queueEntries: proposals.queue.length, queueBySource: tally(proposals.queue.map((proposal) => proposal.source)), withheld: proposals.withheld.length },
        "16_kg_edges": { canonicalCreated: imported.after.knowledge_edges - imported.before.knowledge_edges, knowledgeEdges: imported.after.knowledge_edges, questionNodeLinks: imported.after.question_nodes, distractorRows: imported.after.distractors, families: imported.after.families, familyMembers: imported.after.family_members, questionProposalLinks: imported.after.question_proposals },
        "17_ambiguities": { questions: analysed.filter((record) => record.draft!.ambiguities.length).map((record) => record.number), notes: analysed.reduce((sum, record) => sum + record.draft!.ambiguities.length, 0) },
        "18_failed": records.filter((record) => record.status === "failed").map((record) => ({ number: record.number, flags: record.flags.map((flag) => flag.code), error: record.error?.slice(0, 120) })),
        "19_pipeline_errors": { retries: tally(retries.map((entry) => `${entry.model} ${entry.status}`)), invalidOutputs: records.filter((record) => record.flags.some((flag) => flag.code === "analysis_invalid")).length, blindSolveMissing: analysed.filter((record) => !record.blind).length },
        usage: readJson<{ usage: unknown }>(slug, "analyze", "summary.json").usage,
        manualAnalysisReview: reviewSummary,
      };
      return { files: { "metrics.json": `${JSON.stringify(result, null, 1)}\n` }, stats: { accepted: accepted.length, analysed: analysed.length } };
    },
  );
}
