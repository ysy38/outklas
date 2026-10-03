import type { Metadata } from "next";
import { diagnosticQuota, ydsBlueprint } from "@/modules/exam/blueprint";
import { startModeAction } from "@/server/actions";

export const metadata: Metadata = {
  title: "YDS teşhisi",
  description: "24 soruluk YDS teşhisi okumanın puan payını korur. Sonuç bir aralıktır, resmi ÖSYM puanı değildir.",
  alternates: { canonical: "/teshis" },
};

export default function DiagnosticPage() {
  async function start() {
    "use server";
    await startModeAction("diagnostic");
  }
  const rows = ydsBlueprint.bands.filter((band) => diagnosticQuota[band.section] > 0);
  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-12 px-5 py-16 lg:grid-cols-[1fr_0.85fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Teşhis</p>
        <h1 className="mt-3 text-5xl">Yirmi dört soru, sınavın ağırlığıyla.</h1>
        <p className="mt-4 max-w-xl leading-8 text-muted">
          Okuma metinsiz sorulmaz, boşluk doldurma tek parçadan gelir. Bittiğinde bir aralık görürsün. Bu aralık ÖSYM puanı değildir; ertesi günün listesini kurar.
        </p>
        <form action={start} className="mt-8">
          <button className="rounded-full bg-pine px-5 py-3 text-cream">Teşhisi başlat</button>
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
