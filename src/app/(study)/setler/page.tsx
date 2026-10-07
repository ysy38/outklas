import Link from "next/link";
import { redirect } from "next/navigation";
import { offers, tl } from "@/content/offers";
import { studySets } from "@/content/sets";
import { hasTools } from "@/modules/billing/entitlement";
import { currentProfile } from "@/server/auth";
import { entitlementFor } from "@/server/sessions";

export const metadata = { title: "Kelime ve bağlaç setleri" };

export default async function SetsPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const access = await entitlementFor(profile.id);
  const open = hasTools(access.tier);
  return (
    <section className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Setler</p>
      <h1 className="display mt-2">Yazdır, kâğıt üzerinde çalış.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
        Her seti açıp “PDF olarak indir” düğmesine bas. Açılan pencerede hedef olarak “PDF olarak kaydet”i seçersen dosya bilgisayarına iner; yazıcıyı seçersen doğrudan basılır.
      </p>
      {!open ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-pine/40 bg-cream p-5">
          <p className="text-sm leading-6">
            Setler {offers.gelisim.name} ve {offers.kamp.name} ile açılır. Şimdilik her setin ilk satırlarına göz atabilirsin.
          </p>
          <Link href="/odeme?paket=gelisim" className="rounded-full bg-pine px-4 py-2 text-sm text-cream">
            {offers.gelisim.name} · {tl(offers.gelisim.price)} TL
          </Link>
        </div>
      ) : null}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {studySets.map((set) => (
          <li key={set.id}>
            <Link href={`/setler/${set.id}`} className="lift flex h-full flex-col rounded-3xl border border-line bg-card p-5 transition hover:border-pine">
              <span className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gold">
                {set.kind === "words" ? "Kelime" : "Bağlaç"}
                {!open ? (
                  <svg aria-label="Kilitli" viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                ) : null}
              </span>
              <span className="mt-2 text-xl">{set.title}</span>
              <span className="mt-1 text-sm leading-6 text-muted">{set.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
