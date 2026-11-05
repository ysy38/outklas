/**
 * Controlled distractor revisions. Each experiment switches on one change for both the writer and the
 * distractor judge; with none switched on, the factory behaves exactly as the distractor.v4 / distractor-judge.v3
 * baseline, so benchmark variants differ only in the experiments they name.
 * - contrast: reasons-before-verdict judge, a spec-independent relation check, no negating or restating the stem.
 * - plausibility: structured scenario, tense and event constraints for every role, checked by the judge.
 * - lexical: stem overlap becomes a diagnostic shown to writer and judge instead of a hard rejection.
 * Second round (distractor.v6 / distractor-judge.v5); the first three keep their distractor.v5 meaning:
 * - opposition: the contrast option is a parallel fact that neither supports nor hinders the outcome, so neither a
 *   "given that" nor a concessive reading of its connector can make it correct.
 * - compatibility: condition and time options follow the main clause's time frame (QuestionSpec/DistractorSpec), a
 *   condition slot with no natural reading for a single completed past event becomes a purpose slot, and the judge
 *   checks whether the option's event can stand in the stated relation to the main clause.
 * - relation: the judge separately rates whether the completed sentence reads as the item's target relation and
 *   whether any plausible reading of the connector makes it correct.
 * - overlap: stem and key overlap are rejected only when they look copied, not for necessary topic words.
 */
export const factoryExperiments = ["contrast", "plausibility", "lexical", "opposition", "compatibility", "relation", "overlap"] as const;
export type FactoryExperiment = (typeof factoryExperiments)[number];
export type ExperimentSet = readonly FactoryExperiment[];

/** Experiments whose prompts live in distractor.v6 / distractor-judge.v5. */
export const revisionExperiments: readonly FactoryExperiment[] = ["opposition", "compatibility", "relation", "overlap"];

/** Comma-separated, order-free, duplicates ignored; an unknown name fails loudly. */
export function parseExperiments(raw: string | undefined): FactoryExperiment[] {
  const names = (raw ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  for (const name of names) if (!(factoryExperiments as readonly string[]).includes(name)) throw new Error(`Unknown factory experiment "${name}"; use ${factoryExperiments.join(", ")}`);
  return factoryExperiments.filter((name) => names.includes(name));
}

export const experimentLabel = (set: ExperimentSet) => (set.length ? set.join("+") : "baseline");

/** Which prompt generation a set of experiments runs on: baseline (v4/v3), first round (v5/v4) or second round (v6/v5). */
export const experimentGeneration = (set: ExperimentSet): "baseline" | "first" | "second" =>
  set.some((name) => revisionExperiments.includes(name)) ? "second" : set.length ? "first" : "baseline";
