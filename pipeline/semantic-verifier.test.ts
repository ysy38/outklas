import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadPrices } from "./ai/prices";
import { deterministicBaseline, pilotRates, scoreClaim } from "./semantic-verifier/compare";
import { readVerification, refuseLiveVerification, semanticVerifierRequest, semanticVerification, type SemanticVerification } from "./semantic-verifier/contract";
import { humanClasses } from "./semantic-verifier/expectations";
import { pairsByClass, pilotPairs, verifierInputOf } from "./semantic-verifier/fixture";
import { compareReference, heldOutCeilingUsd } from "./semantic-verifier/held-out-live";
import { heldOutItems, heldOutRequestLeaksReview } from "./semantic-verifier/held-out";
import { verificationCost } from "./semantic-verifier/cost";
import { v2Oracle } from "./semantic-verifier/v2-oracle";

const prices = loadPrices({ FACTORY_PRICES: path.resolve("pipeline/ai/prices.openrouter.json") });
const watchedDirs = [
  ".data/analysis/_factory/cognitive-trap/taxonomy-live-v1",
  ".data/analysis/_factory/cognitive-trap/quality-v1",
  ".data/analysis/_factory/editorial-gold/v1",
];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const watched = watchedDirs.flatMap(filesUnder).sort();
const fingerprint = () => watched.map((file) => createHash("sha256").update(readFileSync(file)).digest("hex")).join("\n");
const frozenRecords = fingerprint();

afterAll(() => {
  expect(fingerprint()).toBe(frozenRecords);
});

describe("independent semantic verifier offline pilot", () => {
  const pairs = pilotPairs();

  it("keeps three human classes and loads every saved sentence", () => {
    expect(new Set(pairs.map((pair) => pair.humanClass))).toEqual(new Set(humanClasses));
    expect(pairsByClass(pairs, "unsupported_event").map((pair) => pair.id)).toEqual(["editors-b", "tr-en-e", "ferry-b"]);
    expect(pairsByClass(pairs, "plausible_misreading").map((pair) => pair.id)).toEqual(["registry-a", "registry-b", "registry-d", "registry-e", "door-until-only-after", "clinic-completed-opening"]);
    expect(pairsByClass(pairs, "equivalent_paraphrase").map((pair) => pair.id)).toEqual(["door-equivalent-key", "clinic-equivalent-key"]);
    const editors = pairs.find((pair) => pair.id === "editors-b")!;
    expect(editors.option).toContain("the server would have withheld the check itself");
    expect(editors.questionType).toBe("restatement");
    const board = pairs.find((pair) => pair.id === "tr-en-e")!;
    expect(board.option).toContain("rather than the archive");
    expect(board.targetLanguage).toBe("en");
    const ferry = pairs.find((pair) => pair.id === "ferry-b")!;
    expect(ferry.option).toContain("other recipients getting serum by default");
    const door = pairs.find((pair) => pair.id === "door-until-only-after")!;
    expect(door.source).toContain("kept the side door locked until");
    expect(door.option).toContain("locked the side door only after");
    expect(door.option).not.toBe(door.key);
    const clinic = pairs.find((pair) => pair.id === "clinic-completed-opening")!;
    expect(clinic.questionType).toBe("translation");
    expect(clinic.targetLanguage).toBe("tr");
    expect(clinic.option).toContain("açtı");
    expect(pairs.find((pair) => pair.id === "clinic-equivalent-key")!.option).toContain("açabilirdi");
    expect(pairs.find((pair) => pair.id === "door-equivalent-key")!.option).toBe(pairs.find((pair) => pair.id === "door-equivalent-key")!.key);
  });

  it("sends only the source, the option, the question type and the target language", () => {
    for (const pair of pairs) {
      const request = semanticVerifierRequest(verifierInputOf(pair));
      expect(request.model).toBe("openrouter:anthropic/claude-sonnet-5.5");
      expect(request.user).toContain(pair.source);
      expect(request.user).toContain(pair.option);
      expect(request.user).toContain(pair.questionType);
      for (const field of ["semanticRisk", "misreadingMechanism", "errorMechanism", "whyIncorrect", "modelVerdict"]) {
        expect(request.system.includes(field) || request.user.includes(field)).toBe(false);
      }
      expect(request.user).not.toContain(pair.note);
      expect(request.user).not.toContain(pair.humanClass);
      expect(request.promptVersion).toBe("semantic-verifier.offline.v2");
      expect(request.system).toContain("Question 1.");
      expect(request.system).toContain("Question 2.");
      expect(request.system).toContain("A yes on question 1 does not answer question 2.");
      expect(request.system).not.toContain("withheld the check");
      expect(request.system).not.toContain("rather than the archive");
      expect(request.system).not.toContain("other recipients");
      if (pair.option !== pair.key) expect(request.user).not.toContain(pair.key);
      expect(request.jsonSchema).toBeTruthy();
    }
    expect(() => semanticVerifierRequest({ source: "s", option: "o", questionType: "restatement", targetLanguage: null, semanticRisk: "none" } as never)).toThrow(/semanticRisk/);
  });

  it("parses a claim without treating confidence as proof", () => {
    const claim: SemanticVerification = {
      relation: "non_equivalent",
      relationMutation: "yes",
      mutationNotes: ["temporal order", "maintained lock read as a new act"],
      unsupportedExtension: "no",
      extensionNotes: [],
      alteredMeaning: "The lock's time and act change.",
      sourceEvidence: ["kept the side door locked until"],
      optionEvidence: ["locked the side door only after"],
      plausibleStudentMisreading: true,
      confidence: 0.99,
    };
    const both = semanticVerification.parse({
      ...claim,
      relationMutation: "yes",
      unsupportedExtension: "yes",
      extensionNotes: ["an added event"],
    });
    expect(both.relationMutation).toBe("yes");
    expect(both.unsupportedExtension).toBe("yes");
    expect(readVerification(claim)).toMatchObject({ isMeaningProof: false, confidenceIsAccuracy: false });
    expect(semanticVerification.safeParse({ ...claim, relation: "confirmed_equivalent" }).success).toBe(false);
    const low = { ...claim, confidence: 0.1 };
    expect(scoreClaim({ humanClass: "plausible_misreading" }, claim)).toBe("accepted_plausible");
    expect(scoreClaim({ humanClass: "plausible_misreading" }, low)).toBe(scoreClaim({ humanClass: "plausible_misreading" }, claim));
    expect(scoreClaim({ humanClass: "plausible_misreading" }, { ...claim, unsupportedExtension: "yes" })).toBe("false_reject_plausible");
    expect(scoreClaim({ humanClass: "unsupported_event" }, { ...claim, unsupportedExtension: "yes", extensionNotes: ["added event"] })).toBe("caught_unsupported");
  });

  it("keeps the v1 human labels and states the v2 split without sending it", () => {
    expect(v2Oracle.map((row) => row.id)).toEqual(pairs.map((pair) => pair.id));
    const oracle = new Map(v2Oracle.map((row) => [row.id, row]));
    for (const id of ["registry-a", "clinic-completed-opening", "registry-b", "registry-d", "registry-e", "door-until-only-after"]) {
      expect(oracle.get(id)).toMatchObject({ relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" });
      expect(pairs.find((pair) => pair.id === id)!.humanClass).toBe("plausible_misreading");
    }
    for (const id of ["editors-b", "tr-en-e", "ferry-b"]) {
      expect(oracle.get(id)?.unsupportedExtension).toBe("yes");
      expect(pairs.find((pair) => pair.id === id)!.unsupportedAddition).toBe("yes");
    }
    for (const id of ["door-equivalent-key", "clinic-equivalent-key"]) {
      expect(oracle.get(id)).toMatchObject({ relation: "equivalent", relationMutation: "no", unsupportedExtension: "no" });
    }
    for (const pair of pairs) expect(semanticVerifierRequest(verifierInputOf(pair)).user).not.toContain("unsupportedExtension");
  });

  it("prepares an unseen review set and does not call a model", () => {
    const held = heldOutItems();
    const seen = new Set(pairs.map((pair) => pair.option));
    expect(held.length).toBeGreaterThanOrEqual(8);
    for (const item of held) {
      expect(item.origin).toBe("saved_record");
      expect(item.humanReview).toBe("review_reference");
      expect(item.expertApproval).toBe(false);
      expect(seen.has(item.option)).toBe(false);
      expect(heldOutRequestLeaksReview(item)).toBe(false);
    }
    expect(held.map((item) => item.id)).toContain("held-door-later-check");
    expect(held.find((item) => item.id === "held-door-later-check")!.provisional).toMatchObject({ relationMutation: "yes", unsupportedExtension: "yes" });
    expect(held.find((item) => item.id === "held-door-exclusive-use")!.provisional).toMatchObject({ relationMutation: "yes", unsupportedExtension: "no" });
    expect(held.find((item) => item.id === "held-clinic-purpose")!.provisional).toMatchObject({ relationMutation: "yes", unsupportedExtension: "yes" });
    expect(held.find((item) => item.id === "held-harbor-key")!.provisional).toMatchObject({ relation: "uncertain", relationMutation: "uncertain", unsupportedExtension: "uncertain" });
    const ceiling = heldOutCeilingUsd();
    expect(ceiling.calls).toBe(10);
    expect(ceiling.upperUsd).not.toBeNull();
    const harbor = held.find((item) => item.id === "held-harbor-key")!;
    expect(compareReference(harbor, { relation: "equivalent", relationMutation: "no", unsupportedExtension: "no", mutationNotes: [], extensionNotes: [], alteredMeaning: null, sourceEvidence: [], optionEvidence: [], plausibleStudentMisreading: false, confidence: 1 })?.matchesReference).toBe(false);
    expect(refuseLiveVerification().providerCalls).toBe(0);
  });

  it("records the deterministic gap and leaves live rates unrun", () => {
    const byId = new Map(pairs.map((pair) => [pair.id, pair]));
    for (const id of ["editors-b", "tr-en-e", "ferry-b"]) {
      const baseline = deterministicBaseline(byId.get(id)!);
      expect(baseline.propositionStatus).toBe("unverified");
      expect(baseline.propositionStatus).not.toBe("unsupported_clause");
      expect(baseline.meaningProven).toBe(false);
      expect(byId.get(id)!.unsupportedAddition).toBe("yes");
    }
    for (const id of ["registry-a", "registry-b", "registry-d", "registry-e", "door-until-only-after", "clinic-completed-opening"]) {
      expect(deterministicBaseline(byId.get(id)!).propositionStatus).not.toBe("unsupported_clause");
      expect(byId.get(id)!.unsupportedAddition).toBe("no");
      expect(byId.get(id)!.relation).toBe("non_equivalent");
    }
    expect(deterministicBaseline(byId.get("door-until-only-after")!).shownMechanisms).toContain("TEMPORAL_ORDER");
    for (const id of ["door-equivalent-key", "clinic-equivalent-key"]) {
      const baseline = deterministicBaseline(byId.get(id)!);
      expect(baseline.sameAsStoredKey).toBe(true);
      expect(baseline.propositionStatus).not.toBe("unsupported_clause");
      expect(baseline.meaningProven).toBe(false);
    }
    const empty = pilotRates(pairs, new Map());
    expect(empty).toMatchObject({ status: "not_run", unsupportedCapture: null, plausibleFalseReject: null, equivalentFalseAccept: null, uncertainty: null, confidenceUsed: false });
    const refused = refuseLiveVerification();
    expect(refused).toEqual({ started: false, providerCalls: 0, studentBankWrites: 0, reason: "semantic verifier live call is not authorized" });
  });

  it("estimates the existing judge price and does not bill confidence", () => {
    const cost = verificationCost(pairs.map(verifierInputOf), prices);
    expect(cost.model).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(cost.candidates).toBe(pairs.length);
    expect(cost.measuredBill).toBe(false);
    expect(cost.confidenceUsed).toBe(false);
    expect(cost.estimatedUsdTotal).toBeGreaterThan(0);
    expect(cost.estimatedUsdTotal).toBeLessThan(1);
    expect(cost.estimatedUsdPerCandidate).toBeGreaterThan(0);
    expect(cost.reason).toBeNull();
  });
});
