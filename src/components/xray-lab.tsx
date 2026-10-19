"use client";

import { useEffect, useState } from "react";
import { brand } from "@/brand";
import { labDomains, labModes, sentences, type LabDomain, type LabMode } from "@/content/xray-lab";

const toneClass: Record<string, string> = {
  contrast: "rounded-md bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-300",
  mute: "text-base text-muted",
  subject: "rounded-md bg-pine/15 px-1.5 py-0.5 font-bold text-pine ring-1 ring-pine/30",
  idea: "rounded-md bg-teal/15 px-1.5 py-0.5 font-bold text-teal ring-1 ring-teal/30",
  condition: "rounded-md bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-300",
  time: "rounded-md bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-300",
};

export function XrayLab() {
  const [domain, setDomain] = useState<LabDomain>("sosyal");
  const [mode, setMode] = useState<LabMode>("raw");
  const [wordInfo, setWordInfo] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [duelOpen, setDuelOpen] = useState(false);
  const [duelLeft, setDuelLeft] = useState(15);
  const [duelResult, setDuelResult] = useState<"idle" | "hit" | "miss">("idle");
  const [verbFlash, setVerbFlash] = useState(false);

  const data = sentences[domain];
  const load = data.loads[mode];

  useEffect(() => {
    if (!duelOpen || duelResult !== "idle") return;
    if (duelLeft <= 0) {
      setDuelResult("miss");
      return;
    }
    const id = window.setTimeout(() => setDuelLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [duelOpen, duelLeft, duelResult]);

  function switchDomain(next: LabDomain) {
    setDomain(next);
    setWordInfo(null);
    setPicked(null);
    resetDuel(false);
  }

  function switchMode(next: LabMode) {
    setMode(next);
    setWordInfo(null);
    setPicked(null);
  }

  function resetDuel(open: boolean) {
    setDuelOpen(open);
    setDuelLeft(15);
    setDuelResult("idle");
    setVerbFlash(false);
  }

  function startDuel() {
    setMode("raw");
    setPicked(null);
    setWordInfo(null);
    resetDuel(true);
  }

  function onVerbClick() {
    if (!duelOpen || duelResult !== "idle") return;
    setDuelResult("hit");
    setVerbFlash(true);
  }

  const loadLabel =
    mode === "raw" ? "Yüksek (ham cümle)" : mode === "skeleton" ? "Optimal (çekirdek öz)" : "Bölümlendirilmiş";
  const loadColor = mode === "raw" ? "bg-clay" : mode === "skeleton" ? "bg-teal" : "bg-pine";
  const option = data.options.find((item) => item.id === picked);

  return (
    <div className="overflow-hidden rounded-[28px] bg-card shadow-[0_24px_60px_-36px_rgba(23,36,59,0.35)] ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-night px-4 py-3.5 text-white sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-md bg-pine px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">{brand.name} motoru</span>
          <span className="text-xs text-white/65">Canlı Cümle Röntgeni · Kelime Neşteri · Çeldirici Otopsisi</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">Örnek</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-white/45">Branş:</span>
          {labDomains.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchDomain(item.id)}
              className={
                domain === item.id
                  ? "rounded-lg bg-card px-3 py-1.5 font-semibold text-ink"
                  : "rounded-lg bg-white/10 px-3 py-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Röntgen katmanını seç veya kelimelere tıkla</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {labModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchMode(item.id)}
                  className={
                    mode === item.id
                      ? "rounded-xl border-2 border-pine bg-pine px-3.5 py-2 text-xs font-bold text-white"
                      : "rounded-xl border border-line bg-paper px-3.5 py-2 text-xs font-semibold text-muted transition hover:border-pine hover:text-ink"
                  }
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={startDuel}
                className="rounded-xl border border-pine/30 bg-soft px-3.5 py-2 text-xs font-bold text-pine transition hover:bg-pine hover:text-white"
              >
                ⚡ 04. 15 sn ana yüklemi bul
              </button>
            </div>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-line bg-paper px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Bilişsel yük</span>
              <span className={`font-bold ${mode === "raw" ? "text-clay" : mode === "skeleton" ? "text-teal" : "text-pine"}`}>{loadLabel}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-soft">
              <div className={`h-full rounded-full transition-all duration-500 ${loadColor}`} style={{ width: `${load}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Odak: <strong className="text-ink">Özne + bağlaç + ana yüklem</strong>
            </p>
          </div>
        </div>

        {duelOpen ? (
          <div className="my-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pine/30 bg-soft p-4">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-12 w-12 place-items-center rounded-xl font-display text-lg font-bold text-white ${
                  duelResult === "hit" ? "bg-teal" : duelResult === "miss" ? "bg-clay" : "bg-pine"
                }`}
              >
                {duelResult === "hit" ? "✓" : duelResult === "miss" ? "0" : `${duelLeft}s`}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">Canlı refleks testi</p>
                <p className="mt-0.5 text-sm text-ink">
                  {duelResult === "hit" ? (
                    <>
                      Tam isabet! Ana yüklem <span className="font-semibold text-pine">‘{data.mainVerb}’</span> · {15 - duelLeft} sn
                    </>
                  ) : duelResult === "miss" ? (
                    <>
                      Süre doldu. Ana yüklem <span className="font-semibold text-clay">‘{data.mainVerb}’</span> idi. “Dolguları sil” ile nedenini gör.
                    </>
                  ) : (
                    <>
                      Yan cümlecikleri atla; doğrudan <span className="underline decoration-pine">ana yükleme</span> tıkla.
                    </>
                  )}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => resetDuel(false)} className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink">
              Kapat
            </button>
          </div>
        ) : null}

        <div className="my-5 rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{data.meta}</p>
            <span className="rounded-md bg-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {labModes.find((item) => item.id === mode)?.label}
            </span>
          </div>

          <div className="text-lg font-medium leading-relaxed text-ink sm:text-xl sm:leading-8">
            {mode === "raw"
              ? data.raw.map((chunk, index) =>
                  chunk.verb ? (
                    <button
                      key={index}
                      type="button"
                      onClick={onVerbClick}
                      className={
                        verbFlash || duelResult === "hit"
                          ? "rounded bg-teal px-1.5 py-0.5 font-extrabold text-white"
                          : duelOpen
                            ? "cursor-pointer underline decoration-pine underline-offset-4 hover:bg-soft"
                            : "font-semibold text-pine"
                      }
                    >
                      {chunk.text}
                    </button>
                  ) : (
                    <span key={index}>{chunk.text}</span>
                  ),
                )
              : null}
            {mode === "skeleton"
              ? data.skeleton.map((chunk, index) => (
                  <span
                    key={index}
                    className={
                      chunk.kind === "filler"
                        ? "text-muted/50 line-through decoration-muted/40"
                        : chunk.kind === "lock"
                          ? "rounded bg-amber-500/20 px-1.5 py-0.5 font-bold ring-1 ring-amber-500/30"
                          : "rounded bg-amber-400/25 px-2 py-0.5 font-extrabold ring-1 ring-amber-500/40"
                    }
                  >
                    {chunk.text}
                  </span>
                ))
              : null}
            {mode === "syntax"
              ? data.syntax.map((chunk, index) => (
                  <span key={index} className={toneClass[chunk.tone]}>
                    {chunk.text}
                  </span>
                ))
              : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Kelime neşteri · tıkla</span>
            {data.words.map((item) => (
              <button
                key={item.word}
                type="button"
                onClick={() => setWordInfo(`[${item.word}] → ${item.info}`)}
                className="rounded-lg bg-soft px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line transition hover:bg-pine hover:text-white hover:ring-pine"
              >
                {item.word}
              </button>
            ))}
          </div>
          {wordInfo ? <p className="mt-3 rounded-xl border border-pine/25 bg-soft px-3.5 py-3 text-xs leading-6 text-ink">{wordInfo}</p> : null}

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-pine/25 bg-soft p-4">
            <span className="mt-0.5 shrink-0 rounded bg-pine px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">{brand.name} teşhisi</span>
            <p className="text-sm leading-6 text-ink">{data.diagnosis[mode]}</p>
          </div>
        </div>

        <div className="border-t border-line pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-ink sm:text-lg">
              Canlı çeldirici otopsisi{" "}
              <span className="font-normal text-muted">· Yukarıdaki cümleye göre hangi şıkkı işaretlerdin?</span>
            </h3>
            <span className="text-xs font-semibold text-pine">Şıkka tıkla, tuzağı gör ↓</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {data.options.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPicked(item.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  picked === item.id ? "border-pine bg-soft" : "border-line bg-paper hover:border-pine"
                }`}
              >
                <span className="text-sm font-medium leading-snug text-ink">{item.text}</span>
                <span className="mt-3 block text-[11px] text-muted">Bu şıkkın otopsisini gör →</span>
              </button>
            ))}
          </div>
          {option ? (
            <div
              className={`mt-4 rounded-2xl border-2 p-4 ${
                option.correct ? "border-teal bg-teal/10" : "border-clay bg-clay/10"
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-[0.12em] ${option.correct ? "text-teal" : "text-clay"}`}>
                {option.correct ? "✓" : "✕"} {option.title}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-ink">{option.explanation}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
