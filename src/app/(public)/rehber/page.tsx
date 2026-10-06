import type { Metadata } from "next";
import Link from "next/link";
import { rehberBySection } from "@/content/rehber";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "YDS rehberi",
  description: "YDS ve e-YDS kitapçığındaki on bölüm: ne ölçülür, nereye bakılır, nerede kaçılır.",
  alternates: { canonical: "/rehber" },
};

export default function GuideIndexPage() {
  return (
    <section className="landing mx-auto w-full max-w-6xl px-4 py-12 sm:px-5 sm:py-20">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Rehber</p>
      <h1 className="display-xl mt-4 max-w-3xl font-serif">
        On bölüm. <span className="grad">Puan bunların içinde.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
        Kitapçık yıllardır aynı düzende gelir. Her bölümde neye bakacağın ve nasıl çözeceğin burada yazıyor. Soru çözdükçe senin sonuçların da o sayfada görünür.
      </p>
      <ol className="mt-12 grid gap-3 md:grid-cols-2">
        {ydsBlueprint.bands.map((band) => {
          const note = rehberBySection(band.section);
          return (
            <li key={band.section} data-rise>
              <Link href={`/rehber/${band.section}`} className="lift glass group block h-full rounded-[28px] border border-line p-6">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-2xl">{band.title}</span>
                  <span className="shrink-0 text-sm text-muted">
                    {band.to - band.from + 1} soru
                    <span className="ml-2 inline-block text-pine opacity-0 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100">→</span>
                  </span>
                </span>
                <span className="mt-3 block text-sm leading-6 text-muted">{note?.measures}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
