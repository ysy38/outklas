import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { skillName } from "@/content/labels";
import { rehberBySection } from "@/content/rehber";
import { and, answers, eq, getDb, inArray, items, mastery } from "@/db/client";
import { ydsBlueprint, type SectionId } from "@/modules/exam/blueprint";
import { currentProfile } from "@/server/auth";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const band = ydsBlueprint.bands.find((item) => item.section === section);
  const note = rehberBySection(section);
  if (!band || !note) return { title: "Rehber" };
  return {
    title: `${band.title} nasıl çözülür`,
    description: note.measures,
    alternates: { canonical: `/rehber/${section}` },
  };
}

export default async function GuideSectionPage({ params }: Props) {
  const { section } = await params;
  const band = ydsBlueprint.bands.find((item) => item.section === section);
  const note = rehberBySection(section);
  if (!band || !note) notFound();
  const profile = await currentProfile();
  const stats = profile ? await sectionStats(profile.id, band.section) : null;
  const readingSkills = profile && band.section === "reading" ? await readingBreakdown(profile.id) : [];

  return (
    <article className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-5 sm:py-16 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">
          <Link href="/rehber" className="hover:text-ink">
            Rehber
          </Link>
          {" · "}
          {band.from}–{band.to}
        </p>
        <h1 className="display mt-3">{band.title}</h1>
        <p className="mt-4 max-w-xl leading-8 text-muted">{note.measures}</p>
        <h2 className="mt-10 text-3xl">Nereye bakılır</h2>
        <ol className="mt-4 space-y-3">
          {note.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6">
              <span className="font-serif text-gold">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <h2 className="mt-10 text-3xl">Nerede kaçar</h2>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
          {note.misses.map((miss) => (
            <li key={miss}>{miss}</li>
          ))}
        </ul>
      </div>
      <aside className="space-y-4">
        <div className="rounded-[28px] border border-line bg-card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Not</p>
          <p className="mt-3 leading-7">{note.tip}</p>
        </div>
        <div className="rounded-[28px] border border-line bg-card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Sende</p>
          {stats && stats.answered > 0 ? (
            <>
              <p className="mt-3 font-serif text-4xl">
                {stats.correct}/{stats.answered}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Bu bölümde çözdüğün sorular. {stats.wrong > 0 ? `${stats.wrong} tanesi kaçtı. Tam sınavda bu, ${(Math.round(stats.wrong * 125) / 100).toLocaleString("tr-TR")} puanın yerinde kalması demektir.` : "Henüz yanlışın yok."}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">Bu bölümden henüz soru yok. Teşhis onu açar.</p>
          )}
          {readingSkills.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {readingSkills.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>{row.name}</span>
                  <span className="text-muted">{row.mastery}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href={profile ? "/bugun" : "/teshis"} className="mt-5 inline-block rounded-full bg-pine px-4 py-2 text-sm text-cream">
            {profile ? "Bugünün listesine dön" : "Teşhisi başlat"}
          </Link>
        </div>
      </aside>
    </article>
  );
}

async function sectionStats(profileId: string, section: SectionId) {
  const db = await getDb();
  const rows = await db
    .select({ correct: answers.correct })
    .from(answers)
    .innerJoin(items, eq(items.id, answers.itemId))
    .where(and(eq(answers.profileId, profileId), eq(items.section, section)));
  let correct = 0;
  let wrong = 0;
  for (const row of rows) {
    if (row.correct === true) correct += 1;
    else if (row.correct === false) wrong += 1;
  }
  return { correct, wrong, answered: correct + wrong };
}

async function readingBreakdown(profileId: string) {
  const db = await getDb();
  const readingIds = ["detail", "inference", "reference", "main-idea", "purpose"];
  const rows = await db
    .select({ skillId: mastery.skillId, value: mastery.mastery })
    .from(mastery)
    .where(and(eq(mastery.profileId, profileId), inArray(mastery.skillId, readingIds)));
  return rows.map((row) => ({ id: row.skillId, name: skillName(row.skillId), mastery: row.value }));
}
