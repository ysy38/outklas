export const nodeTypes = [
  "domain",
  "question_type",
  "skill",
  "cognitive_skill",
  "grammar",
  "grammar_pattern",
  "discourse_relation",
  "connector",
  "misconception",
  "distractor_type",
  "vocabulary",
  "topic",
] as const;
export type NodeType = (typeof nodeTypes)[number];

export const edgeTypes = [
  "parent_of",
  "prerequisite",
  "related_to",
  "contrasts_with",
  "often_confused_with",
  "expressed_by",
  "has_pattern",
  "measures",
  "exploits",
  "synonym_of",
  "antonym_of",
  "collocates_with",
  "derived_from",
] as const;
export type EdgeType = (typeof edgeTypes)[number];

export type LegacyKind = "section" | "skill" | "distractor" | "connector" | "relation";
export type MatchKind = "exact" | "broader" | "narrower" | "related";
export type NodeStatus = "draft" | "active" | "deprecated";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** Written as `type:slug`, e.g. `discourse_relation:concession`. */
export type NodeRef = `${NodeType}:${string}`;

export type KnowledgeNode = {
  type: NodeType;
  slug: string;
  name: string;
  nameTr?: string;
  description?: string;
  cefrLevel?: CefrLevel;
  status?: NodeStatus;
  metadata?: Record<string, unknown>;
};

export type KnowledgeEdge = { type: EdgeType; from: NodeRef; to: NodeRef };

export type LegacyMapping = { kind: LegacyKind; id: string; node: NodeRef; match: MatchKind };

export function ref(node: Pick<KnowledgeNode, "type" | "slug">): NodeRef {
  return `${node.type}:${node.slug}`;
}

export function parseRef(value: NodeRef): { type: NodeType; slug: string } {
  const at = value.indexOf(":");
  return { type: value.slice(0, at) as NodeType, slug: value.slice(at + 1) };
}

/** Stored once, with `from < to`. */
export const symmetricEdges: ReadonlySet<EdgeType> = new Set(["related_to", "contrasts_with", "often_confused_with", "synonym_of", "antonym_of"]);

export const acyclicEdges: readonly EdgeType[] = ["parent_of", "prerequisite"];

const concepts: NodeType[] = ["skill", "cognitive_skill", "grammar", "grammar_pattern", "discourse_relation"];
const lexical: NodeType[] = ["vocabulary", "connector"];

export const edgeRules: Record<EdgeType, { from: readonly NodeType[]; to: readonly NodeType[] }> = {
  parent_of: { from: ["domain", "question_type", "topic", ...concepts], to: ["question_type", "topic", "vocabulary", ...concepts] },
  prerequisite: { from: concepts, to: concepts },
  related_to: { from: nodeTypes, to: nodeTypes },
  contrasts_with: { from: nodeTypes, to: nodeTypes },
  often_confused_with: { from: nodeTypes, to: nodeTypes },
  expressed_by: { from: ["discourse_relation"], to: ["connector"] },
  has_pattern: { from: ["connector", "grammar"], to: ["grammar_pattern"] },
  measures: { from: ["question_type"], to: ["skill", "cognitive_skill", "grammar", "discourse_relation"] },
  exploits: { from: ["distractor_type"], to: ["misconception"] },
  synonym_of: { from: lexical, to: lexical },
  antonym_of: { from: lexical, to: lexical },
  collocates_with: { from: ["vocabulary"], to: ["vocabulary"] },
  derived_from: { from: ["vocabulary"], to: ["vocabulary"] },
};

const slugPattern = /^[a-z0-9]+(_[a-z0-9]+)*$/;

function findCycle(edges: KnowledgeEdge[]): NodeRef[] | null {
  const next = new Map<NodeRef, NodeRef[]>();
  for (const edge of edges) next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to]);
  const state = new Map<NodeRef, "open" | "done">();
  const path: NodeRef[] = [];
  const visit = (node: NodeRef): NodeRef[] | null => {
    if (state.get(node) === "done") return null;
    if (state.get(node) === "open") return [...path.slice(path.indexOf(node)), node];
    state.set(node, "open");
    path.push(node);
    for (const to of next.get(node) ?? []) {
      const cycle = visit(to);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(node, "done");
    return null;
  };
  for (const node of next.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

export function validateGraph(nodes: KnowledgeNode[], edges: KnowledgeEdge[], mappings: LegacyMapping[]): string[] {
  const problems: string[] = [];
  const known = new Set<NodeRef>();
  for (const node of nodes) {
    const key = ref(node);
    if (!slugPattern.test(node.slug)) problems.push(`bad slug ${key}`);
    if (known.has(key)) problems.push(`duplicate node ${key}`);
    known.add(key);
  }
  const seen = new Set<string>();
  for (const edge of edges) {
    const label = `${edge.from} ${edge.type} ${edge.to}`;
    if (!known.has(edge.from) || !known.has(edge.to)) problems.push(`dangling edge ${label}`);
    if (edge.from === edge.to) problems.push(`self edge ${label}`);
    const rule = edgeRules[edge.type];
    if (!rule.from.includes(parseRef(edge.from).type) || !rule.to.includes(parseRef(edge.to).type)) problems.push(`wrong direction ${label}`);
    if (symmetricEdges.has(edge.type) && edge.from > edge.to) problems.push(`symmetric edge not stored as from < to: ${label}`);
    const key = symmetricEdges.has(edge.type) ? [edge.type, ...[edge.from, edge.to].sort()].join(" ") : label;
    if (seen.has(key)) problems.push(`duplicate edge ${label}`);
    seen.add(key);
  }
  for (const type of acyclicEdges) {
    const cycle = findCycle(edges.filter((edge) => edge.type === type));
    if (cycle) problems.push(`${type} cycle ${cycle.join(" > ")}`);
  }
  const mapped = new Set<string>();
  for (const mapping of mappings) {
    const label = `${mapping.kind}:${mapping.id} -> ${mapping.node}`;
    if (!known.has(mapping.node)) problems.push(`dangling mapping ${label}`);
    if (mapped.has(label)) problems.push(`duplicate mapping ${label}`);
    mapped.add(label);
  }
  return problems;
}
