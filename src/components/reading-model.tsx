"use client";

import { useState } from "react";
import { brand } from "@/brand";

type Mode = "classic" | "starc";

const copy = {
  classic: {
    badge: "Klasik okuma",
    caption: (
      <>
        <strong className="text-clay">Sorun:</strong> Klasik aday bilmediği ara kelimelere (epidemiologists, vector-borne) takılıp cümleyi{" "}
        <strong className="text-ink">3–4 kez baştan okuyor</strong>; çalışma belleği yoruluyor.
      </>
    ),
    metrics: [
      ["Odak ritmi", "Dağınık"],
      ["Geri dönüş", "Sürekli tekrar"],
      ["Bellek yükü", "Aşırı yük"],
    ],
  },
  starc: {
    badge: `${brand.wordmark} iskelet kilidi`,
    caption: (
      <>
        <strong className="text-teal">Neşter kilit:</strong> Zihin yalnızca 3 noktaya dokunur:{" "}
        <span className="font-semibold text-amber-700 dark:text-amber-300">[1. Zıtlık: Notwithstanding]</span> →{" "}
        <span className="font-semibold text-pine">[2. Yüklem: studies confirmed]</span> →{" "}
        <span className="font-semibold text-teal">[3. Hedef: accelerate replication]</span>.
      </>
    ),
    metrics: [
      ["Odak ritmi", "3 kilit nokta"],
      ["Geri dönüş", "Tek geçiş"],
      ["Bellek yükü", "Kontrollü akış"],
    ],
  },
} as const;

export function ReadingModel() {
  const [mode, setMode] = useState<Mode>("classic");
  const active = copy[mode];
  const ours = mode === "starc";

  return (
    <div className="overflow-hidden rounded-[28px] bg-card p-5 shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${ours ? "bg-teal" : "bg-clay"}`} />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Okuma modeli karşılaştırması</span>
        </div>
        <span
          className={
            ours
              ? "rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal"
              : "rounded-md border border-clay/30 bg-clay/10 px-2 py-0.5 text-[11px] font-semibold text-clay"
          }
        >
          {active.badge}
        </span>
      </div>

      <div className="my-4 grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-paper p-1">
        <button
          type="button"
          onClick={() => setMode("classic")}
          className={
            mode === "classic"
              ? "rounded-lg bg-clay px-3 py-2 text-xs font-bold text-white transition"
              : "rounded-lg px-3 py-2 text-xs font-bold text-muted transition hover:bg-soft hover:text-ink"
          }
        >
          ✕ Klasik aday (kaotik)
        </button>
        <button
          type="button"
          onClick={() => setMode("starc")}
          className={
            ours
              ? "rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white transition"
              : "rounded-lg px-3 py-2 text-xs font-bold text-muted transition hover:bg-soft hover:text-ink"
          }
        >
          ✓ {brand.wordmark} zihni (neşter)
        </button>
      </div>

      <div className="relative rounded-2xl border border-line bg-paper p-4 sm:p-5">
        <svg viewBox="0 0 400 170" className="h-40 w-full text-ink" aria-hidden>
          <text x="12" y="28" className="fill-muted" fontSize="11.5">
            Notwithstanding the initial skepticism among
          </text>
          <text x="12" y="54" className="fill-muted" fontSize="11.5">
            epidemiologists regarding vector-borne transmission,
          </text>
          {ours ? <rect x="8" y="68" width="235" height="22" rx="4" fill="rgba(215,255,98,0.18)" /> : null}
          <text x="12" y="83" className="fill-ink" fontWeight="bold" fontSize="12">
            longitudinal cohort studies confirmed
          </text>
          <text x="12" y="110" className="fill-muted" fontSize="11.5">
            that climate anomalies directly accelerate
          </text>
          {ours ? <rect x="8" y="124" width="210" height="22" rx="4" fill="rgba(215,255,98,0.16)" /> : null}
          <text x="12" y="139" className="fill-pine" fontWeight="bold" fontSize="12">
            pathogen replication rates.
          </text>

          {!ours ? (
            <g>
              <path
                d="M 30 24 L 180 24 L 60 50 L 290 50 L 110 24 L 220 80 L 45 108 L 260 50 L 140 135 L 80 80 L 310 108"
                fill="none"
                stroke="#E11D48"
                strokeWidth="2"
                className="reading-laser"
              />
              <circle cx="30" cy="24" r="6" fill="#E11D48" fillOpacity="0.45" />
              <circle cx="180" cy="24" r="9" fill="#E11D48" fillOpacity="0.45" />
              <circle cx="60" cy="50" r="7" fill="#E11D48" fillOpacity="0.45" />
              <circle cx="290" cy="50" r="11" fill="#E11D48" fillOpacity="0.45" />
              <circle cx="220" cy="80" r="8" fill="#E11D48" fillOpacity="0.45" />
              <circle cx="140" cy="135" r="10" fill="#E11D48" fillOpacity="0.45" />
            </g>
          ) : (
            <g>
              <path d="M 35 24 L 125 80 L 115 135" fill="none" stroke="#0FA394" strokeWidth="2.5" className="reading-laser" />
              <circle cx="35" cy="24" r="7" fill="#4263EB" />
              <circle cx="125" cy="80" r="9" fill="#6366F1" />
              <circle cx="115" cy="135" r="8" fill="#0FA394" />
            </g>
          )}
        </svg>

        <p className="mt-2 border-t border-line pt-3 text-xs leading-relaxed text-muted">{active.caption}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
        {active.metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-soft/60 p-2.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className={`mt-0.5 text-sm font-bold ${ours ? "text-teal" : "text-clay"}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
