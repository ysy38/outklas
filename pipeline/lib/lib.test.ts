import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readManifest, runStage, stageDir } from "./artifacts";
import { mapLimit } from "./limit";
import { assertTextFree } from "./text-free";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "tomo-artifacts-"));
  process.env.ANALYSIS_DATA_DIR = dir;
});
afterEach(() => {
  delete process.env.ANALYSIS_DATA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe("runStage", () => {
  it("reuses output for the same input hash and reruns when inputs change", async () => {
    let runs = 0;
    const body = async () => {
      runs += 1;
      return { files: { "out.txt": `run ${runs}` }, stats: { runs } };
    };
    const first = await runStage({ document: "d", stage: "s", version: "1", inputs: { a: "1" } }, body);
    const second = await runStage({ document: "d", stage: "s", version: "1", inputs: { a: "1" } }, body);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.manifest.outputHash).toBe(first.manifest.outputHash);
    const third = await runStage({ document: "d", stage: "s", version: "1", inputs: { a: "2" } }, body);
    expect(third.cached).toBe(false);
    expect(runs).toBe(2);
    await runStage({ document: "d", stage: "s", version: "1", inputs: { a: "2" }, code: ["pipeline/lib/limit.ts"] }, body);
    expect(runs).toBe(3);
  });

  it("archives superseded immutable output and refuses to rewrite a tampered one", async () => {
    const body = (text: string) => async () => ({ files: { "raw.txt": text } });
    await runStage({ document: "d", stage: "ocr", version: "1", inputs: { a: "1" }, immutable: true }, body("first"));
    await runStage({ document: "d", stage: "ocr", version: "1", inputs: { a: "2" }, immutable: true }, body("second"));
    expect(readdirSync(path.join(dir, "d")).filter((name) => name.startsWith("ocr@"))).toHaveLength(1);
    writeFileSync(path.join(stageDir("d", "ocr"), "raw.txt"), "edited");
    await expect(runStage({ document: "d", stage: "ocr", version: "1", inputs: { a: "2" }, immutable: true }, body("third"))).rejects.toThrow(/immutable/);
    expect(readManifest("d", "ocr")!.inputs).toEqual({ a: "2" });
  });
});

describe("mapLimit", () => {
  it("keeps order and never exceeds the limit", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapLimit([5, 1, 3, 2], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active -= 1;
      return value * 2;
    });
    expect(result).toEqual([10, 2, 6, 4]);
    expect(peak).toBe(2);
  });
});

describe("assertTextFree", () => {
  it("lets codes, hashes and source metadata through but rejects prose", () => {
    expect(() => assertTextFree({ sources: [{ name: "Some Provider", url: "https://x.test" }], questions: [{ ref: "connector:although", n: 1 }], proposals: [{ name: "made up topic" }] })).not.toThrow();
    expect(() => assertTextFree({ questions: [{ name: "a sentence from an item" }] })).toThrow(/not text-free/);
    expect(() => assertTextFree({ proposals: [{ name: "Has Capitals And Is Prose" }] })).toThrow();
  });
});
