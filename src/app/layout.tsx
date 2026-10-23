import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Newsreader, Plus_Jakarta_Sans, Unbounded } from "next/font/google";
import { brand, siteUrl } from "@/brand";
import "./globals.css";

const sans = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });
const serif = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader" });
const display = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
});
const logo = Unbounded({ subsets: ["latin"], weight: ["700"], variable: "--font-unbounded" });

const description =
  "Türkiye’de YDS, e-YDS, YÖKDİL ve e-YÖKDİL hazırlığı: Cümle Röntgeni, kişisel teşhis ve günlük adaptif plan. Video izlemeden isabetli çalış. ÖSYM formatına kalibre.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.wordmark} · YDS, e-YDS ve YÖKDİL için teşhis temelli hazırlık`,
    template: `%s · ${brand.wordmark}`,
  },
  description,
  applicationName: brand.wordmark,
  keywords: [
    "YDS hazırlık Türkiye",
    "e-YDS hazırlık",
    "YÖKDİL hazırlık",
    "e-YÖKDİL",
    "YÖKDİL Sağlık",
    "YÖKDİL Sosyal",
    "YÖKDİL Fen",
    "YDS çalışma programı",
    "video izlemeden YÖKDİL hazırlık",
    "YÖKDİL Sağlık cümle analizi",
    "50 puandan 70 puana YDS",
    "e-YDS süre yönetimi",
    "Cümle Röntgeni",
    "ÖSYM YDS",
    "outklas",
  ],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: brand.wordmark,
    title: `${brand.wordmark} · YDS & YÖKDİL’de daha isabetli çalış`,
    description,
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: `${brand.wordmark} markası` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.wordmark} · YDS, e-YDS ve YÖKDİL teşhis temelli hazırlık`,
    description,
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
  other: {
    "geo.region": "TR",
    "geo.placename": "Türkiye",
  },
};

/** Dark (Carbon Olive-Black) is the Outklas default; only light if the user opted in. */
const themeScript = `try{if(localStorage.getItem("theme")!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

// Cursor's preview browser stamps data-cursor-ref onto the DOM before React hydrates.
// Strip those marks until the page has loaded, then leave later marks alone.
const cursorRefScript = `(function(){function strip(node){if(!node)return;if(node.nodeType===1&&node.hasAttribute&&node.hasAttribute("data-cursor-ref"))node.removeAttribute("data-cursor-ref");if(node.querySelectorAll){var list=node.querySelectorAll("[data-cursor-ref]");for(var i=0;i<list.length;i++)list[i].removeAttribute("data-cursor-ref")}}var root=document.documentElement;var observer=new MutationObserver(function(records){for(var i=0;i<records.length;i++){var record=records[i];if(record.type==="attributes")strip(record.target);var added=record.addedNodes;if(!added)continue;for(var j=0;j<added.length;j++)strip(added[j])}});observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["data-cursor-ref"]});strip(root);setTimeout(function(){strip(root);observer.disconnect()},8000)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`dark ${sans.variable} ${serif.variable} ${display.variable} ${logo.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <Script id="cursor-ref" strategy="beforeInteractive">
          {cursorRefScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
