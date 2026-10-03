import type { SectionId } from "../exam/blueprint";
import type { PoolItem } from "../exam/select";

export type PlanBlock =
  | { kind: "vocab"; id: string; minutes: number }
  | { kind: "question"; id: string; section: SectionId; minutes: number; bucket: "weak" | "review" | "target" | "strength" | "novel" };

export type DailyPlan = {
  totalMinutes: number;
  blocks: PlanBlock[];
  skipSections: SectionId[];
};

type MasteryRow = { section: SectionId; mastery: number };

function rankedSections(rows: MasteryRow[]): SectionId[] {
  return [...rows].sort((a, b) => a.mastery - b.mastery).map((row) => row.section);
}

function takeUnique(source: PoolItem[], count: number, used: Set<string>, allow: (item: PoolItem) => boolean): PoolItem[] {
  const chosen: PoolItem[] = [];
  for (const item of source) {
    if (chosen.length === count) break;
    if (used.has(item.id) || !allow(item)) continue;
    used.add(item.id);
    chosen.push(item);
  }
  return chosen;
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
  const source = unseen.length >= questionBudget ? unseen : input.pool;

  const weak = takeUnique(source, weakCount, used, (item) => open(item) && (weakSections.size === 0 || weakSections.has(item.section)));
  const review = takeUnique(
    source.filter((item) => due.has(item.id)),
    reviewCount,
    used,
    open,
  );
  if (review.length < reviewCount) {
    review.push(...takeUnique(source, reviewCount - review.length, used, open));
  }
  const targeted = takeUnique(source, targetCount, used, (item) => open(item) && (target ? item.section === target : true));
  const novel = takeUnique(source, novelCount, used, (item) => open(item) && !weakSections.has(item.section));
  const filler = takeUnique(source, questionBudget, used, open);

  const questions = [...weak, ...review, ...targeted, ...novel, ...filler].slice(0, questionBudget);
  const sectionCap = Math.max(1, Math.ceil(questions.length * 0.4));
  const capped: PoolItem[] = [];
  const counts = new Map<SectionId, number>();
  const overflow: PoolItem[] = [];
  for (const item of questions) {
    const count = counts.get(item.section) ?? 0;
    if (count >= sectionCap) {
      overflow.push(item);
      continue;
    }
    counts.set(item.section, count + 1);
    capped.push(item);
  }
  for (const item of source) {
    if (capped.length >= questionBudget) break;
    if (!open(item)) continue;
    if (capped.some((chosen) => chosen.id === item.id)) continue;
    const count = counts.get(item.section) ?? 0;
    if (count >= sectionCap) continue;
    counts.set(item.section, count + 1);
    capped.push(item);
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
  return { totalMinutes, blocks, skipSections: [...strongSections] };
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
