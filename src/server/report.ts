import { and, answers, choices, desc, eq, getDb, inArray, itemSkills, profiles, sessions } from "@/db/client";
import { asExam, blueprintFor, type SectionId } from "@/modules/exam/blueprint";
import { buildReport, type ReportItem } from "@/modules/report/report";
import { loadPlayer } from "./sessions";

export async function diagnosticReport(sessionId: string, profileId: string | null, guestId: string) {
  const loaded = await loadPlayer(sessionId, profileId, guestId);
  if (!loaded || loaded.session.status !== "submitted" || loaded.session.mode !== "diagnostic") return null;
  const db = await getDb();
  const itemIds = loaded.items.map((item) => item.id);
  const [answerRows, skillRows, profileRows] = await Promise.all([
    db.select().from(answers).where(eq(answers.sessionId, sessionId)),
    itemIds.length ? db.select().from(itemSkills).where(inArray(itemSkills.itemId, itemIds)) : Promise.resolve([]),
    profileId ? db.select({ targetScore: profiles.targetScore }).from(profiles).where(eq(profiles.id, profileId)).limit(1) : Promise.resolve([]),
  ]);
  const choiceIds = answerRows.map((row) => row.choiceId).filter((id): id is string => Boolean(id));
  const choiceRows = choiceIds.length ? await db.select().from(choices).where(inArray(choices.id, choiceIds)) : [];
  const items: ReportItem[] = loaded.items.map((item) => {
    const answer = answerRows.find((row) => row.itemId === item.id);
    const chosen = choiceRows.find((row) => row.id === answer?.choiceId);
    return {
      section: item.section as SectionId,
      skills: skillRows.filter((row) => row.itemId === item.id).map((row) => row.skillId),
      correct: answer?.correct ?? null,
      timeMs: answer?.responseTimeMs ?? 0,
      distractor: chosen && !chosen.correct ? chosen.distractorType : null,
    };
  });
  const exam = asExam(loaded.session.exam);
  return buildReport({ exam, bands: blueprintFor(exam).bands, items, targetScore: profileRows[0]?.targetScore ?? null });
}

export async function latestDiagnosticId(profileId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.profileId, profileId), eq(sessions.mode, "diagnostic"), eq(sessions.status, "submitted")))
    .orderBy(desc(sessions.submittedAt))
    .limit(1);
  return rows[0]?.id ?? null;
}
