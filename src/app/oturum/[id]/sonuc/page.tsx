import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { rehberBySection } from "@/content/rehber";
import { asExam, blueprintFor, type SectionId } from "@/modules/exam/blueprint";
import { estimateFromAccuracy, estimateNet, scoreSession, slowestSection, weakestSection, type ScoreItem } from "@/modules/exam/score";
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
  const exam = asExam(loaded.session.exam);
  const blueprint = blueprintFor(exam);
  const report = scoreSession(blueprint.scoring, scoreItems);
  const slow = slowestSection(report);
  const weak = weakestSection(report);
  const answered = report.correct + report.wrong;
  const estimate =
    loaded.session.mode === "diagnostic"
      ? exam === "ydt"
        ? estimateNet(report.correct, report.wrong, answered)
        : estimateFromAccuracy(report.correct, answered)
      : null;
  const title = (section: string) => blueprint.bands.find((band) => band.section === section)?.title ?? section;
  const missed = (wrong: number) =>
    exam === "ydt"
      ? `${wrong} yanlış, yaklaşık ${(Math.round((wrong / 4) * 100) / 100).toLocaleString("tr-TR")} net götürür`
      : `${wrong} kaçtı, ${(Math.round(wrong * 125) / 100).toLocaleString("tr-TR")} puan yerinde kaldı`;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5">
      <p className="text-sm text-muted">
        {loaded.session.mode === "diagnostic" ? "Teşhis tahmini" : loaded.session.mode === "practice" ? "Bugünün işi bitti" : exam === "ydt" ? "YDT neti" : "Deneme"}
      </p>
      <h1 className="display mt-2">{estimate ? `${estimate.low}–${estimate.high}` : report.score}</h1>
      <p className="mt-3 text-muted">
        {report.correct} doğru, {report.wrong} yanlış, {report.blank} boş.
        {estimate
          ? exam === "ydt"
            ? " Bu bir net tahminidir. YKS yerleştirme puanı değildir."
            : " Bu resmi puan değildir. 24 soru, 80 soruluk sınavın kısasıdır."
          : exam === "ydt"
            ? " Net, doğru sayısından yanlışın dörtte biri düşülerek bulunur."
            : " Puan, doğru sayısının 1,25 katıdır. Yanlış bu çarpıma girmez."}
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {report.bySection.map((row) => (
          <li key={row.section} className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2">
            {rehberBySection(row.section) ? (
              <Link href={`/rehber/${row.section}`} className="hover:text-pine">
                {title(row.section)}
              </Link>
            ) : (
              <span>{title(row.section)}</span>
            )}
            <span className="text-right text-muted">
              {row.correct}/{row.correct + row.wrong + row.blank}
              {row.wrong > 0 ? ` · ${missed(row.wrong)}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {weak ? (
        <p className="mt-4 text-sm">
          En çok kaçırdığın bölüm:{" "}
          {rehberBySection(weak.section) ? (
            <Link href={`/rehber/${weak.section}`} className="text-pine">
              {title(weak.section)}
            </Link>
          ) : (
            title(weak.section)
          )}
          .
        </p>
      ) : null}
      {slow ? <p className="text-sm">En yavaş çözdüğün bölüm: {title(slow.section)}.</p> : null}
      <div className="mt-8 flex gap-3">
        {profile ? (
            <Link href="/bugun" className="rounded-full bg-pine px-4 py-2 text-cream">
            {profile.streak > 0 ? `Seri ${profile.streak} gün` : "Bugünün işi"}
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
