import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { qualityOutputDir } from "@/modules/factory/item-model/quality-profile";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { benchmarkAuthorization, freezeBenchmarkPlan, runItemBenchmark } from "@/modules/factory/item-model/benchmark";
import { modelDefaults } from "./ai/config";
import { loadPrices } from "./ai/prices";
import type { AIProvider, ModelResponse } from "./ai/types";
import {
  itemFactoryQualityJudgeReplay,
  qualityJudgeReplayAuthorization,
  qualityJudgeReplayEstimate,
  qualityJudgeReplayIds,
  qualityJudgeReplayPlan,
} from "./stages/cognitive-trap";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const savedDir = qualityOutputDir;

function approving(letter: OptionLabel, rival: OptionLabel | null) {
  return {
    blindAnswer: letter,
    blindConfidence: 0.93,
    blindEvidence: "The source relation is visible in one option.",
    blindUncertain: false,
    blindAlternative: rival,
    acceptability: { sentences: optionLabels.map((option) => ({ option, acceptable: option === letter, confidence: 0.9, reason: "fixture" })) },
    report: {
      scores: { correctness: 0.9, ambiguityRisk: 0.1, distractorQuality: 0.8, targetAlignment: 0.8, difficultyFit: 0.7, grammar: 0.9, semantic: 0.86, ydsAlignment: 0.8, originalityRisk: 0.1, clueRisk: 0.2 },
      alternativeDefensibleOptions: rival ? [rival] : [],
      estimatedDifficulty: "hard",
      verdict: "APPROVE",
      reasons: ["The option keeps the source relation."],
    },
  };
}

describe("quality judge replay", () => {
  it("prepares three saved items under a three-call ceiling and does not call without authorization", async () => {
    const before = Object.fromEntries(qualityJudgeReplayIds.map((id) => [id, readFileSync(`${savedDir}/${id}.json`, "utf8")]));
    const enTr = readFileSync(`${savedDir}/quality-translation-en_tr.json`, "utf8");
    const plan = qualityJudgeReplayPlan();
    expect(plan.failures).toEqual([]);
    expect(plan.items.map((item) => item.id)).toEqual([...qualityJudgeReplayIds]);
    expect((qualityJudgeReplayIds as readonly string[]).includes("quality-translation-en_tr")).toBe(false);
    for (const item of plan.items) {
      const saved = JSON.parse(before[item.id]!) as { source: string; key: string; arms: { B: { options: Record<OptionLabel, string>; keyLetter: OptionLabel } } };
      expect(item.source).toBe(saved.source);
      expect(item.key).toBe(saved.key);
      expect(item.options).toEqual(saved.arms.B.options);
      expect(item.judgeUser).toContain("The key letter is hidden.");
      expect(item.judgeUser).not.toContain("equivalence_uncertain");
      expect(item.judgeUser).not.toContain("key_length_clue");
      expect(item.judgeUser).not.toContain("stood_to_prospective");
      expect(item.judgeUser).not.toContain(saved.key === item.options[item.keyLetter] ? "correctAnswer" : "missing-key");
      for (const label of optionLabels) expect(item.judgeUser).toContain(`${label}) ${item.options[label]}`);
      expect(item.gate.meaningProven).toBe(false);
      expect(item.gate.approvesTarget).toBe(false);
    }
    const door = plan.items[0]!;
    const ferry = plan.items[1]!;
    const snow = plan.items[2]!;
    expect(door.gate.decision).toBe("review");
    expect(door.gate.failure).toBeNull();
    expect(door.gate.risks.whole_set_clue_risk).toContain("two_sentence_key");
    expect(door.gate.options.find((entry) => entry.label === "A")?.evidence).toBe("concession_to_cause");
    expect(ferry.gate.decision).toBe("review");
    expect(ferry.gate.risks.key_semantic_risk).toEqual(expect.arrayContaining(["stood_to_prospective", "once_may_be_temporal"]));
    expect(ferry.gate.risks.whole_set_clue_risk).toContain("key_length_clue");
    expect(snow.gate.options.find((entry) => entry.label === "C")?.evidence).toBe("before_to_during");
    expect(snow.gate.decision).toBe("review");
    const estimate = qualityJudgeReplayEstimate(prices!);
    expect(estimate).not.toBeNull();
    expect(estimate!).toBeGreaterThan(0);
    expect(estimate!).toBeLessThan(0.2);
    const refused = await itemFactoryQualityJudgeReplay("not-authorized");
    expect(refused.started).toBe(false);
    expect(refused.providerCalls).toBe(0);
    expect(refused.writerCalls).toBe(0);
    expect(refused.studentBankWrites).toBe(0);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    const locked = runItemBenchmark({ authorization: benchmarkAuthorization, limits: { maxCalls: 360, maxRegenerations: 0, maxCostUsd: 18 }, plan: freezeBenchmarkPlan({ generator: modelDefaults.generator, judge: modelDefaults.judge }) });
    expect(locked.started).toBe(false);
    for (const id of qualityJudgeReplayIds) expect(readFileSync(`${savedDir}/${id}.json`, "utf8")).toBe(before[id]);
    expect(readFileSync(`${savedDir}/quality-translation-en_tr.json`, "utf8")).toBe(enTr);
  });

  it("sends exactly three judge calls and does not treat an approval as editorial acceptance", async () => {
    const calls: string[] = [];
    const provider: AIProvider = {
      name: "openrouter",
      async generate(request): Promise<ModelResponse> {
        const user = request.parts.map((part) => ("text" in part ? part.text : "")).join("\n");
        calls.push(request.model);
        expect(request.system ?? "").toContain("The key is not shown");
        expect(user).not.toContain("equivalence_uncertain");
        const letter = user.includes("stood to be given") ? "D" : user.includes("Kar yağmadan") ? "A" : "C";
        const rival = letter === "D" ? "A" : null;
        return { text: JSON.stringify(approving(letter, rival)), model: request.model, usage: { inputTokens: 100, outputTokens: 80, reasoningTokens: 10, totalTokens: 190 } };
      },
    };
    const out = mkdtempSync(path.join(tmpdir(), "tomo-judge-replay-"));
    const frozen = readFileSync(`${savedDir}/summary.json`, "utf8");
    try {
      const run = await itemFactoryQualityJudgeReplay(qualityJudgeReplayAuthorization, out, () => provider, `quality-judge-replay-test-${Date.now()}`);
      expect(run.started).toBe(true);
      expect(run.providerCalls).toBe(3);
      expect(run.writerCalls).toBe(0);
      expect(run.retry).toBe(0);
      expect(run.maxCalls).toBe(3);
      expect(run.maxCostUsd).toBe(qualityJudgeReplayEstimate(prices!));
      expect(run.studentBankWrites).toBe(0);
      expect(run.editorApproved).toBe(false);
      expect(run.meaningProven).toBe(false);
      expect(run.benchmarkStarted).toBe(false);
      expect(run.qualityProven).toBe(false);
      expect(calls).toEqual(["anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-5.5"]);
      const door = run.records[0]!;
      const ferry = run.records[1]!;
      const snow = run.records[2]!;
      expect(door.judge?.modelVerdict).toBe("APPROVE");
      expect(door.ruled?.verdict).toBe("REVIEW");
      expect(door.factoryVerdict).toBe("REVIEW");
      expect(door.editorialRemaining).toBe(true);
      expect(door.editorApproved).toBe(false);
      expect(door.mediumHardApproval).toBe(false);
      expect(door.meaningProven).toBe(false);
      expect(door.typeSemantic.status).toBe("not_run");
      expect(ferry.factoryVerdict).toBe("FAIL");
      expect(ferry.editorialRemaining).toBe(false);
      expect(ferry.ruled?.failures.some((failure) => failure.startsWith("second_defensible"))).toBe(true);
      expect(snow.factoryVerdict).toBe("REVIEW");
      expect(snow.judge?.blindAnswer).toBe("A");
      expect(run.records.every((record) => record.studentBankWrites === 0)).toBe(true);
      const again = await itemFactoryQualityJudgeReplay(qualityJudgeReplayAuthorization, out, () => provider, `quality-judge-replay-test-again-${Date.now()}`);
      expect(again.started).toBe(false);
      expect(again.providerCalls).toBe(0);
      const protectedRun = await itemFactoryQualityJudgeReplay(qualityJudgeReplayAuthorization, savedDir, () => provider, `quality-judge-replay-protected-${Date.now()}`);
      expect(protectedRun.started).toBe(false);
      expect(protectedRun.providerCalls).toBe(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
    expect(readFileSync(`${savedDir}/summary.json`, "utf8")).toBe(frozen);
  });
});
