import { usableForDistribution } from "@/modules/analysis/acceptance";
import type { DnaQuestion } from "@/modules/analysis/dna";
import { shingles } from "@/modules/analysis/validate";
import type { NodeRef } from "@/modules/knowledge/graph";

export type GoldRole = "production_exemplar" | "evaluation_holdout";

export type GoldRow = { question: DnaQuestion; fullTextAvailable: boolean };

/** Passage items stay together. Other items share a family when type and primary concepts match. */
export function goldFamilyId(question: DnaQuestion): string {
  if (question.stimulusKey) return `passage:${question.document}:${question.stimulusKey}`;
  const primaries = [...new Set(question.nodes.filter((node) => node.facet === "primary_concept").map((node) => node.ref))].sort();
  return `concept:${question.questionType}:${primaries.join("+") || "concept:none"}`;
}

export function assignGoldRole(familyId: string): GoldRole {
  let hash = 2166136261;
  for (const char of familyId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? "evaluation_holdout" : "production_exemplar";
}

export type AbstractExemplar = {
  role: "production_exemplar";
  familyId: string;
  questionType: NodeRef;
  construct: string;
  discourse: NodeRef[];
  syntax: NodeRef[];
  /** DNA has no verified scope judgment. The field stays empty rather than inventing one. */
  scope: null;
  distractorMechanisms: string[];
  surface: { stemWords: number; optionWords: number; sentenceCount: number };
  /** Stored DNA review state is visible and is not treated as a human judgment. */
  labelTrust: "dna_labels_are_not_human_judgment";
  recordedHumanReviewStatus: DnaQuestion["humanReviewStatus"];
  textIncluded: false;
  distributionUse: boolean;
};

export type HoldoutIdentity = {
  role: "evaluation_holdout";
  familyId: string;
  document: string;
  number: number;
  questionType: NodeRef;
  textSha256: string;
  labelTrust: "dna_labels_are_not_human_judgment";
  recordedHumanReviewStatus: DnaQuestion["humanReviewStatus"];
  textIncluded: false;
};

export type GoldSplit = {
  production: AbstractExemplar[];
  evaluation: HoldoutIdentity[];
  withheld: { familyId: string; reason: "full_text_unavailable" }[];
};

const refs = (question: DnaQuestion, facet: DnaQuestion["nodes"][number]["facet"]) =>
  [...new Set(question.nodes.filter((node) => node.facet === facet).map((node) => node.ref))].sort();

function exemplar(members: DnaQuestion[], familyId: string): AbstractExemplar {
  const unique = (values: NodeRef[]) => [...new Set(values)].sort();
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const statuses = new Set(members.map((member) => member.humanReviewStatus));
  return {
    role: "production_exemplar",
    familyId,
    questionType: unique(members.map((member) => member.questionType))[0],
    construct: unique(members.flatMap((member) => refs(member, "primary_concept"))).join("+") || "concept:none",
    discourse: unique(members.flatMap((member) => refs(member, "discourse"))),
    syntax: unique(members.flatMap((member) => refs(member, "grammar"))),
    scope: null,
    distractorMechanisms: unique(members.flatMap((member) => member.distractors.flatMap((entry) => [entry.type, ...(entry.misconception ? [entry.misconception] : [])]))),
    surface: {
      stemWords: mean(members.map((member) => member.surface.stemWordCount)),
      optionWords: mean(members.map((member) => member.surface.optionWordMean)),
      sentenceCount: mean(members.map((member) => member.surface.sentenceCount)),
    },
    labelTrust: "dna_labels_are_not_human_judgment",
    recordedHumanReviewStatus: statuses.size === 1 ? members[0].humanReviewStatus : "unreviewed",
    textIncluded: false,
    distributionUse: members.every((member) => usableForDistribution(member.sourceClass)),
  };
}

/**
 * Splits text-free DNA rows. A family goes entirely to one side.
 * A family missing any full text is withheld from both prompt sets.
 * The result contains no item wording.
 */
export function splitGold(rows: GoldRow[]): GoldSplit {
  const byFamily = new Map<string, GoldRow[]>();
  for (const row of rows) {
    const familyId = goldFamilyId(row.question);
    byFamily.set(familyId, [...(byFamily.get(familyId) ?? []), row]);
  }
  const production: AbstractExemplar[] = [];
  const evaluation: HoldoutIdentity[] = [];
  const withheld: GoldSplit["withheld"] = [];
  for (const [familyId, members] of [...byFamily].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (members.some((member) => !member.fullTextAvailable)) {
      withheld.push({ familyId, reason: "full_text_unavailable" });
      continue;
    }
    const role = assignGoldRole(familyId);
    if (role === "production_exemplar") production.push(exemplar(members.map((member) => member.question), familyId));
    else {
      for (const member of members) {
        evaluation.push({
          role,
          familyId,
          document: member.question.document,
          number: member.question.number,
          questionType: member.question.questionType,
          textSha256: member.question.textSha256,
          labelTrust: "dna_labels_are_not_human_judgment",
          recordedHumanReviewStatus: member.question.humanReviewStatus,
          textIncluded: false,
        });
      }
    }
  }
  return { production, evaluation, withheld };
}

/** Empty input is not a pass. The caller must stop before treating a missing corpus as clearance. */
export function officialCorpusLoaded(officialTexts: readonly string[] | undefined): boolean {
  return Boolean(officialTexts?.some((text) => text.trim()));
}

export type SurfaceScreen = { status: "not_run" | "clear" | "overlap"; sharedRun: string | null; similarityIsNotLicense: true };

/** A clear screen is the absence of a shared shingle. It is not permission to publish. */
export function screenOfficialSurface(draft: string, officialTexts: readonly string[] | undefined): SurfaceScreen {
  if (!officialCorpusLoaded(officialTexts)) return { status: "not_run", sharedRun: null, similarityIsNotLicense: true };
  const overlap = officialSurfaceOverlap(draft, [...officialTexts!]);
  return { status: overlap.rejected ? "overlap" : "clear", sharedRun: overlap.sharedRun, similarityIsNotLicense: true };
}

/** Shared wording with an official item. This is a surface screen, not a semantic judgment. */
export function officialSurfaceOverlap(draft: string, officialTexts: string[], size = 5): { rejected: boolean; sharedRun: string | null } {
  const hits = sharedOfficialRuns(draft, officialTexts, size);
  return { rejected: hits.length > 0, sharedRun: hits[0] ?? null };
}

export function sharedOfficialRuns(draft: string, officialTexts: string[], size = 5): string[] {
  const official = new Set<string>();
  for (const text of officialTexts) {
    for (const shingle of shingles(text, size)) official.add(shingle);
    const whole = text.trim().toLowerCase();
    if (whole) official.add(whole);
  }
  const hits: string[] = [];
  for (const shingle of shingles(draft, size)) if (official.has(shingle) && !hits.includes(shingle)) hits.push(shingle);
  const wholeDraft = draft.trim().toLowerCase();
  if (wholeDraft && official.has(wholeDraft) && !hits.includes(wholeDraft)) hits.push(wholeDraft);
  return hits;
}

/**
 * Standard exam instructions. A hit is ignored only when it is one of these runs
 * and it occurs in the instruction, not in the passage, the key, or an option.
 */
const standardInstructionTemplates = [
  "Which statement best expresses the main idea of the passage?",
  "According to the passage",
  "Which of the following",
  "It can be inferred from the passage",
  "The primary purpose of the passage",
];

/** Five-word runs that occur inside a standard exam instruction. */
export const standardInstructionShingles = [...new Set(standardInstructionTemplates.flatMap((instruction) => [...shingles(instruction, 5)]))];

const standardInstructionSet = new Set<string>(standardInstructionShingles);

/** Passage, key and options stay fully screened. A standard stem shingle does not license a content copy. */
export function screenExamSurface(parts: { instructions: string; content: string }, officialTexts: readonly string[] | undefined): SurfaceScreen {
  if (!officialCorpusLoaded(officialTexts)) return { status: "not_run", sharedRun: null, similarityIsNotLicense: true };
  const texts = [...officialTexts!];
  const contentHit = sharedOfficialRuns(parts.content, texts)[0];
  if (contentHit) return { status: "overlap", sharedRun: contentHit, similarityIsNotLicense: true };
  const instructionHit = sharedOfficialRuns(parts.instructions, texts).find((run) => !standardInstructionSet.has(run));
  if (instructionHit) return { status: "overlap", sharedRun: instructionHit, similarityIsNotLicense: true };
  return { status: "clear", sharedRun: null, similarityIsNotLicense: true };
}

const studentBankDestination = /bank-import|student-bank|(?:^|\/)items(?:\/|$)|db:items/;

export function refuseStudentBankWrite(destination: string): void {
  if (studentBankDestination.test(destination)) throw new Error("item-model factory does not write the student bank");
}
