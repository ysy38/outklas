import Link from "next/link";
import { brand } from "@/brand";
import { AccountLink } from "./account-link";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

const appLinks: [string, string][] = [
  ["Bugün", "/bugun"],
  ["Rehber", "/rehber"],
  ["Kelime", "/kelime"],
  ["Hatalar", "/hatalar"],
  ["İlerleme", "/ilerleme"],
  ["Deneme", "/deneme"],
];

const publicLinks: [string, string][] = [
  ["Seviye testi", "/teshis"],
  ["Rehber", "/rehber"],
  ["Deneme", "/deneme"],
  ["Puan hesapla", "/yds-puan-hesaplama"],
  ["Fiyat", "/fiyat"],
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

function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-2 font-serif text-lg tracking-tight sm:gap-2.5 sm:text-xl">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pine text-sm text-cream transition-transform duration-500 group-hover:rotate-[-8deg]">Y</span>
      <span className="hidden truncate sm:inline">{brand.name}</span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/70 shadow-[0_20px_50px_-36px_rgba(18,32,40,0.45)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
        <Logo href="/" />
        <nav className="hidden items-center gap-6 text-sm text-muted lg:flex">
          {publicLinks.map(([label, href]) => (
            <Link key={href} href={href} className="link-underline hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <MobileMenu links={publicLinks} account className="lg:hidden" />
          <ThemeToggle />
          <AccountLink className="hidden rounded-full border border-line px-3 py-2 text-sm transition hover:border-pine sm:inline" />
          <Link href="/teshis" className="rounded-full bg-pine px-3 py-2 text-sm text-cream transition hover:-translate-y-0.5">
            Ücretsiz başla
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-10 pt-16 sm:px-5 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <p className="max-w-xs font-serif text-3xl leading-tight">Daha fazla değil, daha doğru çalış.</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            YDS, e-YDS, YÖKDİL ve e-YÖKDİL için seviye testi, günlük çalışma planı ve deneme sınavı. ÖSYM ile bir bağlantısı yoktur.
          </p>
          <Link href="/teshis" className="mt-6 inline-block rounded-full bg-pine px-5 py-3 text-sm text-cream transition hover:-translate-y-0.5">
            Ücretsiz seviye testine başla
          </Link>
        </div>
        {footerColumns.map((column) => (
          <div key={column.title} className="text-sm leading-8">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">{column.title}</p>
            {column.links.map(([label, href]) => (
              <Link key={href} href={href} className="link-underline block w-fit text-muted hover:text-ink">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-5 text-xs text-muted sm:px-5">
        <span>© 2026 {brand.name}</span>
        <span>YDS · e-YDS · YÖKDİL · e-YÖKDİL</span>
      </div>
      <p aria-hidden className="footer-mark pointer-events-none select-none text-center font-serif leading-[0.8] tracking-[-0.06em]">
        {brand.name}
      </p>
    </footer>
  );
}

export function AppHeader({ admin = false }: { admin?: boolean }) {
  const links: [string, string][] = [...appLinks, ...(admin ? ([["Yönetim", "/admin"]] as [string, string][]) : []), ["Profil", "/profil"]];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
        <Logo href="/bugun" />
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-4 text-sm lg:flex">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="link-underline text-muted hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
          <MobileMenu links={links} className="lg:hidden" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
