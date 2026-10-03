import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Newsreader } from "next/font/google";
import { brand } from "@/brand";
import "./globals.css";

const sans = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });
const serif = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader" });

const description =
  "YDS ve e-YDS İngilizce için teşhis, günlük çalışma planı ve 180 dakikalık deneme. Puan doğru sayının 1,25 katıdır; yanlış doğruyu götürmez.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domain}`),
  title: {
    default: "YDS Lab — YDS ve e-YDS için günlük plan",
    template: "%s · YDS Lab",
  },
  description,
  applicationName: brand.name,
  keywords: ["YDS", "e-YDS", "YDS deneme", "YDS puan hesaplama", "YDS çalışma programı", "YDS online"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: brand.name,
    title: "YDS Lab — bugün ne çözeceğini bil",
    description,
  },
  twitter: { card: "summary_large_image", title: brand.name, description },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

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
