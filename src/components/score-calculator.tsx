"use client";

import { useState } from "react";

export function ScoreCalculator({ compact = false }: { compact?: boolean }) {
  const [correct, setCorrect] = useState(56);
  const score = Math.round(correct * 125) / 100;
  return (
    <div className={compact ? "" : "rounded-3xl border border-line bg-card p-6 shadow-[0_20px_60px_-40px_rgba(20,26,23,0.45)]"}>
      <div className="flex items-end justify-between gap-4">
        <label className="text-sm text-muted" htmlFor="yds-correct">
          Doğru sayısı
        </label>
        <p className="font-serif text-5xl leading-none tracking-tight">{score}</p>
      </div>
      <input
        id="yds-correct"
        type="range"
        min={0}
        max={80}
        value={correct}
        onChange={(event) => setCorrect(Number(event.target.value))}
        className="mt-6 w-full accent-pine"
      />
      <p className="mt-3 text-sm leading-6 text-muted">
        {correct} doğru × 1,25 = {score}. Yanlış bu hesaba girmez. 70 için 56, 80 için 64 doğru gerekir.
      </p>
    </div>
  );
}
