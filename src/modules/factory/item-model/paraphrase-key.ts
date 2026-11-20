import { looksTurkish } from "@/modules/analysis/surface";

export type ParaphraseDistance = "clause_inversion" | "near_copy" | "independent" | "unverified";

/**
 * Structural distance only. independent is not proof that the meaning survived.
 * A cross-language pair stays unverified: shared words are not a translation score.
 */
export function paraphraseDistance(source: string, key: string): ParaphraseDistance {
  if (looksTurkish(source) !== looksTurkish(key)) return "unverified";
  const delta = tokenDelta(source, key);
  if (/^\s*had\b/i.test(source) && /\bif\b/i.test(key) && delta <= 4) return "clause_inversion";
  if (delta <= 4) return "near_copy";
  if (delta >= 8) return "independent";
  return "unverified";
}

/**
 * "before any of them" must still cover the whole set at the departure.
 * A universal attached to a different clause does not count. No match is unverified, not a pass.
 */
export function scopeCarry(source: string, key: string): "fail" | "unverified" {
  if (!/before any of (them|these|those)/i.test(source)) return "unverified";
  const folded = key.toLocaleLowerCase("tr-TR");
  const departure = folded.search(/çıkmadan|leave|left|leaving/);
  if (departure < 0) return "fail";
  const window = folded.slice(Math.max(0, departure - 40), departure + 24);
  if (/any|all|each|every|none|hiçbir|hicbir|hepsi|tümü|tumu/.test(window)) return "unverified";
  return "fail";
}

export type ParaphraseAssessment = {
  distance: ParaphraseDistance;
  scope: "fail" | "unverified";
  failures: string[];
  /** Always false. Distance and scope are not a semantic pass. */
  meaningProven: false;
  /** Always false. A design target is not measured difficulty. */
  approvesTarget: false;
};

export function assessParaphraseKey(source: string, key: string): ParaphraseAssessment {
  const distance = paraphraseDistance(source, key);
  const scope = scopeCarry(source, key);
  const failures: string[] = [];
  if (distance === "clause_inversion" || distance === "near_copy") failures.push("key_near_copy");
  if (scope === "fail") failures.push("scope_not_carried");
  return { distance, scope, failures, meaningProven: false, approvesTarget: false };
}

function tokens(text: string): string[] {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token && !["the", "a", "an"].includes(token));
}

function tokenDelta(left: string, right: string): number {
  const count = (list: string[]) => {
    const map = new Map<string, number>();
    for (const token of list) map.set(token, (map.get(token) ?? 0) + 1);
    return map;
  };
  const a = count(tokens(left));
  const b = count(tokens(right));
  let delta = 0;
  for (const token of new Set([...a.keys(), ...b.keys()])) delta += Math.abs((a.get(token) ?? 0) - (b.get(token) ?? 0));
  return delta;
}
