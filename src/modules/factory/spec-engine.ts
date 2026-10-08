import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { DnaReport } from "@/modules/analysis/dna";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { knowledgeEdges, knowledgeNodes, knowledgeVersion } from "@/modules/knowledge/seed";
import { connectorsFor, relationConnectors, type FamilyBlueprint } from "./families";
import { findFamily, type Evidence, type YdsExamProfile } from "./profile";
import { questionSpec, type QuestionSpec } from "./spec";
import { dnaVersion, factoryVersions } from "./versions";

export type SpecTarget = { questionType: NodeRef; primaryConcept: NodeRef; misconception: NodeRef | null; band: QuestionSpec["difficulty"]["band"] };

/** Non-canonical context settings: rotated so a batch does not reuse one subject area. */
export const contextDomains = [
  "biology",
  "medicine",
  "psychology",
  "history",
  "economics",
  "environmental_science",
  "linguistics",
  "astronomy",
  "education",
  "archaeology",
  "sociology",
  "engineering",
] as const;

const bandTarget = { easy: 0.3, medium: 0.55, hard: 0.75 } as const;
const bandCefr = { easy: "B1", medium: "B2", hard: "C1" } as const;
const known = new Set(knowledgeNodes.map((node) => `${node.type}:${node.slug}`));

const related = (misconception: NodeRef) =>
  knowledgeEdges.filter((edge) => edge.type === "related_to" && (edge.from === misconception || edge.to === misconception)).map((edge) => (edge.from === misconception ? edge.to : edge.from));

/** Which type and concept to produce next: the type the bank has least of relative to the DNA, then its most tested concept. */
export function pickTarget(input: { dna: DnaReport; productionTypeCounts?: { key: string; count: number }[]; request?: Partial<SpecTarget> }): SpecTarget {
  const { dna, request } = input;
  const have = new Map((input.productionTypeCounts ?? []).map((entry) => [entry.key, entry.count]));
  const questionType =
    request?.questionType ??
    (dna.questionTypes
      .map((entry) => ({ type: entry.key as NodeRef, dna: entry.count, ratio: (have.get(entry.key) ?? 0) / entry.count }))
      .sort((a, b) => a.ratio - b.ratio || b.dna - a.dna || (a.type < b.type ? -1 : 1))[0]?.type as NodeRef);
  const cells = dna.conceptByQuestionType.cells;
  const primaryConcept =
    request?.primaryConcept ??
    (dna.concepts
      .map((entry) => ({ concept: entry.key as NodeRef, n: cells[entry.key]?.[questionType] ?? 0 }))
      .filter((entry) => entry.n > 0)
      .sort((a, b) => b.n - a.n || (a.concept < b.concept ? -1 : 1))[0]?.concept as NodeRef);
  const misconception =
    request?.misconception !== undefined
      ? request.misconception
      : ((dna.misconceptions.find((entry) => related(entry.key as NodeRef).includes(primaryConcept))?.key as NodeRef | undefined) ?? null);
  return { questionType, primaryConcept, misconception, band: request?.band ?? "medium" };
}

const top = (list: Evidence[], fallback: NodeRef) => list[0]?.ref ?? fallback;
export const connectorSurface = (connector: NodeRef) => knowledgeNodes.find((node) => `${node.type}:${node.slug}` === connector)?.name ?? parseRef(connector).slug.replaceAll("_", " ");

/** The DNA range for the type, widened around the median so a narrow sample does not pin every item to one length. */
function wordRange(range: { min: number; median: number; max: number }, floor: number, ceiling: number) {
  return { min: Math.max(floor, Math.floor(Math.min(range.min, range.median * 0.7))), max: Math.min(ceiling, Math.ceil(Math.max(range.max, range.median * 1.3))) };
}

/** Deterministic: the same profile, family, band and ordinal always give the same spec. No model is called. */
export function buildQuestionSpec(input: { profile: YdsExamProfile; family: FamilyBlueprint; ordinal: number; band?: QuestionSpec["difficulty"]["band"] }): QuestionSpec {
  const { profile, family, ordinal } = input;
  if (!Number.isInteger(ordinal) || ordinal < 1) throw new Error("ordinal must be a positive integer");
  const evidence = findFamily(profile, family.id);
  if (!evidence) throw new Error(`family ${family.id} has no DNA evidence in ${profile.version}`);
  const type = profile.questionTypes.find((entry) => entry.ref === family.questionType);
  if (!type) throw new Error(`question type ${family.questionType} has no DNA evidence`);

  const band = input.band ?? (evidence.difficulty < 0.4 ? "easy" : evidence.difficulty < 0.7 ? "medium" : "hard");
  const correctOption = optionLabels[(ordinal - 1) % optionLabels.length];
  const rest = optionLabels.filter((label) => label !== correctOption);
  const shift = (ordinal - 1) % family.distractors.length;
  const rotated = [...family.distractors.slice(shift), ...family.distractors.slice(0, shift)];
  const distractorPlan = rotated.map((slot, index) => ({
    option: rest[index] as OptionLabel,
    distractorType: slot.distractorType,
    expresses: slot.expresses,
    connectors: connectorsFor(slot.expresses, family.grammarPattern, family.excludedConnectors),
    misconception: slot.misconception,
  }));
  const misconception = family.distractors.find((slot) => slot.misconception)?.misconception ?? null;
  const misconceptionEvidence = misconception ? evidence.misconceptions.find((entry) => entry.ref === misconception) : undefined;
  const requiredKnowledge = [
    family.grammarPattern,
    ...knowledgeEdges.filter((edge) => edge.type === "has_pattern" && edge.to === family.grammarPattern && edge.from.startsWith("grammar:")).map((edge) => edge.from),
    ...knowledgeEdges.filter((edge) => edge.type === "prerequisite" && edge.from === family.primaryConcept).map((edge) => edge.to),
  ];
  const secondaryConcepts = type.concepts
    .map((entry) => entry.ref)
    .filter((value) => value !== family.primaryConcept && value.startsWith("grammar:"))
    .slice(0, 1);

  const spec: QuestionSpec = {
    version: factoryVersions.questionSpec,
    id: `${family.id}.${band}.${String(ordinal).padStart(3, "0")}`,
    exam: "yds",
    knowledgeVersion: knowledgeVersion.version,
    questionType: family.questionType,
    questionFamily: family.id,
    structuralFormat: family.structuralFormat,
    primaryConcept: family.primaryConcept,
    secondaryConcepts,
    targetSkill: top(type.skills, "skill:coherence"),
    cognitiveSkill: top(type.cognitive, "cognitive_skill:logical_relationship"),
    difficulty: { band, cefr: bandCefr[band], target: bandTarget[band] },
    requiredKnowledge: [...new Set(requiredKnowledge)],
    targetMisconception: misconception,
    discourseRelation: family.answerRelation,
    grammarPattern: family.grammarPattern,
    vocabularyConstraints: { register: "academic", cefrCeiling: band === "hard" ? "C1" : "B2", forbiddenInDistractors: [...relationConnectors(family.answerRelation).map(connectorSurface), ...family.relationMarkers].sort() },
    distractorPlan,
    contextConstraints: {
      domain: contextDomains[(ordinal - 1) % contextDomains.length],
      blankPosition: ordinal % 2 === 0 ? "start" : "end",
      stemWords: wordRange(type.surface.stemWords, 7, 28),
      optionWords: wordRange(type.surface.optionWords, 6, 26),
      sentences: 1,
    },
    originalityConstraints: { maxSharedRun: 5, historicalTextInPrompt: false, fewShotFromHistory: false },
    answerConstraints: { correctOption, connectors: connectorsFor(family.answerRelation, family.grammarPattern, family.excludedConnectors), singleDefensibleAnswer: true },
    explanationRequirements: { language: "tr", address: "sen", maxWords: 90, mustName: ["correct_connector", "relation", "each_distractor_failure"] },
    evidenceReferences: {
      dnaVersion,
      profileVersion: profile.version,
      documents: profile.documents,
      family: { questions: evidence.questions, documents: evidence.documents, level: evidence.level },
      misconception: misconceptionEvidence ? { labelled: misconceptionEvidence.labelled, consistent: misconceptionEvidence.consistent } : null,
    },
    generationConstraints: { singleCorrectAnswer: true, avoidUnintendedClues: true, originalContent: true, noNewTaxonomy: true },
  };
  const unknown = [spec.questionType, spec.primaryConcept, spec.targetSkill, spec.cognitiveSkill, ...spec.requiredKnowledge, ...spec.secondaryConcepts, ...spec.answerConstraints.connectors, ...spec.distractorPlan.flatMap((slot) => [slot.distractorType, slot.expresses, slot.misconception, ...slot.connectors])].filter(
    (value): value is NodeRef => !!value && !known.has(value),
  );
  if (unknown.length) throw new Error(`spec references unknown nodes: ${unknown.join(", ")}`);
  if (!spec.answerConstraints.connectors.length || spec.distractorPlan.some((slot) => !slot.connectors.length)) throw new Error(`family ${family.id} has a relation without a connector for ${family.grammarPattern}`);
  return questionSpec.parse(spec);
}
