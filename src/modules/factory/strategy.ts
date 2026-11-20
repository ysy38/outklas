/** How a hard concession item is meant to be difficult. Medium and easy items leave this unset. */
export function assignedStrategy(spec: { id: string; difficulty: { band: string } }): "lexical_pivot" | "relational_inference" | null {
  if (spec.difficulty.band !== "hard") return null;
  const ordinal = Number(spec.id.split(".").pop());
  if (!Number.isInteger(ordinal)) return "lexical_pivot";
  return ordinal % 2 === 0 ? "relational_inference" : "lexical_pivot";
}
