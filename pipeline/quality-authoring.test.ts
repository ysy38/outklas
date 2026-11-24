import { describe, expect, it } from "vitest";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { qualityFirstFrozenModels, qualityFirstPilotForbiddenDirs } from "@/modules/factory/item-model/quality-first-pilot";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";
import { refuseStudentBankWrite } from "@/modules/factory/item-model/gold";
import { classifyOption } from "@/modules/factory/item-model/whole-set";
import {
  applyQualityAuthoringTrapArm,
  assembleQualityAuthoring,
  qualityAuthoringLiveAuthorized,
  qualityAuthoringModels,
  qualityAuthoringOutputDir,
  qualityAuthoringPromptVersion,
  qualityAuthoringTrapAuthorization,
  qualityAuthoringTrapAuthorized,
  qualityAuthoringTrapEnabled,
  refuseQualityAuthoring,
  selectFourDistractors,
  semanticStanding,
  writeQualityAuthoringReplay,
} from "@/modules/factory/item-model/quality-authoring";
import {
  fourOfSixFixture,
  insufficientFixture,
  qualityAuthoringFixtureKey,
  qualityAuthoringFixtureSource,
  sameTrapDifferentTextsFixture,
  shortPoolFixture,
  sourceInsufficientFixture,
} from "@/modules/factory/item-model/quality-authoring-fixtures";
import { flashEmbargoOptions } from "@/modules/factory/item-model/semantic-failure-editorial";
import { runQualityAuthoring } from "./stages/quality-authoring";

const source = qualityAuthoringFixtureSource;
const key = qualityAuthoringFixtureKey;

describe("quality authoring v1", () => {
  it("keeps production defaults and refuses live generate", async () => {
    expect(factoryRootCauseFixEnabled).toBe(false);
    expect(recoveryDefaultEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringTrapAuthorized()).toBe(false);
    expect(qualityAuthoringTrapAuthorized({ authorization: qualityAuthoringTrapAuthorization, situationBrief: "actors and events" })).toBe(false);
    expect(qualityFirstPilotForbiddenDirs).toContain(qualityAuthoringOutputDir);
    expect(qualityAuthoringModels.author).toBe("openrouter:anthropic/claude-haiku-5.5");
    expect(qualityAuthoringModels.judge).toBe("openrouter:anthropic/claude-sonnet-5.5");
    expect(qualityFirstFrozenModels.writer).toBe("openrouter:anthropic/claude-haiku-5.5");
    const refused = refuseQualityAuthoring("live not authorized", "authorization");
    expect(refused.executed).toBe(false);
    expect(refused.providerCalls).toBe(0);
    expect(refused.studentBankWrites).toBe(0);
    expect(qualityAuthoringPromptVersion).toBe("quality-authoring.design-then-write.v1");
    const stage = await runQualityAuthoring("quality-authoring-v1");
    expect(stage.executed).toBe(false);
    expect(stage.providerCalls).toBe(0);
  });

  it("selects four of six, records only_to_at_least as risk, and does not pad", () => {
    const selected = selectFourDistractors({
      source,
      key,
      targetLanguage: "en",
      candidates: fourOfSixFixture.candidates,
    });
    expect(selected.padded).toBe(false);
    expect(selected.rows.find((row) => row.planId === "p1")?.decision).toBe("keep");
    expect(selected.rows.find((row) => row.planId === "p2")?.decision).toBe("keep");
    expect(selected.rows.find((row) => row.planId === "p3")?.decision).toBe("keep");
    expect(selected.rows.find((row) => row.planId === "p5")?.decision).toBe("keep");
    expect(selected.rows.find((row) => row.planId === "p5")?.risks).toContain("near_copy_sequence");
    expect(selected.rows.find((row) => row.planId === "p4")?.decision).toBe("surplus");
    expect(selected.rows.find((row) => row.planId === "p4")?.risks).toContain("only_to_at_least");
    expect(selected.rows.find((row) => row.planId === "p4")?.rank).toBeGreaterThan(selected.rows.find((row) => row.planId === "p1")?.rank ?? 0);
    expect(selected.rows.find((row) => row.planId === "p6")?.decision).toBe("surplus");
    expect(selected.rows.find((row) => row.planId === "p6")?.risks).toContain("near_copy_sequence");
    expect(selected.complete).toBe(true);
    expect(selected.kept).toBe(4);
    expect(selected.editorialAcceptance).toBe("pending");
    expect(selected.studentBankWrites).toBe(0);
  });

  it("does not drop two different texts that share a mechanism label", () => {
    const selected = selectFourDistractors({
      source,
      key,
      targetLanguage: "en",
      candidates: sameTrapDifferentTextsFixture.candidates,
    });
    expect(selected.rows.find((row) => row.planId === "p1")?.decision).toBe("keep");
    expect(selected.rows.find((row) => row.planId === "p2")?.decision).toBe("keep");
    expect(selected.rows.find((row) => row.planId === "p1")?.trap).toBe("QUANTITY_SCOPE");
    expect(selected.rows.find((row) => row.planId === "p2")?.trap).toBe("QUANTITY_SCOPE");
    expect(selected.rows.find((row) => row.planId === "p1")?.candidateText).not.toBe(selected.rows.find((row) => row.planId === "p2")?.candidateText);
    expect(selected.rows.find((row) => row.planId === "p1")?.shown).toBe("only_to_all");
    expect(selected.rows.find((row) => row.planId === "p2")?.shown).toBeNull();
    expect(new Set(selected.rows.filter((row) => row.decision === "keep").map((row) => row.trap)).size).toBeLessThan(4);
    expect(selected.complete).toBe(true);
    expect(selected.kept).toBe(4);
    expect(selected.padded).toBe(false);
    expect(selected.editorialAcceptance).toBe("pending");
    const assembled = assembleQualityAuthoring(sameTrapDifferentTextsFixture);
    expect(assembled.structurallyComplete).toBe(true);
    expect(assembled.editoriallyAccepted).toBe(false);
    expect(assembled.publishedSet).toBe(false);
    expect(assembled.studentBankWrites).toBe(0);
  });

  it("stops without padding when four valid distractors are not available", () => {
    const selected = selectFourDistractors({
      source,
      key,
      targetLanguage: "en",
      candidates: insufficientFixture.candidates,
    });
    expect(selected.padded).toBe(false);
    expect(selected.rows.find((row) => row.planId === "p1")?.candidateText).toBe(selected.rows.find((row) => row.planId === "p4")?.candidateText);
    expect(selected.rows.find((row) => row.planId === "p1")?.planId).not.toBe(selected.rows.find((row) => row.planId === "p4")?.planId);
    expect(selected.rows.find((row) => row.planId === "p4")?.decision).toBe("drop_duplicate");
    expect(selected.rows.find((row) => row.planId === "p5")?.decision).toBe("drop_equivalent");
    expect(selected.rows.find((row) => row.planId === "p6")?.decision).toBe("drop_equivalent");
    expect(selected.complete).toBe(false);
    expect(selected.kept).toBe(3);
  });

  it("assembles unique planIds, key and source gates, four-of-six pack, and insufficient stop", () => {
    const complete = assembleQualityAuthoring(fourOfSixFixture);
    const stopped = assembleQualityAuthoring(insufficientFixture);
    const replay = writeQualityAuthoringReplay([
      { id: "four-of-six", report: complete },
      { id: "insufficient", report: stopped },
    ]);

    expect(complete.parseOk).toBe(true);
    expect(complete.uniquePlanIds).toBe(true);
    if (!("paraphrase" in complete)) throw new Error("expected full assemble report");
    expect(complete.paraphrase.meaningProven).toBe(false);
    expect(complete.meaningProven).toBe(false);
    expect(complete.examSurface.status).toBe("not_run");
    expect(complete.risks).toEqual(expect.arrayContaining(["exam_surface_not_run", "meaning_unproven"]));
    expect(complete.risks.some((code) => code.startsWith("paraphrase_distance:"))).toBe(true);
    expect(complete.keyAssessment.meaning).not.toBe("pass");
    expect(complete.complete).toBe(true);
    expect(complete.structurallyComplete).toBe(true);
    expect(complete.editoriallyAccepted).toBe(false);
    expect(complete.qualityAccepted).toBe(false);
    expect(complete.publishedSet).toBe(false);
    expect(complete.keyStanding?.standing).not.toBe("fail");
    expect(complete.pack?.forms[0]?.complete).toBe(true);
    expect(complete.pack?.forms[0]?.options).toEqual(
      expect.objectContaining({
        A: key,
        B: expect.any(String),
        C: expect.any(String),
        D: expect.any(String),
        E: expect.any(String),
      }),
    );
    expect(new Set(Object.values(complete.pack!.forms[0]!.options!)).size).toBe(5);
    expect(complete.dropped.map((row) => row.planId).sort()).toEqual(["p4", "p6"]);
    expect(complete.editorialAcceptance).toBe("pending");
    expect(complete.studentBankWrites).toBe(0);
    expect(complete.liveGenerate).toBe(0);
    expect(complete.fixtureIsNotQualityProof).toBe(true);

    expect(stopped.complete).toBe(false);
    expect(stopped.publishedSet).toBe(false);
    expect(stopped.pack).toBeNull();
    expect(stopped.selection?.padded).toBe(false);
    expect(stopped.dropped.some((row) => row.decision === "drop_duplicate")).toBe(true);
    expect(replay.livePilotReady).toBe(false);
    expect(replay.studentBankWrites).toBe(0);
  });

  it("rejects duplicate planIds and does not publish a five-option set", () => {
    const duplicated = {
      ...fourOfSixFixture,
      candidates: fourOfSixFixture.candidates.map((row, index) => (index === 5 ? { ...row, planId: "p1" as const } : row)),
    };
    const report = assembleQualityAuthoring(duplicated);
    expect(report.parseOk).toBe(true);
    expect(report.uniquePlanIds).toBe(false);
    expect(report.complete).toBe(false);
    expect(report.pack).toBeNull();
    expect(report.risks).toContain("plan_id_not_unique_p1_p6");
  });

  it("does not publish when the key copies the source", () => {
    const report = assembleQualityAuthoring({ ...fourOfSixFixture, key: source });
    expect(report.parseOk).toBe(true);
    expect(report.keyValid).toBe(false);
    expect(report.complete).toBe(false);
    expect(report.publishedSet).toBe(false);
    expect(report.pack).toBeNull();
    expect(report.risks.some((code) => code.includes("key_copies_proposition"))).toBe(true);
  });

  it("does not publish a completed set when the key is missing", () => {
    const report = assembleQualityAuthoring({ ...fourOfSixFixture, key: "" });
    expect(report.parseOk).toBe(false);
    expect(report.complete).toBe(false);
    expect(report.pack).toBeNull();
  });

  it("drops a wrong-language candidate instead of padding", () => {
    const mixed = {
      ...insufficientFixture,
      candidates: insufficientFixture.candidates.map((row) =>
        row.planId === "p6"
          ? {
              ...row,
              candidateText: "Editörler ambargodan önce atıf kontrolünü tamamlamış olsaydı, yalnızca iki ek yayımlanırdı.",
              studentMisreading: "Turkish wording on an English restatement",
            }
          : row,
      ),
    };
    const selected = selectFourDistractors({
      source,
      key,
      targetLanguage: "en",
      candidates: mixed.candidates,
    });
    expect(selected.rows.find((row) => row.planId === "p6")?.decision).toBe("drop_language");
    expect(selected.complete).toBe(false);
    expect(selected.padded).toBe(false);
  });

  it("does not editorially accept or write the student bank", () => {
    const report = assembleQualityAuthoring(fourOfSixFixture);
    expect(report.editorialAcceptance).toBe("pending");
    expect(report.editoriallyAccepted).toBe(false);
    expect(report.qualityAccepted).toBe(false);
    expect(report.humanEditorial).toBe("pending");
    expect(report.winnerDeclared).toBe(false);
    expect(report.studentBankWrites).toBe(0);
    expect(report.publishedSet).toBe(false);
    expect(() => publishToStudentBank()).toThrow(/student bank/);
    expect(() => refuseStudentBankWrite("student-bank")).toThrow(/student bank/);
  });

  it("splits shown fail, suitable equivalence, and heuristic unverified without promoting classifyOption", () => {
    const shown = semanticStanding(
      "The editors completed the citation check before the embargo.",
      "The editors completed the citation check after the embargo.",
      "source_key",
    );
    expect(shown).toEqual({ standing: "fail", evidence: "before_to_after", heuristic: false });

    const equivalent = semanticStanding(
      source,
      "Had the editors completed the citation check prior to the embargo, only the two contested appendices would have been released to the preprint server.",
      "source_key",
    );
    expect(equivalent).toEqual({ standing: "suitable", evidence: "near_copy_sequence", heuristic: false });

    const heuristic = semanticStanding("The committee declined the proposal after the review.", "The committee was not accepted after the review.", "source_key");
    expect(heuristic.standing).toBe("unverified");
    expect(heuristic.heuristic).toBe(true);
    expect(heuristic.evidence).toBe("polarity_shift");
    expect(classifyOption("The committee declined the proposal after the review.", "The committee declined the proposal after the review.", "The committee was not accepted after the review.").relation).toBe(
      "confirmed_difference",
    );
  });

  it("does not reuse source_key verdicts for distractor pairs on frozen wording", () => {
    const priorTo = flashEmbargoOptions.TEMPORAL_ORDER;
    const after =
      "Had the editors completed the citation check after the embargo, only the two contested appendices would have been released to the preprint server.";
    const onlyToAll = "Had the editors completed the citation check before the embargo, all the contested appendices would have been released to the preprint server.";
    const already =
      "The union announced that it would not end the strike until it saw the arbitration board's reasoned decision, whereas factory management argued that the orders had already been cancelled.";
    const notYet =
      "The union announced that it would not end the strike until it saw the arbitration board's reasoned decision, whereas factory management argued that the orders had not yet been cancelled.";
    const couldNot = "Because the ice-core laboratory could not date the dust band independently, it listed the eruption only as a candidate marker rather than a confirmed one.";
    const emediginden =
      "Buz karotu laboratuvarı toz tabakasını bağımsız olarak tarihlendiremediğinden, püskürmeyi yalnızca aday bir işaret olarak listeledi, doğrulanmış bir işaret olarak değil.";
    const declined =
      "The inspectorate withheld the reopening permit only until both independent laboratories had logged a dust assay, even though the north-shaft operator had restarted the ventilation fans during that interval, a step the inspectorate declined to read as evidence that airborne dust had reached safe levels.";
    const notAccepted =
      "The permit remained suspended only until both independent laboratories had logged dust assays, and the operator's fan restart, which occurred within that window, was not accepted by the inspectorate as proof that the air had become safe.";

    expect(semanticStanding(source, priorTo, "source_key")).toEqual({ standing: "suitable", evidence: "near_copy_sequence", heuristic: false });
    expect(semanticStanding(source, priorTo, "distractor_source")).toEqual({ standing: "fail", evidence: "near_copy_sequence", heuristic: false });
    expect(semanticStanding(source, flashEmbargoOptions.COUNTERFACTUAL_FACTUAL, "distractor_source")).toEqual({
      standing: "fail",
      evidence: "near_copy_sequence",
      heuristic: false,
    });
    expect(semanticStanding(key, flashEmbargoOptions.TEMPORAL_ORDER, "distractor_key").standing).toBe("unverified");
    expect(semanticStanding(key, flashEmbargoOptions.QUANTITY_SCOPE, "distractor_key").standing).toBe("unverified");

    expect(semanticStanding(source, after, "source_key")).toEqual({ standing: "fail", evidence: "before_to_after", heuristic: false });
    expect(semanticStanding(source, after, "distractor_source")).toEqual({ standing: "unverified", evidence: "before_to_after", heuristic: false });
    expect(semanticStanding(source, onlyToAll, "source_key")).toEqual({ standing: "fail", evidence: "only_to_all", heuristic: false });
    expect(semanticStanding(source, onlyToAll, "distractor_source")).toEqual({ standing: "unverified", evidence: "only_to_all", heuristic: false });

    expect(semanticStanding(already, notYet, "source_key")).toEqual({ standing: "suitable", evidence: "near_copy_sequence", heuristic: false });
    expect(semanticStanding(already, notYet, "distractor_key")).toEqual({ standing: "fail", evidence: "near_copy_sequence", heuristic: false });

    expect(semanticStanding(couldNot, emediginden, "source_key")).toMatchObject({ standing: "unverified", evidence: "modality_shift", heuristic: true });
    expect(semanticStanding(couldNot, emediginden, "distractor_key").standing).toBe("unverified");
    expect(semanticStanding(declined, notAccepted, "source_key")).toMatchObject({ standing: "unverified", evidence: "polarity_shift", heuristic: true });
    expect(semanticStanding(declined, notAccepted, "source_key").standing).not.toBe("fail");

    const assembled = assembleQualityAuthoring(fourOfSixFixture);
    expect(assembled.keyStanding?.standing).not.toBe("fail");
    expect(assembled.optionStandings.find((row) => row.planId === "p6")?.vsSource).toEqual({ standing: "fail", evidence: "near_copy_sequence", heuristic: false });
    expect(assembled.optionStandings.find((row) => row.planId === "p1")?.vsSource).toEqual({ standing: "unverified", evidence: "before_to_after", heuristic: false });
    expect(assembled.editoriallyAccepted).toBe(false);
    expect(assembled.publishedSet).toBe(false);
    expect(assembled.studentBankWrites).toBe(0);
  });

  it("withholds a pack on shown key difference and keeps heuristic key unverified for review only", () => {
    const shownKey = assembleQualityAuthoring({
      ...fourOfSixFixture,
      key: "Only the two contested appendices would have been released to the preprint server if the editors had finished checking the citations after the embargo.",
    });
    expect(shownKey.keyStanding?.standing).toBe("fail");
    expect(shownKey.keyStanding?.heuristic).toBe(false);
    expect(shownKey.structurallyComplete).toBe(false);
    expect(shownKey.editoriallyAccepted).toBe(false);
    expect(shownKey.pack).toBeNull();
    expect(shownKey.publishedSet).toBe(false);
    expect(shownKey.studentBankWrites).toBe(0);

    const heuristicKey = assembleQualityAuthoring({
      ...fourOfSixFixture,
      key: "Only the two contested appendices would not have been released to the preprint server if the editors had finished checking the citations ahead of the embargo.",
    });
    expect(heuristicKey.keyStanding?.standing).toBe("unverified");
    expect(heuristicKey.keyStanding?.heuristic).toBe(true);
    expect(heuristicKey.editoriallyAccepted).toBe(false);
    expect(heuristicKey.publishedSet).toBe(false);
    expect(heuristicKey.studentBankWrites).toBe(0);
    if (heuristicKey.structurallyComplete) {
      expect(heuristicKey.pack).not.toBeNull();
    } else {
      expect(heuristicKey.pack).toBeNull();
    }
  });

  it("binds the trap arm offline without a bank write or editorial accept", () => {
    const bound = applyQualityAuthoringTrapArm(fourOfSixFixture);
    expect(bound.structurallyComplete).toBe(true);
    expect(bound.editoriallyAccepted).toBe(false);
    expect(bound.reachesStudentBank).toBe(false);
    expect(bound.studentBankWrites).toBe(0);
    expect(bound.kept).toHaveLength(4);
    expect(bound.keyStanding?.standing).not.toBe("fail");
  });

  it("does not misrepresent frozen selector cases as proven traps or proven equivalents", () => {
    const embargoSource = source;
    const embargoKey = key;
    const flash = selectFourDistractors({
      source: embargoSource,
      key: embargoKey,
      targetLanguage: "en",
      candidates: [
        { planId: "p1", trap: "CONDITION_DIRECTION", candidateText: flashEmbargoOptions.CONDITION_DIRECTION, studentMisreading: "clause order" },
        { planId: "p2", trap: "COUNTERFACTUAL_FACTUAL", candidateText: flashEmbargoOptions.COUNTERFACTUAL_FACTUAL, studentMisreading: "if-fronting" },
        { planId: "p3", trap: "QUANTITY_SCOPE", candidateText: flashEmbargoOptions.QUANTITY_SCOPE, studentMisreading: "received vs released" },
        { planId: "p4", trap: "TEMPORAL_ORDER", candidateText: flashEmbargoOptions.TEMPORAL_ORDER, studentMisreading: "prior to" },
        { planId: "p5", trap: "CAUSE_CONCESSION", candidateText: embargoSource, studentMisreading: "source copy" },
        { planId: "p6", trap: "AGENT_ROLE", candidateText: embargoKey, studentMisreading: "key copy" },
      ],
    });
    expect(flash.padded).toBe(false);
    expect(flash.editorialAcceptance).toBe("pending");
    expect(flash.studentBankWrites).toBe(0);
    expect(flash.rows.find((row) => row.planId === "p5")?.decision).toBe("drop_equivalent");
    expect(flash.rows.find((row) => row.planId === "p6")?.decision).toBe("drop_equivalent");
    expect(flash.rows.find((row) => row.planId === "p4")?.risks).toContain("near_copy_sequence");
    expect(flash.rows.find((row) => row.planId === "p2")?.risks).toContain("near_copy_sequence");
    expect(flash.rows.find((row) => row.planId === "p4")?.shown).toBeNull();
    expect(flash.rows.find((row) => row.planId === "p2")?.shown).toBeNull();
    expect(flash.rows.find((row) => row.planId === "p1")?.shown).toBeNull();
    expect(flash.rows.find((row) => row.planId === "p3")?.shown).toBeNull();
    expect(flash.rows.filter((row) => row.decision === "keep").every((row) => row.rank > 0)).toBe(true);

    const after =
      "Had the editors completed the citation check after the embargo, only the two contested appendices would have been released to the preprint server.";
    const priorKept = selectFourDistractors({
      source: embargoSource,
      key: embargoKey,
      targetLanguage: "en",
      candidates: fourOfSixFixture.candidates,
    });
    expect(priorKept.rows.find((row) => row.planId === "p1")?.decision).toBe("keep");
    expect(priorKept.rows.find((row) => row.planId === "p1")?.shown).toBe("before_to_after");
    expect(priorKept.rows.find((row) => row.candidateText === after)?.decision).toBe("keep");

    const already =
      "The union announced that it would not end the strike until it saw the arbitration board's reasoned decision, whereas factory management argued that the orders had already been cancelled.";
    const notYet =
      "The union announced that it would not end the strike until it saw the arbitration board's reasoned decision, whereas factory management argued that the orders had not yet been cancelled.";
    const alreadyPool = selectFourDistractors({
      source: already,
      key: already,
      targetLanguage: "en",
      candidates: [
        { planId: "p1", trap: "TEMPORAL_ORDER", candidateText: after, studentMisreading: "before to after" },
        { planId: "p2", trap: "CONDITION_DIRECTION", candidateText: fourOfSixFixture.candidates[1]!.candidateText, studentMisreading: "condition" },
        { planId: "p3", trap: "NEGATION_SCOPE", candidateText: notYet, studentMisreading: "already vs not yet" },
        { planId: "p4", trap: "QUANTITY_SCOPE", candidateText: fourOfSixFixture.candidates[3]!.candidateText, studentMisreading: "at least" },
        { planId: "p5", trap: "CAUSE_CONCESSION", candidateText: already, studentMisreading: "key copy" },
        { planId: "p6", trap: "AGENT_ROLE", candidateText: already, studentMisreading: "key copy again" },
      ],
    });
    expect(alreadyPool.rows.find((row) => row.planId === "p3")?.decision).not.toBe("drop_equivalent");
    expect(alreadyPool.rows.find((row) => row.planId === "p3")?.risks).toContain("near_copy_sequence");
    expect(classifyOption(already, already, notYet).relation).toBe("confirmed_equivalent");

    const couldNot = "Because the ice-core laboratory could not date the dust band independently, it listed the eruption only as a candidate marker rather than a confirmed one.";
    const emediginden =
      "Buz karotu laboratuvarı toz tabakasını bağımsız olarak tarihlendiremediğinden, püskürmeyi yalnızca aday bir işaret olarak listeledi, doğrulanmış bir işaret olarak değil.";
    expect(semanticStanding(couldNot, emediginden, "source_key")).toMatchObject({ standing: "unverified", heuristic: true, evidence: "modality_shift" });
    expect(classifyOption(couldNot, emediginden, emediginden).relation).not.toBe("confirmed_equivalent");

    const brief = selectFourDistractors({
      source:
        "The inspectorate withheld the reopening permit only until both independent laboratories had logged a dust assay, even though the north-shaft operator had restarted the ventilation fans during that interval, a step the inspectorate declined to read as evidence that airborne dust had reached safe levels.",
      key: "The permit remained suspended only until both independent laboratories had logged dust assays, and the operator's fan restart, which occurred within that window, was not accepted by the inspectorate as proof that the air had become safe.",
      targetLanguage: "en",
      candidates: [
        {
          planId: "p1",
          trap: "TEMPORAL_ORDER",
          candidateText: "The suspension ended once the operator restarted the ventilation fans, and the inspectorate later treated the dust assays as confirmation of that restart.",
          studentMisreading: "fan restart as endpoint plus later confirmation",
        },
        {
          planId: "p2",
          trap: "CAUSE_CONCESSION",
          candidateText: "Because the operator had restarted the fans, the inspectorate kept the permit suspended until both laboratories had logged dust assays.",
          studentMisreading: "concession to cause",
        },
        {
          planId: "p3",
          trap: "QUANTITY_SCOPE",
          candidateText: "The permit remained suspended only until any one independent laboratory had logged a dust assay, and the fan restart was not taken as proof of safety.",
          studentMisreading: "both to any one",
        },
        {
          planId: "p4",
          trap: "EVIDENCE_CERTAINTY",
          candidateText: "The permit remained suspended until both laboratories had logged dust assays, and the inspectorate regarded the fan restart as conclusive evidence that the air had become safe.",
          studentMisreading: "evidence invert",
        },
        {
          planId: "p5",
          trap: "LEXICAL_COLLOCATION",
          candidateText: "The inspectorate withdrew the reopening permit until both independent laboratories had logged dust assays, and the fan restart was not accepted as proof of safety.",
          studentMisreading: "withheld to withdrew",
        },
        {
          planId: "p6",
          trap: "COUNTERFACTUAL_FACTUAL",
          candidateText: "Had the operator's fan restart been accepted as proof of safety, the inspectorate would have withheld the permit until both laboratories had logged dust assays.",
          studentMisreading: "counterfactual",
        },
      ],
    });
    expect(brief.rows.find((row) => row.planId === "p1")?.risks).toContain("standing_unverified");
    expect(brief.rows.find((row) => row.planId === "p4")?.decision).toBe("keep");
    expect(brief.rows.find((row) => row.planId === "p4")?.reason).not.toBe("surplus");
    expect(brief.studentBankWrites).toBe(0);

    const boardQuantity =
      "The disputed tables would have gone to the external reviewers if the board had read the draft before it entered the archive.";
    const board = selectFourDistractors({
      source: "Hakem kurulu taslağı arşive girmeden önce okumuş olsaydı, yalnızca iki itirazlı tablo dış değerlendiricilere gidecekti.",
      key: "Only the two disputed tables would have gone to the external reviewers if the board had read the draft before it entered the archive.",
      targetLanguage: "en",
      candidates: [
        { planId: "p1", trap: "QUANTITY_SCOPE", candidateText: boardQuantity, studentMisreading: "drops only two" },
        { planId: "p2", trap: "CONDITION_DIRECTION", candidateText: fourOfSixFixture.candidates[1]!.candidateText, studentMisreading: "condition" },
        { planId: "p3", trap: "TEMPORAL_ORDER", candidateText: after, studentMisreading: "after" },
        { planId: "p4", trap: "COUNTERFACTUAL_FACTUAL", candidateText: fourOfSixFixture.candidates[2]!.candidateText, studentMisreading: "factual" },
        { planId: "p5", trap: "CAUSE_CONCESSION", candidateText: boardQuantity, studentMisreading: "duplicate quantity" },
        { planId: "p6", trap: "AGENT_ROLE", candidateText: embargoKey, studentMisreading: "unrelated" },
      ],
    });
    expect(board.rows.find((row) => row.planId === "p1")?.shown).toBeNull();
    expect(board.rows.find((row) => row.planId === "p1")?.rank).toBeGreaterThan(0);
    expect(board.padded).toBe(false);
    expect(qualityAuthoringTrapEnabled).toBe(false);
  });

  it("accepts fewer than six consecutive candidates and does not pad or invent fillers", () => {
    const short = assembleQualityAuthoring(shortPoolFixture);
    expect(short.parseOk).toBe(true);
    expect(short.uniquePlanIds).toBe(true);
    expect(short.authoringStatus).toBe("authored");
    expect(short.selection?.poolSize).toBe(3);
    expect(short.selection?.kept).toBe(3);
    expect(short.selection?.complete).toBe(false);
    expect(short.selection?.padded).toBe(false);
    expect(short.structurallyComplete).toBe(false);
    expect(short.pack).toBeNull();
    expect(short.editoriallyAccepted).toBe(false);
    expect(short.studentBankWrites).toBe(0);

    const skippedIds = assembleQualityAuthoring({
      ...shortPoolFixture,
      candidates: [
        { ...shortPoolFixture.candidates[0]!, planId: "p2" as const },
        { ...shortPoolFixture.candidates[1]!, planId: "p3" as const },
        { ...shortPoolFixture.candidates[2]!, planId: "p4" as const },
      ],
    });
    expect(skippedIds.parseOk).toBe(true);
    expect(skippedIds.uniquePlanIds).toBe(false);
    expect(skippedIds.selection).toBeNull();

    const insufficient = assembleQualityAuthoring(sourceInsufficientFixture);
    expect(insufficient.parseOk).toBe(true);
    expect(insufficient.authoringStatus).toBe("source_insufficient_quality_opportunities");
    expect(insufficient.uniquePlanIds).toBe(true);
    expect(insufficient.selection?.poolSize).toBe(0);
    expect(insufficient.selection?.padded).toBe(false);
    expect(insufficient.structurallyComplete).toBe(false);
    expect(insufficient.risks).toContain("source_insufficient_quality_opportunities");
    expect(qualityAuthoringTrapEnabled).toBe(false);
    expect(qualityAuthoringLiveAuthorized).toBe(false);
  });
});
