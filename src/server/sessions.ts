import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { brand } from "@/brand";
import { asExam, blueprintFor, type ExamCode, type SectionId } from "@/modules/exam/blueprint";
import { estimateFromAccuracy, estimateNet, scoreSession, type ScoreItem } from "@/modules/exam/score";
import { selectDiagnostic, selectItems, selectMock, studyPool, type PoolItem } from "@/modules/exam/select";
import { canStartPractice, canStartSimulator, isPro, practiceAllowance, type CheckoutPlan, type PlanCode } from "@/modules/billing/entitlement";
import { nextMastery } from "@/modules/learning/mastery";
import { buildPlan, daysUntilExam, nextStreak, type DailyPlan } from "@/modules/learning/plan";
import { nextReview } from "@/modules/learning/review";
import {
  answers,
  choices,
  events,
  getDb,
  itemSkills,
  items,
  mastery,
  plans,
  profiles,
  publishedPool,
  reviews,
  sessionItems,
  sessions,
  skills,
  stimuliTable,
  subscriptions,
} from "@/db/client";
import { getGuestId, claimGuest } from "./auth";

export type Mode = "diagnostic" | "practice" | "simulator";

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

function startOfToday(): Date {
  const key = todayKey();
  return new Date(`${key}T00:00:00+03:00`);
}

/** Runs work after the response is sent when inside a request; inline otherwise (tests, scripts). */
async function later(work: () => Promise<unknown>) {
  try {
    after(work);
  } catch {
    await work();
  }
}

export async function recordEvent(name: string, profileId: string | null, payload: Record<string, unknown> = {}) {
  await later(async () => {
    const db = await getDb();
    await db.insert(events).values({ id: randomUUID(), profileId, name, payload });
  });
}

export async function entitlementFor(profileId: string | null) {
  if (process.env.DEV_PRO === "1") return { pro: true, plan: "pro" as const };
  if (!profileId) return { pro: false, plan: "free" as const };
  const db = await getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.profileId, profileId)).limit(1);
  const row = rows[0];
  const pro = isPro({
    devPro: false,
    plan: (row?.plan as PlanCode | undefined) ?? null,
    status: row?.status ?? null,
    periodEnd: row?.periodEnd ?? null,
    now: new Date(),
  });
  return { pro, plan: row?.plan ?? "free" };
}

async function answeredToday(profileId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: answers.id })
    .from(answers)
    .innerJoin(sessions, eq(sessions.id, answers.sessionId))
    .where(and(eq(answers.profileId, profileId), eq(sessions.mode, "practice"), gte(answers.createdAt, startOfToday())));
  return rows.length;
}

async function completedSimulators(owner: { profileId?: string | null; guestId?: string }): Promise<number> {
  const db = await getDb();
  const filter = owner.profileId
    ? eq(sessions.profileId, owner.profileId)
    : eq(sessions.guestId, owner.guestId ?? "");
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(filter, eq(sessions.mode, "simulator"), eq(sessions.status, "submitted")));
  return rows.length;
}

async function examFor(profileId: string | null): Promise<ExamCode> {
  if (!profileId) return "yds";
  const db = await getDb();
  const rows = await db.select({ exam: profiles.exam }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
  return asExam(rows[0]?.exam);
}

export async function createSession(input: {
  mode: Mode;
  profileId: string | null;
  itemIds?: string[];
}): Promise<{ id?: string; error?: string; paywall?: boolean }> {
  const [guestId, access, exam, pool] = await Promise.all([
    getGuestId(),
    entitlementFor(input.profileId),
    examFor(input.profileId),
    publishedPool(input.mode === "simulator" ? "mock" : "study"),
  ]);
  const blueprint = blueprintFor(exam);
  let picked: PoolItem[] = [];
  if (input.mode === "diagnostic") {
    picked = selectDiagnostic(pool, blueprint);
    await recordEvent("diagnostic_started", input.profileId);
  } else if (input.mode === "simulator") {
    if (exam === "ydt") return { error: "YDT denemesi çok yakında burada. O zamana kadar seviye testini çözebilir, günlük çalışmana devam edebilirsin." };
    const completed = await completedSimulators({ profileId: input.profileId, guestId });
    if (!canStartSimulator({ pro: access.pro, completed, limit: brand.freeSimulators })) {
      await recordEvent("paywall_viewed", input.profileId, { reason: "simulator" });
      return { paywall: true, error: "Ücretsiz deneme hakkını kullandın." };
    }
    picked = selectMock(pool);
    if (picked.length !== 80) return { error: "Deneme şu an hazırlanamadı. Biraz sonra tekrar dene." };
    await recordEvent("simulator_started", input.profileId);
  } else {
    const requested = input.itemIds ?? [];
    const todayCount = input.profileId ? await answeredToday(input.profileId) : 0;
    if (!canStartPractice({ pro: access.pro, answeredToday: todayCount, limit: brand.freeDailyQuestions })) {
      await recordEvent("paywall_viewed", input.profileId, { reason: "practice" });
      return { paywall: true, error: "Bugünkü 10 ücretsiz sorunu çözdün. Yarın yeni sorular seni bekliyor." };
    }
    const allowance = practiceAllowance({
      pro: access.pro,
      answeredToday: todayCount,
      limit: brand.freeDailyQuestions,
      requested: requested.length || 8,
    });
    const allowed = new Set(pool.map((item) => item.id));
    const fromPlan = requested.filter((id) => allowed.has(id)).slice(0, allowance);
    picked =
      fromPlan.length > 0
        ? fromPlan.map((id) => pool.find((item) => item.id === id)).filter((item): item is PoolItem => Boolean(item))
        : selectItems({
            pool,
            count: allowance,
            seenIds: input.profileId ? await seenIds(input.profileId) : [],
            preferredSections: ["cloze", "sentence"],
            difficulty: 3,
          });
    if (picked.length === 0) return { error: "Şu an çözebileceğin yeni soru kalmadı. Yeni sorular eklendikçe burada görünecek." };
    await recordEvent("daily_plan_started", input.profileId);
  }
  const db = await getDb();
  const id = randomUUID();
  const endsAt = input.mode === "simulator" ? new Date(Date.now() + blueprint.minutes * 60_000) : null;
  await db.insert(sessions).values({
    id,
    profileId: input.profileId,
    guestId,
    mode: input.mode,
    exam,
    status: "active",
    endsAt,
  });
  await db.insert(sessionItems).values(
    picked.map((item, index) => ({
      sessionId: id,
      itemId: item.id,
      position: index,
      flagged: false,
    })),
  );
  return { id };
}

async function seenIds(profileId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ itemId: answers.itemId }).from(answers).where(eq(answers.profileId, profileId));
  return rows.map((row) => row.itemId);
}

async function ownedSession(sessionId: string, profileId: string | null, guestId: string) {
  const db = await getDb();
  const session = (await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1))[0];
  if (!session) return null;
  if (session.profileId && session.profileId !== profileId) return null;
  if (!session.profileId && session.guestId !== guestId) return null;
  return session;
}

export async function loadPlayer(sessionId: string, profileId: string | null, guestId: string) {
  const db = await getDb();
  const [session, links, answerRows] = await Promise.all([
    ownedSession(sessionId, profileId, guestId),
    db.select().from(sessionItems).where(eq(sessionItems.sessionId, sessionId)).orderBy(asc(sessionItems.position)),
    db.select().from(answers).where(eq(answers.sessionId, sessionId)),
  ]);
  if (!session) return null;
  const ids = links.map((link) => link.itemId);
  if (ids.length === 0) return { session, items: [] };
  const [itemRows, choiceRows] = await Promise.all([
    db.select().from(items).where(inArray(items.id, ids)),
    db.select().from(choices).where(inArray(choices.itemId, ids)).orderBy(asc(choices.position)),
  ]);
  const stimulusIds = [...new Set(itemRows.map((item) => item.stimulusId).filter((id): id is string => Boolean(id)))];
  const stimulusRows = stimulusIds.length ? await db.select().from(stimuliTable).where(inArray(stimuliTable.id, stimulusIds)) : [];
  const byId = new Map(itemRows.map((item) => [item.id, item]));
  const stimuli = new Map(stimulusRows.map((row) => [row.id, row.body]));
  const playerItems = links.map((link) => {
    const item = byId.get(link.itemId);
    if (!item) return null;
    const answer = answerRows.find((row) => row.itemId === item.id);
    const itemChoices = choiceRows.filter((choice) => choice.itemId === item.id);
    const correct = itemChoices.find((choice) => choice.correct);
    const selected = itemChoices.find((choice) => choice.id === answer?.choiceId);
    return {
      id: item.id,
      position: link.position,
      slot: item.slot,
      section: item.section,
      layout: item.layout,
      stem: item.stem,
      stimulusBody: item.stimulusId ? (stimuli.get(item.stimulusId) ?? null) : null,
      flagged: link.flagged,
      selectedChoiceId: answer?.choiceId ?? null,
      choices: itemChoices.map((choice) => ({ id: choice.id, body: choice.body })),
      reveal:
        session.mode === "practice" && answer
          ? {
              correct: Boolean(answer.correct),
              explanation: item.explanation,
              correctChoiceId: correct?.id ?? "",
              note: selected && !selected.correct ? selected.distractorType : null,
            }
          : null,
    };
  });
  return { session, items: playerItems.filter((item) => item !== null) };
}

export async function saveAnswer(input: {
  sessionId: string;
  itemId: string;
  choiceId: string;
  responseTimeMs: number;
  confidence?: string | null;
  profileId: string | null;
  guestId: string;
}) {
  const session = await ownedSession(input.sessionId, input.profileId, input.guestId);
  if (!session || session.status !== "active") return { error: "Bu test bitti; artık cevap değiştiremezsin." };
  if (session.mode === "simulator" && session.endsAt && session.endsAt.getTime() < Date.now()) {
    await submitSession(input.sessionId, input.profileId, input.guestId);
    return { error: "Süre doldu, sonucun hazırlanıyor.", submitted: true };
  }
  const db = await getDb();
  const [choiceRows, existing, membership] = await Promise.all([
    db.select().from(choices).where(eq(choices.id, input.choiceId)).limit(1),
    db
      .select()
      .from(answers)
      .where(and(eq(answers.sessionId, input.sessionId), eq(answers.itemId, input.itemId)))
      .limit(1),
    db
      .select({ itemId: sessionItems.itemId })
      .from(sessionItems)
      .where(and(eq(sessionItems.sessionId, input.sessionId), eq(sessionItems.itemId, input.itemId)))
      .limit(1),
  ]);
  const choice = choiceRows[0];
  if (!choice || choice.itemId !== input.itemId || !membership[0]) return { error: "Cevabın kaydedilemedi. Sayfayı yenileyip tekrar dene." };
  if (session.mode === "practice" && existing[0]) return { error: "Bu soruyu zaten cevapladın." };
  const correct = choice.correct;
  if (existing[0]) {
    await db
      .update(answers)
      .set({ choiceId: choice.id, correct, responseTimeMs: input.responseTimeMs, confidence: input.confidence ?? null })
      .where(eq(answers.id, existing[0].id));
  } else {
    await db.insert(answers).values({
      id: randomUUID(),
      sessionId: input.sessionId,
      profileId: input.profileId,
      itemId: input.itemId,
      choiceId: choice.id,
      correct,
      responseTimeMs: input.responseTimeMs,
      confidence: input.confidence ?? null,
    });
  }
  await recordEvent("question_answered", input.profileId, { sessionId: input.sessionId, itemId: input.itemId, correct });
  if (session.mode !== "practice") return { saved: true };
  const profileId = input.profileId;
  if (profileId) {
    await later(async () => {
      await applyMastery(profileId, input.itemId, correct);
      if (!correct) await touchReview(profileId, "item", input.itemId, false);
    });
  }
  const [choiceList, itemRows] = await Promise.all([
    db.select().from(choices).where(eq(choices.itemId, input.itemId)),
    db.select().from(items).where(eq(items.id, input.itemId)).limit(1),
  ]);
  const correctChoice = choiceList.find((row) => row.correct);
  const itemRow = itemRows[0];
  return {
    saved: true,
    reveal: {
      correct,
      explanation: itemRow?.explanation ?? "",
      correctChoiceId: correctChoice?.id ?? "",
      note: correct ? null : choice.distractorType,
    },
    section: itemRow?.section,
  };
}

async function applyMastery(profileId: string, itemId: string, correct: boolean) {
  const db = await getDb();
  const links = await db.select().from(itemSkills).where(eq(itemSkills.itemId, itemId));
  const itemRows = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  const difficulty = itemRows[0]?.difficulty ?? 3;
  for (const link of links) {
    const current = await db
      .select()
      .from(mastery)
      .where(and(eq(mastery.profileId, profileId), eq(mastery.skillId, link.skillId)))
      .limit(1);
    const previous = current[0]?.mastery ?? 50;
    const next = Math.round(nextMastery(previous, correct, difficulty));
    if (current[0]) {
      await db
        .update(mastery)
        .set({
          mastery: next,
          confidence: next,
          attempts: current[0].attempts + 1,
          correctAttempts: current[0].correctAttempts + (correct ? 1 : 0),
          updatedAt: new Date(),
        })
        .where(and(eq(mastery.profileId, profileId), eq(mastery.skillId, link.skillId)));
    } else {
      await db.insert(mastery).values({
        profileId,
        skillId: link.skillId,
        mastery: next,
        confidence: next,
        attempts: 1,
        correctAttempts: correct ? 1 : 0,
      });
    }
  }
}

export async function touchReview(profileId: string, targetType: "item" | "vocab", targetId: string, correct: boolean) {
  const db = await getDb();
  const id = `${profileId}:${targetType}:${targetId}`;
  const current = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  const update = nextReview(
    { step: current[0]?.step ?? 0, lapses: current[0]?.lapses ?? 0 },
    correct,
    new Date(),
  );
  if (current[0]) {
    await db
      .update(reviews)
      .set({ dueAt: update.dueAt, step: update.step, lapses: update.lapses, stabilityDays: update.stabilityDays })
      .where(eq(reviews.id, id));
  } else {
    await db.insert(reviews).values({
      id,
      profileId,
      targetType,
      targetId,
      dueAt: update.dueAt,
      step: update.step,
      lapses: update.lapses,
      stabilityDays: update.stabilityDays,
    });
  }
}

export async function setFlag(sessionId: string, itemId: string, flagged: boolean, profileId: string | null, guestId: string) {
  const session = await ownedSession(sessionId, profileId, guestId);
  if (!session) return;
  const db = await getDb();
  await db
    .update(sessionItems)
    .set({ flagged })
    .where(and(eq(sessionItems.sessionId, sessionId), eq(sessionItems.itemId, itemId)));
}

export async function submitSession(sessionId: string, profileId: string | null, guestId: string) {
  const loaded = await loadPlayer(sessionId, profileId, guestId);
  if (!loaded || loaded.session.status === "submitted") return loaded?.session ?? null;
  const db = await getDb();
  const answerRows = await db.select().from(answers).where(eq(answers.sessionId, sessionId));
  const answerByItem = new Map(answerRows.map((row) => [row.itemId, row]));
  const blanks = loaded.items.filter((item) => !answerByItem.has(item.id));
  if (blanks.length > 0) {
    await db
      .insert(answers)
      .values(
        blanks.map((item) => ({
          id: randomUUID(),
          sessionId,
          profileId,
          itemId: item.id,
          choiceId: null,
          correct: null,
          responseTimeMs: 0,
        })),
      )
      .onConflictDoNothing();
  }
  const scoreItems: ScoreItem[] = [];
  for (const item of loaded.items) {
    const answer = answerByItem.get(item.id);
    scoreItems.push({
      section: item.section as SectionId,
      slot: item.slot ?? item.position + 1,
      correct: answer ? answer.correct : null,
      responseTimeMs: answer?.responseTimeMs ?? 0,
    });
  }
  const exam = asExam(loaded.session.exam);
  const report = scoreSession(blueprintFor(exam).scoring, scoreItems);
  await db
    .update(sessions)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      score: report.score,
      correctCount: report.correct,
      wrongCount: report.wrong,
      blankCount: report.blank,
    })
    .where(eq(sessions.id, sessionId));
  if (profileId && (loaded.session.mode === "practice" || loaded.session.mode === "diagnostic")) {
    await bumpStreak(profileId);
  }
  if (profileId && loaded.session.mode === "diagnostic") {
    const total = report.correct + report.wrong + report.blank;
    const estimate = exam === "ydt" ? estimateNet(report.correct, report.wrong, total) : estimateFromAccuracy(report.correct, total);
    await db
      .update(profiles)
      .set({ estimatedLow: estimate.low, estimatedHigh: estimate.high })
      .where(eq(profiles.id, profileId));
    for (const item of loaded.items) {
      const scored = scoreItems.find((row) => row.slot === (item.slot ?? item.position + 1) && row.section === item.section);
      if (!scored || scored.correct == null) continue;
      await applyMastery(profileId, item.id, scored.correct);
    }
  }
  await recordEvent(loaded.session.mode === "diagnostic" ? "diagnostic_completed" : "simulator_completed", profileId, {
    sessionId,
    score: report.score,
  });
  return { ...loaded.session, status: "submitted", score: Math.round(report.score), correctCount: report.correct, wrongCount: report.wrong, blankCount: report.blank };
}

async function bumpStreak(profileId: string) {
  const db = await getDb();
  const rows = await db.select({ streak: profiles.streak, lastMissionDate: profiles.lastMissionDate }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
  const row = rows[0];
  if (!row) return;
  const today = todayKey();
  await db
    .update(profiles)
    .set({ streak: nextStreak(row.streak, row.lastMissionDate, today), lastMissionDate: today })
    .where(eq(profiles.id, profileId));
}

export async function ensureDailyPlan(profileId: string, dailyMinutes: number, targetScore: number | null, examDate?: string | null) {
  const db = await getDb();
  const planDate = todayKey();
  const existing = await db
    .select()
    .from(plans)
    .where(and(eq(plans.profileId, profileId), eq(plans.planDate, planDate)))
    .limit(1);
  if (existing[0]) return existing[0].payload as DailyPlan;
  const exam = await examFor(profileId);
  const pool = studyPool(await publishedPool());
  const masteryRows = await db.select().from(mastery).where(eq(mastery.profileId, profileId));
  const due = await db.select().from(reviews).where(and(eq(reviews.profileId, profileId), sql`${reviews.dueAt} <= now()`));
  const skillRows = await db.select().from(skills);
  const parents = new Map(skillRows.map((skill) => [skill.id, skill.parentId]));
  const sectionOf = (skillId: string): SectionId | null => {
    let current: string | null = skillId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      if (blueprintFor(exam).bands.some((band) => band.section === current)) return current as SectionId;
      current = parents.get(current) ?? null;
    }
    return null;
  };
  const sectionMastery = new Map<SectionId, { total: number; count: number }>();
  for (const row of masteryRows) {
    const section = sectionOf(row.skillId);
    if (!section) continue;
    const current = sectionMastery.get(section) ?? { total: 0, count: 0 };
    current.total += row.mastery;
    current.count += 1;
    sectionMastery.set(section, current);
  }
  const plan = buildPlan({
    minutes: dailyMinutes || 30,
    mastery: [...sectionMastery.entries()].map(([section, value]) => ({ section, mastery: value.total / value.count })),
    dueQuestionIds: due.filter((row) => row.targetType === "item").map((row) => row.targetId),
    dueVocabIds: due.filter((row) => row.targetType === "vocab").map((row) => row.targetId),
    pool,
    seenIds: await seenIds(profileId),
    targetSection: targetScore != null && targetScore >= (exam === "ydt" ? 60 : 80) ? "reading" : undefined,
    daysToExam: daysUntilExam(examDate),
  });
  await db.insert(plans).values({ id: randomUUID(), profileId, planDate, payload: plan });
  return plan;
}

const accessDays: Record<CheckoutPlan, number> = {
  lab_90: brand.accessDays.lab90,
  lab_180: brand.accessDays.lab180,
  sprint: brand.accessDays.sprint,
};

export async function devActivate(profileId: string, plan: CheckoutPlan) {
  const db = await getDb();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + accessDays[plan]);
  await db
    .insert(subscriptions)
    .values({ profileId, plan, status: "active", provider: "dev", periodEnd })
    .onConflictDoUpdate({
      target: subscriptions.profileId,
      set: { plan, status: "active", provider: "dev", periodEnd, updatedAt: new Date() },
    });
  await recordEvent("subscription_started", profileId, { plan, provider: "dev" });
}

export async function activateFromWebhook(input: {
  profileId: string;
  plan: PlanCode;
  status: "active" | "canceled";
  periodEnd: Date | null;
}) {
  const db = await getDb();
  await db
    .insert(subscriptions)
    .values({
      profileId: input.profileId,
      plan: input.plan,
      status: input.status,
      provider: "iyzico",
      periodEnd: input.periodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.profileId,
      set: { plan: input.plan, status: input.status, provider: "iyzico", periodEnd: input.periodEnd, updatedAt: new Date() },
    });
  await recordEvent(input.status === "active" ? "subscription_started" : "subscription_cancelled", input.profileId, {
    plan: input.plan,
  });
}

export async function claimGuestSessions(profileId: string) {
  await claimGuest(profileId);
  const db = await getDb();
  const existing = await db.select().from(mastery).where(eq(mastery.profileId, profileId)).limit(1);
  if (existing[0]) return;
  const diags = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.profileId, profileId), eq(sessions.mode, "diagnostic"), eq(sessions.status, "submitted")));
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  for (const session of diags) {
    const answerRows = await db.select().from(answers).where(eq(answers.sessionId, session.id));
    for (const answer of answerRows) {
      if (answer.correct == null) {
        blank += 1;
        continue;
      }
      if (answer.correct) correct += 1;
      else wrong += 1;
      await applyMastery(profileId, answer.itemId, answer.correct);
    }
  }
  if (correct + wrong > 0) {
    const exam = asExam(diags.at(-1)?.exam);
    const total = correct + wrong + blank;
    const estimate = exam === "ydt" ? estimateNet(correct, wrong, total) : estimateFromAccuracy(correct, total);
    await db.update(profiles).set({ estimatedLow: estimate.low, estimatedHigh: estimate.high }).where(eq(profiles.id, profileId));
  }
}
