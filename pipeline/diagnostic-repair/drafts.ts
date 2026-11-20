import { readFileSync } from "node:fs";
import path from "node:path";
import type { RepairFinding, RepairTask } from "./contract";
import { buildRepairTasks } from "./contract";

export const draftsRecordPath = ".data/analysis/_factory/cognitive-trap/medium-repro-v1/medium-repro-translation-tr_en.json";

export type DraftsOptionId = "A" | "B" | "C" | "D" | "E";

export type DraftsRecord = {
  id: string;
  source: string;
  key: string;
  meaning: string;
  options: Record<DraftsOptionId, string>;
  secondAnswerOptions: string[];
  formClues: string[];
  qualityReasons: string[];
};

type Saved = {
  id: string;
  source: string;
  key: string;
  meaning: string;
  arms: {
    B: {
      options: Record<DraftsOptionId, string>;
      secondAnswerOptions: string[];
      decisionRisks: { whole_set_clue_risk: string[] } | null;
      qualityReasons: string[];
    };
  };
};

/** Reads the stored five. It does not rewrite the file. */
export function loadDraftsRecord(file = draftsRecordPath): DraftsRecord {
  const saved = JSON.parse(readFileSync(path.resolve(file), "utf8")) as Saved;
  return {
    id: saved.id,
    source: saved.source,
    key: saved.key,
    meaning: saved.meaning,
    options: saved.arms.B.options,
    secondAnswerOptions: saved.arms.B.secondAnswerOptions,
    formClues: saved.arms.B.decisionRisks?.whole_set_clue_risk ?? [],
    qualityReasons: saved.arms.B.qualityReasons,
  };
}

/**
 * Shown local defects only.
 * C is eligible because "only afterward" is a concrete claim the source does not make.
 * The polarity reversal is a separate relation change and is not this code.
 * E is eligible because people are not "taken up" for a reading.
 * mechanism_unverified and the overlap labels are not findings.
 */
export function draftsFindings(record: DraftsRecord): RepairFinding[] {
  const fixed = "do not change the source, the key, or options A, B, and D";
  return [
    {
      optionId: "C",
      issueCode: "unsupported_extension",
      evidence: "only afterward",
      preservedMeaning: [
        "Most of the drafts were not taken up for the second reading.",
        "All of the drafts were distributed to the board.",
        "The distribution is the later of the two events.",
      ],
      targetMisreading: "The later marker is read as applying to the distribution, so the board receives the drafts after the second-reading decision.",
      forbiddenChanges: [
        fixed,
        "do not keep only",
        "do not say that most drafts were taken up",
        "do not add an actor or a new event",
        "do not add a second misreading",
      ],
    },
    {
      optionId: "E",
      issueCode: "unnatural_option",
      evidence: "board members were not later taken up for a second reading",
      preservedMeaning: [
        "All of the drafts were distributed to the board.",
        "Most of a set of drafts was not later taken up for the second reading.",
        "That set is not the drafts that were just distributed.",
        "The contrast and the passive clauses stay in place.",
      ],
      targetMisreading: "The pronoun is read as pointing at the board. Do not create a new set of drafts owned by the board. If that shift cannot be written as a natural sentence without a new ownership claim, return repair_not_possible.",
      forbiddenChanges: [
        fixed,
        "do not apply taken up to people",
        "do not invent its own drafts or the board's drafts",
        "do not change the quantity, the negation, or the later time",
        "do not replace distributed or taken up with a new event",
      ],
    },
  ];
}

export function draftsRepairTasks(record = loadDraftsRecord()): RepairTask[] {
  return buildRepairTasks({
    sourceId: record.id,
    source: record.source,
    key: record.key,
    options: record.options,
    itemSignals: record.meaning === "unverified" ? ["unverified"] : [record.meaning],
    findings: draftsFindings(record),
  });
}

export function draftsFixedOptions(record: DraftsRecord): string[] {
  return [record.options.A, record.options.B, record.options.D];
}

/** Two verb changes in the recorded D option. This is not a repair task, and it keeps the five under review. */
export const draftsEditorialRisks = [
  {
    optionId: "D" as const,
    changes: ["distributed → approved", "taken up → reviewed"],
  },
];
