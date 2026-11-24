import { describe, expect, it } from "vitest";
import { memoryBankWriter } from "@/modules/factory/bank-import";
import { runBankImport } from "./stages/bank-import";

describe("pipeline bank import runner", () => {
  it("refuses apply without an explicit student-bank confirmation and defaults to dry-run", async () => {
    await expect(runBankImport({ sources: [], mode: "apply" })).rejects.toThrow(/confirm-student-bank/);
    const writer = memoryBankWriter();
    const dry = await runBankImport({ sources: [], writer });
    expect(dry.mode).toBe("dry-run");
    expect(writer.items.size).toBe(0);
  });
});
