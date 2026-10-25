import Link from "next/link";
import { brand } from "@/brand";
import { authors, contactEmail } from "@/content/editorial";
import { AccountLink } from "./account-link";
import { BrandMark } from "./brand-mark";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

const appLinks: [string, string][] = [
  ["Bugün", "/bugun"],
  ["Rapor", "/rapor"],
  ["Kelime", "/kelime"],
  ["Bağlaç", "/baglac"],
  ["Setler", "/setler"],
  ["Rehber", "/rehber"],
  ["Hatalar", "/hatalar"],
  ["İlerleme", "/ilerleme"],
  ["Deneme", "/deneme"],
];

const publicLinks: [string, string][] = [
  ["Nasıl çalışıyor?", "/#nasil"],
  ["Özellikler", "/#ozellikler"],
  ["Sınavlar", "/deneme"],
  ["Fiyatlar", "/fiyat"],
  ["SSS", "/#sss"],
];

const footerColumns: { title: string; links: [string, string][] }[] = [
  {
    title: "Çalış",
    links: [
      ["Ücretsiz seviye testi", "/teshis"],
      ["Bölüm rehberi", "/rehber"],
      ["Ücretsiz deneme sınavı", "/deneme"],
      ["Puan hesapla", "/yds-puan-hesaplama"],
    ],
  },
  {
    title: "Konular",
    links: [
      ["YDS hazırlık", "/yds-hazirlik"],
      ["Yöntemimiz", "/yontem"],
      ["Bağlaçlar", "/yds-baglac-testi"],
      ["Okuduğunu anlama", "/yds-okudugunu-anlama"],
      ["Çeviri", "/rehber/translation"],
      ["Paragrafta boşluk doldurma", "/rehber/cloze"],
    ],
  },
  {
    title: "Hesap",
    links: [
      ["Fiyat", "/fiyat"],
      ["Giriş yap", "/giris"],
    ],
  },
];

function Logo({ href, withTagline = false, markId }: { href: string; withTagline?: boolean; markId: string }) {
  return (
    <Link href={href} aria-label={`${brand.wordmark} ana sayfa`} className="group flex min-w-0 shrink items-center gap-1.5 sm:gap-2.5">
      <BrandMark
        id={markId}
        className="h-8 w-8 shrink-0 transition-transform duration-500 group-hover:-rotate-3 sm:h-9 sm:w-9"
      />
      <span className="min-w-0 leading-none">
        <span className="font-logo text-[16px] font-bold lowercase tracking-[-0.04em] text-ink sm:text-[22px]">
          outklas<span className="text-pine">.</span>
        </span>
        {withTagline ? (
          <span className="mt-2 block max-w-xs text-[11px] font-medium leading-snug tracking-normal text-muted">{brand.tagline}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 shadow-[0_16px_40px_-32px_rgba(8,9,7,0.55)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
        <Logo href="/" markId="mark-header" />
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
          {publicLinks.map(([label, href]) => (
            <Link key={href} href={href} className="link-underline hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <MobileMenu links={publicLinks} account className="lg:hidden" />
          <ThemeToggle />
          <AccountLink className="hidden rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink transition hover:border-pine sm:inline" />
          <Link
            href="/teshis"
            className="max-w-[9.5rem] truncate rounded-full bg-pine px-2.5 py-2 text-[11px] font-semibold shadow-[0_12px_28px_-14px_rgba(215,255,98,0.55)] transition hover:-translate-y-0.5 sm:max-w-none sm:px-4 sm:text-sm"
          >
            Ücretsiz dene ↗
          </Link>
        </div>
      </div>
    </header>
  );
}

function SocialMark({ d }: { d: string }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted" aria-hidden>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d={d} />
      </svg>
    </span>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-sm">
          <Logo href="/" withTagline markId="mark-footer" />
          <p className="mt-4 font-display text-2xl leading-tight text-ink">Daha çok değil. Daha isabetli çalış.</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Türkiye’de YDS, e-YDS, YÖKDİL ve e-YÖKDİL: teşhis, Cümle Röntgeni, günlük adaptif plan. ÖSYM ile bir bağlantısı yoktur.
          </p>
          <Link href="/teshis" className="mt-5 inline-block rounded-full bg-pine px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5">
            Ücretsiz dene ↗
          </Link>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted">
          {publicLinks.map(([label, href]) => (
            <Link key={href} href={href} className="link-underline hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <SocialMark d="M14.7 10.3 22.4 1h-1.8l-6.7 8-5.4-8H2.2l8.1 12.1L2.2 23h1.8l7.1-8.4 5.7 8.4h6.3l-8.4-12.7Zm-2.5 3-0.8-1.2L4.6 2.5h2.8l5.3 7.6.8 1.2 6.9 9.9h-2.8l-5.4-7.9Z" />
          <SocialMark d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 1.8H7A2.2 2.2 0 0 0 4.8 7v10A2.2 2.2 0 0 0 7 19.2h10a2.2 2.2 0 0 0 2.2-2.2V7A2.2 2.2 0 0 0 17 4.8ZM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2Zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8Zm4.7-2.9a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9Z" />
          <SocialMark d="M23 12.3a11 11 0 0 1-11 11.2A11.2 11.2 0 0 1 1.6 8.7 11 11 0 0 1 12.2.6C18 0 23 5.1 23 12.3ZM9.8 17.6V9.4H7.6v8.2h2.2Zm-1.1-9.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm10 9.3v-4.5c0-2.4-1.3-3.5-3-3.5a2.6 2.6 0 0 0-2.3 1.3h-.1V9.4H11v8.2h2.2v-4.3c0-1.1.2-2.2 1.6-2.2s1.4 1.2 1.4 2.3v4.2h2.5Z" />
          <SocialMark d="M23.5 6.2a3.5 3.5 0 0 0-2.5-2.5C19.2 3.2 12 3.2 12 3.2s-7.2 0-9 .5A3.5 3.5 0 0 0 .5 6.2 36 36 0 0 0 0 12a36 36 0 0 0 .5 5.8 3.5 3.5 0 0 0 2.5 2.5c1.8.5 9 .5 9 .5s7.2 0 9-.5a3.5 3.5 0 0 0 2.5-2.5A36 36 0 0 0 24 12a36 36 0 0 0-.5-5.8ZM9.8 15.5v-7l6 3.5-6 3.5Z" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-8 border-t border-line px-4 py-8 sm:px-5 sm:grid-cols-3">
        {footerColumns.map((column) => (
          <div key={column.title} className="text-sm leading-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">{column.title}</p>
            {column.links.map(([label, href]) => (
              <Link key={href} href={href} className="link-underline block w-fit text-muted hover:text-ink">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-line px-4 py-5 text-xs text-muted sm:px-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span>© 2026 {brand.wordmark} Tüm hakları saklıdır.</span>
        <span>
          Kurucular: {authors.map((author) => author.name).join(" · ")} ·{" "}
          <a href={`mailto:${contactEmail}`} className="link-underline hover:text-ink">
            {contactEmail}
          </a>
        </span>
        <span>YDS · e-YDS · YÖKDİL · e-YÖKDİL</span>
      </div>
    </footer>
  );
}

export function AppHeader({ admin = false }: { admin?: boolean }) {
  const links: [string, string][] = [...appLinks, ...(admin ? ([["Yönetim", "/admin"]] as [string, string][]) : []), ["Profil", "/profil"]];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/75 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
        <Logo href="/bugun" markId="mark-app" />
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-4 text-sm xl:flex">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="link-underline text-muted hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
          <MobileMenu links={links} className="xl:hidden" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
