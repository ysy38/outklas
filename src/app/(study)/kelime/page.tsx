import { and, eq, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, reviews, vocabLinks, vocabulary } from "@/db/client";
import { currentProfile } from "@/server/auth";
import { reviewVocabAction } from "@/server/actions";

export default async function VocabularyPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const db = await getDb();
  const words = await db.select().from(vocabulary);
  const links = await db.select().from(vocabLinks);
  const due = await db.select().from(reviews).where(and(eq(reviews.profileId, profile.id), eq(reviews.targetType, "vocab"), lte(reviews.dueAt, new Date())));
  const dueIds = new Set(due.map((row) => row.targetId));
  const queue = [...words.filter((word) => dueIds.has(word.id)), ...words.filter((word) => !dueIds.has(word.id))].slice(0, 8);
  return (
    <section>
      <h1 className="text-4xl">Kelime</h1>
      <p className="mt-2 text-sm text-muted">Her kelimeyi ne kadar iyi bildiğini işaretle. Zorlandığın kelimeler daha sık, bildiklerin daha seyrek karşına çıkar.</p>
      <div className="mt-6 grid gap-4">
        {queue.map((word) => {
          const related = links.filter((link) => link.fromId === word.id);
          return (
            <article key={word.id} className="rounded-3xl border border-line bg-card p-5">
              <h2 className="text-2xl uppercase tracking-wide">{word.word}</h2>
              <p className="mt-1 text-muted">{word.meaningTr}</p>
              <p className="mt-3 text-sm leading-6">{word.example}</p>
              {related.length > 0 ? (
                <p className="mt-2 text-sm text-muted">
                  {related
                    .map((link) => `${link.kind === "synonym" ? "eş anlamlısı" : link.kind === "antonym" ? "zıt anlamlısı" : link.kind === "collocation" ? "birlikte kullanıldığı kelime" : link.kind}: ${link.toId}`)
                    .join(" · ")}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {(["know", "again", "hard"] as const).map((rating) => (
                  <form key={rating} action={reviewVocabAction.bind(null, word.id, rating)}>
                    <button className="rounded-full border border-line px-3 py-1 text-sm">
                      {rating === "know" ? "Biliyorum" : rating === "again" ? "Bilmiyorum" : "Zorlandım"}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
