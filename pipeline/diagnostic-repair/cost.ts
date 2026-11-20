import { openrouterBrevity } from "../ai/openrouter";
import { estimateCost, type Prices } from "../ai/prices";
import { repairModel, repairOutputSchema, repairSystem, repairUser, type RepairTask } from "./contract";

/** One sentence. The provider output floor must be set to this value so it does not rise to 4096. */
export const repairOutputCeiling = 180;

/** Two options, one attempt each. Above this, a live call is not authorized. */
export const repairBudgetUsd = 0.02;

export type RepairCost = {
  model: typeof repairModel;
  calls: number;
  retry: 0;
  attemptsPerOption: 1;
  outputTokenCeiling: number;
  inputTokens: number;
  estimatedUsd: number | null;
  floorWarningUsd: number | null;
  withinBudget: boolean;
  measuredBill: false;
  promptCache: "off";
};

function tokens(chars: number): number {
  return Math.ceil(chars / 3);
}

/** Chars the provider actually receives: system, brevity, schema, and the user message. Cache is off. */
export function repairProviderCeiling(tasks: readonly RepairTask[], prices: Prices | null, fixed: { source: string; key: string; targetLanguage: "tr" | "en"; fixedOptions: readonly string[] }): RepairCost {
  const schema = JSON.stringify(repairOutputSchema);
  const inputTokens = tasks.reduce((sum, task) => sum + tokens(repairSystem.length + 2 + openrouterBrevity.length + schema.length + repairUser(task, fixed).length), 0);
  const calls = tasks.length;
  const planned = estimateCost({ [repairModel]: { calls, inputTokens, outputTokens: calls * repairOutputCeiling } }, prices);
  return {
    model: repairModel,
    calls,
    retry: 0,
    attemptsPerOption: 1,
    outputTokenCeiling: repairOutputCeiling,
    inputTokens,
    estimatedUsd: planned.usd,
    floorWarningUsd: null,
    withinBudget: planned.usd !== null && calls === 2 && planned.usd <= repairBudgetUsd,
    measuredBill: false,
    promptCache: "off",
  };
}

export function repairCost(tasks: readonly RepairTask[], prices: Prices | null, fixed: { source: string; key: string; targetLanguage: "tr" | "en"; fixedOptions: readonly string[] }): RepairCost {
  const inputTokens = tasks.reduce((sum, task) => sum + tokens(repairSystem.length + repairUser(task, fixed).length), 0);
  const calls = tasks.length;
  const planned = estimateCost({ [repairModel]: { calls, inputTokens, outputTokens: calls * repairOutputCeiling } }, prices);
  const floored = estimateCost({ [repairModel]: { calls, inputTokens, outputTokens: calls * 4096 } }, prices);
  const estimatedUsd = planned.usd;
  return {
    model: repairModel,
    calls,
    retry: 0,
    attemptsPerOption: 1,
    outputTokenCeiling: repairOutputCeiling,
    inputTokens,
    estimatedUsd,
    floorWarningUsd: floored.usd,
    withinBudget: estimatedUsd !== null && estimatedUsd <= repairBudgetUsd,
    measuredBill: false,
    promptCache: "off",
  };
}
