import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getDb, items } from "@/db/client";
import { currentProfile } from "@/server/auth";
import { ydsBlueprint } from "@/modules/exam/blueprint";

export default async function AdminPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  if (profile.role !== "admin") return <p>Bu sayfa yönetici hesabına açık.</p>;
  const db = await getDb();
  const rows = await db.select().from(items).orderBy(asc(items.slot));
  return (
    <section>
      <h1 className="text-4xl">Maddeler</h1>
      <p className="mt-2 text-sm text-muted">Yayın kapısı: doğru şık, açıklama, beceri, zorluk ve çeldirici tipi.</p>
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
        {rows.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {item.slot} · {ydsBlueprint.bands.find((band) => band.section === item.section)?.title} · {item.status}
            </span>
            <Link href={`/admin/maddeler/${item.id}`} className="text-pine">
              Düzenle
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
