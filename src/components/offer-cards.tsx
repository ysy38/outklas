import Link from "next/link";
import { checkoutHref, launchActive, launchLabel, offers, tl } from "@/content/offers";
import type { CheckoutPlan, Tier } from "@/modules/billing/entitlement";

export function OfferCards({ signedIn, tier = "free" }: { signedIn: boolean; tier?: Tier }) {
  const plans: CheckoutPlan[] = tier === "gelisim" ? ["kamp"] : ["gelisim", "kamp"];
  return (
    <div className={`grid gap-4 ${plans.length > 1 ? "md:grid-cols-2" : ""}`}>
      {plans.map((plan) => {
        const offer = offers[plan];
        const featured = offer.featured;
        return (
          <article
            key={plan}
            data-rise
            className={
              featured
                ? "lift relative flex flex-col rounded-3xl bg-pine p-6 text-cream shadow-[0_24px_60px_-36px_rgba(20,63,54,0.8)]"
                : "lift glass relative flex flex-col rounded-3xl border border-line p-6"
            }
          >
            {featured ? (
              <span className="absolute -top-3 right-6 rounded-full bg-cream px-3 py-1 text-xs text-pine-deep">Önerilen</span>
            ) : null}
            <p className={`text-xs uppercase tracking-[0.16em] ${featured ? "text-cream/70" : "text-gold"}`}>{offer.eyebrow}</p>
            <h3 className={`mt-2 text-2xl ${featured ? "text-cream" : ""}`}>{offer.name}</h3>
            <p className={`mt-4 font-serif text-4xl ${featured ? "text-cream" : ""}`}>
              {tl(offer.price)} TL
              <span className={`ml-2 font-sans text-sm ${featured ? "text-cream/70" : "text-muted"}`}>tek seferlik · {offer.days} gün</span>
            </p>
            {featured && launchActive() ? <p className="mt-2 text-xs text-cream/80">{launchLabel()}</p> : null}
            <ul className={`mt-5 flex-1 space-y-2 text-sm leading-6 ${featured ? "text-cream/85" : "text-muted"}`}>
              {offer.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden className={featured ? "text-cream" : "text-pine"}>✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className={`mt-5 text-sm font-medium ${featured ? "text-cream" : ""}`}>{offer.tagline}</p>
            <Link
              href={checkoutHref(plan, signedIn)}
              className={
                featured
                  ? "shine mt-4 rounded-full bg-cream px-5 py-3 text-center text-pine-deep transition hover:-translate-y-0.5"
                  : "mt-4 rounded-full bg-pine px-5 py-3 text-center text-cream transition hover:-translate-y-0.5"
              }
            >
              {offer.cta}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
