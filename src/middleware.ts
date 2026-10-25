import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Legacy junk from a previous site on this domain (promo sitemaps, coupon
 * farms). 410 Gone tells Google to drop them; 404 would keep re-probing.
 */
function isLegacyJunk(pathname: string): boolean {
  const path = pathname.toLowerCase();
  if (path.includes("promap")) return true;
  if (path.includes("promosyon")) return true;
  if (path.includes("coupon")) return true;
  // /sitea, /siteb/…, /siteapromap… — never /sitemap
  if (/^\/site[a-z](?:promap|\/|$)/.test(path)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  if (!isLegacyJunk(request.nextUrl.pathname)) return NextResponse.next();

  return new NextResponse("Gone", {
    status: 410,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
