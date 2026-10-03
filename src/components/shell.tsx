import Link from "next/link";
import { brand } from "@/brand";
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

export function PublicHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 font-serif text-xl tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine text-sm text-cream">Y</span>
          {brand.name}
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {publicLinks.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-2 text-sm">Menü</summary>
            <div className="absolute right-0 z-50 mt-2 w-44 rounded-2xl border border-line bg-card p-3 text-sm shadow-lg">
              {publicLinks.map(([label, href]) => (
                <Link key={href} href={href} className="block py-1.5 text-muted hover:text-ink">
                  {label}
                </Link>
              ))}
            </div>
          </details>
          <ThemeToggle />
          <Link href={signedIn ? "/bugun" : "/giris"} className="rounded-full bg-pine px-4 py-2 text-sm text-cream">
            {signedIn ? "Bugün" : "Giriş"}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl">{brand.name}</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            YDS ve e-YDS İngilizce için teşhis, günlük plan ve deneme. ÖSYM’nin resmi uygulaması değildir.
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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/bugun" className="flex items-center gap-2.5 font-serif text-xl tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine text-sm text-cream">Y</span>
          {brand.name}
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
