import { optionLabels, type OptionLabel } from "@/modules/analysis/contract";
import { errorClassFromFactory, lessonGaps, type ErrorClass, type Lesson } from "@/modules/content/lesson";
import { buildSentenceLesson } from "@/modules/content/xray";
import { evaluateBankImport, studentSkills, type BankImportDecision } from "./bank-import";
import {
  applyReview,
  currentVersion,
  editorialRiskFlags,
  isVerifiedHumanReviewer,
  type CandidateRecord,
  type ReviewEntry,
} from "./review";
import type { difficultyBands } from "./spec";
type DifficultyBand = (typeof difficultyBands)[number];
import { validateCandidate } from "./validator";

export type EditorialDecision = "APPROVE" | "REVISE" | "REJECT";

export type EditorialView = {
  candidateId: string;
  version: number;
  status: CandidateRecord["status"];
  stem: string;
  options: Record<OptionLabel, string>;
  correctOption: OptionLabel;
  explanation: string;
  judge: CandidateRecord["judge"];
  riskFlags: string[];
  validation: ReturnType<typeof currentVersion>["validation"];
  lesson: Lesson;
  lessonGaps: ReturnType<typeof lessonGaps>;
  distractors: {
    letter: OptionLabel;
    body: string;
    distractorType: string;
    errorClass: ErrorClass | null;
    whyPlausible: string;
    whyWrong: string;
  }[];
  skills: {
    targetSkill: string;
    cognitiveSkill: string;
    studentSkillIds: string[];
  };
  difficulty: {
    specBand: DifficultyBand;
    approvedBand: DifficultyBand | null;
    cefr: string;
  };
  reviews: (ReviewEntry & { verifiedHuman: boolean })[];
  dryRunDecision: BankImportDecision;
};

export function submitEditorialReview(
  record: CandidateRecord,
  input: {
    decision: EditorialDecision;
    adminEmail: string;
    notes: string;
    band?: DifficultyBand;
    at?: string;
    sourceKey?: string;
  },
): { record: CandidateRecord; entry: ReviewEntry; dryRunDecision: BankImportDecision } {
  const email = input.adminEmail.trim();
  if (!email) throw new Error("Kimliği doğrulanmış admin kullanıcısı gerekli.");
  const notes = input.notes.trim();
  if (!notes) throw new Error("Karar gerekçesi (notes) zorunludur.");

  const reviewer = `admin:${email}`;
  const at = input.at ?? new Date().toISOString();
  const latest = currentVersion(record);
  if (!latest) throw new Error("Aday sürümü bulunamadı.");

  // Re-run deterministic validator on latest candidate before applying review
  const validation = validateCandidate({ spec: record.spec, candidate: latest.candidate });
  const revalidatedRecord: CandidateRecord = {
    ...record,
    versions: record.versions.map((v, idx) =>
      idx === record.versions.length - 1 ? { ...v, validation } : v,
    ),
  };

  const updated = applyReview(revalidatedRecord, {
    decision: input.decision,
    reviewer,
    notes,
    at,
    band: input.band,
  });

  const sourceKey = input.sourceKey ?? record.id;
  const dryRunDecision = evaluateBankImport({ sourceKey, record: updated });
  if (input.decision === "APPROVE" && !dryRunDecision.eligible) {
    throw new Error(`Kalite/yayın kapısı geçilemedi: ${dryRunDecision.reason}`);
  }

  const entry = updated.reviews[updated.reviews.length - 1]!;
  return { record: updated, entry, dryRunDecision };
}

export function buildEditorialView(record: CandidateRecord, sourceKey?: string): EditorialView {
  const latest = currentVersion(record);
  if (!latest) throw new Error(`Aday sürümü yok: ${record.id}`);
  const cand = latest.candidate;
  const key = sourceKey ?? record.id;
  const dryRunDecision = evaluateBankImport({ sourceKey: key, record });

  const lesson: Lesson =
    latest.version === 1 && record.lesson
      ? record.lesson
      : buildSentenceLesson({
          stem: cand.question.stem,
          options: cand.question.options,
          correct: cand.correctOption,
          relation: record.spec.discourseRelation?.split(":").pop() ?? null,
          explanation: cand.explanation,
          rationales: cand.distractorRationales.map((entry) => ({
            option: entry.option,
            distractorType: entry.distractorType,
            whyPlausible: entry.whyPlausible,
            whyWrong: entry.whyWrong,
          })),
        });

  const byRationale = new Map(cand.distractorRationales.map((e) => [e.option, e]));
  const distractors = optionLabels
    .filter((letter) => letter !== cand.correctOption)
    .map((letter) => {
      const r = byRationale.get(letter);
      return {
        letter,
        body: cand.question.options[letter] ?? "",
        distractorType: r?.distractorType ?? "",
        errorClass: r?.distractorType ? errorClassFromFactory(r.distractorType) : null,
        whyPlausible: r?.whyPlausible ?? "",
        whyWrong: r?.whyWrong ?? "",
      };
    });

  return {
    candidateId: record.id,
    version: latest.version,
    status: record.status,
    stem: cand.question.stem,
    options: cand.question.options,
    correctOption: cand.correctOption,
    explanation: cand.explanation,
    judge: record.judge,
    riskFlags: editorialRiskFlags(record),
    validation: latest.validation,
    lesson,
    lessonGaps: lessonGaps(lesson),
    distractors,
    skills: {
      targetSkill: record.spec.targetSkill,
      cognitiveSkill: record.spec.cognitiveSkill,
      studentSkillIds: dryRunDecision.payload?.skillIds ?? studentSkills(record.spec, "sentence"),
    },
    difficulty: {
      specBand: record.spec.difficulty.band,
      approvedBand: cand.metadata?.approvedBand ?? null,
      cefr: record.spec.difficulty.cefr,
    },
    reviews: record.reviews.map((r) => ({
      ...r,
      verifiedHuman: isVerifiedHumanReviewer(r.reviewer),
    })),
    dryRunDecision,
  };
}
