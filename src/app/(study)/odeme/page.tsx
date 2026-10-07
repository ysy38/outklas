import Link from "next/link";
import { redirect } from "next/navigation";
import { OfferCards } from "@/components/offer-cards";
import { PendingButton } from "@/components/pending-button";
import { launchActive, launchLabel, offers, tl } from "@/content/offers";
import type { CheckoutPlan } from "@/modules/billing/entitlement";
import { devCheckoutAllowed } from "@/modules/billing/iyzico";
import { devCheckoutAction } from "@/server/actions";
import { currentProfile } from "@/server/auth";
import { entitlementFor, recordEvent } from "@/server/sessions";

const tierName = { free: "Ücretsiz", gelisim: "Gelişim Paketi", kamp: "Kişisel YDS Kampı" } as const;

export const metadata = { title: "Paketler" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ paket?: string }> }) {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const { paket } = await searchParams;
  const plan: CheckoutPlan | null = paket === "gelisim" || paket === "kamp" ? paket : null;
  const access = await entitlementFor(profile.id);
  const until = access.periodEnd ? access.periodEnd.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : null;

  if (!plan) {
    return (
      <section className="max-w-4xl">
        <h1 className="display">Paketini seç</h1>
        <p className="mt-3 text-muted">
          Şu anki planın: {tierName[access.tier]}
          {until ? ` · son gün ${until}` : ""}.
        </p>
        {access.tier === "kamp" ? (
          <p className="mt-6">
            Bütün özellikler açık.{" "}
            <Link href="/bugun" className="text-pine">
              Bugünün görevlerine geç
            </Link>
            .
          </p>
        ) : (
          <div className="mt-8">
            <OfferCards signedIn tier={access.tier} />
          </div>
        )}
      </section>
    );
  }

  const offer = offers[plan];
  const owned = access.tier === "kamp" || access.tier === plan;
  const dev = devCheckoutAllowed();
  if (!owned && !dev) await recordEvent("checkout_intent", profile.id, { plan });

  return (
    <section className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{offer.eyebrow}</p>
      <h1 className="display mt-2">{offer.name}</h1>
      <p className="mt-4 font-serif text-4xl">
        {tl(offer.price)} TL <span className="font-sans text-base text-muted">tek seferlik · {offer.days} gün</span>
      </p>
      {plan === "kamp" && launchActive() ? <p className="mt-1 text-sm text-muted">{launchLabel()}</p> : null}
      <ul className="mt-6 space-y-2 text-sm leading-6">
        {offer.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden className="text-pine">✓</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">Abonelik yoktur: bir kez ödersin, {offer.days} gün sonra paket kendiliğinden sona erer.</p>

      {owned ? (
        <div className="mt-8 rounded-2xl border border-line bg-card p-5">
          <p>Bu paket zaten açık{until ? `; son gün ${until}` : ""}.</p>
          <Link href="/bugun" className="mt-3 inline-block text-pine">
            Bugün sayfasına dön
          </Link>
        </div>
      ) : dev ? (
        <form action={devCheckoutAction.bind(null, plan)} className="mt-8">
          <PendingButton pendingLabel="Açılıyor…" className="rounded-full bg-pine px-5 py-3 text-cream">
            Test için etkinleştir
          </PendingButton>
          <p className="mt-2 text-xs text-muted">Bu buton yalnızca geliştirme ortamında görünür; ödeme alınmaz.</p>
        </form>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-card p-5">
          <p className="font-medium">Online ödeme çok yakında açılıyor.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            İlgini kaydettik. Ödeme açıldığında {profile.email} adresine haber vereceğiz. O zamana kadar her gün ücretsiz kelime ve bağlaç çalışmana devam edebilirsin.
          </p>
          <Link href="/kelime" className="mt-4 inline-block rounded-full border border-pine px-5 py-2 text-sm text-pine">
            Bugünün kelimelerine başla
          </Link>
        </div>
      )}
      <Link href="/odeme" className="mt-8 block text-sm text-muted hover:text-ink">
        Diğer pakete bak
      </Link>
    </section>
  );
}
