import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { assessKey, assessMeaningIntegrity, type MeaningIntegrity } from "./core";
import type { DistractorCandidate, ItemCore, ItemSource } from "./contract";
import { restatementModel, translationModel } from "./registry";
import { refuseStudentBankWrite } from "./gold";

/** This comparison is not a new factory and not a benchmark authorization. */
export const trapAuthorization = "cognitive-trap-v1";
export const trapMaxCostUsd = 1;
export const trapRetry = 0;

/**
 * Abstract patterns from six restatement and six translation items in the accepted DNA set.
 * Booklet ids are locators. Official wording is not stored here and is not a prompt.
 * These labels are not quotas and are not a measured frequency.
 */
export const misreadingPatterns = [
  { id: "rank_scope", seenIn: ["yds-2018:69"], tempting: "A member of an extreme set is read as the unique extreme.", stillWrong: "The source ranks the item inside a set, not as the only member." },
  { id: "identity_swap", seenIn: ["yds-2018:69"], tempting: "A date or a material is read as the thing being identified.", stillWrong: "The date and the material stay attributes of a different object." },
  { id: "causal_reversal", seenIn: ["yds-2018:71", "yds-2018:38"], tempting: "Two adjacent events are easy to retell with the result as the cause.", stillWrong: "The source keeps one direction; the reverse is a different claim." },
  { id: "entitlement_vs_possibility", seenIn: ["yds-2018-2:68"], tempting: "A right is easy to hear as what someone might do.", stillWrong: "Permission or entitlement is not the same as a mere possibility." },
  { id: "condition_on_wrong_event", seenIn: ["yds-2018-2:68"], tempting: "The fatal outcome is in the sentence, so it can be attached to the treatment instead of the refusal.", stillWrong: "The condition qualifies the refusal, not the intervention." },
  { id: "belief_holder_swap", seenIn: ["yds-2018-2:69"], tempting: "Both a positive and a negative view are present, so the holders can trade places.", stillWrong: "Who holds which view is part of the claim." },
  { id: "quantifier_widening", seenIn: ["yds-2018-2:69", "yds-2023-10:68"], tempting: "A statement about some members is retold as a statement about the class.", stillWrong: "The narrower quantity is not the whole class, and a possibility is not a completed fact." },
  { id: "certainty_softening", seenIn: ["yds-2018:39", "yds-2023-10:68"], tempting: "A reported finding is easy to weaken into a possibility or a question.", stillWrong: "The source states the finding; it does not leave it open." },
  { id: "relation_direction", seenIn: ["yds-2018:38", "yds-2018:40"], tempting: "A temporal or conditional link is easy to retell as a because-clause in the other direction.", stillWrong: "The connector assigns the cause, the result, or the condition." },
  { id: "adjunct_attachment", seenIn: ["yds-2018-2:39"], tempting: "An added circumstance can be read as the cause of the other circumstance.", stillWrong: "Accompanying is not causing." },
  { id: "evidence_on_wrong_clause", seenIn: ["yds-2018-2:41"], tempting: "The word evidence is in the sentence, so it can attach to the nearer clause.", stillWrong: "The evidence supports one clause; moving it makes a different claim." },
  { id: "purpose_vs_means", seenIn: ["yds-2024-11:40"], tempting: "Two requirements can collapse into one means, or a purpose can be retold as a byproduct.", stillWrong: "What is required and what that requirement is for stay distinct." },
  { id: "near_paraphrase_not_error", seenIn: ["yds-2018:40", "yds-2024-11:40", "yds-2024-11:41"], tempting: "A different word order looks like a different answer.", stillWrong: "Word order or a natural paraphrase is not proof that the option is wrong. A DNA syntactic label is not verified wrongness." },
] as const;

export const patternUse = "catalog_only_not_a_quota" as const;

const analysisExcluded = [
  "yds-2018:37",
  "yds-2018:70",
  "yds-2018-2:70",
  "yds-2023-10:39",
  "yds-2023-10:42",
  "yds-2023-10:71",
  "yds-2024-11:39",
] as const;

export const analysisNotes = {
  restatementExamined: 6,
  translationExamined: 6,
  translationDirections: ["en_tr", "tr_en"],
  excludedFromPatternEvidence: analysisExcluded,
  exclusionReason: "A truncated option or OCR residue is not a misreading pattern. DNA labels were not treated as verified wrongness.",
  studentPrevalence: "unmeasured",
} as const;

export type TrapItem = {
  id: string;
  questionType: "restatement" | "translation";
  direction: "en_tr" | "tr_en" | null;
  source: ItemSource;
  core: ItemCore;
  /** Editorial notes. Prompt builders must not receive this field. */
  preservedRelations: string[];
  /** Requested band for this item. Absent means the sample has no design target. It is not an estimate or a measurement. */
  designTarget?: "medium" | "hard" | null;
};

function core(promptVersion: string, stem: string, answer: string, reference: string): ItemCore {
  return {
    stem,
    correctAnswer: answer,
    constructEvidence: "Actors, quantity, modality, polarity and the link between clauses stay in place.",
    correctnessRationale: "Fixed before either distractor method. A clean checker result is unverified, not proof.",
    sourceReferences: [reference],
    modelVersion: "fixed-before-distractors",
    promptVersion,
    meaningDelta: "preserved",
  };
}

/** Six original items. The same source and key are given to both methods. */
export function trapItems(): TrapItem[] {
  const coaches = "While some coaches treat match footage as a waste of practice time, certain drills can train one specific skill, such as shortening a goalkeeper's reaction.";
  const coachesKey = "Certain drills can train one specific skill, such as shortening a goalkeeper's reaction, but some coaches treat match footage as a waste of practice time.";
  const survey = "Had the inspectors finished the coastal survey earlier, the harbor would not have needed to request a delay.";
  const surveyKey = "The harbor would not have needed to request a delay if the inspectors had finished the coastal survey earlier.";
  const illness = "Although the biological pattern of the illness stays the same across regions, clear records show that the way patients describe pain varies sharply.";
  const illnessKey = "Clear records show that the way patients describe pain varies sharply, although the biological pattern of the illness stays the same across regions.";
  const tonic = "Although the researchers found no trace that the tonic improved memory, they did not exclude a slower loss of attention among older patients.";
  const tonicKey = "Araştırmacılar toniğin hafızayı iyileştirdiğine dair bir iz bulamadılar, ancak yaşlı hastalarda dikkat kaybının daha yavaş gerçekleşmesini dışlamadılar.";
  const wards = "Although the clinic could have opened all four wards, the director asked that the two damaged wards be repaired first so that patients would not move twice.";
  const wardsKey = "Klinik dört servisin tamamını açabilirdi, ama müdür hasarlı iki servisin önce onarılmasını istedi; amaç hastaların iki kez yer değiştirmemesiydi.";
  const meeting = "Toplantıdan önce her katılımcı kendi notunu okudu, ama yalnızca iki katılımcı soru sordu.";
  const meetingKey = "Before the meeting, every participant read their own note, but only two participants asked a question.";
  return [
    {
      id: "restatement-1",
      questionType: "restatement",
      direction: null,
      preservedRelations: ["concession", "some coaches versus certain drills", "one specific skill"],
      source: { kind: "restatement", proposition: coaches, frame: { scope: "some coaches and certain drills", modality: "stated", polarity: "affirmative", tense: "present", argumentStructure: "A concession: some coaches dismiss footage, while certain drills train one skill." } },
      core: core(restatementModel.promptVersion, coaches, coachesKey, "proposition"),
    },
    {
      id: "restatement-2",
      questionType: "restatement",
      direction: null,
      preservedRelations: ["counterfactual", "earlier survey prevents the delay request", "negative result"],
      source: { kind: "restatement", proposition: survey, frame: { scope: "the harbor delay", modality: "counterfactual", polarity: "negative", tense: "past_perfect_before_conditional", argumentStructure: "An earlier survey would have removed the need to request a delay." } },
      core: core(restatementModel.promptVersion, survey, surveyKey, "proposition"),
    },
    {
      id: "restatement-3",
      questionType: "restatement",
      direction: null,
      preservedRelations: ["concession", "biology stable across regions", "records attach to pain description"],
      source: { kind: "restatement", proposition: illness, frame: { scope: "the illness across regions", modality: "stated", polarity: "affirmative", tense: "present", argumentStructure: "Biology stays stable across regions; the records concern how patients describe pain." } },
      core: core(restatementModel.promptVersion, illness, illnessKey, "proposition"),
    },
    {
      id: "translation-en_tr-1",
      questionType: "translation",
      direction: "en_tr",
      preservedRelations: ["no trace of memory improvement", "attention loss not excluded", "older patients", "concession"],
      source: { kind: "translation", sourceSentence: tonic, sourceLanguage: "en", targetLanguage: "tr", roles: ["researchers"], scope: "memory trace and attention loss" },
      core: core(translationModel.promptVersion, tonic, tonicKey, "source_sentence"),
    },
    {
      id: "translation-en_tr-2",
      questionType: "translation",
      direction: "en_tr",
      preservedRelations: ["could have opened all four", "two damaged wards first", "purpose of avoiding two moves"],
      source: { kind: "translation", sourceSentence: wards, sourceLanguage: "en", targetLanguage: "tr", roles: ["director"], scope: "four wards, two repaired first" },
      core: core(translationModel.promptVersion, wards, wardsKey, "source_sentence"),
    },
    {
      id: "translation-tr_en-1",
      questionType: "translation",
      direction: "tr_en",
      preservedRelations: ["every participant read a note", "only two asked a question", "sequence before the meeting"],
      source: { kind: "translation", sourceSentence: meeting, sourceLanguage: "tr", targetLanguage: "en", roles: ["participants"], scope: "every participant, only two questions" },
      core: core(translationModel.promptVersion, meeting, meetingKey, "source_sentence"),
    },
  ];
}

export type KeyGate = { id: string; eligible: boolean; failures: string[]; meaning: MeaningIntegrity };

/** A failed or ambiguous key is dropped. Nothing is added to replace it. */
export function selectEligible(items: readonly TrapItem[]): { kept: TrapItem[]; dropped: KeyGate[] } {
  const kept: TrapItem[] = [];
  const dropped: KeyGate[] = [];
  for (const item of items) {
    const model = item.questionType === "restatement" ? restatementModel : translationModel;
    const assessment = assessKey(model, item.source, item.core);
    const failures = [...assessment.failures, ...assessment.meaning.failures];
    if (!assessment.valid || assessment.meaning.status === "fail") dropped.push({ id: item.id, eligible: false, failures, meaning: assessment.meaning });
    else kept.push(item);
  }
  return { kept, dropped };
}

export function sourceSentence(item: TrapItem): string {
  if (item.source.kind === "translation") return item.source.sourceSentence;
  if (item.source.kind === "restatement") return item.source.proposition;
  return "";
}

const contentTokens = (text: string) =>
  text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

const discourseConnectors = new Set(["and", "but", "although", "though", "yet", "while", "ama", "fakat", "ancak", "ve"]);

/** Same words with only a discourse connector changed. That is not automatically wrong and not automatically a second key. */
export function discourseConnectorSwap(left: string, right: string): boolean {
  const marked = (text: string) => contentTokens(text).map((token) => (discourseConnectors.has(token) ? "#" : token));
  return marked(left).join(" ") === marked(right).join(" ") && contentTokens(left).join(" ") !== contentTokens(right).join(" ");
}

/** One inserted, deleted, or substituted word. A full clause rewrite is not this. Selector may still keep a one-word edit when assessMeaningIntegrity fails. */
export function surfaceEdit(key: string, candidate: string): boolean {
  const left = contentTokens(key);
  const right = contentTokens(candidate);
  if (!left.length || !right.length) return false;
  if (left.join(" ") === right.join(" ")) return true;
  const count = (list: string[]) => {
    const map = new Map<string, number>();
    for (const token of list) map.set(token, (map.get(token) ?? 0) + 1);
    return map;
  };
  const a = count(left);
  const b = count(right);
  let delta = 0;
  for (const token of new Set([...a.keys(), ...b.keys()])) delta += Math.abs((a.get(token) ?? 0) - (b.get(token) ?? 0));
  return delta <= 2;
}

export function layoutOptions(key: string, wrongs: readonly string[], keySlot: number): { options: Record<OptionLabel, string>; keyLetter: OptionLabel } {
  const slot = ((keySlot % optionLabels.length) + optionLabels.length) % optionLabels.length;
  const options = {} as Record<OptionLabel, string>;
  let cursor = 0;
  for (let index = 0; index < optionLabels.length; index += 1) {
    const label = optionLabels[index]!;
    options[label] = index === slot ? key : (wrongs[cursor++] ?? "");
  }
  return { options, keyLetter: optionLabels[slot]! };
}

export function trapCallGraph(itemCount: number): { writerCalls: number; judgeCalls: number; maxCalls: number } {
  const writerCalls = itemCount * 3;
  const judgeCalls = itemCount * 2;
  return { writerCalls, judgeCalls, maxCalls: writerCalls + judgeCalls };
}

/**
 * The model verdict is ignored. Integration stays off in this experiment.
 * A proposal is only a later recommendation, and only after editorial winners exist.
 */
export function recommendIntegration(input: { winners: readonly ("A" | "B" | "tie" | "unjudged")[]; editorialPasses: number }): { integrate: false; propose: "B" | null; reason: string } {
  const judged = input.winners.filter((winner) => winner !== "unjudged");
  const bWins = input.winners.filter((winner) => winner === "B").length;
  if (judged.length < input.winners.length || input.winners.length < 1) return { integrate: false, propose: null, reason: "editorial comparison is incomplete" };
  if (bWins >= 4 && input.winners.length >= 6 && input.editorialPasses >= 2) return { integrate: false, propose: "B", reason: "editorial threshold met for a later proposal; this run does not integrate it" };
  return { integrate: false, propose: null, reason: "evidence insufficient" };
}

export function assertTrapOutput(outDir: string): void {
  refuseStudentBankWrite(outDir);
}

export function distractorRationale(candidate: DistractorCandidate): { text: string; mechanism: string; whyPlausible: string; whyInferior: string; shiftTarget: string; semanticRisk: string } {
  return {
    text: candidate.candidateText,
    mechanism: candidate.errorMechanism,
    whyPlausible: candidate.whyPlausible,
    whyInferior: candidate.whyInferior,
    shiftTarget: candidate.shiftTarget,
    semanticRisk: candidate.semanticRisk,
  };
}
