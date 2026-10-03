import { describe, expect, it } from "vitest";
import { canStartPractice, canStartSimulator, isPro, practiceAllowance } from "./entitlement";
import { publishBlockers, type PublishDraft } from "../content/publish";

const ready: PublishDraft = {
  stem: "The committee reached a ---- conclusion after reading the audit.",
  explanation: "Substantial fits the evidence; the other words shift the claim.",
  difficulty: 3,
  skillIds: ["academic-vocabulary"],
  layout: "blank",
  choices: [
    { body: "substantial", correct: true, distractorType: null },
    { body: "scarce", correct: false, distractorType: "CONTEXT_MISMATCH" },
    { body: "hostile", correct: false, distractorType: "VOCAB_SIMILAR_MEANING" },
    { body: "oral", correct: false, distractorType: "COLLOCATION_ERROR" },
    { body: "prior", correct: false, distractorType: "CONTEXT_MISMATCH" },
  ],
};

describe("publish", () => {
  it("blocks incomplete metadata", () => {
    expect(publishBlockers(ready)).toEqual([]);
    expect(publishBlockers({ ...ready, explanation: "short", skillIds: [], difficulty: 0 }).length).toBeGreaterThan(0);
    expect(
      publishBlockers({
        ...ready,
        choices: ready.choices.map((choice) => ({ ...choice, distractorType: null })),
      }),
    ).toContain("Yanlış şıkta çeldirici tipi yok.");
  });
});

describe("entitlement", () => {
  const now = new Date("2026-04-01T00:00:00Z");

  it("treats an active unexpired pro plan as paid", () => {
    expect(isPro({ devPro: false, plan: "pro", status: "active", periodEnd: new Date("2026-05-01"), now })).toBe(true);
    expect(isPro({ devPro: false, plan: "pro", status: "active", periodEnd: new Date("2026-03-01"), now })).toBe(false);
    expect(isPro({ devPro: true, plan: null, status: null, periodEnd: null, now })).toBe(true);
    expect(canStartPractice({ pro: false, answeredToday: 10, limit: 10 })).toBe(false);
    expect(canStartSimulator({ pro: false, completed: 1, limit: 1 })).toBe(false);
    expect(practiceAllowance({ pro: false, answeredToday: 8, limit: 10, requested: 6 })).toBe(2);
  });
});
