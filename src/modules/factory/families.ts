import type { StructuralFormat } from "@/modules/analysis/surface";
import type { NodeRef } from "@/modules/knowledge/graph";
import { knowledgeEdges } from "@/modules/knowledge/seed";
import type { DistractorSlot } from "./spec";

/** What the generator may build for one question family. Relations and connectors resolve through the canonical graph. */
export type FamilyBlueprint = {
  id: string;
  questionType: NodeRef;
  structuralFormat: StructuralFormat;
  primaryConcept: NodeRef;
  grammarPattern: NodeRef;
  /** Each option opens with a clause connector and the candidate chooses by relation and content. */
  optionShape: "connector_clause";
  answerRelation: NodeRef;
  distractors: { distractorType: NodeRef; expresses: NodeRef; misconception: NodeRef | null }[];
  excludedConnectors: NodeRef[];
  /** Markers with the answer relation that are not graph connectors yet; also banned from wrong options. */
  relationMarkers: string[];
};

export function connectorsFor(relation: NodeRef, pattern: NodeRef | null, excluded: NodeRef[] = []): NodeRef[] {
  const expressed = knowledgeEdges.filter((edge) => edge.type === "expressed_by" && edge.from === relation).map((edge) => edge.to);
  const shaped = pattern ? new Set(knowledgeEdges.filter((edge) => edge.type === "has_pattern" && edge.to === pattern).map((edge) => edge.from)) : null;
  return expressed.filter((connector) => (!shaped || shaped.has(connector)) && !excluded.includes(connector)).sort();
}

/** Every connector of a relation, whatever its pattern: none of them may appear in a wrong option. */
export const relationConnectors = (relation: NodeRef) => connectorsFor(relation, null);

export type ConnectorMenu = {
  distractorType: NodeRef;
  expresses: NodeRef;
  misconception: NodeRef | null;
  connectors: NodeRef[];
};

function clauseConnectors(relation: NodeRef): NodeRef[] {
  const family = familyBlueprints["sentence_completion.concession"];
  return connectorsFor(relation, family.grammarPattern, family.excludedConnectors);
}

/**
 * Connector allowlist for one planned relation family. Generation and the full-item validator both read this.
 * An unknown family returns null so the caller keeps its closed list instead of accepting every connector.
 */
export function connectorsForFamily(family: string): ConnectorMenu | null {
  const menu = (expresses: NodeRef, distractorType: NodeRef, misconception: NodeRef | null, connectors: NodeRef[]): ConnectorMenu => ({
    distractorType,
    expresses,
    misconception,
    connectors,
  });
  if (family === "near_concession") {
    return menu(
      "discourse_relation:contrast",
      "distractor_type:wrong_discourse_relation",
      "misconception:concession_vs_contrast",
      [...new Set([...clauseConnectors("discourse_relation:contrast"), ...clauseConnectors("discourse_relation:concession")])].sort(),
    );
  }
  if (family === "contrast") return menu("discourse_relation:contrast", "distractor_type:wrong_discourse_relation", "misconception:concession_vs_contrast", clauseConnectors("discourse_relation:contrast"));
  if (family === "cause") return menu("discourse_relation:cause", "distractor_type:wrong_discourse_relation", null, clauseConnectors("discourse_relation:cause"));
  if (family === "condition") return menu("discourse_relation:condition", "distractor_type:wrong_discourse_relation", null, clauseConnectors("discourse_relation:condition"));
  if (family === "time") return menu("discourse_relation:sequence", "distractor_type:logical_incompatibility", null, clauseConnectors("discourse_relation:sequence"));
  return null;
}

/** The slot whose connector list the written clause must match. A plan counts only when its strategy is natural and its family is known. */
export function slotForBlueprint(slot: DistractorSlot, blueprint: { relationFamily: string; connectorStrategy: string } | undefined): DistractorSlot {
  const menu = blueprint?.connectorStrategy === "natural" ? connectorsForFamily(blueprint.relationFamily) : null;
  if (!menu) return slot;
  return { ...slot, distractorType: menu.distractorType, expresses: menu.expresses, misconception: menu.misconception, connectors: menu.connectors };
}

export const familyBlueprints: Record<string, FamilyBlueprint> = {
  "sentence_completion.concession": {
    id: "sentence_completion.concession",
    questionType: "question_type:sentence_completion",
    structuralFormat: "sentence_stem_completion",
    primaryConcept: "discourse_relation:concession",
    grammarPattern: "grammar_pattern:clause_connector",
    optionShape: "connector_clause",
    answerRelation: "discourse_relation:concession",
    distractors: [
      { distractorType: "distractor_type:wrong_discourse_relation", expresses: "discourse_relation:contrast", misconception: "misconception:concession_vs_contrast" },
      { distractorType: "distractor_type:wrong_discourse_relation", expresses: "discourse_relation:cause", misconception: null },
      { distractorType: "distractor_type:wrong_discourse_relation", expresses: "discourse_relation:condition", misconception: null },
      { distractorType: "distractor_type:logical_incompatibility", expresses: "discourse_relation:sequence", misconception: null },
    ],
    // "but" also carries a concessive reading, so a "but" option would be a second defensible answer.
    excludedConnectors: ["connector:but"],
    relationMarkers: ["though", "while", "even if", "even so"],
  },
};

/** Surfaces banned from wrong options in the baseline contract. Relational items lift this ban and judge the sentence. */
export const concessiveMarkerBan = ["although", "even though", "despite", "nevertheless", "though", "while", "even if", "even so"] as const;
