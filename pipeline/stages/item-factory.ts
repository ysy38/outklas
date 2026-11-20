import { freezeBenchmarkPlan, runItemBenchmark, type BenchmarkPlan } from "@/modules/factory/item-model/benchmark";
import { SpendBudget, loadSpendLimits } from "../ai/budget";
import { modelDefaults } from "../ai/config";
import { loadPrices } from "../ai/prices";

/** Frozen combination for the first item-model batch. Built from the existing model defaults. */
export const itemBenchmarkPlan: BenchmarkPlan = freezeBenchmarkPlan({
  generator: modelDefaults.generator,
  judge: modelDefaults.judge,
});

export function itemFactoryPlan(): BenchmarkPlan {
  return itemBenchmarkPlan;
}

/**
 * Authorizes a future batch and arms the existing spend budget.
 * This process has no provider runner, so the call always returns before any generation.
 */
export function itemFactoryBenchmark(authorization: string): { started: false; executed: false; lock: "authorization" | "budget" | "safety"; reason: string; planId: string } {
  if (authorization !== itemBenchmarkPlan.id) {
    return { started: false, executed: false, lock: "authorization", reason: "benchmark authorization required", planId: itemBenchmarkPlan.id };
  }
  try {
    const limits = loadSpendLimits();
    const decision = runItemBenchmark({ authorization, limits, plan: itemBenchmarkPlan });
    const prices = loadPrices();
    new SpendBudget(limits, prices, [itemBenchmarkPlan.models.generator, itemBenchmarkPlan.models.judge]);
    return { started: false, executed: false, lock: "safety", reason: decision.reason, planId: itemBenchmarkPlan.id };
  } catch (error) {
    return { started: false, executed: false, lock: "budget", reason: error instanceof Error ? error.message : "benchmark refused", planId: itemBenchmarkPlan.id };
  }
}
