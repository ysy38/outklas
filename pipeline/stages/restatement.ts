import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { optionLabels } from "@/modules/analysis/contract";
import { loadAIConfig, parseModel } from "../ai/config";
import { fidelityDecision, fidelityJudgePromptVersion, fidelityJudgeResponseSchema, fidelityJudgeSystem, fidelityJudgeUser, fidelityReport, restatementItem, restatementPromptVersion, restatementResponseSchema, restatementSystem, restatementUser, type RestatementItem } from "../ai/prompts/restatement.v1";
import { BudgetExceeded, SpendBudget } from "../ai/budget";
import { estimateCost } from "../ai/prices";

/** Lightweight closest-meaning smoke. Does not use the sentence-completion skeleton or the live bank. */
export async function restatementSmoke(options: { count: number; out: string; log?: (message: string) => void }) {
  const log = options.log ?? (() => undefined);
  const base = loadAIConfig();
  const writer = base.models.generator;
  const owner = parseModel(writer, base.provider).provider;
  if (!base.keys[owner]) throw new Error(`${writer} needs the ${owner} API key`);
  const budget = new SpendBudget(base.limits ?? {}, base.prices ?? null, [`${owner}:${parseModel(writer, base.provider).model}`]);
  mkdirSync(options.out, { recursive: true });
  const items: { index: number; item: RestatementItem | null; error: string | null }[] = [];
  const { structuredCall, createProvider } = await import("../ai/service");
  const provider = budget.meter(createProvider(base, owner));

  for (let index = 1; index <= options.count; index += 1) {
    if (budget.stopped) {
      items.push({ index, item: null, error: budget.stopped });
      break;
    }
    try {
      const result = await structuredCall(provider, restatementPromptVersion, restatementItem, {
        model: parseModel(writer, base.provider).model,
        system: restatementSystem,
        parts: [{ text: restatementUser(index) }],
        jsonSchema: restatementResponseSchema(),
        temperature: 0.7,
        maxOutputTokens: 1200,
        thinking: "low",
      });
      const problems = restatementProblems(result.value);
      if (problems.length) throw new Error(problems.join(", "));
      items.push({ index, item: result.value, error: null });
      writeFileSync(path.join(options.out, `item-${String(index).padStart(2, "0")}.json`), `${JSON.stringify(result.value, null, 2)}\n`);
      log(`item ${index}: key ${result.value.correctOption}${result.cached ? " (cache)" : ""}`);
    } catch (error) {
      const message = error instanceof BudgetExceeded ? error.message : (error as Error).message.slice(0, 200);
      items.push({ index, item: null, error: message });
      log(`item ${index}: ERROR ${message}`);
      if (/429/.test(message)) break;
    }
  }

  const sheet = items
    .filter((row) => row.item)
    .map((row, order) => {
      const item = row.item!;
      const lines = optionLabels.map((label) => `${label}) ${item.options[label]}`);
      return `## P1-${String(order + 1).padStart(3, "0")}\n\n${item.source}\n\n${lines.join("\n")}\n`;
    })
    .join("\n");
  writeFileSync(path.join(options.out, "part-1.md"), `# Restatement smoke\n\n${sheet}`);
  const cost = estimateCost(budget.usage, base.prices ?? null);
  const summary = { at: new Date().toISOString(), writer, produced: items.filter((row) => row.item).length, errors: items.filter((row) => row.error).length, costUsd: cost.usd, stopped: budget.stopped };
  writeFileSync(path.join(options.out, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export function restatementProblems(item: RestatementItem): string[] {
  const problems: string[] = [];
  const texts = optionLabels.map((label) => item.options[label].trim().toLowerCase());
  if (new Set(texts).size !== 5) problems.push("duplicate_option");
  const faithful = optionLabels.filter((label) => item.flaws[label] === "faithful");
  if (faithful.length !== 1 || faithful[0] !== item.correctOption) problems.push("faithful_key_mismatch");
  const wrong = optionLabels.filter((label) => label !== item.correctOption).map((label) => item.flaws[label]);
  if (wrong.includes("faithful")) problems.push("extra_faithful");
  return problems;
}

/** Independent check of an existing restatement folder. Does not rewrite the items. */
export async function restatementJudge(options: { dir: string; model?: string; log?: (message: string) => void }) {
  const log = options.log ?? (() => undefined);
  const base = loadAIConfig();
  const model = options.model ?? base.models.judge;
  const owner = parseModel(model, base.provider).provider;
  if (!base.keys[owner]) throw new Error(`${model} needs the ${owner} API key`);
  const budget = new SpendBudget(base.limits ?? {}, base.prices ?? null, [`${owner}:${parseModel(model, base.provider).model}`]);
  const { structuredCall, createProvider } = await import("../ai/service");
  const provider = budget.meter(createProvider(base, owner));
  const files = readdirSync(options.dir).filter((name) => /^item-\d+\.json$/.test(name)).sort();
  const rows = [];
  for (const file of files) {
    if (budget.stopped) break;
    const item = restatementItem.parse(JSON.parse(readFileSync(path.join(options.dir, file), "utf8")));
    try {
      const result = await structuredCall(provider, fidelityJudgePromptVersion, fidelityReport, {
        model: parseModel(model, base.provider).model,
        system: fidelityJudgeSystem,
        parts: [{ text: fidelityJudgeUser(item) }],
        jsonSchema: fidelityJudgeResponseSchema(),
        temperature: 0,
        maxOutputTokens: 1200,
        thinking: "low",
      });
      const decision = fidelityDecision(result.value, item.correctOption);
      rows.push({ file, key: item.correctOption, ...decision, report: result.value, cached: result.cached });
      log(`${file}: ${decision.decision} faithful=${decision.faithful.join("") || "—"} ${decision.problems.join(",")}`);
    } catch (error) {
      const message = error instanceof BudgetExceeded ? error.message : (error as Error).message.slice(0, 200);
      rows.push({ file, key: item.correctOption, decision: "ERROR", faithful: [], problems: [message], report: null, cached: false });
      log(`${file}: ERROR ${message}`);
    }
  }
  const cost = estimateCost(budget.usage, base.prices ?? null);
  const summary = {
    at: new Date().toISOString(),
    model,
    judged: rows.filter((row) => row.decision !== "ERROR").length,
    keep: rows.filter((row) => row.decision === "KEEP").length,
    revise: rows.filter((row) => row.decision === "REVISE").length,
    costUsd: cost.usd,
    rows,
  };
  if (existsSync(options.dir)) writeFileSync(path.join(options.dir, "fidelity.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
