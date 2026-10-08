import { coverageDecision, type CoverageReport } from "@/modules/analysis/coverage";
import { distributionCorpus, mergeProposalInputs, ydsDnaV1 } from "@/modules/analysis/corpus";
import type { DnaQuestion } from "@/modules/analysis/dna";
import { extractionFreezeMetrics, type FreezeMetrics } from "@/modules/analysis/freeze";
import type { ProposalInput } from "@/modules/analysis/proposals";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataRoot, readJson, readManifest } from "../lib/artifacts";
import { assertTextFree } from "../lib/text-free";
import type { ValidationReport } from "./extraction";

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

type Skeleton = { rows: { questionType: string; extractionStatus: string }[] };
type Bundle = { questions: DnaQuestion[]; proposals: { type: string; slug: string; name: string; questions: number[] }[] };

function loadBundle(slug: string): Bundle | null {
  return readManifest(slug, "dna") ? readJson<Bundle>(slug, "dna", "rows.json") : null;
}

function loadSkeleton(slug: string): Skeleton | null {
  return readManifest(slug, "dna-skeleton") ? readJson<Skeleton>(slug, "dna-skeleton", "skeleton.json") : null;
}

function freezeOf(slug: string, expected = 80): FreezeMetrics | null {
  const report = readManifest(slug, "validate") ? readJson<ValidationReport>(slug, "validate", "report.json") : null;
  if (!report) return null;
  return extractionFreezeMetrics({ expected, missing: report.summary.missing, questions: report.questions });
}

/** Aggregate analysed exams into YDS DNA v1. Writes text-free JSON only. */
export async function corpus() {
  const bundles = distributionCorpus.map((slug) => ({ slug, bundle: loadBundle(slug) }));
  const missing = bundles.filter((entry) => !entry.bundle).map((entry) => entry.slug);
  if (missing.length) throw new Error(`DNA missing for ${missing.join(", ")}.`);

  const questions = bundles.flatMap((entry) => entry.bundle!.questions);
  const proposals: ProposalInput[] = mergeProposalInputs(
    bundles.map((entry) => ({
      slug: entry.slug,
      proposals: (entry.bundle!.proposals ?? []).map((proposal) => ({ type: proposal.type, slug: proposal.slug, name: proposal.name, questions: proposal.questions.length })),
    })),
  );
  const dna = ydsDnaV1({ questions, proposals });
  const coverage: Record<string, CoverageReport> = {};
  for (const slug of ["yds-2015-spring", "yds-2015-fall"]) {
    const skeleton = loadSkeleton(slug);
    coverage[slug] = coverageDecision({ candidate: skeleton?.rows ?? [], corpus: dna.dna.questionTypes });
  }
  const freeze = Object.fromEntries(["yds-2024-11", "yds-2018", "yds-2018-2", "yds-2023-10", "yds-2024-03"].map((slug) => [slug, freezeOf(slug)]));
  const payload = {
    dna: {
      ...dna,
      proposalReview: {
        summary: dna.proposalReview.summary,
        reviews: dna.proposalReview.reviews.map((row) => ({
          type: row.type,
          slug: row.slug,
          questions: row.questions,
          decision: row.decision,
          mergeInto: row.mergeInto ?? null,
        })),
      },
    },
    coverage: Object.fromEntries(
      Object.entries(coverage).map(([slug, report]) => [slug, { decision: report.decision, candidateOk: report.candidateOk, novelTypes: report.novelTypes, byType: report.byType }]),
    ),
    freeze,
    patternOnly: { evidenceScope: "pattern_only", usableForDistribution: false },
  };
  assertTextFree(payload);
  const dir = path.join(dataRoot(), "_corpus");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "yds-dna-v1.json"), json(payload));
  return {
    cached: existsSync(path.join(dir, "yds-dna-v1.json")),
    questions: dna.questions,
    documents: dna.documents,
    proposals: dna.proposalReview.summary,
    coverage: Object.fromEntries(Object.entries(coverage).map(([slug, report]) => [slug, report.decision])),
    freeze: Object.fromEntries(Object.entries(freeze).map(([slug, metrics]) => [slug, metrics?.freeze ?? null])),
  };
}
