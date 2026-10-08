import type { NodeRef } from "@/modules/knowledge/graph";
import { knowledgeNodes } from "@/modules/knowledge/seed";
import type { Count } from "./dna";

export const proposalDecisions = ["pending", "merge", "reject", "recommend_accept"] as const;
export type ProposalDecision = (typeof proposalDecisions)[number];

export type ProposalInput = { type: string; slug: string; name?: string; questions: number };

export type ProposalReview = {
  type: string;
  slug: string;
  name: string;
  questions: number;
  decision: ProposalDecision;
  mergeInto?: NodeRef;
  reason: string;
};

const existing = new Map(knowledgeNodes.map((node) => [`${node.type}:${node.slug}`, node]));

const noisy = new Set(["the", "a", "an", "of", "and", "or", "to", "in", "on", "for", "with", "as", "by", "from", "that", "this", "it"]);

function mergeTarget(type: string, slug: string): NodeRef | null {
  const exact = existing.get(`${type}:${slug}`);
  return exact ? `${exact.type}:${exact.slug}` : null;
}

/** Review proposals without inserting canonical nodes. Hapax vocabulary is rejected; existing slugs merge. */
export function reviewProposals(proposals: ProposalInput[], counts?: Count[]): ProposalReview[] {
  const byKey = new Map(counts?.map((entry) => [entry.key, entry.count]));
  return [...proposals]
    .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.slug < b.slug ? -1 : 1))
    .map((proposal) => {
      const name = proposal.name ?? proposal.slug;
      const questions = byKey?.get(`${proposal.type}:${proposal.slug}`) ?? proposal.questions;
      const mergeInto = mergeTarget(proposal.type, proposal.slug);
      if (mergeInto) {
        return { type: proposal.type, slug: proposal.slug, name, questions, decision: "merge" as const, mergeInto, reason: `Already in the graph as ${mergeInto}.` };
      }
      if (proposal.type === "vocabulary" && (proposal.slug.length < 3 || noisy.has(proposal.slug) || questions <= 1)) {
        return { type: proposal.type, slug: proposal.slug, name, questions, decision: "reject" as const, reason: "Hapax or noisy vocabulary lemma; not a concept node." };
      }
      if (questions >= 3 && proposal.type !== "vocabulary") {
        return {
          type: proposal.type,
          slug: proposal.slug,
          name,
          questions,
          decision: "recommend_accept" as const,
          reason: `Seen on ${questions} questions; a human should add it to the seed if the name is a real YDS concept.`,
        };
      }
      return { type: proposal.type, slug: proposal.slug, name, questions, decision: "pending" as const, reason: "Needs a human look; not auto-canonical." };
    });
}

export function proposalSummary(reviews: ProposalReview[]) {
  const counts = Object.fromEntries(proposalDecisions.map((decision) => [decision, reviews.filter((row) => row.decision === decision).length])) as Record<ProposalDecision, number>;
  return { total: reviews.length, ...counts, canonicalInserts: 0 };
}
