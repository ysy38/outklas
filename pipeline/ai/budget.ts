import { addTokens, emptyRow, estimateCost, priceFor, totalTokens, type CostEstimate, type Prices, type TokenUsage } from "./prices";
import type { AIProvider } from "./types";

/** Run-level spend limits; an unset limit does not apply. */
export type SpendLimits = { maxCalls?: number; maxRegenerations?: number; maxTokens?: number; maxCostUsd?: number };

const limitEnv: Record<keyof SpendLimits, { name: string; whole: boolean; min: number }> = {
  maxCalls: { name: "FACTORY_MAX_CALLS", whole: true, min: 1 },
  maxRegenerations: { name: "FACTORY_MAX_REGENERATIONS", whole: true, min: 0 },
  maxTokens: { name: "FACTORY_MAX_TOKENS", whole: true, min: 1 },
  maxCostUsd: { name: "FACTORY_MAX_COST_USD", whole: false, min: 0.0001 },
};

export function loadSpendLimits(env: Record<string, string | undefined> = process.env): SpendLimits {
  const limits: SpendLimits = {};
  for (const [key, rule] of Object.entries(limitEnv) as [keyof SpendLimits, (typeof limitEnv)[keyof SpendLimits]][]) {
    const raw = env[rule.name]?.trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < rule.min || (rule.whole && !Number.isInteger(value))) throw new Error(`${rule.name} must be ${rule.whole ? "a whole number" : "a number"} of at least ${rule.min}`);
    limits[key] = value;
  }
  return limits;
}

export class BudgetExceeded extends Error {}

/**
 * Counts every real provider request of a run (local cache hits never reach it) and refuses the next one once a
 * limit is reached. Checks run before each request against what is already spent, so a run can overshoot by the
 * requests already in flight (at most one per concurrently generated item).
 * The regeneration limit only refuses retries; first attempts of other options and items still run.
 */
export class SpendBudget {
  readonly usage: TokenUsage = {};
  calls = 0;
  regenerations = 0;
  regenerationsDenied = 0;
  stopped: string | null = null;

  constructor(
    readonly limits: SpendLimits,
    readonly prices: Prices | null,
    models: string[] = [],
  ) {
    if (limits.maxCostUsd === undefined) return;
    if (!prices) throw new Error("FACTORY_MAX_COST_USD needs FACTORY_PRICES: without prices the cost limit cannot be enforced.");
    const unpriced = models.filter((model) => !priceFor(prices.table, model));
    if (unpriced.length) throw new Error(`FACTORY_MAX_COST_USD needs a price for ${unpriced.join(", ")} in ${prices.source}`);
  }

  get tokens(): number {
    return Object.values(this.usage).reduce((sum, row) => sum + totalTokens(row), 0);
  }

  cost(): CostEstimate {
    return estimateCost(this.usage, this.prices);
  }

  private limitReached(): string | null {
    const { maxCalls, maxTokens, maxCostUsd } = this.limits;
    if (maxCalls !== undefined && this.calls >= maxCalls) return `max calls (${maxCalls}) reached`;
    if (maxTokens !== undefined && this.tokens >= maxTokens) return `max tokens (${maxTokens}) reached: ${this.tokens} used`;
    if (maxCostUsd !== undefined) {
      const cost = this.cost();
      if (cost.usd === null) return `cost unknown (${cost.reason})`;
      if (cost.usd >= maxCostUsd) return `max estimated cost ($${maxCostUsd}) reached: $${cost.usd}`;
    }
    return null;
  }

  /** Before every real provider request: throws once any limit is reached, and keeps refusing afterwards. */
  beforeCall(): void {
    this.stopped ??= this.limitReached();
    if (this.stopped) throw new BudgetExceeded(`spend limit: ${this.stopped}`);
    this.calls += 1;
  }

  /** Before a retry of any stage (skeleton, distractor option, explanation). */
  allowRegeneration(): boolean {
    if (this.stopped) return false;
    if (this.limits.maxRegenerations !== undefined && this.regenerations >= this.limits.maxRegenerations) {
      this.regenerationsDenied += 1;
      return false;
    }
    this.regenerations += 1;
    return true;
  }

  /** Wraps a provider so that each real request is checked first and its usage recorded per `provider:model`. */
  meter(provider: AIProvider): AIProvider {
    return {
      name: provider.name,
      generate: async (request) => {
        this.beforeCall();
        const row = (this.usage[`${provider.name}:${request.model}`] ??= emptyRow());
        row.calls += 1;
        let response;
        try {
          response = await provider.generate(request);
        } catch (error) {
          // A 429 that outlived the provider's own short retries is a quota wall; every later call would hit it too.
          if ((error as { status?: number }).status === 429) this.stopped ??= `provider quota (429) on ${provider.name}:${request.model}`;
          throw error;
        }
        addTokens(row, response.usage, 0);
        return response;
      },
    };
  }

  report() {
    return { limits: this.limits, calls: this.calls, tokens: this.tokens, regenerations: this.regenerations, regenerationsDenied: this.regenerationsDenied, cost: this.cost(), stopped: this.stopped };
  }
}
