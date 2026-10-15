import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import { brand, siteUrl } from "@/brand";
import "./globals.css";

const sans = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });
const serif = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader" });
const display = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const description =
  "YDS, e-YDS, YÖKDİL ve e-YÖKDİL için ücretsiz seviye testi, günlük çalışma planı ve gerçek sınav gibi deneme. Her gün neye çalışacağını bilerek puanını yükselt.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} — YDS ve YÖKDİL için günlük çalışma planı`,
    template: `%s · ${brand.name}`,
  },
  description,
  applicationName: brand.name,
  keywords: ["YDS", "e-YDS", "YÖKDİL", "e-YÖKDİL", "YDS puan hesaplama", "YÖKDİL puan hesaplama", "YDS deneme"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: brand.name,
    title: `${brand.name} — daha fazla değil, daha doğru çalış`,
    description,
  },
  twitter: { card: "summary_large_image", title: brand.name, description },
  robots: { index: true, follow: true },
};

const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

// Cursor's preview browser stamps data-cursor-ref onto the DOM before React hydrates.
// Strip those marks until the page has loaded, then leave later marks alone.
const cursorRefScript = `(function(){function strip(node){if(!node)return;if(node.nodeType===1&&node.hasAttribute&&node.hasAttribute("data-cursor-ref"))node.removeAttribute("data-cursor-ref");if(node.querySelectorAll){var list=node.querySelectorAll("[data-cursor-ref]");for(var i=0;i<list.length;i++)list[i].removeAttribute("data-cursor-ref")}}var root=document.documentElement;var observer=new MutationObserver(function(records){for(var i=0;i<records.length;i++){var record=records[i];if(record.type==="attributes")strip(record.target);var added=record.addedNodes;if(!added)continue;for(var j=0;j<added.length;j++)strip(added[j])}});observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["data-cursor-ref"]});strip(root);setTimeout(function(){strip(root);observer.disconnect()},8000)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${sans.variable} ${serif.variable} ${display.variable}`} suppressHydrationWarning>
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
