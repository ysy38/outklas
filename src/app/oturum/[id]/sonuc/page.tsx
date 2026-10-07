import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { rehberBySection } from "@/content/rehber";
import { asExam, blueprintFor, type SectionId } from "@/modules/exam/blueprint";
import { estimateFromAccuracy, estimateNet, scoreSession, slowestSection, weakestSection, type ScoreItem } from "@/modules/exam/score";
import { answers, getDb } from "@/db/client";
import { DiagnosticReport } from "@/components/diagnostic-report";
import { currentProfile, readGuestId } from "@/server/auth";
import { diagnosticReport } from "@/server/report";
import { entitlementFor, loadPlayer } from "@/server/sessions";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, guestId] = await Promise.all([currentProfile(), readGuestId()]);
  const loaded = await loadPlayer(id, profile?.id ?? null, guestId ?? "");
  if (!loaded || loaded.session.status !== "submitted") notFound();
  if (loaded.session.mode === "diagnostic") {
    const [report, access] = await Promise.all([diagnosticReport(id, profile?.id ?? null, guestId ?? ""), entitlementFor(profile?.id ?? null)]);
    if (!report) notFound();
    return (
      <main className="landing mx-auto max-w-3xl px-4 py-10 sm:px-5">
        <DiagnosticReport report={report} tier={access.tier} signedIn={Boolean(profile)} />
      </main>
    );
  }
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
  const total = report.correct + report.wrong + report.blank;
  const answered = report.correct + report.wrong;
  const estimate =
    loaded.session.mode === "diagnostic" && answered > 0
      ? exam === "ydt"
        ? estimateNet(report.correct, report.wrong, total)
        : estimateFromAccuracy(report.correct, total)
      : null;
  const emptyDiagnostic = loaded.session.mode === "diagnostic" && answered === 0;
  const title = (section: string) => blueprint.bands.find((band) => band.section === section)?.title ?? section;
  const missed = (wrong: number) =>
    exam === "ydt"
      ? `${wrong} yanlış, ${(Math.round((wrong / 4) * 100) / 100).toLocaleString("tr-TR")} net kaybı`
      : `${wrong} yanlış, ${(Math.round(wrong * 125) / 100).toLocaleString("tr-TR")} puan kaybı`;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5">
      <p className="text-sm text-muted">
        {loaded.session.mode === "diagnostic" ? (exam === "ydt" ? "Tahmini netin" : "Tahmini puanın") : loaded.session.mode === "practice" ? "Bugünkü çalışman tamam" : exam === "ydt" ? "Deneme netin" : "Deneme puanın"}
      </p>
      <h1 className="display mt-2">{emptyDiagnostic ? "Sonuç yok" : estimate ? `${estimate.low}–${estimate.high}` : report.score}</h1>
      <p className="mt-3 text-muted">
        {report.correct} doğru, {report.wrong} yanlış, {report.blank} boş.
        {emptyDiagnostic
          ? " Hiç soru cevaplamadığın için puan tahmini yapamadık. Testi yeniden başlatıp soruları cevaplarsan sonucunu görürsün."
          : estimate
            ? exam === "ydt"
              ? " Bu, 80 soruluk sınavda alabileceğin netin tahmini aralığıdır. YKS yerleştirme puanı değildir."
              : " Bu, 80 soruluk sınavda alabileceğin puanın tahmini aralığıdır. Resmi puan değildir."
            : exam === "ydt"
              ? " Net, doğru sayından yanlışlarının dörtte biri çıkarılarak hesaplanır."
              : " Puan, doğru sayının 1,25 katıdır. Yanlışlar doğrularını götürmez."}
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
          En çok puan kaybettiğin bölüm:{" "}
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
      {slow ? <p className="text-sm">En çok vakit harcadığın bölüm: {title(slow.section)}.</p> : null}
      <div className="mt-8 flex gap-3">
        {profile ? (
            <Link href="/bugun" className="rounded-full bg-pine px-4 py-2 text-cream">
            {profile.streak > 0 ? `${profile.streak} gündür aralıksız çalışıyorsun` : "Bugünkü çalışmana geç"}
          </Link>
        ) : (
          <Link href="/giris" className="rounded-full bg-pine px-4 py-2 text-cream">
            Hesap aç, sonucunu kaydet
          </Link>
        )}
        <Link href="/" className="rounded-full border border-line px-4 py-2">
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
