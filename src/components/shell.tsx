import Link from "next/link";
import { brand } from "@/brand";
import { AccountLink } from "./account-link";
import { ThemeToggle } from "./theme-toggle";

const appLinks = [
  ["Bugün", "/bugun"],
  ["Rehber", "/rehber"],
  ["Kelime", "/kelime"],
  ["Hatalar", "/hatalar"],
  ["İlerleme", "/ilerleme"],
  ["Deneme", "/deneme"],
];

const publicLinks = [
  ["Teşhis", "/teshis"],
  ["Rehber", "/rehber"],
  ["Deneme", "/deneme"],
  ["Puan", "/yds-puan-hesaplama"],
  ["Fiyat", "/fiyat"],
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/70 shadow-[0_20px_50px_-36px_rgba(18,32,40,0.45)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-serif text-lg tracking-tight sm:gap-2.5 sm:text-xl">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pine text-sm text-cream">Y</span>
          <span className="hidden truncate sm:inline">{brand.name}</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted lg:flex">
          {publicLinks.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-2 text-sm">Menü</summary>
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-line bg-card p-3 text-sm shadow-lg">
              {publicLinks.map(([label, href]) => (
                <Link key={href} href={href} className="block py-2 text-muted hover:text-ink">
                  {label}
                </Link>
              ))}
              <AccountLink className="block py-2 text-muted hover:text-ink sm:hidden" />
            </div>
          </details>
          <ThemeToggle />
          <AccountLink className="hidden rounded-full border border-line px-3 py-2 text-sm sm:inline" />
          <Link href="/teshis" className="rounded-full bg-pine px-3 py-2 text-sm text-cream">
            Ücretsiz
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-5 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl">{brand.name}</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            YDS, e-YDS, YÖKDİL ve e-YÖKDİL için ölçüm, günlük plan ve deneme. ÖSYM’nin resmi uygulaması değildir.
          </p>
        </div>
        <div className="text-sm leading-8">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Çalış</p>
          <Link className="block hover:text-pine" href="/rehber">YDS rehberi</Link>
          <Link className="block hover:text-pine" href="/teshis">Ücretsiz teşhis</Link>
          <Link className="block hover:text-pine" href="/deneme">e-YDS benzeri deneme</Link>
          <Link className="block hover:text-pine" href="/yds-puan-hesaplama">YDS puan hesaplama</Link>
          <Link className="block hover:text-pine" href="/fiyat">Fiyat</Link>
        </div>
        <div className="text-sm leading-8">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Konu</p>
          <Link className="block hover:text-pine" href="/yds-baglac-testi">Bağlaç</Link>
          <Link className="block hover:text-pine" href="/yds-okudugunu-anlama">Okuduğunu anlama</Link>
          <Link className="block hover:text-pine" href="/giris">Hesap</Link>
        </div>
      </div>
    </footer>
  );
}

export function AppHeader({ admin = false }: { admin?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
        <Link href="/bugun" className="flex min-w-0 items-center gap-2 font-serif text-lg tracking-tight sm:text-xl">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pine text-sm text-cream">Y</span>
          <span className="hidden truncate sm:inline">{brand.name}</span>
        </Link>
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-4 text-sm lg:flex">
            {appLinks.map(([label, href]) => (
              <Link key={href} href={href} className="text-muted hover:text-ink">
                {label}
              </Link>
            ))}
            {admin ? (
              <Link href="/admin" className="text-muted hover:text-ink">
                Yönetim
              </Link>
            ) : null}
            <Link href="/profil" className="text-muted hover:text-ink">
              Profil
            </Link>
          </nav>
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-2 text-sm">Menü</summary>
            <div className="absolute right-0 z-50 mt-2 w-44 rounded-2xl border border-line bg-card p-3 text-sm shadow-lg">
              {appLinks.map(([label, href]) => (
                <Link key={href} href={href} className="block py-1.5 text-muted hover:text-ink">
                  {label}
                </Link>
              ))}
              {admin ? (
                <Link href="/admin" className="block py-1.5 text-muted hover:text-ink">
                  Yönetim
                </Link>
              ) : null}
              <Link href="/profil" className="block py-1.5 text-muted hover:text-ink">
                Profil
              </Link>
            </div>
          </details>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
