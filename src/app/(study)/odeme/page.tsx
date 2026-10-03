import { redirect } from "next/navigation";
import { brand } from "@/brand";
import { iyzicoConfigured } from "@/modules/billing/iyzico";
import { currentProfile } from "@/server/auth";
import { devCheckoutAction } from "@/server/actions";
import { entitlementFor } from "@/server/sessions";

export default async function BillingPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const access = await entitlementFor(profile.id);
  const live = iyzicoConfigured();
  return (
    <section className="max-w-xl">
      <h1 className="text-4xl">Ödeme</h1>
      <p className="mt-3 text-muted">Şu anki erişim: {access.pro ? "Pro" : "Ücretsiz"}.</p>
      <p className="mt-4 leading-7">
        Ücretsiz planda günde {brand.freeDailyQuestions} pratik sorusu ve {brand.freeSimulators} tam deneme var. Pro {brand.prices.proMonthly} TL, sınav geçişi {brand.prices.examPass} TL.
      </p>
      {!live ? (
        <div className="mt-6 flex gap-3">
          <form action={devCheckoutAction.bind(null, "pro")}>
            <button className="rounded-full bg-pine px-4 py-2 text-cream">Pro'yu geliştirmede aç</button>
          </form>
          <form action={devCheckoutAction.bind(null, "exam_pass")}>
            <button className="rounded-full border border-line px-4 py-2">90 gün</button>
          </form>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">iyzico anahtarları tanımlı. Ödeme sonucu webhook ile yazılır.</p>
      )}
    </section>
  );
}
