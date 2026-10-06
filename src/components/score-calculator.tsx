"use client";

import { useState } from "react";
import { scoreMarks } from "@/content/seo";
import { yokdilBands } from "@/content/yokdil";
import { ydsBlueprint } from "@/modules/exam/blueprint";

type Paper = "yds" | "yokdil";
type Row = { id: string; title: string; count: number };

const rowsFor: Record<Paper, Row[]> = {
  yds: ydsBlueprint.bands.map((band) => ({ id: band.section, title: band.title, count: band.to - band.from + 1 })),
  yokdil: yokdilBands.map((band) => ({ id: band.id, title: band.title, count: band.count })),
};

const papers: { id: Paper; label: string }[] = [
  { id: "yds", label: "YDS · e-YDS" },
  { id: "yokdil", label: "YÖKDİL · e-YÖKDİL" },
];

const ring = 2 * Math.PI * 52;

function points(correct: number) {
  return Math.round(correct * 125) / 100;
}

function format(value: number) {
  return value.toLocaleString("tr-TR");
}

export function ScoreCalculator() {
  const [paper, setPaper] = useState<Paper>("yds");
  const [correct, setCorrect] = useState<Record<string, number>>({});
  const rows = rowsFor[paper];
  const valueOf = (row: Row) => Math.min(row.count, correct[row.id] ?? 0);
  const total = rows.reduce((sum, row) => sum + valueOf(row), 0);
  const score = points(total);
  const next = scoreMarks.find((mark) => mark.score > score);

  function set(row: Row, value: number) {
    const clamped = Math.max(0, Math.min(row.count, Math.floor(value)));
    setCorrect((current) => ({ ...current, [row.id]: clamped }));
  }

  function write(row: Row, raw: string) {
    if (raw === "") {
      setCorrect((current) => {
        const copy = { ...current };
        delete copy[row.id];
        return copy;
      });
      return;
    }
    const parsed = Number(raw);
    set(row, Number.isFinite(parsed) ? parsed : 0);
  }

  return (
    <div className="glass rounded-[32px] border border-line p-4 sm:p-6">
      <div className="relative grid grid-cols-2 rounded-full border border-line bg-paper/80 p-1 text-sm">
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-card shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ transform: paper === "yds" ? "translateX(0)" : "translateX(100%)" }}
        />
        {papers.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={paper === item.id}
            onClick={() => setPaper(item.id)}
            className={`relative rounded-full px-3 py-2.5 transition-colors ${paper === item.id ? "text-ink" : "text-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_17rem]">
        <div>
          <p className="text-sm text-muted">Her bölümde kaç doğru beklediğini yaz ya da artı, eksiyle ayarla.</p>
          <ul className="mt-4 space-y-2">
            {rows.map((row) => {
              const value = valueOf(row);
              const stored = correct[row.id];
              return (
                <li key={row.id} className="rounded-2xl border border-line bg-card/70 px-4 py-3 transition hover:border-pine/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate">{row.title}</p>
                      <p className="text-xs text-muted">
                        {row.count} soru{value > 0 ? ` · ${format(points(value))} puan` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${row.title} bir azalt`}
                        onClick={() => set(row, value - 1)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg leading-none text-muted transition hover:border-pine hover:text-ink"
                      >
                        −
                      </button>
                      <label>
                        <span className="sr-only">{row.title} doğru sayısı</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={row.count}
                          value={stored == null ? "" : value}
                          placeholder="0"
                          onChange={(event) => write(row, event.target.value)}
                          className="w-12 rounded-xl border border-line bg-paper px-1 py-1.5 text-center outline-none [appearance:textfield] focus:border-pine [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`${row.title} bir artır`}
                        onClick={() => set(row, value + 1)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg leading-none text-muted transition hover:border-pine hover:text-ink"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span className="mt-3 block h-1 overflow-hidden rounded-full bg-paper">
                    <span
                      className="block h-full rounded-full bg-pine transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
                      style={{ width: `${(value / row.count) * 100}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="sticky bottom-3 z-10 mt-4 flex items-center justify-between gap-4 rounded-full bg-pine py-2.5 pl-5 pr-2.5 text-cream shadow-[0_20px_40px_-20px_rgba(8,62,67,0.8)] lg:hidden" aria-hidden>
            <span className="text-sm">{total} / 80 doğru</span>
            <span className="rounded-full bg-cream/15 px-4 py-1.5 font-serif text-xl leading-none">{format(score)} puan</span>
          </div>
        </div>

        <aside className="self-start rounded-[28px] border border-line bg-card p-5 text-center lg:sticky lg:top-24" aria-live="polite">
          <div className="relative mx-auto h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--pine)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - score / 100)}
                className="transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
              />
            </svg>
            <div className="absolute inset-0 grid place-content-center">
              <p className="font-serif text-4xl leading-none tracking-tight">{format(score)}</p>
              <p className="mt-1 text-xs text-muted">puan</p>
            </div>
          </div>
          <p className="mt-4 text-sm">
            {total} / 80 doğru
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {next ? `${next.score} puan için ${next.correct - total} doğru daha gerekir.` : "90’ı geçtin. A düzeyindesin."}
          </p>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">Her doğru 1,25 puan. Yanlış ve boş puanı düşürmez.</p>
          {total > 0 ? (
            <button type="button" onClick={() => setCorrect({})} className="mt-4 text-sm text-pine">
              Sıfırla
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
