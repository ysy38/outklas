"use client";

import { useState } from "react";
import { roiProfiles } from "@/content/landing-signature";

type RoiId = (typeof roiProfiles)[number]["id"];

export function RoiSwitcher() {
  const [active, setActive] = useState<RoiId>(roiProfiles[0].id);
  const current = roiProfiles.find((item) => item.id === active) ?? roiProfiles[0];

  return (
    <div className="rounded-[28px] bg-card p-5 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">Hedefinin kariyer getirisi (ROI)</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {roiProfiles.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={
              item.id === active
                ? "rounded-full bg-pine px-3.5 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-pine hover:text-ink"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-ink sm:text-base">{current.text}</p>
      <p className="mt-2 text-xs text-muted">Örnek senaryo; garanti veya kesin gelir vaadi değildir.</p>
    </div>
  );
}
