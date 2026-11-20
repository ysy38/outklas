import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { siteUrl } from "@/brand";

/**
 * Legacy junk from a previous site on this domain (promo sitemaps, coupon
 * farms). 410 Gone tells Google to drop them; 404 would keep re-probing.
 */
function isLegacyJunk(pathname: string): boolean {
  const path = pathname.toLowerCase();
  if (path.includes("promap")) return true;
  if (path.includes("promosyon")) return true;
  if (path.includes("coupon")) return true;
  if (/^\/site[a-z](?:promap|\/|$)/.test(path)) return true;
  return false;
}

const trackingParam = /^(utm_|gclid|fbclid|yclid|mc_|_ga)/i;

const noindexExact = new Set(["/giris"]);
const noindexPrefix = ["/bugun", "/kelime", "/baglac", "/setler", "/hatalar", "/ilerleme", "/rapor", "/profil", "/odeme", "/admin", "/oturum", "/dashboard", "/api/"];

function shouldNoindex(pathname: string) {
  if (noindexExact.has(pathname)) return true;
  return noindexPrefix.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
}

function cleanPath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isLegacyJunk(pathname)) {
    return new NextResponse("Gone", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const nextUrl = request.nextUrl.clone();
  let changed = false;

  if (pathname.length > 1 && pathname.endsWith("/")) {
    nextUrl.pathname = pathname.slice(0, -1);
    changed = true;
  }

  for (const key of [...searchParams.keys()]) {
    if (trackingParam.test(key)) {
      nextUrl.searchParams.delete(key);
      changed = true;
    }
  }

  if (changed) {
    return NextResponse.redirect(nextUrl, 308);
  }

  const response = NextResponse.next();
  const canonical = `${siteUrl}${cleanPath(pathname) || "/"}`;
  if (!pathname.includes(".") && !pathname.startsWith("/api/")) {
    response.headers.set("Link", `<${canonical}>; rel="canonical"`);
  }
  if (shouldNoindex(pathname) || (pathname === "/giris" && searchParams.size > 0)) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
