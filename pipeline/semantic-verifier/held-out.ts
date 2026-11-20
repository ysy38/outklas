import { readFileSync } from "node:fs";
import { semanticVerifierRequest, type VerificationInput } from "./contract";

/**
 * Pairs the first live run did not see. Labels are human review references, not expert approval.
 * Texts come from saved records. Nothing here is a new question.
 */
/** A recorded review reference. It is not an independent expert approval. */
export type HeldOutReview = "review_reference";

export type HeldOutItem = {
  id: string;
  origin: "saved_record";
  record: string;
  letter: string;
  questionType: "restatement" | "translation";
  targetLanguage: "tr" | "en" | null;
  source: string;
  option: string;
  humanReview: HeldOutReview;
  /** Review references are not an independent expert approval. */
  expertApproval: false;
  provisional: {
    relation: "equivalent" | "non_equivalent" | "uncertain";
    relationMutation: "yes" | "no" | "uncertain";
    unsupportedExtension: "yes" | "no" | "uncertain";
  };
  reviewNote: string;
};

type Spec = Omit<HeldOutItem, "source" | "option" | "origin" | "humanReview" | "expertApproval">;

const taxonomy = ".data/analysis/_factory/cognitive-trap/taxonomy-live-v1";
const gold = ".data/analysis/_factory/editorial-gold/v1";

const specs: readonly Spec[] = [
  {
    id: "held-editors-all",
    record: `${taxonomy}/taxonomy-restatement-hard.json`,
    letter: "A",
    questionType: "restatement",
    targetLanguage: null,
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
    reviewNote: "Only the two appendices becomes all of the appendices. Provisional quantity mutation. Confirm that no second event is present.",
  },
  {
    id: "held-editors-actual",
    record: `${taxonomy}/taxonomy-restatement-hard.json`,
    letter: "E",
    questionType: "restatement",
    targetLanguage: null,
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
    reviewNote: "The counterfactual release is stated as a completed fact. Provisional actuality mutation.",
  },
  {
    id: "held-tr-en-quantity",
    record: `${taxonomy}/taxonomy-translation-tr_en.json`,
    letter: "D",
    questionType: "translation",
    targetLanguage: "en",
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
    reviewNote: "Only and two drop out of the English option. Provisional quantity mutation, not a new recipient.",
  },
  {
    id: "held-door-cause",
    record: `${gold}/approval-pending/door.json`,
    letter: "A",
    questionType: "restatement",
    targetLanguage: null,
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
    reviewNote: "Even though becomes so. Provisional concession-to-cause mutation. The lock and the signatures stay.",
  },
  {
    id: "held-door-exclusive-use",
    record: `${gold}/approval-pending/door.json`,
    letter: "B",
    questionType: "restatement",
    targetLanguage: null,
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
    reviewNote: "Human review: exclusive use is a relation mutation. It is not an unsupported extension.",
  },
  {
    id: "held-door-later-check",
    record: `${gold}/approval-pending/door.json`,
    letter: "E",
    questionType: "restatement",
    targetLanguage: null,
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "yes" },
    reviewNote: "Human review: the time change is a relation mutation, and the later capacity check is an unsupported extension.",
  },
  {
    id: "held-clinic-purpose",
    record: `${gold}/approval-pending/clinic.json`,
    letter: "D",
    questionType: "translation",
    targetLanguage: "tr",
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "yes" },
    reviewNote: "Human review: the reversed purpose is a relation mutation, and comparing the wards is an unsupported extension.",
  },
  {
    id: "held-snow-during",
    record: `${gold}/approval-pending/snow.json`,
    letter: "C",
    questionType: "translation",
    targetLanguage: "en",
    provisional: { relation: "non_equivalent", relationMutation: "yes", unsupportedExtension: "no" },
    reviewNote: "Before the snow becomes during the snow. Provisional temporal mutation.",
  },
  {
    id: "held-snow-key",
    record: `${gold}/approval-pending/snow.json`,
    letter: "A",
    questionType: "translation",
    targetLanguage: "en",
    provisional: { relation: "equivalent", relationMutation: "no", unsupportedExtension: "no" },
    reviewNote: "This is the stored key. Provisional equivalent paraphrase. It is not editorially accepted, so the label stays open.",
  },
  {
    id: "held-harbor-key",
    record: `${gold}/held/harbor.json`,
    letter: "D",
    questionType: "restatement",
    targetLanguage: null,
    provisional: { relation: "uncertain", relationMutation: "uncertain", unsupportedExtension: "uncertain" },
    reviewNote: "Human review: relation stays uncertain. Do not force equivalence or a confirmed meaning difference.",
  },
];

function readOption(spec: Spec): { source: string; option: string } {
  const data = JSON.parse(readFileSync(spec.record, "utf8")) as {
    source: string;
    key?: string;
    targetKey?: string;
    options?: Record<string, string>;
    arms?: { B: { options: Record<string, string> } };
  };
  const options = data.options ?? data.arms?.B.options;
  const option = options?.[spec.letter];
  if (!data.source || !option) throw new Error(`${spec.record} has no option ${spec.letter}`);
  return { source: data.source, option };
}

export function heldOutItems(): HeldOutItem[] {
  return specs.map((spec) => {
    const loaded = readOption(spec);
    return { ...spec, ...loaded, origin: "saved_record", humanReview: "review_reference", expertApproval: false };
  });
}

export function heldOutInput(item: HeldOutItem): VerificationInput {
  return { source: item.source, option: item.option, questionType: item.questionType, targetLanguage: item.targetLanguage };
}

export function heldOutRequestLeaksReview(item: HeldOutItem): boolean {
  const request = semanticVerifierRequest(heldOutInput(item));
  return request.user.includes(item.reviewNote) || request.system.includes(item.id);
}
