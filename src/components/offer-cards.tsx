import Link from "next/link";
import { checkoutHref, launchActive, launchLabel, offers, priceFor, recommendedPlan, tl } from "@/content/offers";
import type { CheckoutPlan, Tier } from "@/modules/billing/entitlement";

export function OfferCards({ signedIn, tier = "free", daysLeft }: { signedIn: boolean; tier?: Tier; daysLeft?: number | null }) {
  const plans: CheckoutPlan[] = tier === "gelisim" ? ["kamp"] : ["gelisim", "kamp"];
  const recommended = recommendedPlan(daysLeft);
  return (
    <div className={`grid gap-4 ${plans.length > 1 ? "md:grid-cols-2" : ""}`}>
      {plans.map((plan) => {
        const offer = offers[plan];
        const featured = plans.length === 1 || plan === recommended.plan;
        const price = priceFor(plan, tier);
        const credited = price !== offer.price;
        return (
          <article
            key={plan}
            data-rise
            className={
              featured
                ? "lift relative flex flex-col rounded-3xl bg-night p-6 text-[#f4f3eb] shadow-[0_24px_60px_-36px_rgba(8,9,7,0.55)] ring-1 ring-pine/40"
                : "lift glass relative flex flex-col rounded-3xl border border-line p-6"
            }
          >
            {featured && plans.length > 1 ? (
              <span className="absolute -top-3 right-6 rounded-full bg-pine px-3 py-1 text-xs font-semibold text-pine-ink">Sana önerilen</span>
            ) : null}
            <p className={`text-xs uppercase tracking-[0.16em] ${featured ? "text-pine" : "text-gold"}`}>{offer.eyebrow}</p>
            <h3 className={`mt-2 text-2xl ${featured ? "text-[#f4f3eb]" : ""}`}>{offer.name}</h3>
            <p className={`mt-4 font-serif text-4xl ${featured ? "text-[#f4f3eb]" : ""}`}>
              {tl(price)} TL
              <span className={`ml-2 font-sans text-sm ${featured ? "text-[#a7aa9e]" : "text-muted"}`}>tek ödeme · {offer.days} gün · KDV dahil</span>
            </p>
            {credited ? (
              <p className={`mt-2 text-xs ${featured ? "text-[#a7aa9e]" : "text-muted"}`}>
                {offer.name} {tl(offer.price)} TL; Sprint için ödediğin {tl(offer.price - price)} TL düşüldü.
              </p>
            ) : null}
            {plan === "kamp" && launchActive() ? <p className={`mt-2 text-xs ${featured ? "text-[#a7aa9e]" : "text-muted"}`}>{launchLabel()}</p> : null}
            {featured && plans.length > 1 && recommended.days != null ? (
              <p className={`mt-2 text-xs ${featured ? "text-[#a7aa9e]" : "text-muted"}`}>
                {recommended.own ? "Sınavına" : "Bir sonraki YDS’ye"} {recommended.days} gün var; bu süre için önerimiz bu paket.
              </p>
            ) : null}
            <ul className={`mt-5 flex-1 space-y-2 text-sm leading-6 ${featured ? "text-[#cfd2c6]" : "text-muted"}`}>
              {offer.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden className="text-pine">
                    ✓
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className={`mt-5 text-sm font-medium ${featured ? "text-[#f4f3eb]" : ""}`}>{offer.tagline}</p>
            <Link
              href={checkoutHref(plan, signedIn)}
              className={
                featured
                  ? "shine mt-4 rounded-full bg-pine px-5 py-3 text-center font-semibold text-pine-ink transition hover:-translate-y-0.5"
                  : "mt-4 rounded-full bg-pine px-5 py-3 text-center font-semibold text-pine-ink transition hover:-translate-y-0.5"
              }
            >
              {credited ? `${offer.name}’a geç, ${tl(price)} TL →` : offer.cta}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
