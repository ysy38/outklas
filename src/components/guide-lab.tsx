"use client";

import { useState } from "react";
import type { GuideLabItem } from "@/content/guide-labs";

export function GuideLab({ lab }: { lab: GuideLabItem }) {
  const [picked, setPicked] = useState<string | null>(null);
  const option = lab.options.find((item) => item.id === picked);

  return (
    <div className="overflow-hidden rounded-[28px] bg-card shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-night px-4 py-3.5 text-[#f4f3eb] sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">{lab.code}</p>
          <p className="mt-0.5 text-xs text-[#a7aa9e]">{lab.minutes}</p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">Etkileşimli</span>
      </div>

      <div className="p-4 sm:p-6">
        <p className="text-lg font-medium leading-relaxed text-ink sm:text-xl sm:leading-8">{lab.stem}</p>
        <p className="mt-3 text-sm text-muted">{lab.prompt}</p>

        <div className="mt-5 grid gap-2.5">
          {lab.options.map((item) => {
            const active = picked === item.id;
            const show = picked !== null;
            const ok = item.correct;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPicked(item.id)}
                className={`rounded-2xl border px-4 py-3.5 text-left text-sm transition ${
                  !show
                    ? active
                      ? "border-pine bg-soft"
                      : "border-line bg-paper hover:border-pine"
                    : ok
                      ? "border-teal bg-teal/10"
                      : active
                        ? "border-clay bg-clay/10"
                        : "border-line bg-paper opacity-60"
                }`}
              >
                <span className="font-medium text-ink">{item.text}</span>
              </button>
            );
          })}
        </div>

        {option ? (
          <div className={`mt-5 rounded-2xl border-2 p-4 ${option.correct ? "border-teal bg-teal/10" : "border-clay bg-clay/10"}`}>
            <p className={`text-xs font-bold uppercase tracking-[0.12em] ${option.correct ? "text-teal" : "text-clay"}`}>
              {option.correct ? "✓ Doğru" : "✕ Yanlış"} · {lab.revealTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">{option.autopsy}</p>
            <div className="mt-4 space-y-2 border-t border-line/60 pt-3 text-sm leading-6 text-muted">
              <p>
                <span className="font-semibold text-ink">Yapısal / birliktelik: </span>
                {lab.structural}
              </p>
              <p>
                <span className="font-semibold text-ink">Anlam: </span>
                {lab.meaning}
              </p>
            </div>
            {!option.correct ? (
              <p className="mt-3 text-sm text-ink">
                Doğru şık: <strong>{lab.options.find((item) => item.correct)?.text}</strong>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">Şıkka tıkla; doğru cevabı ve dilbilimsel gerekçeyi gör.</p>
        )}
      </div>
    </div>
  );
}
