import { describe, expect, it } from "vitest";
import { modelDefaults } from "./ai/config";
import { itemBenchmarkPlan, itemFactoryBenchmark, itemFactoryPlan } from "./stages/item-factory";

describe("item factory command", () => {
  it("publishes the frozen plan and refuses to start the batch", () => {
    const plan = itemFactoryPlan();
    expect(plan).toBe(itemBenchmarkPlan);
    expect(plan.total).toBe(90);
    expect(plan.autoStart).toBe(false);
    expect(plan.models).toEqual({ generator: modelDefaults.generator, judge: modelDefaults.judge });
    expect(itemFactoryBenchmark("no").reason).toMatch(/authorization/);
    const armed = itemFactoryBenchmark(plan.id);
    expect(armed.started).toBe(false);
    expect(armed.planId).toBe(plan.id);
  });
});
