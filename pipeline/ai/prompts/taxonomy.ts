import { nodeTypes, ref } from "@/modules/knowledge/graph";
import { knowledgeNodes, knowledgeVersion } from "@/modules/knowledge/seed";

/** The canonical node list the models may reference, grouped by type. Part of the prompt, so seed changes invalidate the cache. */
export function taxonomyListing(): string {
  return [
    `Knowledge graph version ${knowledgeVersion.version}. Reference nodes only as type:slug exactly as listed.`,
    ...nodeTypes.map((type) => {
      const nodes = knowledgeNodes.filter((node) => node.type === type && node.status !== "deprecated");
      return `\n## ${type} (${nodes.length})\n${nodes.length ? nodes.map((node) => `${ref(node)} — ${node.name}`).join("\n") : "(no nodes yet: propose instead)"}`;
    }),
  ].join("\n");
}
