import { randomUUID } from "node:crypto";
import { brand } from "@/brand";
import { and, drillAnswers, eq, getDb, gte, reviews } from "@/db/client";
import { relationLabel, type Relation } from "@/content/drill-connectors";
import { drillAllowance, type Tier } from "@/modules/billing/entitlement";
import {
  connectorQuestion,
  connectorRelation,
  drillTargets,
  feedback,
  pickDaily,
  questionById,
  wordDirection,
  wordQuestion,
  type DrillFeedback,
  type DrillKind,
} from "@/modules/drill/drill";
import { touchReview } from "./sessions";

export type PublicDrillQuestion = { id: string; prompt: string; note: string | null; choices: string[] };

export const drillLimit: Record<DrillKind, number> = {
  word: brand.freeDailyWords,
  connector: brand.freeDailyConnectors,
};

export function dayKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

function shiftDay(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00+03:00`);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

type DayScore = { done: number; correct: number };

async function recentAnswers(profileId: string, sinceDays: number) {
  const db = await getDb();
  return db
    .select()
    .from(drillAnswers)
    .where(and(eq(drillAnswers.profileId, profileId), gte(drillAnswers.day, shiftDay(dayKey(), -sinceDays))));
}

function scoreFor(rows: { kind: string; day: string; correct: boolean }[], kind: DrillKind, day: string): DayScore {
  const today = rows.filter((row) => row.kind === kind && row.day === day);
  return { done: today.length, correct: today.filter((row) => row.correct).length };
}

export async function dailyDrill(profileId: string, kind: DrillKind, tier: Tier) {
  const db = await getDb();
  const today = dayKey();
  const [rows, reviewRows] = await Promise.all([
    recentAnswers(profileId, 1),
    db.select().from(reviews).where(and(eq(reviews.profileId, profileId), eq(reviews.targetType, kind))),
  ]);
  const todayScore = scoreFor(rows, kind, today);
  const yesterday = scoreFor(rows, kind, shiftDay(today, -1));
  const limit = drillLimit[kind];
  const remaining = drillAllowance({ tier, answeredToday: todayScore.done, limit });
  const doneToday = new Set(rows.filter((row) => row.kind === kind && row.day === today).map((row) => row.targetId));
  const picked = pickDaily({
    targets: drillTargets[kind],
    due: new Map(reviewRows.map((row) => [row.targetId, row.dueAt])),
    seen: new Set(reviewRows.map((row) => row.targetId)),
    doneToday,
    now: new Date(),
    count: remaining,
  });
  const questions: PublicDrillQuestion[] = picked
    .map((id) => (kind === "word" ? wordQuestion(id, wordDirection(id, today)) : connectorQuestion(id)))
    .filter((question) => question !== null)
    .map(({ id, prompt, note, choices }) => ({ id, prompt, note, choices }));
  return { questions, today: todayScore, yesterday, limit, remaining };
}

export async function answerDrill(input: { profileId: string; tier: Tier; questionId: string; choiceIndex: number }): Promise<DrillFeedback | { error: string }> {
  const question = questionById(input.questionId);
  if (!question || input.choiceIndex < 0 || input.choiceIndex >= question.choices.length) return { error: "Bu soru bulunamadı." };
  const db = await getDb();
  const today = dayKey();
  const todayRows = await db
    .select()
    .from(drillAnswers)
    .where(and(eq(drillAnswers.profileId, input.profileId), eq(drillAnswers.day, today), eq(drillAnswers.kind, question.kind)));
  const already = todayRows.find((row) => row.questionId === question.id);
  if (already) return feedback(question, already.correct ? question.answerIndex : input.choiceIndex);
  if (drillAllowance({ tier: input.tier, answeredToday: todayRows.length, limit: drillLimit[question.kind] }) === 0) {
    return { error: "Bugünkü ücretsiz hakkını kullandın. Yarın 10 yeni soru seni bekliyor." };
  }
  const result = feedback(question, input.choiceIndex);
  await db
    .insert(drillAnswers)
    .values({
      id: randomUUID(),
      profileId: input.profileId,
      kind: question.kind,
      targetId: question.targetId,
      questionId: question.id,
      correct: result.correct,
      day: today,
    })
    .onConflictDoNothing();
  await touchReview(input.profileId, question.kind, question.targetId, result.correct);
  return result;
}

export type DrillOverview = {
  word: { today: DayScore; yesterday: DayScore; limit: number };
  connector: { today: DayScore; yesterday: DayScore; limit: number };
  week: { word: number | null; connector: number | null };
  weakRelations: { relation: Relation; label: string; correct: number; total: number }[];
};

export async function drillOverview(profileId: string): Promise<DrillOverview> {
  const rows = await recentAnswers(profileId, 30);
  const today = dayKey();
  const weekStart = shiftDay(today, -6);
  const rate = (kind: DrillKind) => {
    const week = rows.filter((row) => row.kind === kind && row.day >= weekStart);
    return week.length >= 5 ? Math.round((week.filter((row) => row.correct).length / week.length) * 100) : null;
  };
  const byRelation = new Map<Relation, { correct: number; total: number }>();
  for (const row of rows) {
    if (row.kind !== "connector") continue;
    const relation = connectorRelation(row.targetId);
    if (!relation) continue;
    const cell = byRelation.get(relation) ?? { correct: 0, total: 0 };
    cell.total += 1;
    if (row.correct) cell.correct += 1;
    byRelation.set(relation, cell);
  }
  const weakRelations = [...byRelation.entries()]
    .filter(([, cell]) => cell.total >= 2 && cell.correct / cell.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([relation, cell]) => ({ relation, label: relationLabel[relation], ...cell }));
  return {
    word: { today: scoreFor(rows, "word", today), yesterday: scoreFor(rows, "word", shiftDay(today, -1)), limit: drillLimit.word },
    connector: {
      today: scoreFor(rows, "connector", today),
      yesterday: scoreFor(rows, "connector", shiftDay(today, -1)),
      limit: drillLimit.connector,
    },
    week: { word: rate("word"), connector: rate("connector") },
    weakRelations,
  };
}
