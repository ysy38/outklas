import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Newsreader } from "next/font/google";
import { brand } from "@/brand";
import "./globals.css";

const sans = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });
const serif = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader" });

const description =
  "YDS, e-YDS, YÖKDİL ve e-YÖKDİL için ücretsiz ölçüm, günlük iş ve 180 dakikalık deneme. Puan doğru sayının 1,25 katıdır; yanlış doğruyu götürmez.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domain}`),
  title: {
    default: "YDS Lab — YDS ve YÖKDİL için günlük plan",
    template: "%s · YDS Lab",
  },
  description,
  applicationName: brand.name,
  keywords: ["YDS", "e-YDS", "YÖKDİL", "e-YÖKDİL", "YDS puan hesaplama", "YÖKDİL puan hesaplama", "YDS deneme"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: brand.name,
    title: "YDS Lab — ne çalışacağını tahmin etme",
    description,
  },
  twitter: { card: "summary_large_image", title: brand.name, description },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
