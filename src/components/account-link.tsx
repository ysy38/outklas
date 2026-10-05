"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AccountLink({ className }: { className?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(document.cookie.split("; ").some((part) => part.startsWith("tomo_in=1")));
  }, []);
  return (
    <Link href={signedIn ? "/bugun" : "/giris"} className={className}>
      {signedIn ? "Bugün" : "Giriş"}
    </Link>
  );
}
