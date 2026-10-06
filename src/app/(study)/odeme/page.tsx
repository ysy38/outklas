import { redirect } from "next/navigation";
import { brand } from "@/brand";
import { iyzicoConfigured } from "@/modules/billing/iyzico";
import { currentProfile } from "@/server/auth";
import { PendingButton } from "@/components/pending-button";
import { devCheckoutAction } from "@/server/actions";
import { entitlementFor } from "@/server/sessions";

export default async function BillingPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const access = await entitlementFor(profile.id);
  const live = iyzicoConfigured();
  return (
    <section className="max-w-xl">
      <h1 className="display">Paketini seç</h1>
      <p className="mt-3 text-muted">Şu anki planın: {access.pro ? "ücretli paket" : "ücretsiz"}.</p>
      <p className="mt-4 leading-7">
        Ücretsiz planda her gün {brand.freeDailyQuestions} soru çözebilir ve {brand.freeSimulators} deneme yapabilirsin. Ücretli paketlerde sınır yoktur: 90 gün {brand.prices.lab90.toLocaleString("tr-TR")} TL, 180 gün {brand.prices.lab180.toLocaleString("tr-TR")} TL, 60 günlük yoğun paket {brand.prices.sprint.toLocaleString("tr-TR")} TL. Abonelik yoktur, bir kez ödersin.
      </p>
      {!live ? (
        <div className="mt-6 flex flex-col gap-3">
          <form action={devCheckoutAction.bind(null, "lab_90")}>
            <PendingButton pendingLabel="Açılıyor…" className="w-full rounded-full bg-pine px-4 py-2 text-cream sm:w-auto">
              90 günlük paketi al
            </PendingButton>
          </form>
          <form action={devCheckoutAction.bind(null, "lab_180")}>
            <PendingButton pendingLabel="Açılıyor…" className="w-full rounded-full border border-line px-4 py-2 sm:w-auto">
              180 günlük paketi al
            </PendingButton>
          </form>
          <form action={devCheckoutAction.bind(null, "sprint")}>
            <PendingButton pendingLabel="Açılıyor…" className="w-full rounded-full border border-line px-4 py-2 sm:w-auto">
              Yoğun paketi al
            </PendingButton>
          </form>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Ödemeler iyzico ile güvenle alınır. Paketin, ödeme onaylanır onaylanmaz açılır.</p>
      )}
    </section>
  );
}
