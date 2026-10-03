import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ydsBlueprint, type SectionId } from "@/modules/exam/blueprint";
import { estimateFromAccuracy, scoreSession, slowestSection, weakestSection, type ScoreItem } from "@/modules/exam/score";
import { answers, getDb } from "@/db/client";
import { currentProfile, readGuestId } from "@/server/auth";
import { loadPlayer } from "@/server/sessions";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await currentProfile();
  const loaded = await loadPlayer(id, profile?.id ?? null, (await readGuestId()) ?? "");
  if (!loaded || loaded.session.status !== "submitted") notFound();
  const db = await getDb();
  const answerRows = await db.select().from(answers).where(eq(answers.sessionId, id));
  const scoreItems: ScoreItem[] = loaded.items.map((item) => {
    const answer = answerRows.find((row) => row.itemId === item.id);
    return {
      section: item.section as SectionId,
      slot: item.slot ?? item.position + 1,
      correct: answer?.correct ?? null,
      responseTimeMs: answer?.responseTimeMs ?? 0,
    };
  });
  const report = scoreSession(ydsBlueprint.scoring, scoreItems);
  const slow = slowestSection(report);
  const weak = weakestSection(report);
  const estimate = loaded.session.mode === "diagnostic" ? estimateFromAccuracy(report.correct, report.correct + report.wrong) : null;
  const title = (section: string) => ydsBlueprint.bands.find((band) => band.section === section)?.title ?? section;
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-sm text-muted">{loaded.session.mode === "diagnostic" ? "Teşhis tahmini" : "Deneme"}</p>
      <h1 className="mt-2 text-5xl">{estimate ? `${estimate.low}–${estimate.high}` : report.score}</h1>
      <p className="mt-3 text-muted">
        {report.correct} doğru, {report.wrong} yanlış, {report.blank} boş.
        {estimate ? " Bu aralık resmi bir YDS puanı değildir." : " Puan doğru sayısı çarpı 1,25'tir. Yanlış düşmez."}
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {report.bySection.map((row) => (
          <li key={row.section} className="flex justify-between rounded-xl border border-line bg-card px-3 py-2">
            <span>{title(row.section)}</span>
            <span>
              {row.correct}/{row.correct + row.wrong + row.blank}
            </span>
          </li>
        ))}
      </ul>
      {weak ? <p className="mt-4 text-sm">En çok kaçan bant: {title(weak.section)}.</p> : null}
      {slow ? <p className="text-sm">En yavaş bant: {title(slow.section)}.</p> : null}
      <div className="mt-8 flex gap-3">
        {profile ? (
          <Link href="/bugun" className="rounded-full bg-pine px-4 py-2 text-cream">
            Bugünkü plan
          </Link>
        ) : (
          <Link href="/giris" className="rounded-full bg-pine px-4 py-2 text-cream">
            Planı kaydet
          </Link>
        )}
        <Link href="/" className="rounded-full border border-line px-4 py-2">
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
