import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { skillTree } from "@/modules/knowledge/skills";
import { errorClassFromFactory, isErrorClass, lessonGaps, type ErrorClass, type Lesson } from "@/modules/content/lesson";
import { publishBlockers, type PublishDraft } from "@/modules/content/publish";
import { ydsBlueprint, type Layout, type SectionId } from "@/modules/exam/blueprint";
import { legacyMap, sectionSlug } from "@/modules/knowledge/seed";
import { skillLinkRows } from "@/modules/learning/mastery";
import { buildSentenceLesson } from "@/modules/content/xray";
import type { GeneratedQuestionCandidate } from "./candidate";
import {
  currentVersion,
  isVerifiedHumanReviewer,
  type CandidateRecord,
  type CandidateStatus,
  type ReviewEntry,
} from "./review";
import type { QuestionSpec } from "./spec";
import { factoryVersions } from "./versions";

export const bankImportItemPrefix = "factory-import-";
export const bankImportSlotBase = 8000;

const bandDifficulty = { easy: 2, medium: 3, hard: 4 } as const;

export type BankImportMode = "dry-run" | "apply";

export type BankImportSource = {
  sourceKey: string;
  record: CandidateRecord;
  /** Item-model flags. Absent on the sentence_completion factory path. false blocks import. */
  meaningProven?: boolean;
  qualityAccepted?: boolean;
};

export type BankImportChoice = {
  letter: OptionLabel;
  body: string;
  correct: boolean;
  distractorType: string | null;
  errorClass: ErrorClass | null;
  whyWrong: string;
  whyPlausible: string | null;
};

export type BankImportPayload = {
  itemId: string;
  slot: number;
  exam: QuestionSpec["exam"];
  questionType: QuestionSpec["questionType"];
  questionFamily: QuestionSpec["questionFamily"];
  section: SectionId;
  layout: Layout;
  stem: string;
  stimulus: string | null;
  explanation: string;
  targetBand: keyof typeof bandDifficulty;
  difficulty: number;
  skillIds: string[];
  choices: BankImportChoice[];
  lesson: Lesson;
  provenance: {
    sourceKey: string;
    specId: string;
    pipelineVersion: string;
    knowledgeVersion: string;
    generatorModel: string;
    judgeModel: string;
    generatorPromptVersion: string;
    judgePromptVersion: string;
    reviewer: string;
    approvedAt: string;
    appliesToVersion: number;
    reviewVersion: string;
  };
};

export type BankItemWrite = {
  item: {
    id: string;
    slot: number;
    section: SectionId;
    layout: Layout;
    direction: null;
    stem: string;
    explanation: string;
    difficulty: number;
    status: "published";
    stimulusId: null;
    lesson: Lesson;
  };
  choices: {
    id: string;
    itemId: string;
    position: number;
    body: string;
    correct: boolean;
    distractorType: string | null;
    errorClass: string | null;
  }[];
  skills: ReturnType<typeof skillLinkRows>;
};

export type BankImportDecision = {
  sourceKey: string;
  itemId: string;
  eligible: boolean;
  reason: string | null;
  payload?: BankImportPayload;
};

export type BankWriter = {
  hasItem(id: string): Promise<boolean>;
  write(payload: BankItemWrite): Promise<void>;
};

export type BankImportReport = {
  mode: BankImportMode;
  at: string;
  writes: number;
  eligible: number;
  skipped: number;
  blocked: number;
  rows: BankImportDecision[];
  preservedFields: string[];
  pendingHumanApprovals: string[];
  qualityHolds: string[];
};

export const bankImportPreservedFields = [
  "questionType",
  "exam",
  "stem",
  "stimulus",
  "options",
  "correctOption",
  "targetBand",
  "difficulty",
  "primarySkill",
  "secondarySkills",
  "choices.errorClass",
  "choices.distractorType",
  "choices.whyWrong",
  "explanation",
  "lesson",
  "provenance",
] as const;

const sectionByQuestionType = new Map(legacyMap.filter((row) => row.kind === "section").map((row) => [row.node, row.id as SectionId]));

export function bankImportItemId(sourceKey: string): string {
  const safe = sourceKey.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safe) throw new Error("bank import sourceKey is empty");
  return `${bankImportItemPrefix}${safe}`;
}

export function bankImportChoiceId(itemId: string, position: number): string {
  return `${itemId}-c${position}`;
}

/** Practice-pool slot outside mock 1–80, pack 201+, and factory 301+. Stable for a sourceKey. */
export function bankImportSlot(sourceKey: string): number {
  let hash = 2166136261;
  for (const char of sourceKey) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return bankImportSlotBase + ((hash >>> 0) % 1000);
}

function reject(sourceKey: string, reason: string): BankImportDecision {
  return { sourceKey, itemId: bankImportItemId(sourceKey), eligible: false, reason };
}

function humanApprove(record: CandidateRecord): ReviewEntry | null {
  const latest = currentVersion(record)?.version;
  if (latest == null) return null;
  const latestHumanOnVersion = [...record.reviews]
    .reverse()
    .find((entry) => entry.appliesToVersion === latest && isVerifiedHumanReviewer(entry.reviewer));
  if (!latestHumanOnVersion || latestHumanOnVersion.decision !== "APPROVE") return null;
  return latestHumanOnVersion;
}

function hasUnverifiedApprove(record: CandidateRecord): boolean {
  const latest = currentVersion(record)?.version;
  if (latest == null) return false;
  return record.reviews.some(
    (entry) =>
      entry.decision === "APPROVE" &&
      entry.appliesToVersion === latest &&
      !isVerifiedHumanReviewer(entry.reviewer),
  );
}

export function studentSkills(spec: QuestionSpec, section: SectionId): string[] {
  const wanted = [spec.targetSkill, spec.cognitiveSkill];
  const found: string[] = [];
  for (const node of wanted) {
    const hits = legacyMap
      .filter((row) => row.kind === "skill" && row.node === node)
      .sort((a, b) => Number(a.match !== "exact") - Number(b.match !== "exact"));
    for (const hit of hits) {
      if (found.includes(hit.id)) continue;
      const skill = skillTree.find((row) => row.id === hit.id);
      if (!skill) continue;
      const root = skill.parentId ?? skill.id;
      if (root !== section && skill.id !== section) continue;
      found.push(hit.id);
    }
  }
  return found;
}

function distractorTypeForBank(factoryType: string): string {
  const exact = legacyMap.find((row) => row.kind === "distractor" && row.node === factoryType && row.match === "exact");
  return exact?.id ?? factoryType;
}

function targetBandOf(record: CandidateRecord): keyof typeof bandDifficulty | null {
  const approved = currentVersion(record)?.candidate.metadata.approvedBand;
  if (approved && approved in bandDifficulty) return approved;
  const specBand = record.spec.difficulty.band;
  return specBand in bandDifficulty ? specBand : null;
}

function lessonFor(record: CandidateRecord, candidate: GeneratedQuestionCandidate): Lesson {
  const latestVersion = currentVersion(record)?.version ?? 1;
  if (latestVersion === 1 && record.lesson) return record.lesson;
  return buildSentenceLesson({
    stem: candidate.question.stem,
    options: candidate.question.options,
    correct: candidate.correctOption,
    relation: record.spec.discourseRelation?.split(":").pop() ?? null,
    explanation: candidate.explanation,
    rationales: candidate.distractorRationales.map((entry) => ({
      option: entry.option,
      distractorType: entry.distractorType,
      whyPlausible: entry.whyPlausible,
      whyWrong: entry.whyWrong,
    })),
  });
}

function layoutFor(section: SectionId, spec: QuestionSpec): Layout | null {
  const fromBlueprint = ydsBlueprint.bands.find((band) => band.section === section)?.layout;
  if (spec.structuralFormat === "sentence_stem_completion" || spec.structuralFormat === "sentence_blank") return fromBlueprint ?? "blank";
  return null;
}

export function toBankItemWrite(payload: BankImportPayload): BankItemWrite {
  return {
    item: {
      id: payload.itemId,
      slot: payload.slot,
      section: payload.section,
      layout: payload.layout,
      direction: null,
      stem: payload.stem,
      explanation: payload.explanation,
      difficulty: payload.difficulty,
      status: "published",
      stimulusId: null,
      lesson: payload.lesson,
    },
    choices: payload.choices.map((choice, position) => ({
      id: bankImportChoiceId(payload.itemId, position),
      itemId: payload.itemId,
      position,
      body: choice.body,
      correct: choice.correct,
      distractorType: choice.distractorType,
      errorClass: choice.errorClass,
    })),
    skills: skillLinkRows(payload.itemId, payload.skillIds),
  };
}

export function evaluateBankImport(source: BankImportSource): BankImportDecision {
  const sourceKey = source.sourceKey.trim();
  if (!sourceKey) return { sourceKey: "", itemId: "", eligible: false, reason: "sourceKey yok." };
  const { record } = source;
  if (source.meaningProven === false || source.qualityAccepted === false) {
    return reject(sourceKey, "meaningProven/qualityAccepted false olan deneysel item-model çıktısı içe aktarılmaz.");
  }
  if (record.spec.questionType !== "question_type:sentence_completion") {
    return reject(sourceKey, `yalnızca sentence_completion içe aktarılır (${record.spec.questionType}).`);
  }
  if (record.status !== "approved") {
    return reject(sourceKey, `aday durumu approved değil (${record.status}).`);
  }
  const review = humanApprove(record);
  if (!review) {
    return reject(
      sourceKey,
      hasUnverifiedApprove(record)
        ? "REVIEW_PROVENANCE_UNVERIFIED: doğrulanmış insan APPROVE kaydı yok."
        : "factory.reviews üzerinde doğrulanmış insan APPROVE kaydı yok.",
    );
  }
  const latest = currentVersion(record);
  if (!latest) return reject(sourceKey, "aday sürümü yok.");
  if (latest.validation.status !== "pass") return reject(sourceKey, "son sürüm validator geçmedi.");
  const candidate = latest.candidate;
  const section = sectionByQuestionType.get(record.spec.questionType);
  if (!section) return reject(sourceKey, "soru türü öğrenci bölümüne bağlanamıyor.");
  const layout = layoutFor(section, record.spec);
  if (!layout) return reject(sourceKey, "yerleşim öğrenci layout'una bağlanamıyor.");
  const skillIds = studentSkills(record.spec, section);
  if (skillIds.length === 0) return reject(sourceKey, "birincil beceri mevcut taxonomy üzerinden bulunamadı.");
  const band = targetBandOf(record);
  if (!band) return reject(sourceKey, "hedef zorluk bandı yok.");
  const letters = optionLabels;
  if (letters.some((letter) => !candidate.question.options[letter]?.trim())) {
    return reject(sourceKey, "beş seçenek eksiksiz değil; sessizce tamamlanmaz.");
  }
  if (!candidate.explanation.trim() || candidate.explanation.trim().length < 12) {
    return reject(sourceKey, "doğru cevap açıklaması eksik; sessizce tamamlanmaz.");
  }
  const wrongLetters = letters.filter((letter) => letter !== candidate.correctOption);
  const byRationale = new Map(candidate.distractorRationales.map((entry) => [entry.option, entry]));
  const choices: BankImportChoice[] = [];
  for (const letter of letters) {
    const body = candidate.question.options[letter].trim();
    const correct = letter === candidate.correctOption;
    if (correct) {
      choices.push({ letter, body, correct: true, distractorType: null, errorClass: null, whyWrong: "", whyPlausible: null });
      continue;
    }
    const rationale = byRationale.get(letter);
    if (!rationale || !rationale.whyWrong.trim() || !rationale.distractorType.trim()) {
      return reject(sourceKey, `${letter} çeldirici açıklaması veya tipi eksik; sessizce tamamlanmaz.`);
    }
    const errorClass = errorClassFromFactory(rationale.distractorType);
    if (!isErrorClass(errorClass)) {
      return reject(sourceKey, `${letter} error_class mevcut haritadan üretilemedi; uydurulmaz.`);
    }
    choices.push({
      letter,
      body,
      correct: false,
      distractorType: distractorTypeForBank(rationale.distractorType),
      errorClass,
      whyWrong: rationale.whyWrong.trim(),
      whyPlausible: rationale.whyPlausible.trim() || null,
    });
  }
  if (wrongLetters.some((letter) => !byRationale.has(letter))) {
    return reject(sourceKey, "yanlış seçeneklerin çeldirici kayıtları eksik; sessizce tamamlanmaz.");
  }
  const draft: PublishDraft = {
    stem: candidate.question.stem,
    explanation: candidate.explanation,
    difficulty: bandDifficulty[band],
    skillIds,
    layout,
    choices: choices.map((choice) => ({
      body: choice.body,
      correct: choice.correct,
      distractorType: choice.distractorType,
    })),
  };
  const blockers = publishBlockers(draft);
  if (blockers.length > 0) return reject(sourceKey, `publishBlockers: ${blockers.join(" ")}`);
  const lesson = lessonFor(record, candidate);
  const gaps = lessonGaps(lesson);
  if (gaps.filter.length > 0) return reject(sourceKey, `Lesson süzgeci: ${gaps.filter.join(" ")}`);
  const payload: BankImportPayload = {
    itemId: bankImportItemId(sourceKey),
    slot: bankImportSlot(sourceKey),
    exam: record.spec.exam,
    questionType: record.spec.questionType,
    questionFamily: record.spec.questionFamily,
    section,
    layout,
    stem: candidate.question.stem,
    stimulus: null,
    explanation: candidate.explanation,
    targetBand: band,
    difficulty: bandDifficulty[band],
    skillIds,
    choices,
    lesson,
    provenance: {
      sourceKey,
      specId: record.spec.id,
      pipelineVersion: record.provenance.pipelineVersion,
      knowledgeVersion: record.provenance.knowledgeVersion,
      generatorModel: record.provenance.generatorModel,
      judgeModel: record.provenance.judgeModel,
      generatorPromptVersion: record.provenance.generatorPromptVersion,
      judgePromptVersion: record.provenance.judgePromptVersion,
      reviewer: review.reviewer,
      approvedAt: review.at,
      appliesToVersion: review.appliesToVersion,
      reviewVersion: review.reviewVersion,
    },
  };
  return { sourceKey, itemId: payload.itemId, eligible: true, reason: null, payload };
}

export function memoryBankWriter(options: { failOnWrite?: boolean; seed?: BankItemWrite[] } = {}): BankWriter & {
  items: Map<string, BankItemWrite["item"]>;
  choices: BankItemWrite["choices"];
  skills: BankItemWrite["skills"];
} {
  const items = new Map<string, BankItemWrite["item"]>();
  const choices: BankItemWrite["choices"] = [];
  const skills: BankItemWrite["skills"] = [];
  for (const row of options.seed ?? []) {
    items.set(row.item.id, row.item);
    choices.push(...row.choices);
    skills.push(...row.skills);
  }
  return {
    items,
    choices,
    skills,
    async hasItem(id) {
      return items.has(id);
    },
    async write(payload) {
      const itemSnapshot = new Map(items);
      const choiceSnapshot = [...choices];
      const skillSnapshot = [...skills];
      try {
        items.set(payload.item.id, payload.item);
        choices.push(...payload.choices);
        if (options.failOnWrite) throw new Error("forced import failure");
        skills.push(...payload.skills);
      } catch (error) {
        items.clear();
        for (const [id, item] of itemSnapshot) items.set(id, item);
        choices.length = 0;
        choices.push(...choiceSnapshot);
        skills.length = 0;
        skills.push(...skillSnapshot);
        throw error;
      }
    },
  };
}

export async function importBankCandidates(input: {
  sources: BankImportSource[];
  mode?: BankImportMode;
  writer?: BankWriter;
  existingItemIds?: Iterable<string>;
}): Promise<BankImportReport> {
  const mode: BankImportMode = input.mode ?? "dry-run";
  const existing = new Set(input.existingItemIds ?? []);
  const rows: BankImportDecision[] = [];
  let writes = 0;
  for (const source of input.sources) {
    const decision = evaluateBankImport(source);
    if (!decision.eligible || !decision.payload) {
      rows.push(decision);
      continue;
    }
    const already = existing.has(decision.itemId) || (mode === "apply" && input.writer ? await input.writer.hasItem(decision.itemId) : false);
    if (already) {
      rows.push({ ...decision, eligible: false, reason: "aynı kaynak daha önce aktarılmış.", payload: undefined });
      continue;
    }
    if (mode === "apply") {
      if (!input.writer) throw new Error("apply requires a bank writer");
      await input.writer.write(toBankItemWrite(decision.payload));
      existing.add(decision.itemId);
      writes += 1;
    }
    rows.push(decision);
  }
  const blocked = rows.filter((row) => !row.eligible && row.reason !== "aynı kaynak daha önce aktarılmış.");
  const skipped = rows.filter((row) => row.reason === "aynı kaynak daha önce aktarılmış.");
  const eligible = rows.filter((row) => row.eligible);
  return {
    mode,
    at: new Date().toISOString(),
    writes: mode === "apply" ? writes : 0,
    eligible: eligible.length,
    skipped: skipped.length,
    blocked: blocked.length,
    rows,
    preservedFields: [...bankImportPreservedFields],
    pendingHumanApprovals: blocked.filter((row) => row.reason?.includes("APPROVE")).map((row) => row.sourceKey),
    qualityHolds: blocked.filter((row) => row.reason && !row.reason.includes("APPROVE") && row.reason !== "aynı kaynak daha önce aktarılmış.").map((row) => `${row.sourceKey}: ${row.reason}`),
  };
}

export type FactoryReviewRow = {
  decision: ReviewEntry["decision"];
  reviewer: string;
  appliesToVersion: number;
  notes?: string;
  at: string;
  reviewVersion?: string;
};

export type FactoryCandidateRow = {
  candidateId: string;
  spec: QuestionSpec;
  status: CandidateStatus;
  provenance: CandidateRecord["provenance"];
  versions: CandidateRecord["versions"];
  reviews: FactoryReviewRow[];
  judge?: CandidateRecord["judge"];
  lesson?: Lesson;
  meaningProven?: boolean;
  qualityAccepted?: boolean;
};

/** Minimum adapter from factory.candidates + factory.reviews + candidate_versions onto the existing CandidateRecord. */
export function sourceFromFactoryRow(row: FactoryCandidateRow): BankImportSource {
  const record: CandidateRecord = {
    id: row.candidateId,
    spec: row.spec,
    versions: row.versions,
    judge: row.judge ?? null,
    provenance: row.provenance,
    reviews: row.reviews.map((review) => ({
      reviewVersion: (review.reviewVersion as typeof factoryVersions.review) ?? factoryVersions.review,
      decision: review.decision,
      reviewer: review.reviewer,
      appliesToVersion: review.appliesToVersion,
      notes: review.notes ?? "",
      at: review.at,
    })),
    status: row.status,
    ...(row.lesson ? { lesson: row.lesson } : {}),
  };
  return {
    sourceKey: row.candidateId,
    record,
    ...(row.meaningProven === undefined ? {} : { meaningProven: row.meaningProven }),
    ...(row.qualityAccepted === undefined ? {} : { qualityAccepted: row.qualityAccepted }),
  };
}
