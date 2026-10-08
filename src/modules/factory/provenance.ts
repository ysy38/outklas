import { z } from "zod";
import { optionLabels } from "@/modules/analysis/contract";
import { distractorDecisions } from "./distractor";
import { factoryVersions } from "./versions";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const version = z.string().min(1);

export const stageAttempt = z.object({
  stage: z.enum(["skeleton", "distractor", "explanation"]),
  option: z.enum(optionLabels).nullable(),
  attempt: z.number().int().min(1),
  model: z.string().min(1),
  promptVersion: version,
  requestHash: hash.nullable(),
  cached: z.boolean(),
  latencyMs: z.number().min(0),
  output: z.string().max(800).nullable(),
  validator: z.object({ status: z.enum(["pass", "reject"]), codes: z.array(z.string()) }),
  judge: z
    .object({ model: z.string().min(1), promptVersion: version, requestHash: hash, decision: z.enum(distractorDecisions), failures: z.array(z.string()), concerns: z.array(z.string()), reasons: z.array(z.string()) })
    .nullable(),
  rejectionReason: z.string().nullable(),
});

/** Everything needed to reproduce or audit a candidate. Source context ids are document slugs; never item text. */
export const provenance = z.object({
  pipelineVersion: z.literal(factoryVersions.pipeline),
  provider: z.string().min(1),
  generatorModel: z.string().min(1),
  distractorModel: z.string().min(1),
  distractorJudgeModel: z.string().min(1),
  judgeModel: z.string().min(1),
  explanationModel: z.string().min(1),
  generatorPromptVersion: version,
  distractorPromptVersion: version,
  distractorJudgePromptVersion: version,
  judgePromptVersion: version,
  blindSolvePromptVersion: version,
  acceptabilityPromptVersion: version,
  explanationPromptVersion: version,
  questionSpecVersion: z.literal(factoryVersions.questionSpec),
  distractorSpecVersion: z.literal(factoryVersions.distractorSpec),
  specId: z.string().min(1),
  knowledgeVersion: z.string().min(1),
  dnaVersion: z.string().min(1),
  examProfileVersion: z.literal(factoryVersions.examProfile),
  candidateVersion: z.literal(factoryVersions.candidate),
  validatorVersion: z.literal(factoryVersions.validator),
  judgeVersion: z.literal(factoryVersions.judge),
  distractorJudgeVersion: z.literal(factoryVersions.distractorJudge),
  originalityVersion: z.literal(factoryVersions.originality),
  generatedAt: z.iso.datetime(),
  attempts: z.array(stageAttempt).min(1),
  requestHashes: z.object({ blindSolve: hash.nullable(), acceptability: hash.nullable(), judge: hash.nullable() }),
  sourceContextIds: z.array(z.string().regex(/^[a-z0-9-]+$/)),
});
export type Provenance = z.infer<typeof provenance>;

/** Writers and their checkers are never the same model. */
export function generatorJudgeIndependent(value: Partial<Pick<Provenance, "generatorModel" | "distractorModel" | "distractorJudgeModel" | "judgeModel">>): boolean {
  const writers = [value.generatorModel, value.distractorModel].filter(Boolean);
  if (value.judgeModel && writers.includes(value.judgeModel)) return false;
  if (value.distractorJudgeModel && value.distractorModel && value.distractorJudgeModel === value.distractorModel) return false;
  return true;
}
