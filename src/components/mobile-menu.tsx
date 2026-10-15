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
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-line px-2.5 py-2 text-xs sm:px-3 sm:text-sm"
      >
        {open ? "Kapat" : "Menü"}
      </button>
      <div
        id="mobile-menu"
        className={`absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-2xl border border-line bg-card p-2 text-sm shadow-xl transition duration-200 ease-out ${
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
