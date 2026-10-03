import type { Metadata } from "next";
import Link from "next/link";
import { rehberBySection } from "@/content/rehber";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export const metadata: Metadata = {
  title: "YDS rehberi",
  description: "YDS ve e-YDS kitapçığındaki on bölüm: ne ölçülür, nereye bakılır, nerede kaçılır.",
  alternates: { canonical: "/rehber" },
};

export default function GuideIndexPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Rehber</p>
      <h1 className="mt-3 max-w-2xl text-5xl">On bölüm. Puan bunların içinde.</h1>
      <p className="mt-4 max-w-2xl leading-8 text-muted">
        Kitapçık yıllardır aynı sırayla gelir. Burada her bölümde neye bakacağın yazıyor. Soru çözdükçe senin sayın da o sayfaya düşer.
      </p>
      <ol className="mt-10 grid gap-3 md:grid-cols-2">
        {ydsBlueprint.bands.map((band) => {
          const note = rehberBySection(band.section);
          return (
            <li key={band.section}>
              <Link href={`/rehber/${band.section}`} className="block rounded-3xl border border-line bg-card p-5 hover:border-pine">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-2xl">{band.title}</span>
                  <span className="text-sm text-muted">
                    {band.from}–{band.to}
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
