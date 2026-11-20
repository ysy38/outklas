import { estimateCost, type Prices } from "../ai/prices";
import { openrouterPrecheckModels } from "../stages/item-precheck";
import { semanticVerifierRequest, semanticVerifierSystem, type VerificationInput } from "./contract";

const outputTokenCeiling = 500;

/** Rough uncached size. This is not a measured bill, and confidence is not part of it. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export type VerificationCost = {
  model: typeof openrouterPrecheckModels.judge;
  candidates: number;
  outputTokenCeiling: number;
  estimatedUsdPerCandidate: number | null;
  estimatedUsdTotal: number | null;
  reason: string | null;
  measuredBill: false;
  confidenceUsed: false;
};

export function verificationCost(inputs: readonly VerificationInput[], prices: Prices | null): VerificationCost {
  const model = openrouterPrecheckModels.judge;
  let inputTokens = 0;
  for (const input of inputs) {
    const request = semanticVerifierRequest(input);
    inputTokens += estimateTokens(`${request.system}\n${request.user}`);
  }
  const outputTokens = inputs.length * outputTokenCeiling;
  const cost = estimateCost({ [model]: { calls: inputs.length, inputTokens, outputTokens } }, prices);
  const perCandidate = cost.usd === null || inputs.length === 0 ? null : Math.round((cost.usd / inputs.length) * 1_000_000) / 1_000_000;
  return {
    model,
    candidates: inputs.length,
    outputTokenCeiling,
    estimatedUsdPerCandidate: perCandidate,
    estimatedUsdTotal: cost.usd,
    reason: cost.reason,
    measuredBill: false,
    confidenceUsed: false,
  };
}

export function sharedSystemTokens(): number {
  return estimateTokens(semanticVerifierSystem);
}
