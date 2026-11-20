import path from "node:path";
import { describe, expect, it } from "vitest";
import { BudgetExceeded, loadSpendLimits, SpendBudget } from "./budget";
import { estimateCost, formatCost, loadPrices, missingPrices, priceFor } from "./prices";
import type { AIProvider, ModelRequest } from "./types";

const priceFile = path.join(__dirname, "prices.anthropic.json");

describe("prices", () => {
  it("reports cost as unknown, never zero, when FACTORY_PRICES is not set", () => {
    expect(loadPrices({})).toBeNull();
    const cost = estimateCost({ "anthropic:claude-haiku-5-5": { calls: 1, inputTokens: 1000, outputTokens: 100 } }, null);
    expect(cost).toEqual({ usd: null, reason: missingPrices });
    expect(formatCost(cost)).toMatch(/^unknown: FACTORY_PRICES is not set/);
  });

  it("reads the price table from a file or inline JSON", () => {
    const fromFile = loadPrices({ FACTORY_PRICES: priceFile })!;
    expect(fromFile.table["anthropic:claude-sonnet-5-5"]).toMatchObject({ in: 2, out: 10, cacheWrite: 2.5, cacheRead: 0.1 });
    expect(fromFile.table["anthropic:claude-haiku-5-5"]).toMatchObject({ in: 0.1, out: 0.5, cacheWrite: 0.125, cacheRead: 0.01 });
    expect(loadPrices({ FACTORY_PRICES: '{"anthropic:m":{"in":1,"out":5}}' })!.table["anthropic:m"]).toEqual({ in: 1, out: 5 });
    expect(() => loadPrices({ FACTORY_PRICES: "missing.json" })).toThrow(/does not exist/);
    expect(() => loadPrices({ FACTORY_PRICES: '{"m":{"in":"cheap"}}' })).toThrow(/not a price table/);
  });

  it("prices fresh input, output, cache writes and cache reads separately", () => {
    const prices = loadPrices({ FACTORY_PRICES: priceFile });
    const cost = estimateCost({ "anthropic:claude-sonnet-5-5": { calls: 2, inputTokens: 1_000_000, outputTokens: 100_000, cacheWriteTokens: 1_000_000, cacheReadTokens: 1_000_000 } }, prices);
    expect(cost).toEqual({ usd: 2 + 1 + 2.5 + 0.1, reason: null });
    expect(estimateCost({ "anthropic:claude-unknown": { calls: 1, inputTokens: 1, outputTokens: 1 } }, prices).reason).toMatch(/no price for anthropic:claude-unknown/);
    expect(estimateCost({ "anthropic:m": { calls: 1, inputTokens: 1, outputTokens: 1, cacheReadTokens: 5 } }, { table: { "anthropic:m": { in: 1, out: 1 } }, source: "test" }).reason).toMatch(/no cacheRead price/);
    expect(priceFor(prices!.table, "anthropic:claude-haiku-5-5-20261001")).toMatchObject({ in: 0.1 });
  });

  it("prices Gemini calls, with the implicitly cached prompt at the cache rate", () => {
    const prices = loadPrices({ FACTORY_PRICES: path.join(__dirname, "prices.gemini.json") })!;
    for (const model of ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash"]) expect(priceFor(prices.table, `gemini:${model}`)).not.toBeNull();
    const cost = estimateCost({ "gemini:gemini-3.1-flash-lite": { calls: 1, inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000 } }, prices);
    expect(cost).toEqual({ usd: 0.25 + 1.5 + 0.025, reason: null });
  });
});

describe("spend budget", () => {
  const fake = (usage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 }): AIProvider & { sent: ModelRequest[] } => {
    const sent: ModelRequest[] = [];
    return { name: "anthropic", sent, generate: async (request) => (sent.push(request), { text: "{}", model: request.model, usage }) };
  };
  const request = { model: "claude-haiku-5-5", parts: [{ text: "x" }] };

  it("reads the limits from the environment and rejects nonsense", () => {
    expect(loadSpendLimits({ FACTORY_MAX_CALLS: "40", FACTORY_MAX_REGENERATIONS: "0", FACTORY_MAX_TOKENS: "120000", FACTORY_MAX_COST_USD: "0.4" })).toEqual({ maxCalls: 40, maxRegenerations: 0, maxTokens: 120000, maxCostUsd: 0.4 });
    expect(loadSpendLimits({})).toEqual({});
    expect(() => loadSpendLimits({ FACTORY_MAX_CALLS: "0" })).toThrow(/FACTORY_MAX_CALLS/);
    expect(() => loadSpendLimits({ FACTORY_MAX_TOKENS: "1.5" })).toThrow(/whole number/);
  });

  it("keeps a provider wire identity, so the cache key still sees the reasoning effort", () => {
    const provider = fake();
    provider.wireIdentity = () => ({ reasoningEffort: "none", maxTokens: 4096 });
    const metered = new SpendBudget({ maxCalls: 2 }, null).meter(provider);
    expect(metered.wireIdentity?.(request)).toEqual({ reasoningEffort: "none", maxTokens: 4096 });
  });

  it("stops before the request that would exceed the call limit and keeps refusing", async () => {
    const provider = fake();
    const budget = new SpendBudget({ maxCalls: 2 }, null);
    const metered = budget.meter(provider);
    await metered.generate(request);
    await metered.generate(request);
    await expect(metered.generate(request)).rejects.toBeInstanceOf(BudgetExceeded);
    await expect(metered.generate(request)).rejects.toThrow(/max calls \(2\) reached/);
    expect(provider.sent).toHaveLength(2);
    expect(budget.allowRegeneration()).toBe(false);
    expect(budget.report()).toMatchObject({ calls: 2, tokens: 300, stopped: "max calls (2) reached", cost: { usd: null, reason: missingPrices } });
  });

  it("stops on tokens and on estimated cost, counting prompt-cache tokens", async () => {
    const byTokens = new SpendBudget({ maxTokens: 1000 }, null);
    const heavy = byTokens.meter(fake({ inputTokens: 100, outputTokens: 100, totalTokens: 1200, cacheWriteTokens: 1000 } as never));
    await heavy.generate(request);
    await expect(heavy.generate(request)).rejects.toThrow(/max tokens \(1000\) reached: 1200 used/);
    expect(byTokens.usage["anthropic:claude-haiku-5-5"]).toMatchObject({ calls: 1, cacheWriteTokens: 1000 });

    const prices = loadPrices({ FACTORY_PRICES: priceFile });
    const byCost = new SpendBudget({ maxCostUsd: 0.001 }, prices, ["anthropic:claude-sonnet-5-5"]);
    const sonnet = byCost.meter(fake({ inputTokens: 300, outputTokens: 100, totalTokens: 400 }));
    await sonnet.generate({ ...request, model: "claude-sonnet-5-5" });
    expect(byCost.cost().usd).toBe(0.0016);
    await expect(sonnet.generate({ ...request, model: "claude-sonnet-5-5" })).rejects.toThrow(/max estimated cost/);
  });

  it("refuses a cost limit it cannot enforce", () => {
    expect(() => new SpendBudget({ maxCostUsd: 1 }, null)).toThrow(/needs FACTORY_PRICES/);
    expect(() => new SpendBudget({ maxCostUsd: 1 }, loadPrices({ FACTORY_PRICES: priceFile }), ["anthropic:claude-unknown"])).toThrow(/needs a price for anthropic:claude-unknown/);
  });

  it("limits regenerations without stopping first attempts", () => {
    const budget = new SpendBudget({ maxRegenerations: 1 }, null);
    expect(budget.allowRegeneration()).toBe(true);
    expect(budget.allowRegeneration()).toBe(false);
    expect(budget.stopped).toBeNull();
    expect(() => budget.beforeCall()).not.toThrow();
    expect(budget.regenerationsDenied).toBe(1);
  });

  it("stops the run at the first quota error the provider gives up on, and not on other errors", async () => {
    const budget = new SpendBudget({}, null);
    const failing = (status: number): AIProvider => ({ name: "gemini", generate: async () => Promise.reject(Object.assign(new Error(`HTTP ${status}`), { status })) });
    await expect(budget.meter(failing(503)).generate(request)).rejects.toThrow(/503/);
    expect(budget.stopped).toBeNull();
    await expect(budget.meter(failing(429)).generate(request)).rejects.toThrow(/429/);
    expect(budget.stopped).toBe("provider quota (429) on gemini:claude-haiku-5-5");
    const provider = fake();
    await expect(budget.meter(provider).generate(request)).rejects.toBeInstanceOf(BudgetExceeded);
    expect(provider.sent).toHaveLength(0);
  });
});
