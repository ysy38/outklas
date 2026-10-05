import type { Metadata } from "next";
import { PendingButton } from "@/components/pending-button";
import { diagnosticQuota, ydsBlueprint } from "@/modules/exam/blueprint";
import { startDiagnosticAction } from "@/server/actions";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "YDS teşhisi",
  description: "24 soruluk ölçüm. Sonuç resmi puan değildir; 80 soruluk sınavın kısaltılmış bir tahminidir.",
  alternates: { canonical: "/teshis" },
};

export default function DiagnosticPage() {
  const rows = ydsBlueprint.bands.filter((band) => diagnosticQuota[band.section] > 0);
  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 py-10 sm:px-5 sm:py-16 lg:grid-cols-[1fr_0.85fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Teşhis</p>
        <h1 className="display mt-3">Yirmi dört soru, sınavın ağırlığıyla.</h1>
        <p className="mt-4 max-w-xl leading-8 text-muted">
          Okuma metinsiz sorulmaz, boşluk doldurma tek parçadan gelir. Bittiğinde tahmini bir puan görürsün. Bu resmi puan değildir; ertesi günün listesini kurar.
        </p>
        <form action={startDiagnosticAction} className="mt-8">
          <PendingButton pendingLabel="Açılıyor…" className="w-full rounded-full bg-pine px-5 py-3 text-cream sm:w-auto">
            Teşhisi başlat
          </PendingButton>
        </form>
        <p className="mt-4 text-sm text-muted">Hesap sonda istenir. Süre, tam denemenin 180 dakikası değildir.</p>
      </div>
      <ol className="rounded-[28px] border border-line bg-card p-5">
        {rows.map((band) => (
          <li key={band.section} className="flex items-baseline justify-between gap-4 border-b border-line py-3 text-sm last:border-0">
            <span>{band.title}</span>
            <span className="text-muted">{diagnosticQuota[band.section]} soru</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
