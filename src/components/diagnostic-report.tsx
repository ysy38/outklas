import Link from "next/link";
import { brand } from "@/brand";
import { rehberBySection } from "@/content/rehber";
import { hasTools, type Tier } from "@/modules/billing/entitlement";
import { formatNumber, freeFindings, type Report } from "@/modules/report/report";
import { OfferCards } from "./offer-cards";

function Ladder({ report }: { report: Report }) {
  const ceiling = report.exam === "ydt" ? 80 : 100;
  const potential = report.scenario?.high ?? null;
  const marks = [
    { label: "Şu an", value: report.estimate.point, tone: "bg-ink" },
    { label: "İlk hedef", value: report.firstTarget, tone: "bg-pine" },
    ...(potential != null && potential > report.firstTarget ? [{ label: "Ulaşılabilir görünen", value: potential, tone: "bg-moss" }] : []),
  ];
  return (
    <div className="mt-8">
      <div className="relative h-2 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-pine/30" style={{ width: `${(report.estimate.point / ceiling) * 100}%` }} />
        {marks.map((mark) => (
          <span
            key={mark.label}
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card ${mark.tone}`}
            style={{ left: `${(mark.value / ceiling) * 100}%` }}
          />
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        {marks.map((mark) => (
          <div key={mark.label}>
            <dt className="text-muted">{mark.label}</dt>
            <dd className="font-serif text-3xl">
              {mark.value}
              {mark.label === "Ulaşılabilir görünen" ? "+" : ""}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DiagnosticReport({ report, tier, signedIn }: { report: Report; tier: Tier; signedIn: boolean }) {
  const full = hasTools(tier);
  const examName = report.exam === "ydt" ? "YDT netin" : "YDS puanın";
  const answered = report.correct + report.wrong;
  const shown = full ? report.findings : report.findings.slice(0, freeFindings);
  const locked = full ? [] : report.findings.slice(freeFindings);
  const pulling = report.areas.filter((area) => area.loss > 0).slice(0, 3);

  if (answered === 0) {
    return (
      <section className="rounded-3xl border border-line bg-card p-6">
        <h1 className="display">Sonuç yok</h1>
        <p className="mt-3 leading-7 text-muted">Hiç soru cevaplamadığın için tahmin yapamadık. Testi yeniden başlatıp soruları cevaplarsan raporunu görürsün.</p>
        <Link href="/teshis" className="mt-6 inline-block rounded-full bg-pine px-5 py-3 text-cream">
          Seviye testine dön
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-14">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Tahmini {examName}</p>
        <h1 className="display-xl mt-3 font-serif">
          {report.estimate.low}–{report.estimate.high}
        </h1>
        <p className="mt-2 text-lg">Tahmini merkez {report.unit}: {report.estimate.point}</p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          {report.total} sorudan {report.correct} doğru, {report.wrong} yanlış, {report.blank} boş. Bu, 80 soruluk sınavda alabileceğin {report.unit === "net" ? "netin" : "puanın"} tahmini aralığıdır; resmi sonuç değildir.
        </p>
        <Ladder report={report} />
        {report.scenario && report.scenario.high > report.firstTarget ? (
          <p className="mt-3 text-xs leading-5 text-muted">“Ulaşılabilir görünen”, bu testteki performansına göre hesaplanan bir hedef aralığıdır; garanti değildir.</p>
        ) : null}
      </section>

      {pulling.length > 0 ? (
        <section>
          <h2 className="text-3xl">Neden {report.estimate.point}?</h2>
          <p className="mt-2 text-sm text-muted">{report.unit === "net" ? "Netini" : "Puanını"} en çok aşağı çeken {pulling.length} bölüm:</p>
          <ul className="mt-5 space-y-4">
            {pulling.map((area) => (
              <li key={area.section} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {rehberBySection(area.section) ? (
                    <Link href={`/rehber/${area.section}`} className="font-medium hover:text-pine">
                      {area.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{area.title}</span>
                  )}
                  <span className={`text-sm ${area.level === "Geliştirilmeli" ? "text-clay" : area.level === "Orta" ? "text-gold" : "text-moss"}`}>{area.level}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-line">
                  <div className="h-2 rounded-full bg-pine" style={{ width: `${Math.round(area.accuracy * 100)}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {area.correct}/{area.total} doğru · gerçek sınavda yaklaşık {formatNumber(area.loss)} {report.unit} kaybı
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl bg-paper p-5">
            <p className="font-medium">Hatalarının hepsi aynı değerde değil.</p>
            {report.weightNote ? <p className="mt-2 text-sm leading-6 text-muted">{report.weightNote}</p> : null}
            <p className="mt-2 text-sm leading-6">Daha çok soru çözmek yerine doğru bölümlere çalışırsan {report.unit === "net" ? "netin" : "puanın"} daha hızlı yükselir.</p>
          </div>
        </section>
      ) : null}

      {report.scenario ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="text-3xl">Şu an en büyük fırsatın burada.</h2>
          <p className="mt-3 leading-7">
            {report.scenario.titles.join(" ile ")} bölümlerindeki açığını kapattığında tahmini aralığın:
          </p>
          <p className="mt-3 font-serif text-4xl">
            {report.estimate.point} → {report.scenario.low}–{report.scenario.high}
          </p>
          <p className="mt-3 text-xs leading-5 text-muted">
            Bu bir garanti değildir. Testteki açıkların kapanması hâlinde oluşabilecek tahmini bir senaryodur.
          </p>
        </section>
      ) : null}

      {report.findings.length > 0 ? (
        <section>
          <h2 className="text-3xl">Raporunda {report.findings.length} bulgu var.</h2>
          <ul className="mt-5 space-y-3">
            {shown.map((finding) => (
              <li key={finding.id} className="rounded-2xl border border-line bg-card p-4">
                <p className="font-medium">
                  <span aria-hidden className="mr-2 text-pine">✓</span>
                  {finding.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{finding.detail}</p>
              </li>
            ))}
            {locked.map((finding) => (
              <li key={finding.id} className="relative overflow-hidden rounded-2xl border border-dashed border-line p-4">
                <p className="font-medium text-muted">
                  <svg aria-hidden viewBox="0 0 16 16" className="mr-2 inline h-4 w-4 -translate-y-px fill-current">
                    <path d="M4 7V5a4 4 0 1 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4Zm1.5 0h5V5a2.5 2.5 0 0 0-5 0v2Z" />
                  </svg>
                  {finding.teaser}
                </p>
                <p aria-hidden className="mt-2 select-none text-sm leading-6 text-muted blur-[5px]">
                  Bu bulgunun ayrıntısı, raporu açtığında burada görünür. Hangi bölümde neye dikkat etmen gerektiğini anlatır.
                </p>
              </li>
            ))}
          </ul>
          {locked.length > 0 ? (
            <a href="#paketler" className="mt-5 inline-block rounded-full bg-pine px-5 py-3 text-cream transition hover:-translate-y-0.5">
              {locked.length} bulguyu daha aç
            </a>
          ) : null}
        </section>
      ) : null}

      {tier === "free" ? (
        <section id="paketler" className="scroll-mt-24">
          <h2 className="text-3xl">Peki bundan sonra ne yapmalısın?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Sınavına {brand.sprintMaxDays} gün ya da daha az varsa Sprint, daha fazla varsa Kamp. İkisinde de hedefine göre günlük programın hazır gelir. Tek ödeme, abonelik yok, fiyatlar KDV dahil.
          </p>
          <div className="mt-8">
            <OfferCards signedIn={signedIn} tier={tier} />
          </div>
        </section>
      ) : (
        <section className="rounded-3xl bg-pine p-6 text-cream">
          <h2 className="text-3xl text-cream">Programın hazır.</h2>
          <p className="mt-2 text-sm leading-6 text-cream/80">Bugünün görevleri bu rapora göre seçildi.</p>
          <Link href="/bugun" className="mt-5 inline-block rounded-full bg-cream px-5 py-3 text-pine-deep">
            Bugünün görevlerine geç
          </Link>
        </section>
      )}

      {tier === "free" ? (
        <section className="rounded-3xl border border-line p-6">
          <h2 className="text-2xl">Şimdilik ücretsiz devam et</h2>
          <p className="mt-3 leading-7 text-muted">
            Her gün {brand.freeDailyWords} kelime ve {brand.freeDailyConnectors} bağlaç çalış. Gelişimini takip et, istediğin zaman tekrar değerlendir.
          </p>
          <Link
            href={signedIn ? "/kelime" : "/giris?kayit=1"}
            className="mt-5 inline-block rounded-full border border-pine px-5 py-3 text-pine transition hover:bg-pine hover:text-cream"
          >
            {signedIn ? "Bugünün kelimelerine başla" : "Ücretsiz hesabımı oluştur"}
          </Link>
          {!signedIn ? <p className="mt-3 text-xs text-muted">Hesap açınca bu rapor da hesabına kaydedilir.</p> : null}
        </section>
      ) : null}

      <details className="rounded-2xl border border-line p-4">
        <summary className="cursor-pointer text-sm">Bölüm bölüm sonuçların</summary>
        <ul className="mt-4 space-y-2 text-sm">
          {report.areas.map((area) => (
            <li key={area.section} className="flex items-baseline justify-between gap-3">
              <span>{area.title}</span>
              <span className="text-muted">
                {area.correct}/{area.total}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
