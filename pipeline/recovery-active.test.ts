import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { optionLabels } from "@/modules/analysis/contract";
import { trapAuthorization, trapItems } from "@/modules/factory/item-model/cognitive-trap";
import { contentVersion } from "@/modules/factory/item-model/distractor-strategy";
import { translationModel } from "@/modules/factory/item-model/registry";
import { loadPrices } from "./ai/prices";
import type { AIProvider, ModelRequest } from "./ai/types";
import { openRouterWriterWire } from "./diagnostic-repair/call-contract";
import { executeActiveRecovery } from "./recovery/active";
import { attachRecovery, recoveryActiveAuthorization, type QualityRecord } from "./recovery/attach";
import { executeCognitiveTrap } from "./stages/cognitive-trap";
import { loadOfficialComparisonCorpus, openrouterPrecheckModels } from "./stages/item-precheck";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const pilotDir = path.resolve(".data/analysis/_factory/cognitive-trap/medium-repro-v1");
const draftsPath = path.join(pilotDir, "medium-repro-translation-tr_en.json");
const samplesPath = path.join(pilotDir, "medium-repro-restatement-2.json");
const editorPath = path.join(pilotDir, "medium-repro-translation-en_tr.json");
const reviewersPath = path.join(pilotDir, "medium-repro-restatement-1.json");
const frozenDrafts = createHash("sha256").update(readFileSync(draftsPath)).digest("hex");

afterAll(() => {
  expect(createHash("sha256").update(readFileSync(draftsPath)).digest("hex")).toBe(frozenDrafts);
});

function loadRecord(file: string): QualityRecord {
  return JSON.parse(readFileSync(file, "utf8")) as QualityRecord;
}

function wrongLangRecord(): QualityRecord {
  return {
    id: "test-lang-en-tr",
    questionType: "translation",
    direction: "en_tr",
    source: "The board approved the revised draft before noon.",
    key: "Kurul, gözden geçirilmiş taslağı öğleden önce onayladı.",
    arms: {
      B: {
        keyLetter: "A",
        options: {
          A: "Kurul, gözden geçirilmiş taslağı öğleden önce onayladı.",
          B: "The board approved the revised draft after noon.",
          C: "Kurul ilk taslağı öğleden sonra reddetti.",
          D: "Kurul gözden geçirilmiş taslağı öğleye kadar bekletti.",
          E: "Kurul taslakları öğleden önce dağıtmadı.",
        },
        qualityDecision: "fail",
        qualityReasons: ["target_language_mismatch"],
        failures: ["target_language_mismatch"],
        secondAnswerOptions: [],
        decisionRisks: null,
        propositionGuards: [],
      },
    },
  };
}

function mockProvider(handler: (req: ModelRequest) => { text: string; inputTokens?: number; outputTokens?: number; reasoningTokens?: number } | never): AIProvider & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  return {
    name: "mock-openrouter",
    calls,
    async generate(request) {
      calls.push(request);
      const res = handler(request);
      const inputTokens = res.inputTokens ?? 400;
      const outputTokens = res.outputTokens ?? 60;
      return {
        text: res.text,
        model: request.model,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          ...(res.reasoningTokens !== undefined ? { reasoningTokens: res.reasoningTokens } : {}),
        },
        finishReason: "STOP",
      };
    },
  };
}

describe("active recovery integration (offline mock provider)", () => {
  it("repairs a confirmed option-level defect using Diagnostic Repair v2 contract and preserves hashes", async () => {
    const record = wrongLangRecord();
    const beforeOptions = { ...record.arms.B.options };
    const provider = mockProvider(() => ({
      text: JSON.stringify({ optionId: "B", text: "Kurul, gözden geçirilmiş taslağı onaylamak yerine ilk taslağı öğleden sonraya bıraktı." }),
      inputTokens: 500,
      outputTokens: 80,
    }));

    const out = await executeActiveRecovery(record, {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider,
      prices,
    });

    expect(out.mode).toBe("active");
    expect(out.blocked).toBeNull();
    expect(out.applied).toBe(true);
    expect(out.providerCalls).toBe(1);
    expect(out.recoveryCostUsd).toBeGreaterThan(0);
    expect(out.meaningProven).toBe(false);
    expect(out.qualityProven).toBe(false);
    expect(out.editorial).toBe("pending");
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.maxOutputTokens).toBe(openRouterWriterWire.outputFloor);
    expect(provider.calls[0]?.temperature).toBe(0);
    expect(out.activeReport).toMatchObject({
      retry: 0,
      calls: 1,
      repairCalls: 1,
      replaceCalls: 0,
      technicalFailureCount: 0,
      repairSuccessCount: 1,
      replacementSuccessCount: 0,
      replacementUnavailableCount: 0,
      remainingIssues: [],
      wholeSetRechecked: true,
      meaningProven: false,
      qualityProven: false,
      editorial: "pending",
      studentBankWrite: false,
    });
    expect(out.activeReport?.options.B).toBe("Kurul, gözden geçirilmiş taslağı onaylamak yerine ilk taslağı öğleden sonraya bıraktı.");
    expect(out.activeReport?.finalOptionHashes.A).toBe(out.activeReport?.initialOptionHashes.A);
    expect(out.activeReport?.finalOptionHashes.C).toBe(out.activeReport?.initialOptionHashes.C);
    expect(out.activeReport?.finalOptionHashes.D).toBe(out.activeReport?.initialOptionHashes.D);
    expect(out.activeReport?.finalOptionHashes.E).toBe(out.activeReport?.initialOptionHashes.E);
    // Factory arm options and qualityDecision stay untouched
    expect(record.arms.B.options).toEqual(beforeOptions);
    expect(record.arms.B.qualityDecision).toBe("fail");
  });

  it("returns replacement_unavailable on repair_not_possible when no general replacement contract exists", async () => {
    const provider = mockProvider(() => ({
      text: JSON.stringify({ optionId: "B", outcome: "repair_not_possible" }),
    }));
    const out = await executeActiveRecovery(wrongLangRecord(), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 3,
      maxCostUsd: 0.02,
      provider,
      prices,
    });

    expect(out.applied).toBe(false);
    expect(out.providerCalls).toBe(1);
    expect(out.activeReport?.repairCalls).toBe(1);
    expect(out.activeReport?.replaceCalls).toBe(0);
    expect(out.activeReport?.replacementUnavailableCount).toBe(1);
    expect(out.activeReport?.results.find((r) => r.optionId === "B")?.replacementOutcome).toBe("replacement_unavailable");
    expect(out.activeReport?.remainingIssues).toEqual(["B:target_language_mismatch", "B:replacement_unavailable"]);
  });

  it("routes Drafts E repair_not_possible through completion.ts replacement and rejects repeated mechanism", async () => {
    const drafts = loadRecord(draftsPath);
    const draftsWithConfirmedE: QualityRecord = {
      ...drafts,
      arms: {
        ...drafts.arms,
        B: {
          ...drafts.arms.B,
          decisionRisks: { key_semantic_risk: [], distractor_equivalence_risk: [], whole_set_clue_risk: [] },
          propositionGuards: [
            ...drafts.arms.B.propositionGuards.filter((g) => g.label !== "E"),
            {
              label: "E",
              guard: { status: "unsupported_clause", mechanismStatus: "supported", signals: ["only afterward"], reason: "unsupported_extension" },
            },
          ],
        },
      },
    };
    const originalC = drafts.arms.B.options!.C!;
    draftsWithConfirmedE.arms.B.options!.C = originalC;

    // 1) Successful different-mechanism replacement for Drafts E
    let turn = 0;
    const okProvider = mockProvider(() => {
      turn += 1;
      if (turn === 1) return { text: JSON.stringify({ optionId: "E", outcome: "repair_not_possible" }) };
      return {
        text: JSON.stringify({
          optionId: "E",
          outcome: "replacement",
          text: "All of the drafts were distributed to the board, which is why most of them were not later taken up for the second reading.",
        }),
      };
    });
    const ok = await executeActiveRecovery(draftsWithConfirmedE, {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider: okProvider,
      prices,
    });
    expect(ok.applied).toBe(true);
    expect(ok.providerCalls).toBe(2);
    expect(ok.activeReport?.repairCalls).toBe(1);
    expect(ok.activeReport?.replaceCalls).toBe(1);
    expect(ok.activeReport?.replacementSuccessCount).toBe(1);
    expect(ok.activeReport?.results.find((r) => r.optionId === "E")?.replacementOutcome).toBe("replacement_accepted");

    // 2) Repeated closed_reference mechanism is rejected
    let turn2 = 0;
    const repeatedProvider = mockProvider(() => {
      turn2 += 1;
      if (turn2 === 1) return { text: JSON.stringify({ optionId: "E", outcome: "repair_not_possible" }) };
      return {
        text: JSON.stringify({
          optionId: "E",
          outcome: "replacement",
          text: "All of the drafts were distributed to the board, which is why most of the board members were not later taken up for the second reading.",
        }),
      };
    });
    const rejected = await executeActiveRecovery(draftsWithConfirmedE, {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider: repeatedProvider,
      prices,
    });
    expect(rejected.applied).toBe(false);
    expect(rejected.activeReport?.replacementSuccessCount).toBe(0);
    expect(rejected.activeReport?.results.find((r) => r.optionId === "E")?.replacementOutcome).toBe("replacement_rejected");
    expect(rejected.activeReport?.results.find((r) => r.optionId === "E")?.validationFailures).toContain("repeats_closed_reference");
  });

  it("blocks on technical failure without starting replacement, and rejects bad whole-set revalidations", async () => {
    const drafts = loadRecord(draftsPath);
    const draftsWithE: QualityRecord = {
      ...drafts,
      arms: {
        ...drafts.arms,
        B: {
          ...drafts.arms.B,
          decisionRisks: { key_semantic_risk: [], distractor_equivalence_risk: [], whole_set_clue_risk: [] },
          propositionGuards: [
            ...drafts.arms.B.propositionGuards.filter((g) => g.label !== "E"),
            {
              label: "E",
              guard: { status: "unsupported_clause", mechanismStatus: "supported", signals: ["only afterward"], reason: "unsupported_extension" },
            },
          ],
        },
      },
    };

    const techProvider = mockProvider(() => ({
      text: "",
      inputTokens: 400,
      outputTokens: 4096,
      reasoningTokens: 4096,
    }));
    const tech = await executeActiveRecovery(draftsWithE, {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider: techProvider,
      prices,
    });
    expect(tech.applied).toBe(false);
    expect(tech.providerCalls).toBe(1);
    expect(tech.activeReport?.replaceCalls).toBe(0);
    expect(tech.activeReport?.technicalFailureCount).toBe(1);
    expect(tech.activeReport?.results.find((r) => r.optionId === "E")?.technicalFailures).toEqual(
      expect.arrayContaining(["no_visible_output", "output_budget_exhausted", "invalid_json"]),
    );

    // Post-repair whole-set rejection (candidate copies key -> second_defensible / confirmed_equivalent)
    const badCandidateProvider = mockProvider(() => ({
      text: JSON.stringify({
        optionId: "B",
        text: "Kurul, gözden geçirilmiş taslağı öğleden önce onayladı.",
      }),
    }));
    const bad = await executeActiveRecovery(wrongLangRecord(), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider: badCandidateProvider,
      prices,
    });
    expect(bad.applied).toBe(false);
    expect(bad.activeReport?.repairSuccessCount).toBe(0);
    expect(bad.activeReport?.options.B).toBe(wrongLangRecord().arms.B.options!.B);
    expect(bad.activeReport?.results.find((r) => r.optionId === "B")?.validationFailures).toEqual(
      expect.arrayContaining(["second_defensible", "confirmed_equivalent"]),
    );
  });

  it("enforces budget, retry=0, authorization, hash mismatch, second answer, key review, and set-level blocks", async () => {
    const provider = mockProvider(() => {
      throw new Error("should not have called provider");
    });

    const unauth = await executeActiveRecovery(wrongLangRecord(), { mode: "active", maxCalls: 2, maxCostUsd: 0.02, provider, prices });
    expect(unauth.blocked).toBe("active_not_authorized");
    expect(unauth.providerCalls).toBe(0);

    const retryNotAllowed = await executeActiveRecovery(wrongLangRecord(), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      maxRegenerations: 1,
      provider,
      prices,
    });
    expect(retryNotAllowed.blocked).toBe("retry_not_allowed");
    expect(retryNotAllowed.providerCalls).toBe(0);

    const overBudget = await executeActiveRecovery(wrongLangRecord(), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.0001,
      provider,
      prices,
    });
    expect(overBudget.blocked).toBe("budget");
    expect(overBudget.providerCalls).toBe(0);

    const hashMismatch = await executeActiveRecovery(wrongLangRecord(), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      sourceHash: "000000000000",
      provider,
      prices,
    });
    expect(hashMismatch.blocked).toBe("hash_mismatch");
    expect(hashMismatch.providerCalls).toBe(0);

    const samples = await executeActiveRecovery(loadRecord(samplesPath), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider,
      prices,
    });
    expect(samples.blocked).toBe("second_answer");
    expect(samples.providerCalls).toBe(0);

    const editor = await executeActiveRecovery(loadRecord(editorPath), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider,
      prices,
    });
    expect(editor.blocked).toBe("set_blocked");
    expect(editor.providerCalls).toBe(0);

    const reviewers = await executeActiveRecovery(loadRecord(reviewersPath), {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider,
      prices,
    });
    expect(reviewers.blocked).toBe("set_blocked");
    expect(reviewers.providerCalls).toBe(0);

    const keyBlocked = await executeActiveRecovery({ ...loadRecord(draftsPath), keyFailures: ["key_equivalence_uncertain"] }, {
      mode: "active",
      authorization: recoveryActiveAuthorization,
      maxCalls: 2,
      maxCostUsd: 0.02,
      provider,
      prices,
    });
    expect(keyBlocked.blocked).toBe("key_review");
    expect(keyBlocked.providerCalls).toBe(0);

    // Default attachRecovery remains off
    expect(attachRecovery(wrongLangRecord()).mode).toBe("off");
  });

  it("integrates active recovery into executeCognitiveTrap with mock provider and writes recovery-summary.json", async () => {
    const out = mkdtempSync(path.join(os.tmpdir(), "tomo-active-trap-"));
    try {
      const enTrItem = trapItems().find((item) => item.direction === "en_tr")!;
      const mockTrapProvider: AIProvider = {
        name: "openrouter",
        async generate(request) {
          const system = request.system ?? "";
          const text = request.parts.map((part) => ("text" in part ? part.text : "")).join("\n");
          if (system.startsWith("DIAGNOSTIC REPAIR")) {
            const match = /REPAIR ONLY OPTION ([A-E])/.exec(text);
            const optionId = match?.[1] ?? "B";
            const suffixes = {
              A: "yalnızca ilk dozda görüldü ve sonraki ölçümlerde kayboldu",
              B: "yalnızca genç gönüllülerde ortaya çıktı ve yaşlılarda izlenmedi",
              C: "yalnızca kısa süreli testlerde geçerli kaldı ve uzun dönemde bozuldu",
              D: "yalnızca sabah oturumlarında ölçüldü ve akşam saatlerinde tekrarlanmadı",
              E: "yalnızca tek bir grupta raporlandı ve diğer deneklere genellenemedi",
            } as const;
            return {
              text: JSON.stringify({
                optionId,
                text: `Araştırmacılar toniğin hafızayı iyileştirdiğine dair etkiyi doğruladı ancak bu durum ${suffixes[optionId as keyof typeof suffixes]}.`,
              }),
              model: request.model,
              usage: { inputTokens: 450, outputTokens: 70, totalTokens: 520 },
            };
          }
          if (system.startsWith("MISREADING PATHS")) {
            const ids = [...text.matchAll(/^- ([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]!).filter((id) => id !== "NONE");
            const cycle = ids.length > 0 ? ids : ["TEMPORAL_ORDER"];
            return {
              text: JSON.stringify({
                meaningMap: {
                  roles: "researchers, patients",
                  quantity: "older patients",
                  modality: "none",
                  polarity: "negative",
                  tense: "past",
                  cause: "none",
                  reference: "tonic",
                },
                preservedRelations: ["concession", "negation"],
                readings: [0, 1, 2, 3].map((i) => ({
                  misreadingMechanism: cycle[i % cycle.length]!,
                  studentMisreading: `A reader treats clause ${i} as the cause of the outcome.`,
                  temptingEvidence: "Both clauses appear together.",
                  actualSemanticDifference: "Cause and concession are reversed.",
                  whyIncorrect: "The source keeps concession.",
                  prevalence: "unmeasured",
                })),
              }),
              model: request.model,
              usage: { inputTokens: 300, outputTokens: 180, totalTokens: 480 },
            };
          }
          if (system.startsWith("MISREADING OPTIONS")) {
            const mechanisms = translationModel.errorMechanisms;
            return {
              text: JSON.stringify({
                candidates: [0, 1, 2, 3].map((i) => ({
                  candidateText: `The researchers did not find that the tonic improved memory during the trial ${i} for older patients in general`,
                  errorMechanism: mechanisms[i % mechanisms.length]!,
                  shiftTarget: "contrast",
                  whyPlausible: "Both clauses are visible in the prompt.",
                  whyInferior: "The source keeps the original concession.",
                  sourceEvidence: "tonic",
                  semanticRisk: "none",
                  studentMisreading: `A reader treats clause ${i} as the cause of the outcome.`,
                  temptingEvidence: "Both clauses appear together.",
                  actualSemanticDifference: "Cause and concession are reversed.",
                  whyIncorrect: "The source keeps concession.",
                })),
              }),
              model: request.model,
              usage: { inputTokens: 300, outputTokens: 200, totalTokens: 500 },
            };
          }
          if (system.startsWith("ITEM MODEL DISTRACTOR")) {
            return {
              text: JSON.stringify({
                candidates: [0, 1, 2, 3].map((i) => ({
                  candidateText: `Araştırmacılar toniğin etkisini ${i} numaralı grupta inceledi ancak farklı bir sonuç buldu.`,
                  errorMechanism: "omitted_qualifier",
                  shiftTarget: "scope",
                  whyPlausible: "p",
                  whyInferior: "i",
                  sourceEvidence: "e",
                  semanticRisk: "none",
                })),
              }),
              model: request.model,
              usage: { inputTokens: 300, outputTokens: 200, totalTokens: 500 },
            };
          }
          // Judge call: find which letter holds the key sentence so blindAnswer matches keyLetter and avoids set-level judge_review block
          const keyLineMatch = /^([A-E])[:.)]\s+Araştırmacılar toniğin hafızayı/m.exec(text);
          const keyLetter = (keyLineMatch?.[1] ?? "C") as "A" | "B" | "C" | "D" | "E";
          return {
            text: JSON.stringify({
              blindAnswer: keyLetter,
              blindConfidence: 0.9,
              blindEvidence: "matches source",
              blindUncertain: false,
              keyAccurate: true,
              keyDefects: [],
              secondDefensibleOption: "none",
              distractorAcceptability: optionLabels
                .filter((l) => l !== keyLetter)
                .map((option) => ({ option, status: "acceptable", defect: "none", evidence: "ok" })),
              clueRisk: 1,
              difficultyEstimate: "medium",
              modelVerdict: "keep",
              notes: "ok",
            }),
            model: request.model,
            usage: { inputTokens: 250, outputTokens: 120, totalTokens: 370 },
          };
        },
      };

      const run = await executeCognitiveTrap({
        authorization: trapAuthorization,
        providerFor: () => mockTrapProvider,
        prices,
        models: { ...openrouterPrecheckModels },
        items: [enTrItem],
        outDir: out,
        officialTexts: loadOfficialComparisonCorpus() ?? [],
        cacheSalt: `active-test-${Date.now()}`,
        recovery: {
          mode: "active",
          authorization: recoveryActiveAuthorization,
          maxCalls: 4,
          maxCostUsd: 0.05,
        },
      });

      expect(run.recoveryMode).toBe("active");
      expect(run.recoveryProviderCalls).toBeGreaterThan(0);
      expect(run.recoveryCostUsd).toBeGreaterThan(0);
      expect(run.qualityProven).toBe(false);
      expect(run.studentBankWrites).toBe(0);
      expect(run.records[0]?.recovery?.mode).toBe("active");
      expect(run.records[0]?.recovery?.applied).toBe(true);
      expect(run.records[0]?.recovery?.meaningProven).toBe(false);
      expect(run.records[0]?.recovery?.qualityProven).toBe(false);
      expect(run.records[0]?.recovery?.editorial).toBe("pending");
      expect(run.records[0]?.arms.B.qualityDecision).toBe("fail");
      expect(existsSync(path.join(out, "recovery-summary.json"))).toBe(true);
      const savedSummary = JSON.parse(readFileSync(path.join(out, "recovery-summary.json"), "utf8"));
      expect(savedSummary).toMatchObject({
        mode: "active",
        meaningProven: false,
        qualityProven: false,
        editorial: "pending",
        studentBankWrites: 0,
      });
      expect(contentVersion(run.records[0]!.source)).toBe(run.records[0]!.recovery!.activeReport!.sourceHash);
      expect(optionLabels.every((l) => Boolean(run.records[0]!.recovery!.activeReport!.options[l]))).toBe(true);

      // Verify off and dry_run regressions on executeCognitiveTrap
      const offRun = await executeCognitiveTrap({
        authorization: trapAuthorization,
        providerFor: () => mockTrapProvider,
        prices,
        models: { ...openrouterPrecheckModels },
        items: [enTrItem],
        officialTexts: loadOfficialComparisonCorpus() ?? [],
        cacheSalt: `off-test-${Date.now()}`,
      });
      expect(offRun.recoveryMode).toBe("off");
      expect(offRun.recoveryProviderCalls).toBe(0);
      expect(offRun.recoveryCostUsd).toBe(0);
      expect(offRun.records[0]?.recovery?.mode).toBe("off");
      expect(offRun.records[0]?.recovery?.activeReport).toBeUndefined();

      const dryRun = await executeCognitiveTrap({
        authorization: trapAuthorization,
        providerFor: () => mockTrapProvider,
        prices,
        models: { ...openrouterPrecheckModels },
        items: [enTrItem],
        officialTexts: loadOfficialComparisonCorpus() ?? [],
        cacheSalt: `dry-test-${Date.now()}`,
        recovery: { mode: "dry_run" },
      });
      expect(dryRun.recoveryMode).toBe("dry_run");
      expect(dryRun.recoveryProviderCalls).toBe(0);
      expect(dryRun.recoveryCostUsd).toBe(0);
      expect(dryRun.records[0]?.recovery?.mode).toBe("dry_run");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
