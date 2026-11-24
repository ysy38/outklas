import { z } from "zod";
import { responseSchema } from "./schema";

export const qualityAuthoringPromptVersion = "quality-authoring.design-then-write.v1";

export const qualityAuthoringTrapKinds = [
  "TEMPORAL_ORDER",
  "CONDITION_DIRECTION",
  "COUNTERFACTUAL_FACTUAL",
  "QUANTITY_SCOPE",
  "CAUSE_CONCESSION",
  "PURPOSE_RESULT",
  "NEGATION_SCOPE",
  "AGENT_ROLE",
  "EVIDENCE_CERTAINTY",
  "LEXICAL_COLLOCATION",
  "GRAMMAR_FORM",
] as const;

export const qualityAuthoringSystem = `You write one YDS/YÖKDİL restatement or translation item as a single psychometric unit.

Work in two logical stages inside this one JSON response. Do not make a second call.

STAGE A — ITEM DESIGN
Keep every required fact in the situation brief. Do not add actors, events, quantities, or causes.
Author a natural source sentence. Write a key that is equivalent only to that source.
List the meaning relations that actually occur in that source.
Do not force a mechanism the source does not host.
Four different catalog labels are not required.
If the brief cannot host genuine misreadings, set status to source_insufficient_quality_opportunities, still return source and key, and return an empty candidates array.

STAGE B — DISTRACTOR WRITING
Write candidates only for the misreadings Stage A found.
Each candidate changes one dominant relation. Do not invent actors, events, or causal links.
Do not paraphrase the same misreading twice.
Keep natural academic language in the required target language.
Do not fill unused slots with grammar or lexical filler.
Return only as many candidates as you can actually write. Fewer than six is allowed. Padding is forbidden.

The key must be the only fully defensible answer. Quantity traps invert exclusivity (only → all), not only → at least.
planId values are p1, p2, p3… in order for the candidates you write.
Return JSON only.`;

export const qualityAuthoringOutput = z.object({
  status: z.enum(["authored", "source_insufficient_quality_opportunities"]),
  source: z.string().min(20).max(500),
  key: z.string().min(20).max(500),
  questionType: z.enum(["restatement", "translation"]),
  direction: z.enum(["none", "en_tr", "tr_en"]),
  candidates: z
    .array(
      z.object({
        planId: z.enum(["p1", "p2", "p3", "p4", "p5", "p6"]),
        trap: z.enum(qualityAuthoringTrapKinds),
        candidateText: z.string().min(1).max(400),
        studentMisreading: z.string().min(1).max(240),
      }),
    )
    .min(0)
    .max(6),
});

export const qualityAuthoringResponseSchema = responseSchema(qualityAuthoringOutput);

export function qualityAuthoringUser(input: {
  questionType: "restatement" | "translation";
  direction: "none" | "en_tr" | "tr_en";
  situationBrief: string;
}) {
  const language =
    input.direction === "en_tr" ? "Turkish key and Turkish distractors" : input.direction === "tr_en" ? "English key and English distractors" : "English key and English distractors";
  return [
    `Question type: ${input.questionType}. Direction: ${input.direction}. Target: ${language}.`,
    `Situation brief — actors, events, required facts, and relations. This is not a source sentence. Do not copy it as the stem. Do not add facts, actors, events, or quantities.`,
    input.situationBrief,
    `Stage A: design source, equivalent key, and only the misreadings the source actually hosts.`,
    `Stage B: write one candidate per hosted misreading. Do not pad to six. If the source cannot host genuine misreadings, status is source_insufficient_quality_opportunities and candidates is [].`,
  ].join("\n");
}
