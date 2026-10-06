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
    <section className="landing mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-12 sm:px-5 sm:py-20 lg:grid-cols-[1fr_0.85fr]">
      <div className="rise-in">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Ücretsiz teşhis</p>
        <h1 className="display-xl mt-4 font-serif">
          Yirmi dört soru. <span className="grad">Puanın nerede kalıyor, gör.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          Sorular sınavdaki ağırlığa göre dağılır: okuma metniyle gelir, boşluk doldurma tek parçadan. Bittiğinde tahmini puanını ve en çok puan bıraktığın bölümü görürsün. Bu resmi puan değildir; ertesi günün işini kurar.
        </p>
        <form action={startDiagnosticAction} className="mt-8">
          <PendingButton pendingLabel="Açılıyor…" className="shine w-full rounded-full bg-pine px-6 py-3.5 text-cream transition hover:-translate-y-0.5 sm:w-auto">
            Teşhisi başlat →
          </PendingButton>
        </form>
        <p className="mt-4 text-sm text-muted">Üye olmadan başlarsın; hesap sonda istenir. Yaklaşık 15 dakika sürer.</p>
      </div>
      <ol className="rise-in rise-in-late tilt glass rounded-[32px] border border-line p-6">
        <li className="pb-3 text-[11px] uppercase tracking-[0.16em] text-muted">Soruların dağılımı</li>
        {rows.map((band) => (
          <li key={band.section} className="flex items-baseline justify-between gap-4 border-t border-line py-3 text-sm">
            <span>{band.title}</span>
            <span className="text-muted">{diagnosticQuota[band.section]} soru</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
