import { z } from "zod";
import { facetTypes, type Facet } from "@/modules/analysis/contract";
import { ref } from "@/modules/knowledge/graph";
import { knowledgeNodes } from "@/modules/knowledge/seed";

const dropped = new Set(["$schema", "additionalProperties", "pattern", "maxLength", "minLength", "maxItems", "minItems"]);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !dropped.has(key))
      .map(([key, inner]) => [key, strip(inner)]),
  );
}

/** Shape-only schema for the provider; length and pattern limits are enforced by Zod after the call. */
export const responseSchema = (schema: z.ZodType) => strip(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })) as Record<string, unknown>;

type JsonSchema = { type?: string; properties?: Record<string, JsonSchema>; items?: JsonSchema; anyOf?: JsonSchema[]; enum?: string[] };

export const refsFor = (facet: Facet) =>
  knowledgeNodes
    .filter((node) => node.status !== "deprecated" && (facetTypes[facet] as readonly string[]).includes(node.type))
    .map(ref)
    .sort();

/**
 * Replaces the string at `path` (dot-separated; "[]" steps into array items) with an enum of the references the facet
 * allows, so constrained decoding cannot produce free text or an unknown node. Nullable fields stay nullable.
 */
export function withRefEnums(schema: Record<string, unknown>, fields: Record<string, Facet>): Record<string, unknown> {
  const copy = structuredClone(schema) as JsonSchema;
  for (const [path, facet] of Object.entries(fields)) {
    let parent: JsonSchema = copy;
    const steps = path.split(".");
    for (const step of steps.slice(0, -1)) parent = step === "[]" ? parent.items! : parent.properties![step];
    const last = steps.at(-1)!;
    const leaf = last === "[]" ? parent.items! : parent.properties![last];
    const target = leaf.anyOf?.find((option) => option.type === "string") ?? leaf;
    if (target.type !== "string") throw new Error(`${path} is not a string field`);
    target.enum = refsFor(facet);
  }
  return copy as Record<string, unknown>;
}
