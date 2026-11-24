import { isErrorClass } from "../content/lesson";
import type { SectionId } from "../exam/blueprint";
import type { PoolItem } from "../exam/select";
import { initialMastery, targetDifficulty } from "./mastery";

export type PlanBlock =
  | { kind: "vocab"; id: string; minutes: number }
  | { kind: "question"; id: string; section: SectionId; minutes: number; bucket: "weak" | "review" | "target" | "strength" | "novel" };

export type DailyPlan = {
  totalMinutes: number;
  blocks: PlanBlock[];
  skipSections: SectionId[];
  /** Closed error classes from error_mastery that ranked this plan. Omitted when the learner has none. */
  weakErrors?: string[];
  /** ISO timestamp. Same-day diagnostic refresh compares this to session.submittedAt. */
  generatedAt?: string;
};

/** Same cutoff createSession already uses when ranking practice fallback items. */
export const weakErrorMasteryThreshold = 55;
export const weakErrorLimit = 3;

export function rankWeakErrorClasses(rows: { errorClass: string; mastery: number; attempts: number }[]): string[] {
  return rows
    .filter((row) => row.attempts > 0 && row.mastery < weakErrorMasteryThreshold && isErrorClass(row.errorClass))
    .sort((a, b) => a.mastery - b.mastery || a.errorClass.localeCompare(b.errorClass))
    .slice(0, weakErrorLimit)
    .map((row) => row.errorClass);
}

/** Rebuild today's cached plan only after a diagnostic submitted later than that plan. */
export function shouldRefreshDailyPlan(input: { generatedAt?: string | null; diagnosticSubmittedAt?: Date | string | null }): boolean {
  if (!input.diagnosticSubmittedAt) return false;
  const diagnostic =
    input.diagnosticSubmittedAt instanceof Date ? input.diagnosticSubmittedAt.getTime() : Date.parse(String(input.diagnosticSubmittedAt));
  if (!Number.isFinite(diagnostic)) return false;
  if (!input.generatedAt) return true;
  const generated = Date.parse(input.generatedAt);
  if (!Number.isFinite(generated)) return true;
  return diagnostic > generated;
}

export function mergePreservedPlan(previous: DailyPlan, next: DailyPlan, completedIds: Iterable<string>): DailyPlan {
  const done = new Set(completedIds);
  const preservedQuestions = previous.blocks.filter((block) => block.kind === "question" && done.has(block.id));
  const preservedIds = new Set(preservedQuestions.map((block) => block.id));
  const questionBudget = next.blocks.filter((block) => block.kind === "question").length;
  const extras = next.blocks.filter((block) => block.kind === "question" && !preservedIds.has(block.id));
  const vocab = previous.blocks.filter((block) => block.kind === "vocab");
  const questions = [...preservedQuestions, ...extras].slice(0, Math.max(questionBudget, preservedQuestions.length));
  const blocks: PlanBlock[] = [...vocab, ...questions];
  return {
    totalMinutes: blocks.reduce((sum, block) => sum + block.minutes, 0),
    blocks,
    skipSections: next.skipSections,
    ...(next.weakErrors && next.weakErrors.length > 0 ? { weakErrors: next.weakErrors } : {}),
    ...(next.generatedAt ? { generatedAt: next.generatedAt } : {}),
  };
}

type MasteryRow = { section: SectionId; mastery: number };

function rankedSections(rows: MasteryRow[]): SectionId[] {
  return [...rows].sort((a, b) => a.mastery - b.mastery).map((row) => row.section);
}

function takeUnique(
  source: PoolItem[],
  count: number,
  used: Set<string>,
  allow: (item: PoolItem) => boolean,
  onPick?: (item: PoolItem) => void,
): PoolItem[] {
  const chosen: PoolItem[] = [];
  for (const item of source) {
    if (chosen.length === count) break;
    if (used.has(item.id) || !allow(item)) continue;
    used.add(item.id);
    chosen.push(item);
    onPick?.(item);
  }
  return chosen;
}

function hitsWeakError(item: PoolItem, weak: Set<string>): boolean {
  return item.errorClasses.some((error) => weak.has(error));
}

function primaryWeakError(item: PoolItem, weak: Set<string>): string | null {
  return item.errorClasses.find((error) => weak.has(error)) ?? null;
}

function noteWeakError(item: PoolItem, counts: Map<string, number>, weak: Set<string>) {
  const key = primaryWeakError(item, weak);
  if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
}

function underErrorCap(item: PoolItem, counts: Map<string, number>, cap: number, weak: Set<string>): boolean {
  if (weak.size === 0) return true;
  const key = primaryWeakError(item, weak);
  if (!key) return true;
  return (counts.get(key) ?? 0) < cap;
}

export function daysUntilExam(examDate: string | null | undefined, now = new Date()): number | null {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((exam.getTime() - start.getTime()) / 86_400_000);
}

export function buildPlan(input: {
  minutes: number;
  mastery: MasteryRow[];
  dueQuestionIds: string[];
  dueVocabIds: string[];
  pool: PoolItem[];
  seenIds: string[];
  targetSection?: SectionId;
  daysToExam?: number | null;
  weakErrors?: string[];
}): DailyPlan {
  const minutes = Math.max(10, input.minutes);
  const vocabBudget = Math.min(8, Math.max(3, Math.round(minutes / 8)));
  const vocabIds = input.dueVocabIds.slice(0, vocabBudget);
  const questionBudget = Math.max(4, Math.round((minutes - vocabIds.length) / 2.2));
  const near = input.daysToExam != null && input.daysToExam >= 0 && input.daysToExam <= 14;
  const lastDays = input.daysToExam != null && input.daysToExam >= 0 && input.daysToExam <= 3;
  const mix = lastDays
    ? { weak: 0.25, review: 0.45, target: 0.2 }
    : near
      ? { weak: 0.3, review: 0.35, target: 0.2 }
      : { weak: 0.4, review: 0.2, target: 0.2 };
  const weakCount = Math.round(questionBudget * mix.weak);
  const reviewCount = Math.round(questionBudget * mix.review);
  const targetCount = Math.round(questionBudget * mix.target);
  const novelCount = Math.max(0, questionBudget - weakCount - reviewCount - targetCount);

  const order = rankedSections(input.mastery.length > 0 ? input.mastery : []);
  const weakSections = new Set(order.slice(0, 2));
  const strongSections = new Set(
    input.mastery
      .filter((row) => row.mastery >= 75)
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 2)
      .map((row) => row.section),
  );
  const open = (item: PoolItem) => !strongSections.has(item.section);
  const target = input.targetSection ?? order[0];
  const seen = new Set(input.seenIds);
  const due = new Set(input.dueQuestionIds);
  const used = new Set<string>();
  const unseen = input.pool.filter((item) => !seen.has(item.id));
  const base = unseen.length >= questionBudget ? unseen : input.pool;
  const levelOf = new Map(input.mastery.map((row) => [row.section, row.mastery]));
  const weakErrorSet = new Set((input.weakErrors ?? []).filter((error) => isErrorClass(error)));
  const source = [...base].sort((a, b) => {
    const aGap = Math.abs(a.difficulty - targetDifficulty(levelOf.get(a.section) ?? initialMastery()));
    const bGap = Math.abs(b.difficulty - targetDifficulty(levelOf.get(b.section) ?? initialMastery()));
    if (aGap !== bGap) return aGap - bGap;
    if (weakErrorSet.size > 0) {
      const aHit = hitsWeakError(a, weakErrorSet) ? 0 : 1;
      const bHit = hitsWeakError(b, weakErrorSet) ? 0 : 1;
      if (aHit !== bHit) return aHit - bHit;
    }
    return a.slot - b.slot;
  });

  const errorCap = Math.max(1, Math.ceil(questionBudget * 0.4));
  const errorCounts = new Map<string, number>();
  const trackError = (item: PoolItem) => noteWeakError(item, errorCounts, weakErrorSet);
  const withinError = (item: PoolItem) => underErrorCap(item, errorCounts, errorCap, weakErrorSet);
  const weak = takeUnique(
    source,
    weakCount,
    used,
    (item) => open(item) && (weakSections.size === 0 || weakSections.has(item.section)) && withinError(item),
    trackError,
  );
  const review = takeUnique(
    source.filter((item) => due.has(item.id)),
    reviewCount,
    used,
    (item) => open(item) && withinError(item),
    trackError,
  );
  if (review.length < reviewCount) {
    review.push(...takeUnique(source, reviewCount - review.length, used, (item) => open(item) && withinError(item), trackError));
  }
  const targeted = takeUnique(source, targetCount, used, (item) => open(item) && (target ? item.section === target : true) && withinError(item), trackError);
  const novel = takeUnique(source, novelCount, used, (item) => open(item) && !weakSections.has(item.section) && withinError(item), trackError);
  const filler = takeUnique(source, questionBudget, used, (item) => open(item) && withinError(item), trackError);

  const questions = [...weak, ...review, ...targeted, ...novel, ...filler].slice(0, questionBudget);
  const sectionCap = Math.max(1, Math.ceil(questions.length * 0.4));
  const sectionErrorCap = Math.max(1, Math.ceil(sectionCap * 0.4));
  const capped: PoolItem[] = [];
  const counts = new Map<SectionId, number>();
  const liveErrorCounts = new Map<string, number>();
  const sectionErrorCounts = new Map<SectionId, number>();
  const accept = (item: PoolItem, respectErrorCap: boolean) => {
    if (capped.some((chosen) => chosen.id === item.id) || !open(item)) return false;
    const count = counts.get(item.section) ?? 0;
    if (count >= sectionCap) return false;
    if (respectErrorCap && weakErrorSet.size > 0) {
      if (!underErrorCap(item, liveErrorCounts, errorCap, weakErrorSet)) return false;
      if (primaryWeakError(item, weakErrorSet) && (sectionErrorCounts.get(item.section) ?? 0) >= sectionErrorCap) return false;
    }
    counts.set(item.section, count + 1);
    noteWeakError(item, liveErrorCounts, weakErrorSet);
    if (primaryWeakError(item, weakErrorSet)) {
      sectionErrorCounts.set(item.section, (sectionErrorCounts.get(item.section) ?? 0) + 1);
    }
    capped.push(item);
    return true;
  };
  for (const item of questions) accept(item, true);
  for (const respectErrorCap of [true, false]) {
    for (const item of source) {
      if (capped.length >= questionBudget) break;
      accept(item, respectErrorCap);
    }
  }

  const bucketFor = (item: PoolItem): "weak" | "review" | "target" | "strength" | "novel" => {
    if (weak.some((row) => row.id === item.id)) return "weak";
    if (review.some((row) => row.id === item.id)) return "review";
    if (targeted.some((row) => row.id === item.id)) return "target";
    return "novel";
  };

  const blocks: PlanBlock[] = [
    ...vocabIds.map((id) => ({ kind: "vocab" as const, id, minutes: 1 })),
    ...capped.map((item) => ({
      kind: "question" as const,
      id: item.id,
      section: item.section,
      minutes: item.section === "reading" ? 3 : 2,
      bucket: bucketFor(item),
    })),
  ];
  const totalMinutes = blocks.reduce((sum, block) => sum + block.minutes, 0);
  const rankedErrors = [...weakErrorSet];
  return {
    totalMinutes,
    blocks,
    skipSections: [...strongSections],
    ...(rankedErrors.length > 0 ? { weakErrors: rankedErrors } : {}),
  };
}

export function nextStreak(previous: number, lastDate: string | null, today: string): number {
  if (lastDate === today) return Math.max(previous, 1);
  if (!lastDate) return 1;
  const last = new Date(`${lastDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const gap = Math.round((now.getTime() - last.getTime()) / 86_400_000);
  if (gap === 1) return Math.max(previous, 0) + 1;
  return 1;
}
