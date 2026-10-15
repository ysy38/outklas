import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/brand";
import { relationHint } from "@/content/drill-connectors";
import { offers, priceFor, tl } from "@/content/offers";
import { currentProfile, readGuestId } from "@/server/auth";
import { drillOverview, type DrillOverview } from "@/server/drills";
import { diagnosticReport, latestDiagnosticId } from "@/server/report";
import { ensureDailyPlan, entitlementFor } from "@/server/sessions";
import { asExam, blueprintFor } from "@/modules/exam/blueprint";
import { daysUntilExam } from "@/modules/learning/plan";
import { freeFindings } from "@/modules/report/report";
import { hasProgram, type Tier } from "@/modules/billing/entitlement";
import { PendingButton } from "@/components/pending-button";
import { saveOnboardingAction, startTodayAction } from "@/server/actions";

type DayScore = DrillOverview["word"];

function DrillCard({ href, title, noun, score, tier }: { href: string; title: string; noun: string; score: DayScore; tier: Tier }) {
  const { today, yesterday, limit } = score;
  const finished = tier === "free" && today.done >= limit;
  const better = today.done > 0 && yesterday.done > 0 && today.correct / today.done > yesterday.correct / yesterday.done;
  return (
    <Link href={href} className="lift group flex flex-col rounded-3xl border border-line bg-card p-5 transition hover:border-pine">
      <p className="text-xs uppercase tracking-[0.16em] text-gold">{title}</p>
      <p className="mt-3 font-serif text-3xl">
        {today.done > 0 ? (
          <>
            Bugün {today.correct}/{today.done}
          </>
        ) : (
          `Günün ${limit} ${noun} sorusu`
        )}
      </p>
      <p className="mt-1 text-sm text-muted">
        {yesterday.done > 0 ? `Dün ${yesterday.correct}/${yesterday.done}` : "Her gün yeni sorular"}
        {better ? " · düne göre daha iyisin" : ""}
      </p>
      {tier === "free" ? (
        <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-paper">
          <span className="block h-full rounded-full bg-pine" style={{ width: `${Math.min(100, (today.done / limit) * 100)}%` }} />
        </span>
      ) : null}
      <span className="mt-4 text-sm text-pine">
        {finished ? "Bugünlük tamam. Yarın yeni sorular gelecek." : today.done > 0 ? "Devam et →" : "Başla →"}
      </span>
    </Link>
  );
}

export const metadata = { title: "Bugün" };

export default async function TodayPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  if (!profile.onboardingCompleted) {
    return (
      <section className="max-w-lg">
        <h1 className="display">Hangi sınava hazırlanıyorsun, hedefin kaç?</h1>
        <form action={saveOnboardingAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            Sınav
            <select name="exam" defaultValue="yds" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
              <option value="yds">YDS / e-YDS</option>
              <option value="ydt">YDT, YKS yabancı dil</option>
            </select>
          </label>
          <label className="block text-sm">
            Hedefin
            <select name="targetScore" defaultValue={70} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
              {[50, 60, 70, 80, 90].map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted">YDS’de hedefini puan, YDT’de net olarak seç. YDT’de 4 yanlış 1 doğruyu götürür; YDS’de yanlışlar puanını düşürmez.</p>
          <label className="block text-sm">
            Sınav tarihi
            <input name="examDate" type="date" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
          </label>
          <label className="block text-sm">
            Günde kaç dakika ayırabilirsin?
            <select name="dailyMinutes" defaultValue={30} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
              {[10, 20, 30, 45, 60].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Daha önce sınava girdiysen son puanın
            <input name="priorScore" type="number" min={0} max={100} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
          </label>
          <PendingButton pendingLabel="Kaydediliyor…" className="w-full rounded-full bg-pine px-4 py-3 text-cream sm:w-auto">
            Kaydet ve devam et
          </PendingButton>
        </form>
      </section>
    );
  }
  const exam = asExam(profile.exam);
  const blueprint = blueprintFor(exam);
  const unit = exam === "ydt" ? "net" : "puan";
  const [access, overview, sessionId, guestId] = await Promise.all([
    entitlementFor(profile.id),
    drillOverview(profile.id),
    latestDiagnosticId(profile.id),
    readGuestId(),
  ]);
  const program = hasProgram(access.tier);
  const [plan, report] = await Promise.all([
    program ? ensureDailyPlan(profile.id, profile.dailyMinutes ?? 30, profile.targetScore, profile.examDate) : null,
    !program && sessionId ? diagnosticReport(sessionId, profile.id, guestId ?? "") : null,
  ]);
  const daysLeft = daysUntilExam(profile.examDate);
  const midpoint =
    profile.estimatedLow != null && profile.estimatedHigh != null ? Math.round((profile.estimatedLow + profile.estimatedHigh) / 2) : null;
  const target = profile.targetScore;
  const gap = midpoint != null && target != null ? target - midpoint : null;
  const title = (section: string) => blueprint.bands.find((band) => band.section === section)?.title ?? section;
  const skip = (plan?.skipSections ?? []).map(title);
  const weak = overview.weakRelations[0];
  return (
    <section className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{blueprint.title}</p>
      <h1 className="display mt-2">
        {gap != null && gap > 0 ? `Hedefine ~${gap} ${unit} kaldı` : gap != null ? "Hedef puanını yakaladın" : "Bugünkü çalışman"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {midpoint != null ? `Tahmini ${exam === "ydt" ? "netin" : "puanın"} ${profile.estimatedLow}–${profile.estimatedHigh}` : "Önce seviyeni ölç, sonra hedefine ne kadar kaldığını burada gör."}
        {daysLeft != null && daysLeft >= 0 ? (daysLeft === 0 ? " · sınavın bugün" : ` · sınavına ${daysLeft} gün var`) : ""}
        {profile.streak > 0 ? ` · ${profile.streak} gündür aralıksız çalışıyorsun` : ""}
      </p>

      {midpoint != null && target != null ? (
        <div className="mt-6 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              Şu an <span className="font-serif text-2xl">~{midpoint}</span>
            </span>
            <span className="text-muted">
              Hedef <span className="font-serif text-2xl text-ink">{target}</span>
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper" role="img" aria-label={`Hedefin ${target}, şu an yaklaşık ${midpoint}`}>
            <div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(4, Math.min(100, (midpoint / target) * 100))}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            {gap != null && gap > 0
              ? "Çözdüğün her deneme ve çalışma bu tahmini günceller."
              : "Şimdi amaç bu seviyeyi sınav gününe kadar korumak."}
          </p>
        </div>
      ) : midpoint == null ? (
        <Link href="/teshis" className="mt-6 block rounded-3xl border border-pine bg-card p-5 transition hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">İlk adım</p>
          <p className="mt-2 text-xl">{brand.diagnosticQuestions} soruluk seviye testini çöz →</p>
          <p className="mt-1 text-sm text-muted">Yaklaşık {brand.diagnosticMinutes} dakika. Sonunda puanını aşağı çeken bölümleri görürsün.</p>
        </Link>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <DrillCard href="/kelime" title="Kelime" noun="kelime" score={overview.word} tier={access.tier} />
        <DrillCard href="/baglac" title="Bağlaç" noun="bağlaç" score={overview.connector} tier={access.tier} />
      </div>
      {weak ? (
        <p className="mt-4 rounded-2xl border border-line bg-cream px-4 py-3 text-sm leading-6">
          Bağlaçlarda en çok <strong className="font-medium">{weak.label}</strong> ilişkisinde zorlanıyorsun (son 30 günde {weak.correct}/{weak.total} doğru). Bu
          cümlelerde {relationHint[weak.relation]}; bağlacı seçmeden önce bunu fark et.
        </p>
      ) : null}

      {program && plan ? (
        <>
          {daysLeft != null && daysLeft >= 0 && daysLeft <= 14 ? (
            <p className="mt-6 text-sm leading-6 text-muted">Sınavın yaklaştı. Bu yüzden bugün yeni sorulardan çok, daha önce yanlış yaptığın soruları tekrar edeceksin.</p>
          ) : null}
          <article className="mt-6 rounded-3xl border border-line bg-card p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Bugünün görevi · {plan.totalMinutes} dakika</p>
            <p className="mt-3 text-2xl">Zayıf olduğun bölümden sorular, önceki yanlışların ve birkaç yeni soru.</p>
            <p className="mt-3 text-sm leading-6 text-muted">Hepsini bitirdiğinde bugünkü çalışman tamamlanır.</p>
            {skip.length > 0 ? <p className="mt-3 text-sm leading-6">Bu bölümlerde zaten iyisin, bugün onlara vakit ayırmana gerek yok: {skip.join(", ")}.</p> : null}
            <form action={startTodayAction} className="mt-5">
              <PendingButton pendingLabel="Sorular hazırlanıyor…" className="w-full rounded-full bg-pine px-5 py-3 text-cream sm:w-auto">
                Çalışmaya başla
              </PendingButton>
            </form>
          </article>
        </>
      ) : null}

      {access.tier === "free" ? (
        <article className="mt-6 rounded-3xl border border-pine/40 bg-cream p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">
            {offers.gelisim.name} ve {offers.kamp.name}
          </p>
          <p className="mt-2 text-xl">Her gün ne çalışacağını düşünme.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {report ? `Raporunda ${report.findings.length} bulgu var, ${Math.min(freeFindings, report.findings.length)} tanesini gördün. ` : ""}
            İki paket de hedef puanına ve sınav tarihine göre her gün hazır bir görev listesi verir.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Link href={report ? "/rapor#paketler" : "/fiyat"} className="rounded-full bg-pine px-4 py-2 text-cream">
              Paketleri gör
            </Link>
            {report ? (
              <Link href="/rapor" className="text-pine">
                Raporuma dön →
              </Link>
            ) : null}
          </div>
        </article>
      ) : access.tier === "gelisim" ? (
        <article className="mt-6 rounded-3xl border border-pine/40 bg-cream p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">{offers.kamp.name}</p>
          <p className="mt-2 text-xl">Sınırsız deneme ve {offers.kamp.days} gün.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {offers.kamp.name}’a geçersen {offers.gelisim.name} için ödediğin {tl(offers.gelisim.price)} TL düşülür.
          </p>
          <Link href="/odeme?paket=kamp" className="mt-4 inline-block rounded-full bg-pine px-4 py-2 text-sm text-cream">
            {offers.kamp.name}’a geç · {tl(priceFor("kamp", access.tier))} TL
          </Link>
        </article>
      ) : null}
    </section>
  );
}
