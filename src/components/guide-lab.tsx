"use client";

import { useMemo, useState } from "react";
import type { GuideLabItem } from "@/content/guide-labs";

export function GuideLab({ lab }: { lab: GuideLabItem }) {
  const [eliminated, setEliminated] = useState<Set<string>>(() => new Set());
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  const focus = lab.options.find((item) => item.id === focusId);
  const remaining = useMemo(
    () => lab.options.filter((item) => !eliminated.has(item.id) && !wrongIds.includes(item.id)).length,
    [lab.options, eliminated, wrongIds],
  );

  function toggleEliminate(id: string) {
    if (solved) return;
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pick(id: string) {
    if (solved || eliminated.has(id) || wrongIds.includes(id)) return;
    const option = lab.options.find((item) => item.id === id);
    if (!option) return;
    setFocusId(id);
    if (option.correct) {
      setSolved(true);
      return;
    }
    setWrongIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function reset() {
    setEliminated(new Set());
    setWrongIds([]);
    setFocusId(null);
    setSolved(false);
  }

  return (
    <div className="overflow-hidden rounded-[24px] bg-card shadow-[0_24px_60px_-36px_rgba(23,36,59,0.28)] ring-1 ring-line sm:rounded-[28px]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-night px-4 py-3.5 text-[#f4f3eb] sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">{lab.code}</p>
          <p className="mt-0.5 text-xs text-[#a7aa9e]">{lab.minutes}</p>
        </div>
        <div className="flex items-center gap-2">
          {!solved ? (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
              {remaining} şık kaldı
            </span>
          ) : (
            <span className="rounded-full bg-pine/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-pine">Çözüldü</span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <p className="text-base font-medium leading-relaxed text-ink sm:text-xl sm:leading-8">{lab.stem}</p>
        <p className="mt-3 text-sm text-muted">{lab.prompt}</p>
        <p className="mt-2 text-xs leading-5 text-muted">Yanlış şıkta yalnızca neden yanlış olduğunu görürsün. Doğruyu kendin bulmaya devam et. Sağdaki Ele ile şıkkı çiz.</p>

        <div className="mt-5 grid gap-2.5" role="listbox" aria-label="Seçenekler">
          {lab.options.map((item) => {
            const isEliminated = eliminated.has(item.id);
            const isWrong = wrongIds.includes(item.id);
            const isFocus = focusId === item.id;
            const isCorrectPick = solved && item.correct;
            const disabled = solved ? !item.correct && !isWrong : isEliminated || isWrong;

            return (
              <div
                key={item.id}
                className={`flex items-stretch gap-2 rounded-2xl border transition ${
                  isCorrectPick
                    ? "border-teal bg-teal/10"
                    : isWrong || (isFocus && !solved && focus && !focus.correct)
                      ? "border-clay/50 bg-clay/5"
                      : isEliminated
                        ? "border-line/70 bg-soft/60"
                        : "border-line bg-paper hover:border-pine/60"
                }`}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={isFocus}
                  disabled={disabled && !isCorrectPick}
                  onClick={() => pick(item.id)}
                  className={`min-h-12 min-w-0 flex-1 px-3.5 py-3 text-left text-sm sm:px-4 sm:py-3.5 ${
                    isEliminated || isWrong ? "text-muted" : "text-ink"
                  } ${disabled && !isCorrectPick ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className={`font-medium ${isEliminated || isWrong ? "line-through decoration-clay/80" : ""}`}>{item.text}</span>
                  {isWrong ? <span className="mt-1 block text-xs font-semibold text-clay">elenmiş · yanlış</span> : null}
                  {isCorrectPick ? <span className="mt-1 block text-xs font-semibold text-teal">doğru</span> : null}
                </button>
                <button
                  type="button"
                  onClick={() => toggleEliminate(item.id)}
                  disabled={solved || isWrong}
                  aria-pressed={isEliminated}
                  aria-label={isEliminated ? `${item.text} elemesini geri al` : `${item.text} şıkkını ele`}
                  className={`m-1.5 flex w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-[10px] font-bold uppercase tracking-[0.08em] transition sm:w-14 ${
                    solved || isWrong
                      ? "cursor-not-allowed border-transparent text-muted/40"
                      : isEliminated
                        ? "border-clay/40 bg-clay/10 text-clay"
                        : "border-line bg-card text-muted hover:border-pine hover:text-ink"
                  }`}
                >
                  Ele
                </button>
              </div>
            );
          })}
        </div>

        {solved && focus?.correct ? (
          <div className="mt-5 rounded-2xl border-2 border-teal bg-teal/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal">✓ Doğru · {lab.revealTitle}</p>
            <p className="mt-2 text-sm leading-6 text-ink">{focus.autopsy}</p>
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
            {wrongIds.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-line/60 pt-3 text-sm leading-6 text-muted">
                {wrongIds.map((id) => {
                  const item = lab.options.find((row) => row.id === id);
                  if (!item) return null;
                  return (
                    <li key={id}>
                      <span className="font-medium text-ink">{item.text}: </span>
                      {item.autopsy}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <button type="button" onClick={reset} className="mt-4 text-xs font-semibold text-pine underline-offset-2 hover:underline">
              Yeniden dene
            </button>
          </div>
        ) : focus && !focus.correct ? (
          <div className="mt-5 rounded-2xl border-2 border-clay bg-clay/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-clay">✕ Bu şık neden yanlış</p>
            <p className="mt-2 text-sm leading-6 text-ink">{focus.autopsy}</p>
            <p className="mt-3 text-sm font-medium text-ink">Doğru cevabı göstermiyoruz. Kalan şıklardan birini dene veya Ele ile daralt.</p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">Bir şık seç veya sağdaki Ele ile eleyerek başla.</p>
        )}
      </div>
    </div>
  );
}
