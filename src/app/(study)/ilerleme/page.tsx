import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { answers, getDb, items, mastery, sessions, skills } from "@/db/client";
import { modeLabel, sessionStatusLabel, skillName } from "@/content/labels";
import { asExam, blueprintFor, type SectionId } from "@/modules/exam/blueprint";
import { currentProfile } from "@/server/auth";

export default async function ProgressPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const db = await getDb();
  const rows = await db.select().from(mastery).where(eq(mastery.profileId, profile.id));
  const skillRows = await db.select().from(skills);
  const history = await db.select().from(sessions).where(eq(sessions.profileId, profile.id)).orderBy(desc(sessions.startedAt)).limit(8);
  const answered = await db
    .select({ section: items.section, correct: answers.correct })
    .from(answers)
    .innerJoin(items, eq(items.id, answers.itemId))
    .where(eq(answers.profileId, profile.id));
  const parentOf = new Map(skillRows.map((skill) => [skill.id, skill.parentId]));
  const sectionMastery = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const parent = parentOf.get(row.skillId);
    const section = parent ?? row.skillId;
    const cell = sectionMastery.get(section) ?? { total: 0, count: 0 };
    cell.total += row.mastery;
    cell.count += 1;
    sectionMastery.set(section, cell);
  }
  const tally = new Map<string, { correct: number; wrong: number }>();
  for (const row of answered) {
    const cell = tally.get(row.section) ?? { correct: 0, wrong: 0 };
    if (row.correct === true) cell.correct += 1;
    else if (row.correct === false) cell.wrong += 1;
    tally.set(row.section, cell);
  }
  const latest = history.find(
    (session) =>
      (session.mode === "simulator" || session.mode === "diagnostic") &&
      session.status === "submitted" &&
      session.wrongCount != null,
  );
  const exam = asExam(profile.exam);
  const blueprint = blueprintFor(exam);
  const estimate =
    profile.estimatedLow != null && profile.estimatedHigh != null
      ? exam === "ydt"
        ? `Tahmini netin ${profile.estimatedLow}–${profile.estimatedHigh}. Bu, YKS puanın değildir.`
        : `Tahmini puanın ${profile.estimatedLow}–${profile.estimatedHigh}. Bu resmi puan değildir.`
      : "Seviye testini çözünce tahmini puanın burada görünür.";
  const hasAnswers = [...tally.values()].some((cell) => cell.correct + cell.wrong > 0);
  return (
    <section>
      <h1 className="display">İlerleme</h1>
      <p className="mt-2 text-sm text-muted">{estimate}</p>
      {latest && latest.wrongCount ? (
        <p className="mt-3 max-w-xl text-sm leading-6">
          Son {latest.mode === "simulator" ? "denemende" : "seviye testinde"} {latest.wrongCount} yanlışın vardı.{" "}
          {exam === "ydt"
            ? `YDT’de 4 yanlış 1 doğruyu götürdüğü için bu, yaklaşık ${(Math.round((latest.wrongCount / 4) * 100) / 100).toLocaleString("tr-TR")} net kaybı demek.`
            : `Bu soruları doğru yapsaydın ${(Math.round(latest.wrongCount * 125) / 100).toLocaleString("tr-TR")} puan daha alacaktın.`}
        </p>
      ) : null}
      <div className="mt-8 space-y-4">
        {blueprint.bands.map((band) => {
          const cell = tally.get(band.section) ?? { correct: 0, wrong: 0 };
          const seen = cell.correct + cell.wrong;
          const rolled = sectionMastery.get(band.section);
          const bar = seen > 0 ? Math.round((cell.correct / seen) * 100) : rolled ? Math.round(rolled.total / rolled.count) : 0;
          return (
            <div key={band.section}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                <Link href={`/rehber/${band.section as SectionId}`} className="min-w-0 hover:text-pine">
                  {band.title}
                </Link>
                <span className="text-right text-muted">
                  {seen > 0
                    ? `${cell.correct}/${seen}${
                        cell.wrong > 0
                          ? exam === "ydt"
                            ? ` · ${(Math.round((cell.wrong / 4) * 100) / 100).toLocaleString("tr-TR")} net kaybı`
                            : ` · ${(Math.round(cell.wrong * 125) / 100).toLocaleString("tr-TR")} puan kaybı`
                          : ""
                      }`
                    : "henüz soru çözmedin"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-line">
                <div className="h-2 rounded-full bg-pine" style={{ width: `${bar}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {!hasAnswers ? <p className="mt-4 text-sm text-muted">Soru çözdükçe her bölümdeki doğru oranın burada görünecek.</p> : null}
      <h2 className="mt-10 text-2xl">Okuma becerilerin</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {["detail", "inference", "reference", "main-idea", "purpose"].map((id) => {
          const row = rows.find((item) => item.skillId === id);
          return (
            <li key={id} className="flex justify-between gap-3">
              <span>{skillName(id)}</span>
              <span className="text-muted">{row ? `%${row.mastery}` : "henüz yok"}</span>
            </li>
          );
        })}
      </ul>
      {history.length > 0 ? <h2 className="mt-10 text-2xl">Son çalışmaların</h2> : null}
      <ul className="mt-3 space-y-2 text-sm">
        {history.map((session) => (
          <li key={session.id} className="rounded-xl border border-line bg-card px-3 py-2">
            {modeLabel[session.mode] ?? session.mode} · {sessionStatusLabel[session.status] ?? session.status}{session.score != null ? ` · ${session.score} ${session.exam === "ydt" ? "net" : "puan"}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
