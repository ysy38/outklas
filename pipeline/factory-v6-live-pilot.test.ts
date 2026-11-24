import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditFacultyRoleCarry,
  factoryV6LivePilotAuthorization,
  factoryV6LivePilotLiveAuthorized,
  factoryV6LivePilotMaxCalls,
  factoryV6LivePilotOutputDir,
  factoryV6LivePilotSpendCapUsd,
  factoryV6LivePilotWriter,
  pilotCeilingUsd,
  validateAllV6PilotPreFlight,
  v6PilotProtectedDirs,
  writeFactoryV6LivePilotOfflinePreFlight,
} from "@/modules/factory/item-model/factory-v6-live-pilot";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { scoringSourceAliases } from "@/modules/factory/item-model/root-cause-audit";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { writerBakeoffCompareOutputDir } from "@/modules/factory/item-model/writer-bakeoff-compare";
import { writerBakeoffOutputDir } from "@/modules/factory/item-model/writer-bakeoff";
import { fingerprintFiles, qualityFirstPilotFingerprint, writerBakeoffV1Fingerprint } from "@/modules/factory/item-model/writer-bakeoff-smoke";
import { loadPrices } from "./ai/prices";
import { runFactoryV6ControlledLivePilot } from "./stages/factory-v6-live-pilot";

const openrouter = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });

describe("factory v6 controlled live pilot v1", () => {
  it("passes offline writer prompt pre-flight and respects pilot guardrails", async () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(factoryV6LivePilotLiveAuthorized).toBe(true);
    expect(factoryV6LivePilotMaxCalls).toBe(3);
    expect(factoryV6LivePilotSpendCapUsd).toBe(0.03);
    expect(factoryV6LivePilotWriter).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityFirstFrozenModels.writer).toBe(factoryV6LivePilotWriter);
    expect(qualityFirstPilotForbiddenDirs).toContain(factoryV6LivePilotOutputDir);
    expect(v6PilotProtectedDirs()).toContain(writerBakeoffCompareOutputDir);
    expect(v6PilotProtectedDirs()).not.toContain(factoryV6LivePilotOutputDir);

    expect(openrouter).not.toBeNull();
    const ceiling = pilotCeilingUsd(openrouter!.table);
    expect(ceiling.perCallUsd).not.toBeNull();
    expect(ceiling.threeCallUsd).not.toBeNull();
    expect(ceiling.fitsCap).toBe(true);

    const preFlight = validateAllV6PilotPreFlight();
    expect(preFlight.ok).toBe(true);
    expect(preFlight.tasks).toHaveLength(3);
    expect(preFlight.tasks.map((task) => task.id)).toEqual([
      scoringSourceAliases.embargo,
      scoringSourceAliases.faculty,
      scoringSourceAliases.board,
    ]);

    for (const task of preFlight.tasks) {
      expect(task.writerUser).toMatch(/change: \w+ →/);
      expect(task.writerUser).toMatch(/preserve:\n  -/);
      expect(task.plans).toHaveLength(4);
    }

    const registryMedium = writeFactoryV6LivePilotOfflinePreFlight();
    expect(registryMedium.ok).toBe(true);
    expect(existsSync(path.join(factoryV6LivePilotOutputDir, "pre-flight.json"))).toBe(true);

    const v1Before = writerBakeoffV1Fingerprint();
    const compareBefore = fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"]);
    const qualityBefore = qualityFirstPilotFingerprint();
    const freezeBefore = readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8");

    const blocked = await runFactoryV6ControlledLivePilot("nope");
    expect(blocked.started).toBe(false);
    expect((blocked as { providerCalls?: number }).providerCalls ?? 0).toBe(0);

    const overwrite = await runFactoryV6ControlledLivePilot(factoryV6LivePilotAuthorization, writerBakeoffCompareOutputDir);
    expect(overwrite.started).toBe(false);

    const facultyCarry = auditFacultyRoleCarry({
      sourceId: scoringSourceAliases.faculty,
      plans: [
        { planId: "p1-PURPOSE_RESULT", mechanismId: "PURPOSE_RESULT" },
        { planId: "p2-CAUSE_CONCESSION", mechanismId: "CAUSE_CONCESSION" },
        { planId: "p3-NEGATION_SCOPE", mechanismId: "NEGATION_SCOPE" },
        { planId: "p4-AGENT_ROLE", mechanismId: "AGENT_ROLE" },
      ],
      candidates: [
        { candidateText: "Fakülte, aynı kadronun rakamları hazırlaması nedeniyle bölümün kendi donanımını değerlememesi sonucunda dışarıdan bir denetçi tuttu.", planId: "p1-PURPOSE_RESULT" },
        { candidateText: "Aynı kadro geçen yılki rakamları hazırlamış olsa da fakülte, bölümün kendi donanımını değerlememesi için dışarıdan bir denetçi tuttu.", planId: "p2-CAUSE_CONCESSION" },
        { candidateText: "Fakülte, geçen yılki rakamları aynı kadronun hazırlamış olması nedeniyle bölümün kendi donanımını kısmen değerlemesi için dışarıdan bir denetçi tuttu.", planId: "p3-NEGATION_SCOPE" },
        { candidateText: "Bölüm, geçen yılki rakamları aynı kadronun hazırlamış olması nedeniyle fakültenin kendi donanımını değerlememesi için dışarıdan bir denetçi tuttu.", planId: "p4-AGENT_ROLE" },
      ],
    });
    expect(facultyCarry.facultyPresent).toBe(true);
    expect(facultyCarry.departmentPresent).toBe(true);
    expect(facultyCarry.sameStaffPresent).toBe(true);
    expect(facultyCarry.agentRoleSwapsHirer).toBe(true);

    expect(writerBakeoffV1Fingerprint()).toBe(v1Before);
    expect(fingerprintFiles(writerBakeoffCompareOutputDir, ["summary.json", "plan-audit.json", "machine-eval.json"])).toBe(compareBefore);
    expect(qualityFirstPilotFingerprint()).toBe(qualityBefore);
    expect(readFileSync(path.join(writerBakeoffOutputDir, "freeze.json"), "utf8")).toBe(freezeBefore);
  });
});