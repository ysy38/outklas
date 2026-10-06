import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { answers, choices, getDb, items } from "@/db/client";
import { distractorText } from "@/content/labels";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { currentProfile } from "@/server/auth";

export default async function MistakesPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const db = await getDb();
  const wrong = await db
    .select()
    .from(answers)
    .where(and(eq(answers.profileId, profile.id), eq(answers.correct, false)))
    .orderBy(desc(answers.createdAt))
    .limit(20);
  const itemIds = wrong.map((row) => row.itemId);
  const itemRows = itemIds.length ? await db.select().from(items) : [];
  const choiceRows = itemIds.length ? await db.select().from(choices) : [];
  return (
    <section>
      <h1 className="text-4xl">Yanlışların</h1>
      <p className="mt-2 text-sm text-muted">Son yanlış yaptığın 20 soru. Her birinin doğru cevabını ve nedenini oku; bu sorular tekrar listene de girer.</p>
      <div className="mt-6 space-y-4">
        {wrong.length === 0 ? <p className="text-muted">Henüz yanlışın yok. Soru çözdükçe yanlış yaptıkların burada toplanır.</p> : null}
        {wrong.map((answer) => {
          const item = itemRows.find((row) => row.id === answer.itemId);
          const picked = choiceRows.find((row) => row.id === answer.choiceId);
          return (
            <article key={answer.id} className="rounded-2xl border border-line bg-card p-4">
              <p className="text-sm text-muted">{ydsBlueprint.bands.find((band) => band.section === item?.section)?.title ?? item?.section}</p>
              <h2 className="mt-1 text-xl">{item?.stem}</h2>
              <p className="mt-2 text-sm">Senin cevabın: {picked?.body}</p>
              {picked?.distractorType ? <p className="text-sm text-clay">Neden yanlış: {distractorText(picked.distractorType)}</p> : null}
              <p className="mt-2 text-sm leading-6">{item?.explanation}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
