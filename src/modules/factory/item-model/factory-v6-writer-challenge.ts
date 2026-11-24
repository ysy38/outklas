import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { architectureV2WriterTokenCeiling, callCeilingUsd, type CatalogPrice, type PriceCatalog } from "./architecture-v2";
import {
  factoryV6LivePilotOutputDir,
  factoryV6LivePilotSourceIds,
  validateAllV6PilotPreFlight,
  type V6PilotTask,
} from "./factory-v6-live-pilot";
import { factoryRootCauseFixEnabled } from "./root-cause-fix";
import { qualityFirstPilotForbiddenDirs } from "./quality-first-pilot";
import { recoveryDefaultEnabled } from "./recovery";
import { incompleteOption } from "./misreading-mechanisms";
import { bakeoffHardBlocks, freezeWriterBakeoffTasks, packBlindOptions, writerBakeoffBlindSeed, writerBakeoffOutputDir } from "./writer-bakeoff";
import { evaluateWriterOption } from "./writer-bakeoff-compare";
import { classifyOption } from "./whole-set";

export const factoryV6WriterChallengeAuthorization = "factory-v6-writer-model-challenge-v1";
export const factoryV6WriterChallengeOutputDir = ".data/analysis/_factory/cognitive-trap/factory-v6-writer-challenge-v1";
export const factoryV6WriterChallengeLiveAuthorized = true as const;
export const factoryV6WriterChallengeSpendCapUsd = 0.05;
export const factoryV6WriterChallengeMaxCalls = 6;
export const factoryV6WriterChallengeRetry = 0;
export const factoryV6WriterChallengeOutputTokens = architectureV2WriterTokenCeiling.output;
export const factoryV6WriterChallengeCatalogUrl = "https://openrouter.ai/api/v1/models";

export const factoryV6WriterChallengeModels = [
  "openrouter:deepseek/deepseek-v4.1-flash-1017",
  "openrouter:tencent/hy4",
] as const;

export const factoryV6WriterChallengeSourceIds = factoryV6LivePilotSourceIds;

const adapterRequiredParams = ["response_format", "structured_outputs", "reasoning", "max_tokens"] as const;

export type CatalogModelRow = {
  id: string;
  present: boolean;
  name: string | null;
  inUsdPerMillion: number | null;
  outUsdPerMillion: number | null;
  cacheReadUsdPerMillion: number | null;
  supportedParameters: string[];
  adapterCompatible: boolean;
  missingAdapterParams: string[];
  substituted: false;
};

export type ChallengeCandidate = {
  candidateText: string;
  planId: string;
  studentMisreading: string;
  semanticRisk: string;
};

function usdPerMillion(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n < 0.01 ? n * 1_000_000 : n;
}

export function parseOpenRouterCatalog(raw: unknown): CatalogModelRow[] {
  const data = raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data)
    ? (raw as { data: { id?: string; name?: string; pricing?: Record<string, unknown>; supported_parameters?: string[] }[] }).data
    : [];
  return factoryV6WriterChallengeModels.map((setting) => {
    const id = setting.slice("openrouter:".length);
    const row = data.find((item) => item.id === id);
    const supportedParameters = row?.supported_parameters ?? [];
    const missingAdapterParams = adapterRequiredParams.filter((name) => !supportedParameters.includes(name));
    return {
      id,
      present: Boolean(row),
      name: row?.name ?? null,
      inUsdPerMillion: usdPerMillion(row?.pricing?.prompt),
      outUsdPerMillion: usdPerMillion(row?.pricing?.completion),
      cacheReadUsdPerMillion: usdPerMillion(row?.pricing?.input_cache_read),
      supportedParameters,
      adapterCompatible: Boolean(row) && missingAdapterParams.length === 0,
      missingAdapterParams,
      substituted: false,
    };
  });
}

export function conservativePrice(live: CatalogModelRow, local: CatalogPrice | undefined): CatalogPrice | null {
  if (live.inUsdPerMillion == null || live.outUsdPerMillion == null) return local ?? null;
  const inUsd = Math.max(live.inUsdPerMillion, local?.in ?? 0);
  const outUsd = Math.max(live.outUsdPerMillion, local?.out ?? 0);
  return {
    in: inUsd,
    out: outUsd,
    ...(live.cacheReadUsdPerMillion != null || local?.cacheRead != null
      ? { cacheRead: Math.max(live.cacheReadUsdPerMillion ?? 0, local?.cacheRead ?? 0) }
      : {}),
  };
}

export function challengeCeilingUsd(input: { catalog: CatalogModelRow[]; localPrices: PriceCatalog }): {
  perModel: { setting: string; perCallUsd: number | null; adapterCompatible: boolean; present: boolean }[];
  sixCallUsd: number | null;
  fitsCap: boolean;
} {
  const perModel = factoryV6WriterChallengeModels.map((setting) => {
    const id = setting.slice("openrouter:".length);
    const live = input.catalog.find((row) => row.id === id);
    const price = live ? conservativePrice(live, input.localPrices[setting]) : input.localPrices[setting] ?? null;
    const perCallUsd = price
      ? callCeilingUsd({ in: price.in, out: price.out, cacheWrite: price.cacheWrite ?? 0 }, architectureV2WriterTokenCeiling)
      : null;
    return {
      setting,
      perCallUsd,
      adapterCompatible: live?.adapterCompatible ?? false,
      present: live?.present ?? false,
    };
  });
  const sixCallUsd = perModel.every((row) => row.perCallUsd != null)
    ? perModel.reduce((sum, row) => sum + (row.perCallUsd ?? 0) * factoryV6LivePilotSourceIds.length, 0)
    : null;
  return {
    perModel,
    sixCallUsd,
    fitsCap: sixCallUsd != null && sixCallUsd <= factoryV6WriterChallengeSpendCapUsd,
  };
}

export function challengePricesFromCatalog(catalog: CatalogModelRow[]): PriceCatalog {
  const table: PriceCatalog = {};
  for (const row of catalog) {
    if (row.inUsdPerMillion == null || row.outUsdPerMillion == null) continue;
    table[`openrouter:${row.id}`] = {
      in: row.inUsdPerMillion,
      out: row.outUsdPerMillion,
      ...(row.cacheReadUsdPerMillion != null ? { cacheRead: row.cacheReadUsdPerMillion } : {}),
    };
  }
  return table;
}

export function frozenHashesUnchanged(): {
  ok: boolean;
  rows: { sourceId: string; sourceHash: string; keyHash: string; planHash: string; freezeMatch: boolean }[];
} {
  const freezePath = path.join(writerBakeoffOutputDir, "freeze.json");
  const freeze = JSON.parse(readFileSync(freezePath, "utf8")) as {
    id: string;
    sourceHash: string;
    keyHash: string;
    planHash: string;
  }[];
  const live = freezeWriterBakeoffTasks();
  const rows = factoryV6WriterChallengeSourceIds.map((id) => {
    const frozen = freeze.find((row) => row.id === id);
    const task = live.find((row) => row.id === id);
    const freezeMatch = Boolean(
      frozen && task && frozen.sourceHash === task.sourceHash && frozen.keyHash === task.keyHash && frozen.planHash === task.planHash,
    );
    return {
      sourceId: id,
      sourceHash: task?.sourceHash ?? "",
      keyHash: task?.keyHash ?? "",
      planHash: task?.planHash ?? "",
      freezeMatch,
    };
  });
  return { ok: rows.every((row) => row.freezeMatch), rows };
}

export function loadHaikuV6Baseline(): { sourceId: string; candidates: ChallengeCandidate[] }[] {
  return factoryV6WriterChallengeSourceIds.map((sourceId) => {
    const file = path.join(factoryV6LivePilotOutputDir, `${sourceId}.v6.json`);
    if (!existsSync(file)) throw new Error(`haiku v6 baseline missing for ${sourceId}`);
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { candidates?: ChallengeCandidate[] };
    if (!parsed.candidates?.length) throw new Error(`haiku v6 baseline empty for ${sourceId}`);
    return { sourceId, candidates: parsed.candidates };
  });
}

function extraClaim(source: string, option: string): boolean {
  if (/\bnever filed\b/i.test(option) && !/\bnever\b/i.test(source)) return true;
  if (/\bhumidity fell\b/i.test(option) && !/\bfell\b/i.test(source)) return true;
  if (/\bdiğer donanım|other equipment\b/i.test(option) && !/other equipment|diğer donanım/i.test(source)) return true;
  if (/\bintervened\b/i.test(option) && !/\bintervened\b/i.test(source)) return true;
  if (/\bapproved\b/i.test(option) && !/\bapproved\b/i.test(source)) return true;
  return false;
}

function embargoQuantityKind(option: string): "full_widen" | "weakened" | "unchanged" | "unverified" {
  if (/\ball (?:of )?(?:the )?appendices\b/i.test(option)) return "full_widen";
  if (/\bat least|among those|some of the appendices\b/i.test(option)) return "weakened";
  if (/\bonly the two (?:contested )?appendices\b/i.test(option)) return "unchanged";
  return "unverified";
}

function embargoConditionDirection(option: string): "applied" | "not_applied" | "unverified" {
  if (/\bhad (?:only )?(?:the )?(?:two contested )?appendices been released\b/i.test(option)) return "applied";
  if (/\bif (?:only )?(?:the )?(?:two contested )?appendices (?:had been|were) released\b/i.test(option)) return "applied";
  if (/^\s*only the two contested appendices would have been released\b/i.test(option) && /\bhad the editors completed\b/i.test(option)) {
    return "not_applied";
  }
  if (/\b(?:had|if) the editors (?:had )?completed\b/i.test(option)) return "not_applied";
  return "unverified";
}

function embargoCounterfactual(option: string): "applied" | "not_applied" | "unverified" {
  const stillUnreal = /\bwould have\b/i.test(option) || /\bhad\b[\s\S]{0,80}\bwould\b/i.test(option);
  if (!stillUnreal && /\bcompleted\b/i.test(option) && /\breleased\b/i.test(option)) return "applied";
  if (stillUnreal) return "not_applied";
  return "unverified";
}

function embargoTemporal(option: string): "applied" | "not_applied" | "unverified" {
  if (/\bafter the embargo\b/i.test(option) && !/\bbefore the embargo\b/i.test(option) && !/\bprior to the embargo\b/i.test(option)) {
    return "applied";
  }
  if (/\b(?:before|prior to|ahead of) the embargo\b/i.test(option)) return "not_applied";
  return "unverified";
}

function facultyPurposeCollapsed(option: string): boolean {
  const resultCue = /\bbu yüzden\b|\bsonucunda\b|\bzaten\b/i.test(option);
  const purposeCue = /\biçin\b/.test(option);
  return resultCue && !purposeCue;
}

function boardQuantityVsFocus(option: string): "quantity_drop_only" | "focus_moved_to_reviewers" | "other" {
  if (/\bonly the (?:external )?reviewers\b/i.test(option) || /\brather than the archive\b/i.test(option)) return "focus_moved_to_reviewers";
  if (!/\bonly the two\b/i.test(option) && /\bdisputed tables\b/i.test(option)) return "quantity_drop_only";
  return "other";
}

export type OptionAudit = {
  writer: string;
  sourceId: string;
  planId: string;
  candidateText: string;
  targetedChange: "shown" | "weak" | "unverified" | "fail";
  othersPreserved: "unverified" | "fail";
  naturalAcademic: "unverified" | "fail";
  keyEquivalent: "yes" | "no" | "unverified";
  extraClaim: "yes" | "no" | "unverified";
  formalCue: "yes" | "no" | "unverified";
  notes: string[];
  humanEditorial: "pending";
};

export function auditChallengeOption(input: {
  writer: string;
  task: V6PilotTask;
  plan: V6PilotTask["plans"][number];
  candidate: ChallengeCandidate;
}): OptionAudit {
  const option = input.candidate.candidateText;
  const classified = classifyOption(input.task.source, input.task.key, option);
  const blocks = bakeoffHardBlocks({
    source: input.task.source,
    key: input.task.key,
    option,
    targetLanguage: input.task.targetLanguage,
  });
  const evalRow = evaluateWriterOption({
    source: input.task.source,
    key: input.task.key,
    targetLanguage: input.task.targetLanguage,
    plan: input.plan,
    planFeasibility: "strained",
    candidate: input.candidate,
  });
  const notes: string[] = [];
  let targetedChange: OptionAudit["targetedChange"] = "unverified";
  if (input.plan.mechanismId === "QUANTITY_SCOPE" && input.task.alias === "embargo") {
    const kind = embargoQuantityKind(option);
    targetedChange = kind === "full_widen" ? "shown" : kind === "weakened" ? "weak" : kind === "unchanged" ? "fail" : "unverified";
    if (kind === "weakened") notes.push("embargo_quantity_weakened");
    if (kind === "unchanged") notes.push("embargo_quantity_not_applied");
  }
  if (input.plan.mechanismId === "CONDITION_DIRECTION" && input.task.alias === "embargo") {
    const kind = embargoConditionDirection(option);
    targetedChange = kind === "applied" ? "shown" : kind === "not_applied" ? "fail" : "unverified";
    if (kind === "not_applied") notes.push("embargo_condition_direction_not_applied");
  }
  if (input.plan.mechanismId === "COUNTERFACTUAL_FACTUAL" && input.task.alias === "embargo") {
    const kind = embargoCounterfactual(option);
    targetedChange = kind === "applied" ? "shown" : kind === "not_applied" ? "fail" : "unverified";
    if (kind === "not_applied") notes.push("embargo_counterfactual_not_applied");
  }
  if (input.plan.mechanismId === "TEMPORAL_ORDER" && input.task.alias === "embargo") {
    const kind = embargoTemporal(option);
    targetedChange = kind === "applied" ? "shown" : kind === "not_applied" ? "fail" : "unverified";
    if (kind === "not_applied") notes.push("embargo_temporal_not_applied");
  }
  if (input.plan.mechanismId === "PURPOSE_RESULT" && input.task.alias === "faculty") {
    if (facultyPurposeCollapsed(option)) {
      targetedChange = "weak";
      notes.push("faculty_purpose_collapsed_to_result");
    } else if (/\biçin\b/.test(option) && /\bdeğerleme|değerlemedi|değerlememesi\b/i.test(option)) {
      targetedChange = "shown";
    }
  }
  if (input.plan.mechanismId === "QUANTITY_SCOPE" && input.task.alias === "board") {
    const kind = boardQuantityVsFocus(option);
    if (kind === "focus_moved_to_reviewers") {
      targetedChange = "fail";
      notes.push("board_quantity_leaked_into_focus");
    } else if (kind === "quantity_drop_only") {
      targetedChange = "shown";
      notes.push("board_quantity_without_focus_move");
    }
  }
  const short = incompleteOption(option);
  return {
    writer: input.writer,
    sourceId: input.task.id,
    planId: input.plan.planId,
    candidateText: option,
    targetedChange,
    othersPreserved: evalRow.writerExecutionQuality.coverageRetention === "fail" ? "fail" : "unverified",
    naturalAcademic: short || evalRow.writerExecutionQuality.naturalness === "fail" ? "fail" : "unverified",
    keyEquivalent: classified.relation === "confirmed_equivalent" || blocks.includes("key_equivalence") || blocks.includes("second_defensible") ? "yes" : classified.relation === "confirmed_difference" ? "no" : "unverified",
    extraClaim: extraClaim(input.task.source, option) ? "yes" : "no",
    formalCue: evalRow.writerExecutionQuality.coverageRetention === "fail" || short ? "yes" : "unverified",
    notes,
    humanEditorial: "pending",
  };
}

export function adapterPreFlight(catalog: CatalogModelRow[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const row of catalog) {
    if (!row.present) errors.push(`catalog missing ${row.id}`);
    if (row.present && !row.adapterCompatible) {
      errors.push(`${row.id} missing adapter params: ${row.missingAdapterParams.join(", ")}`);
    }
    if (row.substituted) errors.push(`${row.id} was substituted`);
  }
  return { ok: errors.length === 0, errors };
}

export function challengeProtectedDirs(): string[] {
  return (qualityFirstPilotForbiddenDirs as readonly string[]).filter(
    (dir) => path.resolve(dir) !== path.resolve(factoryV6WriterChallengeOutputDir),
  );
}

export function refuseFactoryV6WriterChallenge(reason: string, code: string) {
  return {
    started: false,
    executed: false,
    providerCalls: 0,
    reason,
    code,
    factoryRootCauseFixEnabled,
    recoveryDefault: recoveryDefaultEnabled ? "on" : "off",
  };
}

export function buildBlindPack(input: {
  tasks: V6PilotTask[];
  cells: { writer: string; sourceId: string; candidates: ChallengeCandidate[] }[];
}) {
  const items = input.cells.map((cell) => {
    const task = input.tasks.find((row) => row.id === cell.sourceId);
    if (!task) throw new Error(`missing task ${cell.sourceId}`);
    return {
      sourceId: cell.sourceId,
      source: task.source,
      key: task.key,
      model: cell.writer,
      options: cell.candidates.map((candidate, index) => {
        const plan = task.plans[index]!;
        return {
          planId: candidate.planId,
          change: plan.changeRelation,
          preserve: plan.preserveRelations,
          forbidden: plan.forbiddenAdditions,
          expectedStudentMisreading: plan.expectedStudentMisreading,
          text: candidate.candidateText,
        };
      }),
    };
  });
  const packed = packBlindOptions({ seed: writerBakeoffBlindSeed, items });
  const packHasModelId = /claude-haiku|deepseek-v4\.1-flash-1017|tencent\/hy4|openrouter:/i.test(JSON.stringify(packed.pack));
  return { ...packed, packHasModelId };
}

export function writeFactoryV6WriterChallengePreFlight(catalog: CatalogModelRow[], localPrices: PriceCatalog) {
  const prompt = validateAllV6PilotPreFlight();
  const hashes = frozenHashesUnchanged();
  const adapter = adapterPreFlight(catalog);
  const ceiling = challengeCeilingUsd({ catalog, localPrices });
  const haiku = loadHaikuV6Baseline();
  const ok =
    prompt.ok &&
    hashes.ok &&
    adapter.ok &&
    ceiling.fitsCap &&
    haiku.length === 3 &&
    !factoryRootCauseFixEnabled;
  mkdirSync(factoryV6WriterChallengeOutputDir, { recursive: true });
  writeFileSync(
    path.join(factoryV6WriterChallengeOutputDir, "pre-flight.json"),
    `${JSON.stringify(
      {
        ok,
        factoryRootCauseFixEnabled,
        promptOk: prompt.ok,
        hashes,
        adapter,
        catalog,
        ceiling,
        haikuBaselineCounts: haiku.map((row) => ({ sourceId: row.sourceId, n: row.candidates.length })),
        substituted: false,
        liveGenerateAuthorizedOnlyIfOk: true,
      },
      null,
      2,
    )}\n`,
  );
  return { ok, prompt, hashes, adapter, ceiling, haiku, errors: [...adapter.errors, ...(hashes.ok ? [] : ["freeze hashes drifted"]), ...(prompt.ok ? [] : ["v6 prompt pre-flight failed"]), ...(ceiling.fitsCap ? [] : ["ceiling over cap"])] };
}