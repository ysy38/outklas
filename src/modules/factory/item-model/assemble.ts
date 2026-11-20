import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import type { JudgeInput } from "../judge";
import { factoryVersions } from "../versions";
import { assessKey } from "./core";
import type { DistractorCandidate, DistractorStrategy, EditorialStatus, ItemAssembly, ItemCore, ItemSource } from "./contract";
import { unobservedDifficulty } from "./difficulty";
import { deterministicReport, evaluateSemantics } from "./evaluate";
import type { SourceRecord } from "./contract";
import { screenOfficialSurface } from "./gold";
import { selectCognitiveDistractors, resolveDistractorStrategy } from "./distractor-strategy";
import { selectDistractors } from "./pool";
import { assessWholeSet } from "./whole-set";
import { requireModelId } from "./registry";
import { assessSource } from "./source";

export type AssemblyDraft = {
  id: string;
  modelId: string;
  source: ItemSource;
  core: ItemCore | null;
  distractors: DistractorCandidate[];
  correctOption: OptionLabel;
  generatorModel: string;
  judgeModel: string | null;
  judge: JudgeInput | null;
  officialTexts: string[];
  sources?: SourceRecord[];
  selfScoreClaim: string | null;
  attempt?: number;
  distractorStrategy?: DistractorStrategy;
  strategyAuthorization?: string;
};

function rights(draft: AssemblyDraft, surfaceScreen: "clear" | "overlap" | "not_run"): ItemAssembly["contentRights"] {
  const readingSource = draft.source.kind === "reading" ? draft.source : null;
  const record = readingSource ? draft.sources?.find((source) => source.sourceId === readingSource.sourceId) : undefined;
  return {
    officialSurfaceRewrite: surfaceScreen === "overlap",
    studentBankWrite: false,
    exemplarKind: "none",
    usageRights: readingSource ? (record?.usageRights ?? "missing") : "not_applicable",
    surfaceScreen,
    similarityIsNotLicense: true,
    sourceFidelity: "not_run",
  };
}

const base = (draft: AssemblyDraft, status: EditorialStatus, failure: string | null, extra: Partial<ItemAssembly> = {}): ItemAssembly => {
  const model = requireModelId(draft.modelId);
  return {
    version: factoryVersions.itemModel,
    id: draft.id,
    model,
    source: draft.source,
    core: draft.core,
    stem: null,
    options: null,
    correctOption: null,
    selectedDistractors: [],
    status,
    statusHistory: ["generated", status],
    targetDifficulty: model.targetDifficulty,
    observedDifficulty: unobservedDifficulty(),
    keyCertifiedByJudge: false,
    judge: null,
    semanticClaims: draft.selfScoreClaim ? [{ source: "model_rationale", claim: draft.selfScoreClaim, treatedAsProof: false }] : [],
    reviews: [],
    textVersion: 1,
    publishState: "unpublished",
    production: { proceededToDistractors: false, retries: 0, distractorsDiscarded: draft.distractors.length > 0, distractorStrategy: "baseline_v34" },
    qualityGate: null,
    contentRights: rights(draft, "not_run"),
    failure,
    ...extra,
  };
};

function placeOptions(correct: OptionLabel, answer: string, distractors: DistractorCandidate[]): Record<OptionLabel, string> {
  const options = {} as Record<OptionLabel, string>;
  options[correct] = answer;
  optionLabels.filter((label) => label !== correct).forEach((label, index) => {
    options[label] = distractors[index].candidateText;
  });
  return options;
}

/** One pass from a supplied draft. No model call and no retry. */
export function assembleItem(draft: AssemblyDraft): ItemAssembly {
  if ((draft.attempt ?? 1) !== 1) throw new Error("item-model production does not retry");
  const model = requireModelId(draft.modelId);
  if (draft.core && draft.core.promptVersion !== model.promptVersion) throw new Error("prompt version is frozen for this item model");
  const source = assessSource(model, draft.source, { sources: draft.sources });
  if (!source.sufficient) return base(draft, "rejected", source.failures[0] ?? "source_insufficient");
  const key = assessKey(model, draft.source, draft.core);
  if (!key.valid || !draft.core) return base(draft, "rejected", key.failures[0] ?? "key_invalid");
  const screen = screenOfficialSurface(`${draft.core.stem}\n${draft.core.correctAnswer}`, draft.officialTexts);
  if (screen.status === "overlap") {
    return base(draft, "rejected", "official_surface_overlap", { contentRights: rights(draft, "overlap") });
  }
  const strategy = resolveDistractorStrategy({ requested: draft.distractorStrategy, authorization: draft.strategyAuthorization, questionType: model.questionType });
  if (strategy.failure) return base(draft, "rejected", strategy.failure, { production: { proceededToDistractors: false, retries: 0, distractorsDiscarded: false, distractorStrategy: "baseline_v34" }, qualityGate: null });
  const pool = strategy.strategy === "cognitive_trap_first"
    ? selectCognitiveDistractors({ candidates: draft.distractors, keyText: draft.core.correctAnswer, allowedMechanisms: model.errorMechanisms })
    : selectDistractors({ candidates: draft.distractors, keyText: draft.core.correctAnswer, allowedMechanisms: model.errorMechanisms });
  if (pool.status !== "selected") return base(draft, "rejected", "distractor_pool_insufficient", { production: { proceededToDistractors: true, retries: 0, distractorsDiscarded: true, distractorStrategy: strategy.strategy }, qualityGate: null });
  const options = placeOptions(draft.correctOption, draft.core.correctAnswer, pool.selected);
  const qualityGate = strategy.strategy === "cognitive_trap_first"
    ? assessWholeSet({ source: draft.source.kind === "translation" ? draft.source.sourceSentence : draft.source.kind === "restatement" ? draft.source.proposition : "", key: draft.core.correctAnswer, options, correct: draft.correctOption })
    : null;
  if (qualityGate?.decision === "fail") {
    return base(draft, "rejected", qualityGate.failure, {
      stem: draft.core.stem,
      options,
      correctOption: draft.correctOption,
      selectedDistractors: pool.selected,
      production: { proceededToDistractors: true, retries: 0, distractorsDiscarded: false, distractorStrategy: strategy.strategy },
      qualityGate: { approvesTarget: false as const, meaningProven: false as const, failure: qualityGate.failure, risks: qualityGate.risks },
      semanticClaims: [{ source: "model_rationale", claim: qualityGate.failure ?? "confirmed_defect", treatedAsProof: false }],
    });
  }
  const structure = deterministicReport({ source: draft.source, core: draft.core, options, correctOption: draft.correctOption, officialTexts: draft.officialTexts });
  const placed = {
    stem: draft.core.stem,
    options,
    correctOption: draft.correctOption,
    selectedDistractors: pool.selected,
    production: { proceededToDistractors: true, retries: 0 as const, distractorsDiscarded: false, distractorStrategy: strategy.strategy },
    qualityGate: qualityGate ? { approvesTarget: false as const, meaningProven: false as const, failure: null, risks: qualityGate.risks } : null,
    contentRights: rights(draft, screen.status),
  };
  if (structure.status !== "pass") return base(draft, "rejected", structure.issues[0]?.code ?? "structure", placed);
  const ready: EditorialStatus[] = ["generated", "structurally_valid"];
  if (!draft.judge || !draft.judgeModel) return base(draft, "structurally_valid", null, { ...placed, statusHistory: ready });
  const gateConcerns = qualityGate
    ? [...qualityGate.risks.key_semantic_risk, ...qualityGate.risks.distractor_equivalence_risk, ...qualityGate.risks.whole_set_clue_risk].map((code) => `quality_${code}`)
    : [];
  const semantic = evaluateSemantics({
    correctOption: draft.correctOption,
    targetBand: model.targetDifficulty,
    validation: structure,
    generatorModel: draft.generatorModel,
    judgeModel: draft.judgeModel,
    judge: draft.judge ? { ...draft.judge, planConcerns: [...(draft.judge.planConcerns ?? []), ...gateConcerns] } : null,
    selfScoreClaim: draft.selfScoreClaim,
  });
  if (!semantic.independent || !semantic.judge) {
    return base(draft, "rejected", semantic.failure, { ...placed, semanticClaims: semantic.claims, statusHistory: [...ready, "rejected"] });
  }
  if (semantic.failure) {
    return base(draft, "rejected", semantic.failure, { ...placed, judge: semantic.judge, semanticClaims: semantic.claims, statusHistory: [...ready, "rejected"] });
  }
  return base(draft, "needs_editorial_review", null, {
    ...placed,
    judge: semantic.judge,
    semanticClaims: semantic.claims,
    statusHistory: [...ready, "needs_editorial_review"],
  });
}
