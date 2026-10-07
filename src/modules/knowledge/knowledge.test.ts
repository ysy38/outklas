import { describe, expect, it } from "vitest";
import { connectors, relationLabel } from "@/content/drill-connectors";
import { skillName } from "@/content/labels";
import { examDraft, skillTree } from "@/db/exam-draft";
import { packItems } from "@/db/pack-draft";
import { sections } from "@/modules/exam/blueprint";
import { ref, validateGraph, type LegacyKind, type NodeType } from "./graph";
import { connectorSlug, discourseForConnector, knowledgeEdges, knowledgeNodes, legacyMap } from "./seed";

const typed = (type: NodeType) => knowledgeNodes.filter((node) => node.type === type);

describe("knowledge seed", () => {
  it("passes graph validation", () => {
    expect(validateGraph(knowledgeNodes, knowledgeEdges, legacyMap)).toEqual([]);
  });

  it("has the planned node counts", () => {
    const counts = Object.fromEntries(
      (["domain", "question_type", "skill", "grammar", "discourse_relation", "cognitive_skill", "grammar_pattern", "connector", "misconception", "distractor_type"] as const).map(
        (type) => [type, typed(type).length],
      ),
    );
    expect(counts).toEqual({
      domain: 5,
      question_type: 13,
      skill: 24,
      grammar: 20,
      discourse_relation: 12,
      cognitive_skill: 10,
      grammar_pattern: 4,
      connector: 45,
      misconception: 8,
      distractor_type: 14,
    });
  });

  it("maps every legacy id to at least one exact or broader node", () => {
    const covered = (kind: LegacyKind, id: string) => legacyMap.some((m) => m.kind === kind && m.id === id && (m.match === "exact" || m.match === "broader"));
    const distractorCodes = new Set(
      [...examDraft, ...packItems].flatMap((item) => item.choices.map((choice) => choice.distractor)).filter((code): code is string => Boolean(code)),
    );
    const missing = [
      ...skillTree.map((skill) => ["skill", skill.id] as const),
      ...sections.map((section) => ["section", section] as const),
      ...[...distractorCodes].map((code) => ["distractor", code] as const),
      ...connectors.map((connector) => ["connector", connector.id] as const),
      ...Object.keys(relationLabel).map((relation) => ["relation", relation] as const),
    ].filter(([kind, id]) => !covered(kind, id));
    expect(distractorCodes.size).toBeGreaterThanOrEqual(9);
    expect(missing).toEqual([]);
  });

  it("names exactly mapped skill nodes the way the app does", () => {
    const byRef = new Map(knowledgeNodes.map((node) => [ref(node), node]));
    const mismatched = legacyMap
      .filter((m) => m.kind === "skill" && m.match === "exact")
      .filter((m) => byRef.get(m.node)?.nameTr !== skillName(m.id))
      .map((m) => `${m.id} -> ${m.node}`);
    expect(mismatched).toEqual([]);
  });

  it("derives every connector's relation and grammar pattern from the drill bank", () => {
    for (const connector of connectors) {
      const target = `connector:${connectorSlug(connector.id)}`;
      expect(knowledgeEdges.filter((e) => e.type === "expressed_by" && e.to === target)).toHaveLength(1);
      expect(knowledgeEdges.filter((e) => e.type === "has_pattern" && e.from === target)).toHaveLength(1);
    }
    expect(discourseForConnector("connector:whereas")).toBe("discourse_relation:contrast");
    expect(discourseForConnector("connector:although")).toBe("discourse_relation:concession");
  });

  it("puts every skill, grammar point, discourse relation and cognitive skill under exactly one domain", () => {
    const orphans = knowledgeNodes
      .filter((node) => ["skill", "grammar", "discourse_relation", "cognitive_skill"].includes(node.type))
      .filter((node) => knowledgeEdges.filter((e) => e.type === "parent_of" && e.to === ref(node) && e.from.startsWith("domain:")).length !== 1)
      .map(ref);
    expect(orphans).toEqual([]);
  });

  it("gives every question type something to measure or a child type", () => {
    const idle = typed("question_type")
      .map(ref)
      .filter((type) => !knowledgeEdges.some((e) => e.from === type && (e.type === "measures" || e.type === "parent_of")));
    expect(idle).toEqual([]);
  });

  it("catches broken graphs", () => {
    const problems = validateGraph(
      [
        { type: "skill", slug: "a", name: "A" },
        { type: "skill", slug: "a", name: "A again" },
        { type: "skill", slug: "b", name: "B" },
        { type: "skill", slug: "Bad-Slug", name: "Bad" },
        { type: "connector", slug: "c", name: "C" },
      ],
      [
        { type: "parent_of", from: "skill:a", to: "skill:b" },
        { type: "parent_of", from: "skill:b", to: "skill:a" },
        { type: "related_to", from: "skill:b", to: "skill:a" },
        { type: "expressed_by", from: "skill:a", to: "connector:c" },
        { type: "measures", from: "skill:a", to: "skill:missing" },
      ],
      [{ kind: "skill", id: "x", node: "skill:missing", match: "exact" }],
    );
    expect(problems.join("\n")).toMatch(/duplicate node skill:a/);
    expect(problems.join("\n")).toMatch(/bad slug/);
    expect(problems.join("\n")).toMatch(/parent_of cycle/);
    expect(problems.join("\n")).toMatch(/from < to/);
    expect(problems.join("\n")).toMatch(/wrong direction skill:a expressed_by/);
    expect(problems.join("\n")).toMatch(/dangling edge/);
    expect(problems.join("\n")).toMatch(/dangling mapping/);
  });
});
