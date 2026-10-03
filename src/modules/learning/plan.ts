import type { SectionId } from "../exam/blueprint";
import type { PoolItem } from "../exam/select";

export type PlanBlock =
  | { kind: "vocab"; id: string; minutes: number }
  | { kind: "question"; id: string; section: SectionId; minutes: number; bucket: "weak" | "review" | "target" | "strength" | "novel" };

export type DailyPlan = {
  totalMinutes: number;
  blocks: PlanBlock[];
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

export function buildPlan(input: {
  minutes: number;
  mastery: MasteryRow[];
  dueQuestionIds: string[];
  dueVocabIds: string[];
  pool: PoolItem[];
  seenIds: string[];
  targetSection?: SectionId;
}): DailyPlan {
  const minutes = Math.max(10, input.minutes);
  const vocabBudget = Math.min(8, Math.max(3, Math.round(minutes / 8)));
  const vocabIds = input.dueVocabIds.slice(0, vocabBudget);
  const questionBudget = Math.max(4, Math.round((minutes - vocabIds.length) / 2.2));
  const weakCount = Math.round(questionBudget * 0.4);
  const reviewCount = Math.round(questionBudget * 0.2);
  const targetCount = Math.round(questionBudget * 0.2);
  const strengthCount = Math.max(0, Math.round(questionBudget * 0.1));
  const novelCount = Math.max(0, questionBudget - weakCount - reviewCount - targetCount - strengthCount);

  const order = rankedSections(input.mastery.length > 0 ? input.mastery : []);
  const weakSections = new Set(order.slice(0, 2));
  const strongSections = new Set(order.slice(-2));
  const target = input.targetSection ?? order[0];
  const seen = new Set(input.seenIds);
  const due = new Set(input.dueQuestionIds);
  const used = new Set<string>();
  const unseen = input.pool.filter((item) => !seen.has(item.id));
  const source = unseen.length >= questionBudget ? unseen : input.pool;

  const weak = takeUnique(source, weakCount, used, (item) => weakSections.size === 0 || weakSections.has(item.section));
  const review = takeUnique(
    source.filter((item) => due.has(item.id)),
    reviewCount,
    used,
    () => true,
  );
  if (review.length < reviewCount) {
    review.push(...takeUnique(source, reviewCount - review.length, used, () => true));
  }
  const targeted = takeUnique(source, targetCount, used, (item) => (target ? item.section === target : true));
  const strength = takeUnique(source, strengthCount, used, (item) => strongSections.size === 0 || strongSections.has(item.section));
  const novel = takeUnique(source, novelCount, used, (item) => !weakSections.has(item.section));
  const filler = takeUnique(source, questionBudget, used, () => true);

  const questions = [...weak, ...review, ...targeted, ...strength, ...novel, ...filler].slice(0, questionBudget);
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
    if (strength.some((row) => row.id === item.id)) return "strength";
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
  return { totalMinutes, blocks };
}
