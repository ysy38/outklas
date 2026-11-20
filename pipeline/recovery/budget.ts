import { estimateCost, type Prices } from "../ai/prices";
import { openRouterWriterWire } from "../diagnostic-repair/call-contract";
import { repairModel } from "../diagnostic-repair/contract";

/**
 * Recovery calls are priced apart from production.
 * The output ceiling is the provider's shared pool. This figure is not a live authorization.
 * cognitive-trap does not import this module.
 */
export function conservativeRecoveryCeiling(prices: Prices | null, prompts: readonly { chars: number }[]) {
  const inputTokens = prompts.reduce((sum, prompt) => sum + Math.ceil(prompt.chars / 2), 0);
  const calls = prompts.length;
  const outputTokensPerCall = openRouterWriterWire.outputFloor;
  const outputTokens = calls * outputTokensPerCall;
  const estimated = estimateCost({ [repairModel]: { calls, inputTokens, outputTokens } }, prices);
  return {
    provider: "openrouter" as const,
    model: repairModel,
    calls,
    retry: 0 as const,
    maxRepairPerOption: 1 as const,
    maxReplacePerOption: 1 as const,
    inputTokens,
    outputTokensPerCall,
    outputTokens,
    estimatedUsd: estimated.usd,
    separateFromProduction: true as const,
    liveAuthorized: false as const,
  };
}
