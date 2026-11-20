/**
 * v2 regression answers for the existing 11 pairs.
 * These stay out of the verifier prompt. The v1 human labels are not rewritten.
 * An extension item may also change a relation; that does not remove the extension.
 */
export type V2OracleRow = {
  id: string;
  relation: "equivalent" | "non_equivalent";
  relationMutation: "yes" | "no" | "either";
  unsupportedExtension: "yes" | "no";
};

export const v2Oracle: readonly V2OracleRow[] = [
  { id: "editors-b", relation: "non_equivalent", relationMutation: "either", unsupportedExtension: "yes" },
  { id: "tr-en-e", relation: "non_equivalent", relationMutation: "either", unsupportedExtension: "yes" },
  { id: "ferry-b", relation: "non_equivalent", relationMutation: "either", unsupportedExtension: "yes" },
  { id: "registry-a", relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
  { id: "registry-b", relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
  { id: "registry-d", relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
  { id: "registry-e", relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
  { id: "door-until-only-after", relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
  { id: "clinic-completed-opening", relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
  { id: "door-equivalent-key", relation: "equivalent", relationMutation: "no", unsupportedExtension: "no" },
  { id: "clinic-equivalent-key", relation: "equivalent", relationMutation: "no", unsupportedExtension: "no" },
];
