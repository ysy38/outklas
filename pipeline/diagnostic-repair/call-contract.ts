import { openrouterBrevity } from "../ai/openrouter";
import { estimateCost, type Prices } from "../ai/prices";
import { repairModel, repairOutputSchema, repairSystem, repairUser, type RepairTask } from "./contract";

/**
 * OpenRouterProvider.generate sends `reasoning: { exclude: true }`.
 * That omits reasoning text from the message. It does not stop reasoning, and this provider does not send `effort`.
 * GatewayProvider can send `effort: "none"`. The repair pilot did not use that provider.
 * max_tokens is one pool: completion_tokens include reasoning_tokens. There is no separate visible-output budget.
 * json_schema is attached when the request carries jsonSchema. It does not reserve visible tokens.
 */
export const openRouterWriterWire = {
  reasoning: { exclude: true },
  reasoningEffortSent: false,
  jsonSchema: "response_format.json_schema",
  outputFloor: 4096,
  sharedBudget: true,
} as const;

/** The completed pilot is not permission for another call. $0.02 was the old cap, not a new authorization. */
export const repairLiveAuthorized = false;

export const technicalFailureCodes = ["no_visible_output", "output_budget_exhausted"] as const;
export type TechnicalFailureCode = (typeof technicalFailureCodes)[number];

/** Empty visible text and a reasoning spend that fills the output cap. Not a repair outcome. */
export function classifyRepairTransport(input: { text: string; outputTokens: number; reasoningTokens?: number }): TechnicalFailureCode[] {
  const codes: TechnicalFailureCode[] = [];
  if (!input.text.trim()) codes.push("no_visible_output");
  const reasoning = input.reasoningTokens ?? 0;
  if (input.outputTokens > 0 && reasoning >= input.outputTokens) codes.push("output_budget_exhausted");
  return codes;
}

/** chars/2 over the observed ~2.3 chars per token. Output is the provider floor, because lowering it starved the shared pool. */
export function cautiousRepairCeiling(tasks: readonly RepairTask[], prices: Prices | null, fixed: { source: string; key: string; targetLanguage: "tr" | "en"; fixedOptions: readonly string[] }) {
  const schema = JSON.stringify(repairOutputSchema);
  const inputTokens = tasks.reduce((sum, task) => sum + Math.ceil((repairSystem.length + 2 + openrouterBrevity.length + schema.length + repairUser(task, fixed).length) / 2), 0);
  const calls = tasks.length;
  const outputTokens = calls * openRouterWriterWire.outputFloor;
  const estimated = estimateCost({ [repairModel]: { calls, inputTokens, outputTokens } }, prices);
  return {
    model: repairModel,
    calls,
    retry: 0 as const,
    inputTokens,
    outputTokensPerCall: openRouterWriterWire.outputFloor,
    outputTokens,
    estimatedUsd: estimated.usd,
    measuredBill: false as const,
    promptCache: "off" as const,
    liveAuthorized: repairLiveAuthorized,
  };
}

export function refuseRepairLive(): { started: false; providerCalls: 0; studentBankWrites: 0; reason: string } {
  return { started: false, providerCalls: 0, studentBankWrites: 0, reason: "the completed repair pilot is not a new live authorization" };
}
