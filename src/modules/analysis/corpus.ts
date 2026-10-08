import type { DnaQuestion, DnaReport } from "./dna";
import { countBy, forOverallDistribution, mineDna, type Count } from "./dna";
import { proposalSummary, reviewProposals, type ProposalInput, type ProposalReview } from "./proposals";
import { typeSaturationCount } from "./thresholds";

export const distributionCorpus = ["yds-2024-11", "yds-2018", "yds-2018-2", "yds-2023-10"] as const;

export type DnaV1 = {
  version: "1";
  questions: number;
  documents: string[];
  dna: DnaReport;
  unsaturatedTypes: Count[];
  rare: { grammar: Count[]; discourse: Count[]; distractorTypes: Count[]; misconceptions: Count[] };
  combinations: { concept: string; questionType: string; count: number }[];
  proposalReview: { summary: ReturnType<typeof proposalSummary>; reviews: ProposalReview[] };
};

export function unsaturatedTypes(counts: Count[], saturation = typeSaturationCount): Count[] {
  return counts.filter((entry) => entry.count < saturation).sort((a, b) => a.count - b.count || (a.key < b.key ? -1 : 1));
}

export function rareItems(counts: Count[], max = 2): Count[] {
  return counts.filter((entry) => entry.count <= max);
}

export function ydsSpecificCombinations(dna: DnaReport, min = 3): { concept: string; questionType: string; count: number }[] {
  const rows: { concept: string; questionType: string; count: number }[] = [];
  for (const [concept, columns] of Object.entries(dna.conceptByQuestionType.cells)) {
    for (const [questionType, count] of Object.entries(columns)) {
      if (count >= min) rows.push({ concept, questionType, count });
    }
  }
  return rows.sort((a, b) => b.count - a.count || (a.concept < b.concept ? -1 : 1) || (a.questionType < b.questionType ? -1 : 1));
}

export function mergeProposalInputs(documents: { slug: string; proposals: ProposalInput[] }[]): ProposalInput[] {
  const merged = new Map<string, ProposalInput>();
  for (const document of documents) {
    for (const proposal of document.proposals) {
      const key = `${proposal.type}:${proposal.slug}`;
      const existing = merged.get(key);
      if (!existing) merged.set(key, { ...proposal });
      else existing.questions += proposal.questions;
    }
  }
  return [...merged.values()].sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.slug < b.slug ? -1 : 1));
}

/** Historical ACCEPT rows → YDS DNA v1. Topic slices must already be excluded. */
export function ydsDnaV1(input: { questions: DnaQuestion[]; proposals?: ProposalInput[] }): DnaV1 {
  const questions = forOverallDistribution(input.questions);
  const documents = [...new Set(questions.map((question) => question.document))].sort();
  const dna = mineDna(questions);
  const reviews = reviewProposals(input.proposals ?? countBy(questions.flatMap((question) => question.proposals.map((proposal) => `${proposal.type}:${proposal.slug}`))).map((entry) => {
    const [type, slug] = [entry.key.split(":")[0], entry.key.slice(entry.key.indexOf(":") + 1)];
    return { type, slug, name: slug.replaceAll("_", " "), questions: entry.count };
  }));
  return {
    version: "1",
    questions: questions.length,
    documents,
    dna,
    unsaturatedTypes: unsaturatedTypes(dna.questionTypes),
    rare: {
      grammar: rareItems(dna.grammar),
      discourse: rareItems(dna.discourse),
      distractorTypes: rareItems(dna.distractorTypes),
      misconceptions: rareItems(dna.misconceptions),
    },
    combinations: ydsSpecificCombinations(dna),
    proposalReview: { summary: proposalSummary(reviews), reviews },
  };
}
