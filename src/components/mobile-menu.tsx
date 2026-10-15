"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountLink } from "./account-link";

type Props = {
  links: [string, string][];
  account?: boolean;
  className?: string;
};

export function MobileMenu({ links, account = false, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        onClick={() => setOpen((value) => !value)}
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          {open ? (
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          )}
        </svg>
      </button>
      <div
        id="mobile-menu"
        className={`fixed inset-x-3 top-16 z-50 mt-2 origin-top-right sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:w-52 rounded-2xl border border-line bg-card p-2 text-sm shadow-xl transition duration-200 ease-out ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        }`}
      >
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={pathname === href ? "page" : undefined}
            className={`block rounded-xl px-3 py-2.5 hover:bg-paper hover:text-ink ${pathname === href ? "text-ink" : "text-muted"}`}
          >
            {label}
          </Link>
        ))}
        {account ? <AccountLink className="block rounded-xl px-3 py-2.5 text-muted hover:bg-paper hover:text-ink sm:hidden" /> : null}
      </div>
    </div>
  );
}
