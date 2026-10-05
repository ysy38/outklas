"use client";

import { useState } from "react";
import { yokdilBands } from "@/content/yokdil";
import { ydsBlueprint } from "@/modules/exam/blueprint";

type Row = { id: string; title: string; count: number; slots?: string };

const ydsRows: Row[] = ydsBlueprint.bands.map((band) => ({
  id: band.section,
  title: band.title,
  count: band.to - band.from + 1,
  slots: `${band.from}–${band.to}`,
}));

const yokdilRows: Row[] = yokdilBands.map((band) => ({
  id: band.id,
  title: band.title,
  count: band.count,
}));

function points(correct: number) {
  return Math.round(correct * 125) / 100;
}

function formatPoints(correct: number) {
  return points(correct).toLocaleString("tr-TR");
}

export function ScoreCalculator() {
  const [paper, setPaper] = useState<"yds" | "yokdil">("yds");
  const [correct, setCorrect] = useState<Record<string, number>>({});
  const rows = paper === "yds" ? ydsRows : yokdilRows;
  const total = rows.reduce((sum, row) => sum + Math.min(row.count, correct[row.id] ?? 0), 0);

  function write(id: string, count: number, raw: string) {
    if (raw === "") {
      setCorrect((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const parsed = Number(raw);
    const next = Number.isFinite(parsed) ? Math.max(0, Math.min(count, Math.floor(parsed))) : 0;
    setCorrect((current) => ({ ...current, [id]: next }));
  }

  return (
    <div className="rounded-3xl border border-line bg-card p-4 sm:p-6">
      <div className="grid grid-cols-2 rounded-full bg-paper p-1 text-sm">
        <button
          type="button"
          onClick={() => setPaper("yds")}
          className={`rounded-full px-3 py-2 ${paper === "yds" ? "bg-card text-ink shadow-sm" : "text-muted"}`}
        >
          YDS / e-YDS
        </button>
        <button
          type="button"
          onClick={() => setPaper("yokdil")}
          className={`rounded-full px-3 py-2 ${paper === "yokdil" ? "bg-card text-ink shadow-sm" : "text-muted"}`}
        >
          YÖKDİL / e-YÖKDİL
        </button>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <p className="text-sm text-muted">
          {total} doğru
          <span className="mt-1 block">Yanlış bu hesaba girmez.</span>
        </p>
        <p className="font-serif text-[clamp(2.5rem,10vw,3.25rem)] leading-none tracking-tight">{formatPoints(total)}</p>
      </div>
      <ul className="mt-6 divide-y divide-line">
        {rows.map((row) => {
          const stored = correct[row.id];
          const value = stored == null ? 0 : Math.min(row.count, stored);
          return (
            <li key={row.id} className="grid grid-cols-[1fr_4.5rem] items-center gap-3 py-3">
              <div className="min-w-0">
                <p>{row.title}</p>
                <p className="text-sm text-muted">
                  {row.slots ? `${row.slots} · ` : ""}
                  {row.count} soru · en fazla {formatPoints(row.count)} puan
                  {value > 0 ? ` · ${formatPoints(value)} puan` : ""}
                </p>
              </div>
              <label className="text-right">
                <span className="sr-only">{row.title} doğru sayısı</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={row.count}
                  value={stored == null ? "" : value}
                  placeholder="0"
                  onChange={(event) => write(row.id, row.count, event.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-2 py-2 text-center outline-none focus:border-pine"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
