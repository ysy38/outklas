import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readingModel } from "@/modules/factory/item-model/registry";
import { productionSourceFailures } from "@/modules/factory/item-model/source";
import { sourceUser } from "./ai/prompts/item-model.v1";
import { inspectOfficialComparisonCorpus, loadOfficialComparisonCorpus, loadProductionSources } from "./stages/item-precheck";

describe("source readiness", () => {
  it("loads only hash-matched questions the validator accepted", () => {
    const inspection = inspectOfficialComparisonCorpus();
    const loaded = loadOfficialComparisonCorpus();
    expect(inspection.integrityFailed).toBe(false);
    expect(inspection.booklets.every((booklet) => booklet.hashMatched)).toBe(true);
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(inspection.loadedChunks);
    expect(inspection.loadedQuestions).toBe(inspection.loadedChunks);
    expect(inspection.loadedQuestions).toBeGreaterThan(0);
    expect(inspection.excluded.some((item) => item.status === "ok")).toBe(false);
    const saved = JSON.parse(readFileSync(".data/analysis/_factory/official-corpus-report.json", "utf8")) as { loadedQuestions: number; chunks?: unknown };
    expect(saved.loadedQuestions).toBe(inspection.loadedQuestions);
    expect(saved.chunks).toBeUndefined();
    expect(inspection.withheld.map((item) => item.document)).toContain("yds-2024-03");
    expect(loadOfficialComparisonCorpus("/tmp/tomo-missing-analysis-corpus")).toBeNull();
  });

  it("binds only the verified production notes and keeps them out of the official screen", () => {
    const sources = loadProductionSources();
    expect(sources.map((record) => record.sourceId)).toEqual([
      "nlm-medlineplus-gene-expression",
      "state-historian-marshall-plan-1948",
      "noaa-gml-mauna-loa-co2",
    ]);
    expect(sources.every((record) => record.role === "production_notes" && record.usageRights === "granted" && productionSourceFailures([record], record.sourceId).length === 0)).toBe(true);
    const prompt = sourceUser(readingModel, 1, { source: sources[0], passageId: "reading-1" });
    expect(prompt).toContain("nlm-medlineplus-gene-expression");
    expect(prompt).toContain("transcription and translation");
    const official = loadOfficialComparisonCorpus()?.[0] ?? "";
    expect(official.length).toBeGreaterThan(40);
    expect(prompt.includes(official.slice(0, 80))).toBe(false);
    const verification = readFileSync(".data/analysis/_factory/production-source-verification.json", "utf8");
    const catalog = readFileSync(".data/analysis/_factory/production-sources.json", "utf8");
    expect(verification).toContain('"factorySourceFidelity": "not_run"');
    expect(verification).toContain('"factoryTypeSemantic": "not_run"');
    expect(verification).toContain("OpenStax Biology 2e");
    expect(catalog.includes("openstax.org")).toBe(false);
  });
});
