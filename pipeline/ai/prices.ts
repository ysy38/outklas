import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Usage } from "./types";

/** USD per million tokens. Cache prices are required only when a usage row has cache tokens. */
const modelPrice = z.object({
  in: z.number().min(0),
  out: z.number().min(0),
  cacheWrite: z.number().min(0).optional(),
  cacheWrite1h: z.number().min(0).optional(),
  cacheRead: z.number().min(0).optional(),
  note: z.string().optional(),
});
export type ModelPrice = z.infer<typeof modelPrice>;
const priceTable = z.record(z.string(), modelPrice);
export type PriceTable = z.infer<typeof priceTable>;
export type Prices = { table: PriceTable; source: string };

/** Tokens per `provider:model`, as the provider reported them. */
export type TokenRow = { calls: number; inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheWrite1hTokens?: number; cacheReadTokens?: number };
export type TokenUsage = Record<string, TokenRow>;

export const emptyRow = (): TokenRow => ({ calls: 0, inputTokens: 0, outputTokens: 0 });

export function addTokens(row: TokenRow, usage: Usage, calls = 1): TokenRow {
  row.calls += calls;
  row.inputTokens += usage.inputTokens;
  row.outputTokens += usage.outputTokens;
  for (const key of ["cacheWriteTokens", "cacheWrite1hTokens", "cacheReadTokens"] as const) if (usage[key]) row[key] = (row[key] ?? 0) + usage[key]!;
  return row;
}

/** Every token the provider processed: uncached input, cache writes, cache reads and output. */
export const totalTokens = (row: Omit<TokenRow, "calls">) => row.inputTokens + row.outputTokens + (row.cacheWriteTokens ?? 0) + (row.cacheReadTokens ?? 0);

/**
 * FACTORY_PRICES: inline JSON (`{"anthropic:claude-haiku-5-5":{"in":0.1,"out":0.5}}`) or the path of a JSON file
 * with that table, optionally under a `models` key (see pipeline/ai/prices.anthropic.json). Unset means no prices,
 * and every cost is reported as unknown, never as zero.
 */
export function loadPrices(env: Record<string, string | undefined> = process.env): Prices | null {
  const raw = env.FACTORY_PRICES?.trim();
  if (!raw) return null;
  const inline = raw.startsWith("{");
  if (!inline && !existsSync(path.resolve(raw))) throw new Error(`FACTORY_PRICES points to ${raw}, which does not exist`);
  const parsed = JSON.parse(inline ? raw : readFileSync(path.resolve(raw), "utf8")) as Record<string, unknown>;
  const table = priceTable.safeParse(parsed.models ?? parsed);
  if (!table.success) throw new Error(`FACTORY_PRICES is not a price table: ${table.error.issues.slice(0, 3).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  return { table: table.data, source: inline ? "FACTORY_PRICES (inline)" : raw };
}

/** Exact key first; a served model with a date suffix (`claude-haiku-5-5-20261001`) takes the longest matching key. */
export function priceFor(table: PriceTable, model: string): ModelPrice | null {
  if (table[model]) return table[model];
  const key = Object.keys(table)
    .filter((name) => model.startsWith(`${name}-`))
    .sort((a, b) => b.length - a.length)[0];
  return key ? table[key] : null;
}

export type CostEstimate = { usd: number | null; reason: string | null };

export const missingPrices = "FACTORY_PRICES is not set (missing price config)";

export function estimateCost(usage: TokenUsage, prices: Prices | null): CostEstimate {
  if (!prices) return { usd: null, reason: missingPrices };
  let total = 0;
  for (const [model, row] of Object.entries(usage)) {
    if (!row.calls && !totalTokens(row)) continue;
    const price = priceFor(prices.table, model);
    if (!price) return { usd: null, reason: `no price for ${model} in ${prices.source}` };
    const hour = row.cacheWrite1hTokens ?? 0;
    const write = (row.cacheWriteTokens ?? 0) - hour;
    const read = row.cacheReadTokens ?? 0;
    for (const [tokens, field] of [[write, "cacheWrite"], [hour, "cacheWrite1h"], [read, "cacheRead"]] as const) {
      if (tokens > 0 && price[field] === undefined) return { usd: null, reason: `no ${field} price for ${model} in ${prices.source}` };
    }
    total += row.inputTokens * price.in + row.outputTokens * price.out + write * (price.cacheWrite ?? 0) + hour * (price.cacheWrite1h ?? 0) + read * (price.cacheRead ?? 0);
  }
  return { usd: Math.round(total) / 1_000_000, reason: null };
}

export const formatCost = (cost: CostEstimate) => (cost.usd === null ? `unknown: ${cost.reason}` : `$${cost.usd.toFixed(4)}`);
