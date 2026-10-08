import { z } from "zod";
import { factoryVersions } from "./versions";

const hash = z.string().regex(/^[a-f0-9]{64}$/);

/** Everything needed to reproduce or audit a candidate. Source context ids are document slugs; never item text. */
export const provenance = z.object({
  provider: z.string().min(1),
  generatorModel: z.string().min(1),
  judgeModel: z.string().min(1),
  generatorPromptVersion: z.string().min(1),
  judgePromptVersion: z.string().min(1),
  blindSolvePromptVersion: z.string().min(1),
  questionSpecVersion: z.literal(factoryVersions.questionSpec),
  specId: z.string().min(1),
  knowledgeVersion: z.string().min(1),
  dnaVersion: z.string().min(1),
  examProfileVersion: z.literal(factoryVersions.examProfile),
  candidateVersion: z.literal(factoryVersions.candidate),
  validatorVersion: z.literal(factoryVersions.validator),
  judgeVersion: z.literal(factoryVersions.judge),
  originalityVersion: z.literal(factoryVersions.originality),
  generatedAt: z.iso.datetime(),
  requestHashes: z.object({ generator: hash, blindSolve: hash.nullable(), judge: hash.nullable() }),
  sourceContextIds: z.array(z.string().regex(/^[a-z0-9-]+$/)),
});
export type Provenance = z.infer<typeof provenance>;

export function generatorJudgeIndependent(value: Pick<Provenance, "generatorModel" | "judgeModel">): boolean {
  return value.generatorModel !== value.judgeModel;
}
