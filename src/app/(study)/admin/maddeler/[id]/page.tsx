import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { choices, getDb, itemSkills, items, skills } from "@/db/client";
import { currentProfile } from "@/server/auth";
import { saveItemAction } from "@/server/actions";

const distractors = [
  "VOCAB_SIMILAR_MEANING",
  "GRAMMAR_TRAP",
  "COLLOCATION_ERROR",
  "TENSE_ERROR",
  "CONNECTOR_ERROR",
  "LOGICAL_ERROR",
  "REFERENCE_ERROR",
  "CONTEXT_MISMATCH",
  "TRANSLATION_SHIFT",
];

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  if (profile.role !== "admin") return <p>Bu sayfa yönetici hesabına açık.</p>;
  const { id } = await params;
  const { hata } = await searchParams;
  const db = await getDb();
  const item = (await db.select().from(items).where(eq(items.id, id)).limit(1))[0];
  if (!item) notFound();
  const choiceRows = (await db.select().from(choices).where(eq(choices.itemId, id))).sort((a, b) => a.position - b.position);
  const skillRows = await db.select().from(skills);
  const linked = new Set((await db.select().from(itemSkills).where(eq(itemSkills.itemId, id))).map((row) => row.skillId));
  const correctIndex = choiceRows.findIndex((choice) => choice.correct);
  return (
    <form action={saveItemAction} className="space-y-4">
      <h1 className="text-3xl">Madde {item.slot}</h1>
      {hata ? <p className="rounded-xl bg-clay/10 px-3 py-2 text-sm text-clay">{hata}</p> : null}
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="layout" value={item.layout} />
      <label className="block text-sm">
        Kök
        <textarea name="stem" defaultValue={item.stem} rows={4} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
      </label>
      <label className="block text-sm">
        Açıklama
        <textarea name="explanation" defaultValue={item.explanation} rows={3} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
      </label>
      <label className="block text-sm">
        Zorluk
        <input name="difficulty" type="number" min={1} max={5} defaultValue={item.difficulty} className="mt-1 w-24 rounded-xl border border-line bg-card px-3 py-2" />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm">Şıklar</legend>
        {choiceRows.map((choice, index) => (
          <div key={choice.id} className="grid gap-2 md:grid-cols-[auto_1fr_180px]">
            <label className="text-sm">
              <input type="radio" name="correct" value={index} defaultChecked={index === correctIndex} /> doğru
            </label>
            <input name={`choice-${index}`} defaultValue={choice.body} className="rounded-xl border border-line bg-card px-3 py-2" />
            <select name={`distractor-${index}`} defaultValue={choice.distractorType ?? ""} className="rounded-xl border border-line bg-card px-3 py-2 text-sm">
              <option value="">Çeldirici yok</option>
              {distractors.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>
      <fieldset className="grid gap-2 text-sm md:grid-cols-2">
        <legend className="mb-2">Beceriler</legend>
        {skillRows.map((skill) => (
          <label key={skill.id}>
            <input type="checkbox" name="skill" value={skill.id} defaultChecked={linked.has(skill.id)} /> {skill.name}
          </label>
        ))}
      </fieldset>
      <label className="block text-sm">
        Durum
        <select name="status" defaultValue={item.status} className="mt-1 rounded-xl border border-line bg-card px-3 py-2">
          <option value="draft">draft</option>
          <option value="review">review</option>
          <option value="published">published</option>
        </select>
      </label>
      <button className="rounded-full bg-pine px-4 py-2 text-cream">Kaydet</button>
    </form>
  );
}
