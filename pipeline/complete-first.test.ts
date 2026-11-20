import { describe, expect, it } from "vitest";
import { familyBlueprints } from "@/modules/factory/families";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import { BudgetExceeded } from "./ai/budget";
import { loadAIConfig } from "./ai/config";
import type { AIResult } from "./ai/types";
import { factoryProfile } from "./stages/factory";
import {
  assessCompleteFirst,
  completeFirstBrief,
  completeFirstLimits,
  completeFirstOutput,
  completeFirstPreflight,
  completeFirstShape,
  completeFirstSystem,
  joinCompleteFirst,
  legacyFormProbe,
  runCompleteFirst,
  splitConcessionSentence,
  type CompleteFirstOutput,
} from "./complete-first";

const { profile } = factoryProfile();
const spec = buildQuestionSpec({ profile, family: familyBlueprints["sentence_completion.concession"], ordinal: 4, band: "hard" });
const writer = "gateway:anthropic/claude-sonnet-5.5";

function config(patch: Record<string, string> = {}) {
  return loadAIConfig({
    FACTORY_PRICES: "pipeline/ai/prices.gateway.json",
    FACTORY_MAX_COST_USD: "0.06",
    FACTORY_MAX_CALLS: "1",
    GENERATOR_MODEL: writer,
    ...patch,
  });
}

const fullSentence = "Although the dome opens only for scheduled research nights, the gate still admits a short queue.";

function fixtureParts() {
  const split = splitConcessionSentence(fullSentence);
  if (!split) throw new Error("fixture sentence did not split");
  return split;
}

const parts = fixtureParts();

function item(stem = parts.stem): CompleteFirstOutput {
  return completeFirstOutput.parse({
    fullSentence,
    stem,
    correctOption: parts.correctOption,
    distractors: [
      { text: "The dome stays shut to every visitor on scheduled research nights.", propositionError: "The closure is read as total.", decisiveFailureReason: "The stem limits the opening, and the judgment is about who still enters." },
      { text: "Scheduled research nights are cancelled whenever visitors arrive.", propositionError: "The schedule is read as cancelled by the queue.", decisiveFailureReason: "The stem keeps the night scheduled and only narrows who the dome is for." },
      { text: "The observatory opens the dome for the public every night of the week.", propositionError: "Only is widened to every night.", decisiveFailureReason: "The stem says the dome opens only for scheduled research nights." },
      { text: "Visitors are turned away because the night is reserved for research.", propositionError: "The reservation is read as a ban on entry.", decisiveFailureReason: "The stem's concession is that entry still happens inside that limit." },
    ],
    criticalScopeCue: "only for scheduled",
    correctnessRationale: "The phrase only for scheduled keeps the night a research night, so the judgment is the short queue.",
  });
}

describe("complete-first prototype", () => {
  it("keeps the cap, the writer, and reasoning effort none", () => {
    expect(completeFirstPreflight(config(), writer)).toMatchObject({ ok: true, writerBase: "claude-sonnet-5-5" });
    expect(completeFirstPreflight(config({ FACTORY_MAX_COST_USD: "0.1" }), writer).ok).toBe(false);
    expect(completeFirstPreflight(config({ FACTORY_MAX_CALLS: "6" }), writer).ok).toBe(false);
    expect(completeFirstPreflight(config({ GENERATOR_THINKING: "low" }), writer).ok).toBe(false);
    expect(completeFirstPreflight(config(), "gateway:anthropic/claude-haiku-5.5").ok).toBe(false);
  });

  it("asks for the concession archetype and exactly four main clauses", () => {
    const system = completeFirstSystem();
    expect(system).toContain("Although <subordinate clause>, ----.");
    expect(system).toContain("exactly four");
    expect(system).toContain("Do not assign them one cause");
    expect(completeFirstBrief).toContain("observatory");
    expect(completeFirstBrief).not.toContain("harbour");
    expect(completeFirstBrief).not.toContain("footbridge");
    expect(completeFirstBrief).not.toContain("cistern");
    expect(completeFirstLimits).toEqual({ maxCostUsd: 0.06, maxCalls: 1 });
  });

  it("splits a full concession sentence and joins it back unchanged", () => {
    const split = splitConcessionSentence(fullSentence);
    expect(split).toEqual(parts);
    expect(joinCompleteFirst(parts.stem, parts.correctOption)).toBe(fullSentence);
    expect(completeFirstShape(item()).ok).toBe(true);
  });

  it("rejects a which-shows option and a short distractor list", () => {
    const output = item();
    const commentary = completeFirstShape({ ...output, correctOption: "which shows that the gate and the dome are separate matters" });
    expect(commentary.ok).toBe(false);
    expect(commentary.issues.map((issue) => issue.code)).toContain("not_main_clause");
    expect(assessCompleteFirst({ ...output, distractors: output.distractors.slice(0, 1) }).status).toBe("INCOMPLETE_OUTPUT");
    expect(assessCompleteFirst({ ...output, distractors: output.distractors.slice(0, 3) }).status).toBe("INCOMPLETE_OUTPUT");
    expect(completeFirstOutput.safeParse({ ...output, distractors: output.distractors.slice(0, 3) }).success).toBe(false);
    expect(assessCompleteFirst(output).status).toBe("RECORDED");
    const duplicated = completeFirstShape({
      ...output,
      distractors: output.distractors.map((entry, index) => (index === 1 ? { ...entry, text: output.distractors[0].text } : entry)),
    });
    expect(duplicated.issues.map((issue) => issue.code)).toContain("option_duplicate");
  });

  it("records one writer result without turning the factory validator into a pass", async () => {
    const output = item();
    const result = {
      value: output,
      provider: "gateway",
      model: "anthropic/claude-sonnet-5.5",
      promptVersion: "complete-first.v1",
      requestHash: "abc",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      cached: false,
    } satisfies AIResult<CompleteFirstOutput>;
    const record = await runCompleteFirst({ brief: completeFirstBrief, write: async () => result });
    expect(record.status).toBe("RECORDED");
    expect(record.hardVerified).toBe(false);
    expect(record.factoryQualityVerdict).toBe("not_applicable");
    expect(spec.contextConstraints.blankPosition).toBe("start");
    expect(spec.distractorPlan).toHaveLength(4);
    expect(spec.id).toBe("sentence_completion.concession.hard.004");
    const legacy = legacyFormProbe(spec, output);
    expect(legacy.qualityVerdict).toBe("not_applicable");
    expect(legacy.validation.status).toBe("reject");
    expect(legacy.validation.issues.some((issue) => issue.code === "answer_connector_not_allowed" || issue.code === "connector_unrecognised")).toBe(true);
    const stopped = await runCompleteFirst({
      brief: completeFirstBrief,
      write: async () => {
        throw new BudgetExceeded("spend limit");
      },
    });
    expect(stopped.status).toBe("INCOMPLETE_BUDGET");
    expect(stopped.output).toBeNull();
  });
});
