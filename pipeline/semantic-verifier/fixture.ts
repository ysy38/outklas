import { readFileSync } from "node:fs";
import { doorUntilOption, pilotExpectations, type HumanClass, type HumanExpectation } from "./expectations";
import { verificationInput, type VerificationInput } from "./contract";

export type PilotPair = HumanExpectation & {
  questionType: "restatement" | "translation";
  targetLanguage: "tr" | "en" | null;
  source: string;
  option: string;
  /** Stored key, used only for the deterministic comparison. The verifier request does not receive it. */
  key: string;
  record: string;
};

type TrapRecord = {
  questionType: "restatement" | "translation";
  direction: "tr_en" | "en_tr" | null;
  source: string;
  key: string;
  arms: { B: { options: Record<string, string> } };
};

type GoldRecord = {
  questionType?: "restatement" | "translation";
  source: string;
  targetKey: string;
  options: Record<string, string>;
};

const taxonomy = ".data/analysis/_factory/cognitive-trap/taxonomy-live-v1";
const quality = ".data/analysis/_factory/cognitive-trap/quality-v1";
const gold = ".data/analysis/_factory/editorial-gold/v1/approval-pending";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function trap(file: string, letter: string): Pick<PilotPair, "questionType" | "targetLanguage" | "source" | "option" | "key" | "record"> {
  const data = readJson<TrapRecord>(file);
  const option = data.arms.B.options[letter];
  if (!option) throw new Error(`${file} has no option ${letter}`);
  return {
    questionType: data.questionType,
    targetLanguage: data.direction === "tr_en" ? "en" : data.direction === "en_tr" ? "tr" : null,
    source: data.source,
    option,
    key: data.key,
    record: file,
  };
}

function goldPair(file: string, letter: string, questionType: GoldRecord["questionType"], targetLanguage: PilotPair["targetLanguage"]): Pick<PilotPair, "questionType" | "targetLanguage" | "source" | "option" | "key" | "record"> {
  const data = readJson<GoldRecord>(file);
  const option = letter === "key" ? data.targetKey : data.options[letter];
  if (!option || !questionType) throw new Error(`${file} has no option ${letter}`);
  return { questionType, targetLanguage, source: data.source, option, key: data.targetKey, record: file };
}

const loaded: Record<string, Pick<PilotPair, "questionType" | "targetLanguage" | "source" | "option" | "key" | "record">> = {
  "editors-b": trap(`${taxonomy}/taxonomy-restatement-hard.json`, "B"),
  "tr-en-e": trap(`${taxonomy}/taxonomy-translation-tr_en.json`, "E"),
  "ferry-b": trap(`${quality}/quality-restatement-hard.json`, "B"),
  "registry-a": trap(`${taxonomy}/taxonomy-restatement-medium.json`, "A"),
  "registry-b": trap(`${taxonomy}/taxonomy-restatement-medium.json`, "B"),
  "registry-d": trap(`${taxonomy}/taxonomy-restatement-medium.json`, "D"),
  "registry-e": trap(`${taxonomy}/taxonomy-restatement-medium.json`, "E"),
  "door-until-only-after": { ...goldPair(`${gold}/door.json`, "C", "restatement", null), option: doorUntilOption },
  "clinic-completed-opening": goldPair(`${gold}/clinic.json`, "A", "translation", "tr"),
  "door-equivalent-key": goldPair(`${gold}/door.json`, "key", "restatement", null),
  "clinic-equivalent-key": goldPair(`${gold}/clinic.json`, "key", "translation", "tr"),
};

export function pilotPairs(): PilotPair[] {
  return pilotExpectations.map((expectation) => {
    const row = loaded[expectation.id];
    if (!row) throw new Error(`no saved text for ${expectation.id}`);
    return { ...expectation, ...row };
  });
}

export function verifierInputOf(pair: PilotPair): VerificationInput {
  return verificationInput({
    source: pair.source,
    option: pair.option,
    questionType: pair.questionType,
    targetLanguage: pair.targetLanguage,
  });
}

export function pairsByClass(pairs: readonly PilotPair[], humanClass: HumanClass): PilotPair[] {
  return pairs.filter((pair) => pair.humanClass === humanClass);
}
