import { z } from "zod";
import { responseSchema } from "./schema";

/** Benchmark-only. Production cognitive-trap.options.v5 stays on min 4. */
export const writerBakeoffPromptVersion = "writer-bakeoff.options.v1";

export const writerBakeoffSystem = `SEMANTIC PRESERVATION WRITER
The source, the key, and the misreading plans are frozen. Do not rewrite them.
Write exactly one option per plan, in plan order.
Rules:
1. Change only the one targeted meaning relation named on that plan.
2. Keep every other source event and relation listed as preserve.
3. Do not add an actor, event, purpose, or cause that the source does not have.
4. Write a natural academic sentence in the required language.
5. The option must not be equivalent to the key or the source.
6. Do not drop a whole clause or shorten the proposition so the key becomes the only complete sentence.
A field such as preserved: true is not proof.
Copy studentMisreading from the plan unchanged.
Return JSON only.`;

/** One candidate per frozen plan. Fewer than four plans does not pad. */
export function writerBakeoffOutput(planCount: number) {
  if (planCount < 1) throw new Error("writer bake-off schema needs at least one plan");
  return z.object({
    candidates: z
      .array(
        z.object({
          candidateText: z.string().min(1).max(400),
          planId: z.string().min(1).max(80),
          studentMisreading: z.string().min(1).max(240),
          semanticRisk: z.enum(["none", "second_answer", "off_construct", "ungrammatical"]),
        }),
      )
      .min(planCount)
      .max(planCount),
  });
}

export const writerBakeoffResponseSchema = (planCount: number) => responseSchema(writerBakeoffOutput(planCount));
