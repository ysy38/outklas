"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const IntelligenceScene = dynamic(() => import("@/components/intelligence-scene").then((mod) => mod.IntelligenceScene), {
  ssr: false,
});

const DEPTHS = [8, -6, 7];

/** Static helix drawn on the server so the hero paints before three.js loads. Proportions follow the WebGL helix. */
const POSTER = (() => {
  const steps = 120;
  const turns = 2.1;
  const amp = 21;
  const a: string[] = [];
  const b: string[] = [];
  const rungs: { xa: number; xb: number; y: number; front: boolean }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = 3 + t * 94;
    const angle = t * Math.PI * 2 * turns;
    const xa = 50 + Math.cos(angle) * amp;
    const xb = 50 - Math.cos(angle) * amp;
    a.push(`${xa.toFixed(2)} ${y.toFixed(2)}`);
    b.push(`${xb.toFixed(2)} ${y.toFixed(2)}`);
    if (i % 5 === 2) rungs.push({ xa, xb, y, front: Math.sin(angle) > 0 });
  }
  return { a: `M${a.join(" L")}`, b: `M${b.join(" L")}`, rungs };
})();

function HelixPoster({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${hidden ? "opacity-0" : "opacity-100"}`}
    >
      <defs>
        <linearGradient id="poster-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d84f2" />
          <stop offset="0.5" stopColor="#4263eb" />
          <stop offset="1" stopColor="#0f9fad" />
        </linearGradient>
        <linearGradient id="poster-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3ec4d0" />
          <stop offset="1" stopColor="#4263eb" />
        </linearGradient>
      </defs>
      {POSTER.rungs.map((rung) => (
        <g key={rung.y}>
          <line x1={rung.xa} y1={rung.y} x2={rung.xb} y2={rung.y} stroke="#8ea0f6" strokeOpacity={rung.front ? 0.55 : 0.25} strokeWidth="0.7" />
          <circle cx={rung.xa} cy={rung.y} r={rung.front ? 1.5 : 1} fill="#4263eb" fillOpacity={rung.front ? 0.95 : 0.45} />
          <circle cx={rung.xb} cy={rung.y} r={rung.front ? 1 : 1.5} fill="#0f9fad" fillOpacity={rung.front ? 0.45 : 0.95} />
        </g>
      ))}
      <path d={POSTER.b} fill="none" stroke="url(#poster-b)" strokeWidth="1.6" strokeOpacity="0.7" strokeLinecap="round" />
      <path d={POSTER.a} fill="none" stroke="url(#poster-a)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const profile = [
  { label: "Puan", value: "64 → 72", dot: "var(--pine)" },
  { label: "Hedef", value: "8 puan", dot: "var(--teal)" },
  { label: "Konu", value: "Bağlaç", dot: "var(--gold)" },
];

const task = [
  { label: "Set", value: "12 soru", dot: "var(--pine)" },
  { label: "Süre", value: "18 dk", dot: "var(--teal)" },
  { label: "Etki", value: "+1,4", dot: "var(--moss)" },
];

const reason = [
  { label: "Doğru", value: "%61", dot: "var(--teal)" },
  { label: "Etki", value: "yüksek", dot: "var(--pine)" },
];

function MetricCard({
  title,
  badge,
  rows,
  note,
  bar,
  register,
  index,
}: {
  title: string;
  badge?: string;
  rows: { label: string; value: string; dot: string }[];
  note?: string;
  bar?: boolean;
  register?: (node: HTMLElement | null, index: number) => void;
  index: number;
}) {
  return (
    <article
      ref={(node) => register?.(node, index)}
      className="hero-card rounded-2xl border border-line bg-card/95 p-3 shadow-[0_18px_40px_-24px_rgba(23,36,59,0.45)] backdrop-blur-md sm:p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
        {badge ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-pine">
            <i className="pulse-dot h-1.5 w-1.5 rounded-full bg-teal" />
            {badge}
          </span>
        ) : null}
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-[11px] sm:text-xs">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.dot }} />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
      {bar ? (
        <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-soft">
          <span className="bar-grow block h-full w-[68%] rounded-full bg-gradient-to-r from-pine to-teal" />
        </span>
      ) : null}
      {note ? <p className="mt-2 text-[10px] leading-4 text-muted sm:text-[11px]">{note}</p> : null}
    </article>
  );
}

function Cluster({ register }: { register?: (node: HTMLElement | null, index: number) => void }) {
  return (
    <>
      <MetricCard index={0} register={register} title="Örnek plan" badge="YDS" rows={profile} bar />
      <MetricCard index={1} register={register} title="Şimdi çalışman gereken" rows={task} note="Bağlaçlar · zıtlık ve kabul" />
      <MetricCard index={2} register={register} title="Neden bu konu?" rows={reason} note="Hedefine en hızlı buradan yaklaşırsın." />
    </>
  );
}

export function HeroStage() {
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const cards = useRef<(HTMLElement | null)[]>([]);
  const lines = useRef<SVGSVGElement>(null);
  const [still, setStill] = useState(false);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduce);
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
    if (!webgl || saveData) return;
    const start = () => setLive(true);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(start, { timeout: 2500 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(start, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const node = root.current;
    if (!node || still) return;
    let frame = 0;
    function move(event: PointerEvent) {
      const rect = node!.getBoundingClientRect();
      const compact = rect.width < 520;
      pointer.current = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
      };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { x, y } = pointer.current;
        const damp = compact ? 0.45 : 1;
        cards.current.forEach((card, index) => {
          if (!card) return;
          const depth = (DEPTHS[index] ?? 6) * damp;
          card.style.transform = `translate3d(${x * depth}px, ${y * depth * 0.65}px, 0)`;
        });
        if (lines.current) lines.current.style.transform = `translate3d(${x * 6 * damp}px, ${y * 4 * damp}px, 0)`;
      });
    }
    function leave() {
      pointer.current = { x: 0, y: 0 };
    }
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
    };
  }, [still]);

  function register(card: HTMLElement | null, index: number) {
    cards.current[index] = card;
  }

  return (
    <div ref={root} className="relative mx-auto w-full max-w-[34rem]" aria-hidden>
      <div className="relative h-[23rem] sm:h-[26rem] lg:h-[28rem]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--pine)_22%,transparent),color-mix(in_srgb,var(--teal)_12%,transparent)_48%,transparent_70%)] blur-2xl" />
        <div className="absolute inset-[10%] sm:inset-[8%]">
          <HelixPoster hidden={ready} />
          {live ? (
            <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
              <IntelligenceScene pointer={pointer} still={still} onReady={() => setReady(true)} />
            </div>
          ) : null}
        </div>
        <svg ref={lines} className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path vectorEffect="non-scaling-stroke" d="M30 22 C 40 30, 46 40, 50 48" fill="none" stroke="var(--pine)" strokeOpacity="0.7" strokeWidth="1.6" />
          <path vectorEffect="non-scaling-stroke" d="M72 26 C 64 34, 58 42, 52 48" fill="none" stroke="var(--pine)" strokeOpacity="0.7" strokeWidth="1.6" />
          <path vectorEffect="non-scaling-stroke" d="M34 78 C 42 68, 46 58, 50 52" fill="none" stroke="var(--teal)" strokeOpacity="0.75" strokeWidth="1.6" />
        </svg>
        <div className="pointer-events-none absolute inset-0 [&>article:nth-child(1)]:absolute [&>article:nth-child(1)]:left-0 [&>article:nth-child(1)]:top-[2%] [&>article:nth-child(2)]:absolute [&>article:nth-child(2)]:right-0 [&>article:nth-child(2)]:top-[14%] [&>article:nth-child(3)]:absolute [&>article:nth-child(3)]:bottom-[2%] [&>article:nth-child(3)]:left-[6%] sm:[&>article:nth-child(3)]:left-[10%]">
          <Cluster register={register} />
        </div>
      </div>
    </div>
  );
}
