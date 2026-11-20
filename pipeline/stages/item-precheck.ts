import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/artifacts";
import { z } from "zod";
import type { JudgeInput } from "@/modules/factory/judge";
import type { DistractorCandidate, ItemCore, ItemSource, SourceRecord } from "@/modules/factory/item-model/contract";
import { acceptDistractorPool } from "@/modules/factory/item-model/pool";
import { itemModel } from "@/modules/factory/item-model/registry";
import {
  assertPrecheckInputs,
  assertPrecheckStart,
  assertSmokeStart,
  buildRunRecord,
  finalizeReadingSet,
  notCalled,
  precheckAuthorization,
  precheckCeilings,
  precheckLimits,
  precheckSlots,
  smokeAuthorization,
  smokeCeilings,
  smokeLimits,
  smokeSlots,
  type ItemRunRecord,
  type PrecheckSlot,
  type StageCall,
  type StageUsage,
} from "@/modules/factory/item-model/precheck";
import { freezeBenchmarkPlan } from "@/modules/factory/item-model/benchmark";
import { BudgetExceeded, SpendBudget, loadSpendLimits } from "../ai/budget";
import { cachedGenerate } from "../ai/cache";
import { loadAIConfig, modelDefaults, parseModel } from "../ai/config";
import { extractJsonText } from "../ai/service";
import { addTokens, emptyRow, estimateCost, loadPrices, type Prices } from "../ai/prices";
import {
  coreResponseSchema,
  coreSystem,
  coreUser,
  distractorPoolEnvelope,
  distractorResponseSchema,
  distractorSystem,
  distractorUser,
  itemCoreOutput,
  itemJudgePacket,
  itemJudgePromptVersion,
  judgeResponseSchemaForItem,
  judgeSystem,
  judgeUser,
  readingCoreOutput,
  readingSourceOutput,
  restatementSourceOutput,
  sourceResponseSchema,
  sourceSchemaFor,
  sourceSystem,
  sourceUser,
  translationSourceOutput,
} from "../ai/prompts/item-model.v1";
import type { AIProvider, Usage } from "../ai/types";

/** Same models as the locked 90-item plan. This profile does not replace that plan. */
export const precheckPlan = freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge });

const emptyUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });

type Ran<T> = { ran: true; value: T | null; error: string | null; usage: Usage; cached: boolean; requestHash: string | null; model: string } | { ran: false; error: string };

async function oneCall(provider: AIProvider, promptVersion: string, schema: z.ZodType, request: { model: string; system: string; user: string; jsonSchema: Record<string, unknown>; maxOutputTokens: number; cacheSalt: string }): Promise<Ran<unknown>> {
  try {
    const hit = await cachedGenerate(provider, promptVersion, {
      model: request.model,
      system: request.system,
      parts: [{ text: request.user }],
      jsonSchema: request.jsonSchema,
      temperature: 0,
      maxOutputTokens: request.maxOutputTokens,
      cacheSalt: request.cacheSalt,
    });
    let value: unknown = null;
    let error: string | null = null;
    try {
      const parsed = schema.safeParse(JSON.parse(extractJsonText(hit.response.text)));
      if (parsed.success) value = parsed.data;
      else error = parsed.error.issues.slice(0, 4).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    } catch {
      error = "output is not valid JSON";
    }
    return { ran: true, value, error, usage: hit.response.usage, cached: hit.cached, requestHash: hit.requestHash, model: hit.response.model };
  } catch (error) {
    if (error instanceof BudgetExceeded) return { ran: false, error: error.message };
    return { ran: true, value: null, error: error instanceof Error ? error.message : "call failed", usage: emptyUsage(), cached: false, requestHash: null, model: request.model };
  }
}

function asCall(ran: Extract<Ran<unknown>, { ran: true }>): { called: true; value: unknown; error: string | null } {
  return { called: true, value: ran.value, error: ran.error };
}

function usageRow(stage: StageUsage["stage"], promptVersion: string, pricedModel: string, ran: Ran<unknown>): StageUsage {
  const usage = ran.ran ? ran.usage : emptyUsage();
  return {
    stage,
    model: pricedModel,
    promptVersion,
    cached: ran.ran ? ran.cached : false,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    requestHash: ran.ran ? ran.requestHash : null,
    error: ran.ran ? ran.error : ran.error,
    ...(usage.reasoningTokens != null ? { reasoningTokens: usage.reasoningTokens } : {}),
    ...(usage.cacheReadTokens ? { cacheReadTokens: usage.cacheReadTokens } : {}),
    ...(usage.cacheWriteTokens ? { cacheWriteTokens: usage.cacheWriteTokens } : {}),
  };
}

function toSource(type: "restatement" | "translation" | "reading_comprehension", value: unknown, passageId: string | null): ItemSource {
  if (type === "restatement") {
    const parsed = restatementSourceOutput.parse(value);
    return { kind: "restatement", proposition: parsed.proposition, frame: { scope: parsed.scope, modality: parsed.modality, polarity: parsed.polarity, tense: parsed.tense, argumentStructure: parsed.argumentStructure } };
  }
  if (type === "translation") {
    const parsed = translationSourceOutput.parse(value);
    return { kind: "translation", ...parsed };
  }
  const parsed = readingSourceOutput.parse(value);
  return { kind: "reading", passageId: passageId ?? "reading-1", sourceId: parsed.sourceId, passage: parsed.passage, questionPlan: parsed.questionPlan };
}

function toCore(value: unknown, generatorModel: string, promptVersion: string, type: "restatement" | "translation" | "reading_comprehension"): ItemCore {
  if (type === "reading_comprehension") {
    const parsed = readingCoreOutput.parse(value);
    return { ...parsed, modelVersion: generatorModel, promptVersion, reading: { questionFunction: parsed.questionFunction, evidenceSpan: parsed.evidenceSpan, propositionId: parsed.propositionId, testedProposition: parsed.testedProposition, cognitiveOperation: parsed.cognitiveOperation } };
  }
  return { ...itemCoreOutput.parse(value), modelVersion: generatorModel, promptVersion, reading: null };
}

function itemCost(calls: StageUsage[], prices: Prices | null): number | null {
  const usage: Record<string, ReturnType<typeof emptyRow>> = {};
  for (const call of calls) {
    if (!call.requestHash) continue;
    const row = (usage[call.model] ??= emptyRow());
    addTokens(row, {
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      totalTokens: call.inputTokens + call.outputTokens,
      ...(call.reasoningTokens != null ? { reasoningTokens: call.reasoningTokens } : {}),
      ...(call.cacheReadTokens ? { cacheReadTokens: call.cacheReadTokens } : {}),
      ...(call.cacheWriteTokens ? { cacheWriteTokens: call.cacheWriteTokens } : {}),
    });
  }
  return estimateCost(usage, prices).usd;
}

export type PrecheckRun = {
  started: boolean;
  executed: boolean;
  ready: boolean;
  lock: "authorization" | "budget" | "credentials" | "runner" | "corpus" | "sources" | null;
  reason: string | null;
  planId: typeof precheckAuthorization;
  profile: typeof precheckCeilings;
  qualityProven: false;
  studentBankWrites: 0;
  providerCalls: number;
  costUsd: number | null;
  records: ItemRunRecord[];
};

/**
 * Runs the frozen 11-question profile. Reading uses one shared source call and four question chains.
 * A failed item is not generated again. The 90-item plan is not used.
 */
export async function executePrecheck(input: {
  authorization: string;
  providerFor: ((setting: string) => AIProvider) | null;
  prices: Prices | null;
  models: { generator: string; judge: string };
  outDir?: string;
  cacheSalt?: string;
  officialTexts?: string[];
  sources?: SourceRecord[];
  overrides?: unknown;
  limits?: { maxCalls?: number; maxRegenerations?: number; maxCostUsd?: number };
}): Promise<PrecheckRun> {
  const base: Pick<PrecheckRun, "planId" | "profile" | "qualityProven" | "studentBankWrites" | "providerCalls" | "costUsd" | "records"> = { planId: precheckAuthorization, profile: precheckCeilings, qualityProven: false, studentBankWrites: 0, providerCalls: 0, costUsd: null, records: [] };
  try {
    assertPrecheckStart(input);
  } catch (error) {
    return { ...base, started: false, executed: false, ready: false, lock: "authorization", reason: error instanceof Error ? error.message : "precheck refused" };
  }
  const limits = precheckLimits(input.limits);
  const resolveProvider = input.providerFor;
  if (!resolveProvider) return { ...base, started: false, executed: false, ready: true, lock: "runner", reason: "provider runner is not attached; the precheck was not started" };
  const gate = assertPrecheckInputs(input);
  if (gate) return { ...base, started: false, executed: false, ready: false, lock: gate, reason: gate === "corpus" ? "official comparison corpus is not loaded" : "production source list is empty" };
  let budget: SpendBudget;
  try {
    budget = new SpendBudget(limits, input.prices, [input.models.generator, input.models.judge]);
  } catch (error) {
    return { ...base, started: false, executed: false, ready: false, lock: "budget", reason: error instanceof Error ? error.message : "budget refused" };
  }
  const metered = new Map<string, AIProvider>();
  const stageProvider = (setting: string) => {
    const found = metered.get(setting);
    if (found) return found;
    const wrapped = budget.meter(resolveProvider(setting));
    metered.set(setting, wrapped);
    return wrapped;
  };
  const officialTexts = input.officialTexts ?? [];
  const salt = input.cacheSalt ?? precheckAuthorization;
  const records: ItemRunRecord[] = [];
  let stopped = false;
  const context = { officialTexts, sources: input.sources ?? [], prices: input.prices, models: input.models };

  async function sourceCall(slot: PrecheckSlot, calls: StageUsage[]): Promise<Ran<unknown>> {
    const model = itemModel(slot.questionType);
    const generator = parseModel(input.models.generator);
    const sourceRecord = slot.questionType === "reading_comprehension" ? input.sources?.find((record) => record.role === "production_notes" && record.usageRights === "granted") : undefined;
    const ran = await oneCall(stageProvider(input.models.generator), model.promptVersion, sourceSchemaFor[slot.questionType], {
      model: generator.model,
      system: sourceSystem,
      user: sourceUser(model, records.length + 1, { direction: slot.direction ?? undefined, source: sourceRecord, passageId: slot.passageId ?? undefined }),
      jsonSchema: sourceResponseSchema(slot.questionType),
      maxOutputTokens: slot.questionType === "reading_comprehension" ? 1600 : 800,
      cacheSalt: `${salt}:${slot.passageId ?? slot.id}:source`,
    });
    calls.push(usageRow("source", model.promptVersion, `${stageProvider(input.models.generator).name}:${generator.model}`, ran));
    return ran;
  }

  async function questionChain(slot: PrecheckSlot, sourceValue: ItemSource, calls: StageUsage[], sourceError: string | null): Promise<ItemRunRecord> {
    const model = itemModel(slot.questionType);
    const generator = parseModel(input.models.generator);
    const judge = parseModel(input.models.judge);
    let record = finish(slot, context, { called: true, value: sourceValue, error: sourceError }, notCalled, notCalled, notCalled, calls);
    if (record.source.status !== "pass") return record;
    const coreRan = await oneCall(stageProvider(input.models.generator), model.promptVersion, slot.questionType === "reading_comprehension" ? readingCoreOutput : itemCoreOutput, {
      model: generator.model,
      system: coreSystem,
      user: coreUser(model, sourceValue, slot.questionSlot ?? undefined),
      jsonSchema: coreResponseSchema(slot.questionType),
      maxOutputTokens: 800,
      cacheSalt: `${salt}:${slot.id}:core`,
    });
    calls.push(usageRow("core", model.promptVersion, `${stageProvider(input.models.generator).name}:${generator.model}`, coreRan));
    if (!coreRan.ran) {
      stopped = true;
      return { ...record, stop: "budget", stopReason: coreRan.error, calls };
    }
    const coreValue = coreRan.value ? toCore(coreRan.value, input.models.generator, model.promptVersion, slot.questionType) : null;
    record = finish(slot, context, { called: true, value: sourceValue, error: null }, { called: true, value: coreValue, error: coreRan.error }, notCalled, notCalled, calls);
    if (record.key.status !== "pass" || !coreValue) return record;
    const poolRan = await oneCall(stageProvider(input.models.generator), model.promptVersion, distractorPoolEnvelope, {
      model: generator.model,
      system: distractorSystem,
      user: distractorUser(model, sourceValue, { stem: coreValue.stem, correctAnswer: coreValue.correctAnswer }),
      jsonSchema: distractorResponseSchema(model.errorMechanisms),
      maxOutputTokens: 1600,
      cacheSalt: `${salt}:${slot.id}:distractors`,
    });
    calls.push(usageRow("distractors", model.promptVersion, `${stageProvider(input.models.generator).name}:${generator.model}`, poolRan));
    if (!poolRan.ran) {
      stopped = true;
      return { ...record, stop: "budget", stopReason: poolRan.error, calls };
    }
    const split = poolRan.value ? acceptDistractorPool(poolRan.value, model.errorMechanisms) : { accepted: null, rejected: [] };
    record = finish(slot, context, { called: true, value: sourceValue, error: null }, { called: true, value: coreValue, error: null }, { called: true, value: split.accepted, error: poolRan.error }, notCalled, calls);
    if (split.rejected.length) record = { ...record, pool: { ...record.pool, rejected: [...split.rejected, ...record.pool.rejected] } };
    if (record.pool.status !== "pass" || record.structure.status !== "pass" || !record.options || !record.stem) return record;
    const judgeRan = await oneCall(stageProvider(input.models.judge), itemJudgePromptVersion, itemJudgePacket, {
      model: judge.model,
      system: judgeSystem,
      user: judgeUser(model, record.stem, record.options, sourceValue),
      jsonSchema: judgeResponseSchemaForItem(),
      maxOutputTokens: 1200,
      cacheSalt: `${salt}:${slot.id}:judge`,
    });
    calls.push(usageRow("judge", itemJudgePromptVersion, `${stageProvider(input.models.judge).name}:${judge.model}`, judgeRan));
    if (!judgeRan.ran) {
      stopped = true;
      return { ...record, stop: "budget", stopReason: judgeRan.error, calls };
    }
    return finish(slot, context, { called: true, value: sourceValue, error: null }, { called: true, value: coreValue, error: null }, { called: true, value: split.accepted, error: null }, { called: true, value: (judgeRan.value as JudgeInput | null) ?? null, error: judgeRan.error }, calls);
  }

  const slots = precheckSlots();
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (!slot) continue;
    if (stopped || budget.stopped) {
      records.push(stoppedRecord(slot, input.models, budget.stopped ?? "budget"));
      continue;
    }
    if (slot.passageId) {
      const group = slots.filter((entry) => entry.passageId === slot.passageId);
      const calls: StageUsage[] = [];
      const sourceRan = await sourceCall(slot, calls);
      if (!sourceRan.ran) {
        stopped = true;
        for (const member of group) records.push(stoppedRecord(member, input.models, sourceRan.error));
      } else {
        const parsed = asCall(sourceRan);
        const sourceValue = parsed.value ? safeSource(slot.questionType, parsed.value, slot.passageId) : null;
        const sourceError = parsed.error ?? (parsed.value && !sourceValue ? "source_schema" : null);
        for (const [memberIndex, member] of group.entries()) {
          if (stopped || budget.stopped) {
            records.push(stoppedRecord(member, input.models, budget.stopped ?? "budget"));
            continue;
          }
          const memberCalls = memberIndex === 0 ? calls : [];
          if (!sourceValue) records.push(finish(member, context, { called: true, value: null, error: sourceError }, notCalled, notCalled, notCalled, memberCalls));
          else records.push(await questionChain(member, sourceValue, memberCalls, null));
        }
      }
      index += group.length - 1;
      continue;
    }
    const calls: StageUsage[] = [];
    const sourceRan = await sourceCall(slot, calls);
    if (!sourceRan.ran) {
      stopped = true;
      records.push(stoppedRecord(slot, input.models, sourceRan.error));
      continue;
    }
    const parsed = asCall(sourceRan);
    const sourceValue = parsed.value ? safeSource(slot.questionType, parsed.value, null) : null;
    const sourceError = parsed.error ?? (parsed.value && !sourceValue ? "source_schema" : null);
    if (!sourceValue) records.push(finish(slot, context, { called: true, value: null, error: sourceError }, notCalled, notCalled, notCalled, calls));
    else records.push(await questionChain(slot, sourceValue, calls, sourceError));
  }
  const finished = finalizeReadingSet(records);
  const summary: PrecheckRun = {
    ...base,
    started: true,
    executed: true,
    ready: true,
    lock: null,
    reason: null,
    providerCalls: finished.reduce((sum, record) => sum + record.providerCalls, 0),
    costUsd: finished.reduce((sum, record) => (sum === null || record.costUsd === null ? null : sum + record.costUsd), 0 as number | null),
    records: finished,
  };
  if (input.outDir) writeRecords(input.outDir, summary);
  return summary;
}

function safeSource(type: "restatement" | "translation" | "reading_comprehension", value: unknown, passageId: string | null): ItemSource | null {
  try {
    return toSource(type, value, passageId);
  } catch {
    return null;
  }
}

function finish(
  slot: PrecheckSlot,
  context: { officialTexts: string[]; sources: SourceRecord[]; prices: Prices | null; models: { generator: string; judge: string } },
  source: StageCall<ItemSource>,
  core: StageCall<ItemCore>,
  distractors: StageCall<DistractorCandidate[]>,
  judge: StageCall<JudgeInput>,
  calls: StageUsage[],
): ItemRunRecord {
  return buildRunRecord({
    id: slot.id,
    model: itemModel(slot.questionType),
    generatorModel: context.models.generator,
    judgeModel: context.models.judge,
    correctOption: slot.correctOption,
    officialTexts: context.officialTexts,
    sources: context.sources,
    passageId: slot.passageId,
    expectedDirection: slot.direction,
    source,
    core,
    distractors,
    judge,
    calls,
    costUsd: itemCost(calls, context.prices),
  });
}

function stoppedRecord(slot: PrecheckSlot, models: { generator: string; judge: string }, reason: string): ItemRunRecord {
  const record = buildRunRecord({
    id: slot.id,
    model: itemModel(slot.questionType),
    generatorModel: models.generator,
    judgeModel: models.judge,
    correctOption: slot.correctOption,
    passageId: slot.passageId,
    expectedDirection: slot.direction,
    officialTexts: [],
    source: notCalled,
    core: notCalled,
    distractors: notCalled,
    judge: notCalled,
    calls: [],
    costUsd: null,
    stop: "budget",
  });
  return { ...record, stop: "budget", stopReason: reason };
}

function writeRecords(outDir: string, summary: PrecheckRun) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify({ ...summary, records: summary.records.length }, null, 2)}\n`);
  for (const record of summary.records) writeFileSync(path.join(outDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
}

/** Hash-locked text or verified extracts. Raw OCR and topic slices stay out of the screen. */
const reliableBooklets = [
  { document: "yds-2013-spring", file: "questions-text.json" },
  { document: "yds-2013-fall", file: "questions-text.json" },
  { document: "yds-2014-spring", file: "questions-text.json" },
  { document: "yds-2014-fall", file: "questions-text.json" },
  { document: "yds-2015-spring", file: "questions-text.json" },
  { document: "yds-2015-fall", file: "questions-text.json" },
  { document: "yds-2016-spring", file: "questions-text.json" },
  { document: "yds-2018", file: "questions-text.json" },
  { document: "yds-2018-2", file: "questions-text.json" },
  { document: "yds-2023-10", file: "questions-text.json" },
  { document: "yds-2024-11", file: "questions-verified.json" },
] as const;

const withheldBooklets = [
  { document: "yds-2024-03", reason: "ocr_primary_not_a_verified_freeze" },
  { document: "e-yds-topic-vocab", reason: "topic_slice" },
  { document: "e-yds-topic-tense", reason: "topic_slice" },
  { document: "e-yds-topic-conj", reason: "topic_slice" },
  { document: "e-yds-topic-prep", reason: "topic_slice" },
  { document: "e-yds-topic-sent", reason: "topic_slice" },
  { document: "e-yds-topic-trans", reason: "topic_slice" },
  { document: "e-yds-topic-dlg", reason: "topic_slice" },
] as const;

export type OfficialCorpusInspection = {
  integrityFailed: boolean;
  loadedQuestions: number;
  loadedChunks: number;
  booklets: { document: string; file: string; hashMatched: boolean; loaded: number; excluded: number }[];
  excluded: { document: string; number: number | null; status: string; flags: string[] }[];
  /** Flags on questions the validator still accepted. The question text is loaded; the flag is a residual note. */
  loadedFlagCounts: Record<string, number>;
  withheld: { document: string; reason: string; ok: number | null; needsReview: number | null; failed: number | null; missing: number[] }[];
  chunks: string[];
};

type ReconstructItem = { question?: { number?: number; stimulus?: string | null; stem?: string; options?: Record<string, string> } };
type ValidateReport = { summary?: { ok?: number; needsReview?: number; failed?: number; missing?: number[] }; questions?: { number: number; status: string; flags?: string[] }[] };

function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function questionChunk(question: { stimulus?: string | null; stem?: string; options?: Record<string, string> } | undefined): string {
  if (!question) return "";
  return [question.stimulus, question.stem, ...Object.values(question.options ?? {})].filter((part) => part?.trim()).join("\n");
}

function withheldRow(root: string, document: string, reason: string): OfficialCorpusInspection["withheld"][number] {
  const report = readJson<ValidateReport>(path.join(root, document, "validate", "report.json"));
  return {
    document,
    reason,
    ok: report?.summary?.ok ?? null,
    needsReview: report?.summary?.needsReview ?? null,
    failed: report?.summary?.failed ?? null,
    missing: report?.summary?.missing ?? [],
  };
}

/**
 * Official booklet wording for the shingle screen only.
 * A file whose bytes do not match its reconstruct manifest is not loaded.
 * Questions the validator did not accept are reported and left out.
 */
export function inspectOfficialComparisonCorpus(root = ".data/analysis"): OfficialCorpusInspection {
  const base = path.resolve(root);
  const booklets: OfficialCorpusInspection["booklets"] = [];
  const excluded: OfficialCorpusInspection["excluded"] = [];
  const loadedFlagCounts: Record<string, number> = {};
  const chunks: string[] = [];
  let integrityFailed = false;
  let loadedQuestions = 0;
  for (const booklet of reliableBooklets) {
    const dir = path.join(base, booklet.document);
    const manifest = readJson<{ files?: Record<string, string> }>(path.join(dir, "reconstruct", "manifest.json"));
    const textFile = path.join(dir, "reconstruct", booklet.file);
    const expected = manifest?.files?.[booklet.file];
    const hashMatched = Boolean(expected && existsSync(textFile) && sha256(readFileSync(textFile)) === expected);
    const report = readJson<ValidateReport>(path.join(dir, "validate", "report.json"));
    const items = readJson<ReconstructItem[]>(textFile);
    if (!hashMatched || !report?.questions || !Array.isArray(items)) {
      integrityFailed = true;
      booklets.push({ document: booklet.document, file: booklet.file, hashMatched, loaded: 0, excluded: 0 });
      continue;
    }
    const byNumber = new Map(items.flatMap((item) => (item.question?.number == null ? [] : [[item.question.number, item.question] as const])));
    let loaded = 0;
    let dropped = 0;
    for (const question of report.questions) {
      if (question.status !== "ok") {
        dropped += 1;
        excluded.push({ document: booklet.document, number: question.number, status: question.status, flags: question.flags ?? [] });
        continue;
      }
      const text = questionChunk(byNumber.get(question.number));
      if (!text.trim()) {
        dropped += 1;
        excluded.push({ document: booklet.document, number: question.number, status: "empty_text", flags: question.flags ?? [] });
        continue;
      }
      loaded += 1;
      for (const flag of question.flags ?? []) loadedFlagCounts[flag] = (loadedFlagCounts[flag] ?? 0) + 1;
      chunks.push(text);
    }
    for (const number of report.summary?.missing ?? []) {
      dropped += 1;
      excluded.push({ document: booklet.document, number, status: "missing", flags: [] });
    }
    loadedQuestions += loaded;
    booklets.push({ document: booklet.document, file: booklet.file, hashMatched: true, loaded, excluded: dropped });
  }
  return {
    integrityFailed,
    loadedQuestions,
    loadedChunks: chunks.length,
    booklets,
    excluded,
    loadedFlagCounts,
    withheld: withheldBooklets.map((booklet) => withheldRow(base, booklet.document, booklet.reason)),
    chunks,
  };
}

/** Official booklet text for the shingle screen only. It is not a production source. An empty or unverified corpus stays unloaded. */
export function loadOfficialComparisonCorpus(root = ".data/analysis"): string[] | null {
  const inspection = inspectOfficialComparisonCorpus(root);
  if (inspection.integrityFailed || inspection.chunks.length === 0) return null;
  return inspection.chunks;
}

const sourceRecordSchema = z.object({
  sourceId: z.string().min(1),
  locator: z.object({ kind: z.enum(["url", "doi", "document"]), value: z.string().min(1) }),
  topic: z.string().min(1),
  factNotes: z.string().min(1),
  usageRights: z.enum(["granted", "unclear", "refused"]),
  role: z.enum(["production_notes", "official_exam"]),
});

export function loadProductionSources(file = ".data/analysis/_factory/production-sources.json"): SourceRecord[] {
  const full = path.resolve(file);
  if (!existsSync(full)) return [];
  const parsed = z.array(sourceRecordSchema).safeParse(JSON.parse(readFileSync(full, "utf8")));
  return parsed.success ? parsed.data : [];
}

function refused(lock: PrecheckRun["lock"], reason: string): PrecheckRun {
  return { started: false, executed: false, ready: false, lock, reason, planId: precheckAuthorization, profile: precheckCeilings, qualityProven: false, studentBankWrites: 0, providerCalls: 0, costUsd: null, records: [] };
}

/** Same two frozen roles, billed on OpenRouter. The Anthropic ids in modelDefaults stay as they are. */
export const openrouterPrecheckModels = {
  generator: "openrouter:anthropic/claude-haiku-5.5",
  judge: "openrouter:anthropic/claude-sonnet-5.5",
} as const;

export type PrecheckRail = "anthropic" | "openrouter";

/** Authorization, corpus, sources, price table and key are checked before any provider is constructed. */
export async function itemFactoryPrecheck(authorization: string, outDir = ".data/analysis/_factory/item-precheck/v1", via: PrecheckRail = "anthropic"): Promise<PrecheckRun> {
  if (authorization !== precheckAuthorization) return refused("authorization", "precheck authorization required");
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) return refused("corpus", "official comparison corpus is not loaded");
  const sources = loadProductionSources();
  if (assertPrecheckInputs({ officialTexts, sources })) return refused("sources", "production source list is empty");
  if (via !== "anthropic" && via !== "openrouter") return refused("authorization", "precheck rail must be anthropic or openrouter");
  const prices = via === "openrouter" ? loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") }) : loadPrices();
  const limits = precheckLimits(loadSpendLimits());
  const models = via === "openrouter" ? { ...openrouterPrecheckModels } : { generator: precheckPlan.models.generator, judge: precheckPlan.models.judge };
  try {
    new SpendBudget(limits, prices, [models.generator, models.judge]);
  } catch (error) {
    return refused("budget", error instanceof Error ? error.message : "budget refused");
  }
  const config = loadAIConfig();
  const needed = [parseModel(models.generator, config.provider).provider, parseModel(models.judge, config.provider).provider];
  const missing = needed.find((name) => !config.keys[name]);
  if (missing) {
    return refused("credentials", `missing ${missing} API key`);
  }
  const cache = new Map<string, AIProvider>();
  const { createProvider } = await import("../ai/service");
  return executePrecheck({
    authorization,
    prices,
    models,
    limits,
    outDir,
    officialTexts,
    sources,
    providerFor: (setting) => {
      const parsed = parseModel(setting, config.provider);
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = createProvider(config, parsed.provider);
      cache.set(parsed.provider, created);
      return created;
    },
  });
}

export type CoreSmokeRun = {
  started: boolean;
  executed: boolean;
  ready: boolean;
  lock: PrecheckRun["lock"];
  reason: string | null;
  planId: typeof smokeAuthorization;
  profile: typeof smokeCeilings;
  qualityProven: false;
  studentBankWrites: 0;
  providerCalls: number;
  costUsd: number | null;
  tokens: { input: number; output: number; reasoning: number; visibleOutput: number };
  records: ItemRunRecord[];
};

const precheckRecordDirs = [path.resolve(".data/analysis/_factory/item-precheck/v1"), path.resolve(".data/analysis/_factory/item-precheck/openrouter-v1")];

function smokeRefused(lock: CoreSmokeRun["lock"], reason: string): CoreSmokeRun {
  return { started: false, executed: false, ready: false, lock, reason, planId: smokeAuthorization, profile: smokeCeilings, qualityProven: false, studentBankWrites: 0, providerCalls: 0, costUsd: null, tokens: { input: 0, output: 0, reasoning: 0, visibleOutput: 0 }, records: [] };
}

function smokeTokens(records: ItemRunRecord[]): CoreSmokeRun["tokens"] {
  const tokens = { input: 0, output: 0, reasoning: 0, visibleOutput: 0 };
  for (const record of records) {
    for (const call of record.calls) {
      const reasoning = call.reasoningTokens ?? 0;
      tokens.input += call.inputTokens;
      tokens.output += call.outputTokens;
      tokens.reasoning += reasoning;
      tokens.visibleOutput += Math.max(0, call.outputTokens - reasoning);
    }
  }
  return tokens;
}

/**
 * Source and key only. Distractors and the judge are not called.
 * The call ceiling stays at the authorized ten even though the graph has eleven calls.
 */
export async function executeCoreSmoke(input: {
  authorization: string;
  providerFor: ((setting: string) => AIProvider) | null;
  prices: Prices | null;
  models: { generator: string; judge: string };
  outDir?: string;
  cacheSalt?: string;
  officialTexts?: string[];
  sources?: SourceRecord[];
  overrides?: unknown;
  limits?: { maxCalls?: number; maxRegenerations?: number; maxCostUsd?: number };
}): Promise<CoreSmokeRun> {
  const base: Pick<CoreSmokeRun, "planId" | "profile" | "qualityProven" | "studentBankWrites" | "providerCalls" | "costUsd" | "tokens" | "records"> = { planId: smokeAuthorization, profile: smokeCeilings, qualityProven: false, studentBankWrites: 0, providerCalls: 0, costUsd: null, tokens: { input: 0, output: 0, reasoning: 0, visibleOutput: 0 }, records: [] };
  try {
    assertSmokeStart(input);
  } catch (error) {
    return { ...base, started: false, executed: false, ready: false, lock: "authorization", reason: error instanceof Error ? error.message : "core smoke refused" };
  }
  const limits = smokeLimits(input.limits);
  const resolveProvider = input.providerFor;
  if (!resolveProvider) return { ...base, started: false, executed: false, ready: true, lock: "runner", reason: "provider runner is not attached; the core smoke was not started" };
  const gate = assertPrecheckInputs(input);
  if (gate) return { ...base, started: false, executed: false, ready: false, lock: gate, reason: gate === "corpus" ? "official comparison corpus is not loaded" : "production source list is empty" };
  let budget: SpendBudget;
  try {
    budget = new SpendBudget(limits, input.prices, [input.models.generator]);
  } catch (error) {
    return { ...base, started: false, executed: false, ready: false, lock: "budget", reason: error instanceof Error ? error.message : "budget refused" };
  }
  const metered = new Map<string, AIProvider>();
  const stageProvider = (setting: string) => {
    const found = metered.get(setting);
    if (found) return found;
    const wrapped = budget.meter(resolveProvider(setting));
    metered.set(setting, wrapped);
    return wrapped;
  };
  const officialTexts = input.officialTexts ?? [];
  const salt = input.cacheSalt ?? smokeAuthorization;
  const records: ItemRunRecord[] = [];
  let stopped = false;
  const context = { officialTexts, sources: input.sources ?? [], prices: input.prices, models: input.models };

  async function sourceCall(slot: PrecheckSlot, calls: StageUsage[]): Promise<Ran<unknown>> {
    const model = itemModel(slot.questionType);
    const generator = parseModel(input.models.generator);
    const sourceRecord = slot.questionType === "reading_comprehension" ? input.sources?.find((record) => record.role === "production_notes" && record.usageRights === "granted") : undefined;
    const ran = await oneCall(stageProvider(input.models.generator), model.promptVersion, sourceSchemaFor[slot.questionType], {
      model: generator.model,
      system: sourceSystem,
      user: sourceUser(model, records.length + 1, { direction: slot.direction ?? undefined, source: sourceRecord, passageId: slot.passageId ?? undefined }),
      jsonSchema: sourceResponseSchema(slot.questionType),
      maxOutputTokens: slot.questionType === "reading_comprehension" ? 1600 : 800,
      cacheSalt: `${salt}:${slot.passageId ?? slot.id}:source`,
    });
    calls.push(usageRow("source", model.promptVersion, `${stageProvider(input.models.generator).name}:${generator.model}`, ran));
    return ran;
  }

  async function keyOnly(slot: PrecheckSlot, sourceValue: ItemSource, calls: StageUsage[]): Promise<ItemRunRecord> {
    const model = itemModel(slot.questionType);
    const generator = parseModel(input.models.generator);
    const record = finish(slot, context, { called: true, value: sourceValue, error: null }, notCalled, notCalled, notCalled, calls);
    if (record.source.status !== "pass") return record;
    const coreRan = await oneCall(stageProvider(input.models.generator), model.promptVersion, slot.questionType === "reading_comprehension" ? readingCoreOutput : itemCoreOutput, {
      model: generator.model,
      system: coreSystem,
      user: coreUser(model, sourceValue, slot.questionSlot ?? undefined),
      jsonSchema: coreResponseSchema(slot.questionType),
      maxOutputTokens: 800,
      cacheSalt: `${salt}:${slot.id}:core`,
    });
    calls.push(usageRow("core", model.promptVersion, `${stageProvider(input.models.generator).name}:${generator.model}`, coreRan));
    if (!coreRan.ran) {
      stopped = true;
      return { ...record, stop: "budget", stopReason: coreRan.error, calls };
    }
    const coreValue = coreRan.value ? toCore(coreRan.value, input.models.generator, model.promptVersion, slot.questionType) : null;
    return finish(slot, context, { called: true, value: sourceValue, error: null }, { called: true, value: coreValue, error: coreRan.error }, notCalled, notCalled, calls);
  }

  const slots = smokeSlots();
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (!slot) continue;
    if (stopped || budget.stopped) {
      records.push(stoppedRecord(slot, input.models, budget.stopped ?? "budget"));
      continue;
    }
    if (slot.passageId) {
      const group = slots.filter((entry) => entry.passageId === slot.passageId);
      const calls: StageUsage[] = [];
      const sourceRan = await sourceCall(slot, calls);
      if (!sourceRan.ran) {
        stopped = true;
        for (const member of group) records.push(stoppedRecord(member, input.models, sourceRan.error));
      } else {
        const parsed = asCall(sourceRan);
        const sourceValue = parsed.value ? safeSource(slot.questionType, parsed.value, slot.passageId) : null;
        const sourceError = parsed.error ?? (parsed.value && !sourceValue ? "source_schema" : null);
        for (const [memberIndex, member] of group.entries()) {
          if (stopped || budget.stopped) {
            records.push(stoppedRecord(member, input.models, budget.stopped ?? "budget"));
            continue;
          }
          const memberCalls = memberIndex === 0 ? calls : [];
          if (!sourceValue) records.push(finish(member, context, { called: true, value: null, error: sourceError }, notCalled, notCalled, notCalled, memberCalls));
          else records.push(await keyOnly(member, sourceValue, memberCalls));
        }
      }
      index += group.length - 1;
      continue;
    }
    const calls: StageUsage[] = [];
    const sourceRan = await sourceCall(slot, calls);
    if (!sourceRan.ran) {
      stopped = true;
      records.push(stoppedRecord(slot, input.models, sourceRan.error));
      continue;
    }
    const parsed = asCall(sourceRan);
    const sourceValue = parsed.value ? safeSource(slot.questionType, parsed.value, null) : null;
    const sourceError = parsed.error ?? (parsed.value && !sourceValue ? "source_schema" : null);
    if (!sourceValue) records.push(finish(slot, context, { called: true, value: null, error: sourceError }, notCalled, notCalled, notCalled, calls));
    else records.push(await keyOnly(slot, sourceValue, calls));
  }
  const finished = finalizeReadingSet(records);
  const summary: CoreSmokeRun = {
    ...base,
    started: true,
    executed: true,
    ready: true,
    lock: null,
    reason: budget.stopped,
    providerCalls: finished.reduce((sum, record) => sum + record.providerCalls, 0),
    costUsd: budget.cost().usd,
    tokens: smokeTokens(finished),
    records: finished,
  };
  if (input.outDir) {
    mkdirSync(input.outDir, { recursive: true });
    writeFileSync(path.join(input.outDir, "summary.json"), `${JSON.stringify({ ...summary, records: summary.records.length }, null, 2)}\n`);
    for (const record of summary.records) writeFileSync(path.join(input.outDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }
  return summary;
}

/** OpenRouter source-and-key smoke. It does not start the 11-question precheck or the 90-item benchmark. */
export async function itemFactoryCoreSmoke(authorization: string, outDir = ".data/analysis/_factory/item-core-smoke/openrouter-v1", via: PrecheckRail | string = "openrouter"): Promise<CoreSmokeRun> {
  if (authorization !== smokeAuthorization) return smokeRefused("authorization", "core smoke authorization required");
  if (precheckRecordDirs.some((dir) => path.resolve(outDir) === dir)) return smokeRefused("authorization", "core smoke refuses to overwrite a precheck record directory");
  const officialTexts = loadOfficialComparisonCorpus();
  if (!officialTexts?.length) return smokeRefused("corpus", "official comparison corpus is not loaded");
  const sources = loadProductionSources();
  if (assertPrecheckInputs({ officialTexts, sources })) return smokeRefused("sources", "production source list is empty");
  if (via !== "openrouter") return smokeRefused("authorization", "core smoke rail must be openrouter");
  const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
  const limits = smokeLimits(loadSpendLimits());
  const models = { generator: openrouterPrecheckModels.generator, judge: openrouterPrecheckModels.judge };
  try {
    new SpendBudget(limits, prices, [models.generator]);
  } catch (error) {
    return smokeRefused("budget", error instanceof Error ? error.message : "budget refused");
  }
  const config = loadAIConfig();
  if (!config.keys.openrouter) return smokeRefused("credentials", "missing openrouter API key");
  const cache = new Map<string, AIProvider>();
  const { createProvider } = await import("../ai/service");
  return executeCoreSmoke({
    authorization,
    prices,
    models,
    limits,
    outDir,
    officialTexts,
    sources,
    providerFor: (setting) => {
      const parsed = parseModel(setting, config.provider);
      const existing = cache.get(parsed.provider);
      if (existing) return existing;
      const created = createProvider(config, parsed.provider);
      cache.set(parsed.provider, created);
      return created;
    },
  });
}
