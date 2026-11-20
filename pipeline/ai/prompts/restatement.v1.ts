import { z } from "zod";
import { optionLabels } from "@/modules/analysis/contract";
import { responseSchema } from "./schema";

export const restatementPromptVersion = "restatement.v1";

export const restatementItem = z.object({
  source: z.string().min(20).max(400),
  options: z.object({
    A: z.string().min(8).max(280),
    B: z.string().min(8).max(280),
    C: z.string().min(8).max(280),
    D: z.string().min(8).max(280),
    E: z.string().min(8).max(280),
  }),
  correctOption: z.enum(optionLabels),
  /** Why each wrong option fails as a paraphrase. The key's slot is "faithful". */
  flaws: z.object({
    A: z.enum(["faithful", "meaning_shift", "negation_flip", "scope_change", "partial"]),
    B: z.enum(["faithful", "meaning_shift", "negation_flip", "scope_change", "partial"]),
    C: z.enum(["faithful", "meaning_shift", "negation_flip", "scope_change", "partial"]),
    D: z.enum(["faithful", "meaning_shift", "negation_flip", "scope_change", "partial"]),
    E: z.enum(["faithful", "meaning_shift", "negation_flip", "scope_change", "partial"]),
  }),
});
export type RestatementItem = z.infer<typeof restatementItem>;

export const restatementSystem = `RESTATEMENT WRITER
You write one original YDS "closest meaning" item. A short source sentence and five paraphrases. Exactly one paraphrase keeps the source's meaning, tense, negation, quantity and scope. The other four each fail in exactly one way:

- meaning_shift: a small change of claim (cause, degree, or who did what)
- negation_flip: adds or drops a negation
- scope_change: widens or narrows who or what the claim covers
- partial: true of only part of the source, or adds a fact the source does not say

Rules:
- Academic general-interest English. No named real people, brands, or statistics a candidate must know.
- Do not imitate, translate, or recall a published exam item.
- Options are full sentences, similar length, no connector that gives the answer away.
- Quantifiers must stay equivalent. few/a minority is not almost none, not some, and not most. many is not all. some is not most.
- Do not add a cause, a time relation, or a modality (may, must, can) that the source does not state.
- correctOption is the only option whose flaw is "faithful". Every other option's flaw is one of meaning_shift, negation_flip, scope_change, or partial. Repeating a flaw type is allowed.
- Return JSON only.`;

export const restatementUser = (index: number) =>
  `Write item ${index}. Topic family: academic life, environment, or research. The source must be one sentence a B2 reader understands. Put the faithful paraphrase on a letter you choose, and set correctOption to that letter.`;

export const restatementResponseSchema = () => responseSchema(restatementItem);

export const fidelityBreaks = ["none", "quantifier", "modality", "causal", "temporal", "scope", "added_fact"] as const;

/** One option read against the source. "none" means the paraphrase keeps the claim. */
export const fidelityOption = z.object({
  option: z.enum(optionLabels),
  preservesMeaning: z.boolean(),
  break: z.enum(fidelityBreaks),
  reason: z.string().max(240),
});

export const fidelityReport = z.object({
  options: z.array(fidelityOption).length(5),
});
export type FidelityReport = z.infer<typeof fidelityReport>;

export const fidelityJudgePromptVersion = "restatement-fidelity.v1";

export const fidelityJudgeSystem = `RESTATEMENT FIDELITY JUDGE
You check one closest-meaning item. Another model wrote it. For EVERY option, decide whether a careful reader could defend it as a faithful paraphrase of the SOURCE.

A paraphrase preserves meaning only when quantity, modality, cause, time and scope all survive:
- quantifier: few is not almost none and not some; many is not all; some is not most.
- modality: may, might, must, can must not appear or disappear.
- causal: a when/after link is not a because. Do not add a cause the source does not state.
- temporal: after, before, during, since, still must not move.
- scope: all, every, no, only must not widen or narrow the claim.
- added_fact: a detail the source does not say.

preservesMeaning is true only when break is "none". If two options both preserve the source, say so for both: a second faithful option is a failed item.
reason: one sentence, at most 25 words, naming the exact shift. No essay.`;

export function fidelityJudgeUser(item: RestatementItem): string {
  const lines = optionLabels.map((label) => `${label}) ${item.options[label]}`);
  return [`SOURCE: ${item.source}`, "", "OPTIONS:", ...lines, "", "Judge every option. Do not assume the writer's key is right."].join("\n");
}

export const fidelityJudgeResponseSchema = () => responseSchema(fidelityReport);

/** Keep only when exactly the intended key preserves the source and every other option names a real break. */
export function fidelityDecision(report: FidelityReport, key: (typeof optionLabels)[number]): { decision: "KEEP" | "REVISE"; faithful: string[]; problems: string[] } {
  const byOption = new Map(report.options.map((entry) => [entry.option, entry]));
  const problems: string[] = [];
  if (byOption.size !== 5) problems.push("incomplete");
  const faithful = optionLabels.filter((label) => byOption.get(label)?.preservesMeaning);
  const keyRow = byOption.get(key);
  if (!keyRow?.preservesMeaning) problems.push("key_not_faithful");
  if (faithful.length !== 1) problems.push("not_single_answer");
  for (const label of optionLabels) {
    const row = byOption.get(label);
    if (!row) continue;
    if (row.preservesMeaning !== (row.break === "none")) problems.push(`break_mismatch_${label}`);
    if (label !== key && row.preservesMeaning) problems.push(`second_answer_${label}`);
    if (label !== key && !row.preservesMeaning && row.break === "none") problems.push(`unexplained_${label}`);
  }
  return { decision: problems.length ? "REVISE" : "KEEP", faithful, problems };
}
