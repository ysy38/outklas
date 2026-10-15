"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createHelixField, type HelixPort } from "./helix-field";

/** Keep in sync with the `pin` variant in globals.css. */
const PIN = "(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";
const HEADER = 65;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function phase(p: number, from: number, to: number) {
  const t = clamp((p - from) / (to - from));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const profile: [string, number][] = [
  ["Kelime", 62],
  ["Dil bilgisi", 48],
  ["Okuma", 71],
  ["Çeviri", 55],
  ["Diyalog", 43],
];

/** anchor: helix height (-1 top, 1 bottom) the card is wired to; fly: direction it leaves in on scroll. */
const nodes = [
  { anchor: -0.4, fly: [-1, -0.5], depth: 9 },
  { anchor: -0.7, fly: [1, -0.7], depth: -7 },
  { anchor: 0.5, fly: [0.9, 0.8], depth: 8 },
];

function Port({ side }: { side: "left" | "right" }) {
  return (
    <span
      data-port
      className={`absolute top-1/2 grid h-3 w-3 -translate-y-1/2 place-items-center rounded-full bg-card ring-2 ring-pine/70 ${side === "right" ? "-right-1.5" : "-left-1.5"}`}
    >
      <i className="pulse-dot h-1 w-1 rounded-full bg-pine" />
    </span>
  );
}

const cardClass =
  "hero-card absolute z-10 rounded-2xl border border-line/80 bg-card/80 p-3 shadow-[0_22px_48px_-26px_rgba(23,36,59,0.5)] backdrop-blur-md will-change-transform before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-pine/60 before:to-transparent sm:p-3.5";

export function HeroAssembly({ copy, report, caption }: { copy: ReactNode; report: ReactNode; caption: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const copyBox = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const captionBox = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const section = root.current;
    const stageEl = stage.current;
    const slotEl = slot.current;
    const copyEl = copyBox.current;
    const backEl = back.current;
    const frontEl = front.current;
    const panelEl = panel.current;
    const captionEl = captionBox.current;
    if (!section || !stageEl || !slotEl || !copyEl || !backEl || !frontEl || !panelEl || !captionEl) return;

    const pinQuery = window.matchMedia(PIN);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const field = createHelixField(backEl, frontEl, window.innerWidth >= 768);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let width = 0;
    let height = 0;
    let smooth = 0;
    let spin = 0.6;
    let prev = 0;
    let frame = 0;
    let visible = true;

    function resize() {
      const rect = stageEl!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const canvas of [backEl!, frontEl!]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
    }

    function paint(now: number) {
      const time = now / 1000;
      const dt = prev ? Math.min(0.05, time - prev) : 0;
      prev = time;
      const still = reduce.matches;
      const pinned = pinQuery.matches;

      const box = section!.getBoundingClientRect();
      const target = pinned ? clamp((HEADER - box.top) / Math.max(1, box.height - height)) : 0;
      smooth = still || dt === 0 ? target : smooth + (target - smooth) * (1 - Math.exp(-dt * 9));
      const p = smooth;
      const ease = 1 - Math.exp(-dt * 4);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      if (!still) spin += dt * 0.3;

      const copyOut = phase(p, 0.02, 0.2);
      const cardsOut = phase(p, 0.05, 0.24);
      const move = phase(p, 0.1, 0.4);
      const reveal = phase(p, 0.32, 0.68);
      const captionIn = phase(p, 0.7, 0.84);

      copyEl!.style.opacity = String(1 - copyOut);
      copyEl!.style.transform = copyOut ? `translate3d(0, ${-90 * copyOut}px, 0)` : "";
      copyEl!.style.visibility = copyOut > 0.98 ? "hidden" : "";

      cards.current.forEach((card, index) => {
        if (!card) return;
        const node = nodes[index];
        if (!node) {
          card.style.opacity = String(1 - cardsOut);
          return;
        }
        const x = node.fly[0] * 110 * cardsOut + pointer.x * node.depth;
        const y = node.fly[1] * 110 * cardsOut + pointer.y * node.depth * 0.6;
        card.style.opacity = String(1 - cardsOut);
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(1 - 0.08 * cardsOut).toFixed(3)})`;
      });

      const stageBox = stageEl!.getBoundingClientRect();
      const slotBox = slotEl!.getBoundingClientRect();
      const homeX = slotBox.left - stageBox.left + slotBox.width / 2;
      const homeY = slotBox.top - stageBox.top + slotBox.height * 0.47;
      const homeScale = slotBox.height * 0.45;
      const drift = pinned ? 0 : 0.4 * phase((HEADER - slotBox.top) / slotBox.height, 0, 1);
      const split = pinned ? reveal : drift;

      const half = pinned ? panelEl!.offsetWidth / 2 : slotBox.width * 0.3;
      const gap = 24;
      const open = Math.max(0, split * (half + gap) - gap);
      const bulge = 22 * (1 - split);
      panelEl!.style.opacity = pinned && split > 0.02 ? "1" : "0";
      panelEl!.style.clipPath = `polygon(calc(50% - ${open}px) 0, calc(50% - ${open + bulge}px) 50%, calc(50% - ${open}px) 100%, calc(50% + ${open}px) 100%, calc(50% + ${open + bulge}px) 50%, calc(50% + ${open}px) 0)`;
      panelEl!.style.visibility = pinned && split > 0.02 ? "visible" : "hidden";

      captionEl!.style.opacity = String(captionIn);
      captionEl!.style.transform = `translate3d(0, ${(1 - captionIn) * 18}px, 0)`;
      captionEl!.style.visibility = captionIn > 0.02 ? "visible" : "hidden";

      const cx = lerp(homeX, width / 2, move);
      const cy = lerp(homeY, height * 0.47, move);
      const scale = lerp(homeScale, height * 0.5, move);
      const ports: HelixPort[] = [];
      cards.current.forEach((card, index) => {
        const port = card?.querySelector<HTMLElement>("[data-port]");
        if (!port || !nodes[index]) return;
        const r = port.getBoundingClientRect();
        const y = r.top - stageBox.top + r.height / 2;
        ports.push({
          x: r.left - stageBox.left + r.width / 2,
          y,
          anchor: clamp((y - cy) / scale + nodes[index].anchor * 0.25, -0.92, 0.92),
          alpha: 1 - cardsOut,
        });
      });

      field.draw({
        width,
        height,
        cx,
        cy,
        scale,
        spin: spin + pointer.x * 0.5,
        tiltX: -0.1 + pointer.y * 0.16,
        tiltZ: 0.13 * (1 - move),
        split,
        splitPx: half + gap,
        network: 1 - move * 0.5,
        time,
        ports,
        dark: document.documentElement.classList.contains("dark"),
      });
    }

    function loop(now: number) {
      paint(now);
      frame = visible && !reduce.matches ? requestAnimationFrame(loop) : 0;
    }

    function wake() {
      if (!frame && visible && !reduce.matches) {
        prev = 0;
        frame = requestAnimationFrame(loop);
      } else if (reduce.matches) {
        paint(performance.now());
      }
    }

    resize();
    paint(performance.now());
    wake();

    const sizes = new ResizeObserver(() => {
      resize();
      paint(performance.now());
    });
    sizes.observe(stageEl);
    const seen = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        wake();
      },
      { rootMargin: "120px" },
    );
    seen.observe(section);
    const theme = new MutationObserver(() => paint(performance.now()));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    function move(event: PointerEvent) {
      const rect = stageEl!.getBoundingClientRect();
      pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.ty = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    }
    function leave() {
      pointer.tx = 0;
      pointer.ty = 0;
    }
    const onScroll = () => {
      if (reduce.matches) paint(performance.now());
    };
    stageEl.addEventListener("pointermove", move);
    stageEl.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", onScroll, { passive: true });
    reduce.addEventListener("change", wake);

    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      seen.disconnect();
      theme.disconnect();
      stageEl.removeEventListener("pointermove", move);
      stageEl.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", onScroll);
      reduce.removeEventListener("change", wake);
    };
  }, []);

  const register = (index: number) => (node: HTMLElement | null) => {
    cards.current[index] = node;
  };

  return (
    <section ref={root} className="relative pin:h-[250svh]">
      <div ref={stage} className="relative pin:sticky pin:top-[65px] pin:h-[calc(100svh-65px)] pin:overflow-hidden">
        <canvas ref={back} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-4 px-4 pb-8 pt-10 sm:px-5 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:pt-10 pin:h-full pin:py-0">
          <div className="rise-in">
            <div ref={copyBox} className="will-change-transform">
              {copy}
            </div>
          </div>
          <div className="rise-in rise-in-late">
            <div ref={slot} aria-hidden className="relative mx-auto h-[25rem] w-full max-w-[34rem] sm:h-[28rem] lg:h-[31rem]">
              <div ref={register(3)} className="pointer-events-none absolute left-1/2 top-[47%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--pine)_20%,transparent),color-mix(in_srgb,var(--teal)_10%,transparent)_50%,transparent_72%)] blur-2xl" />

              <article ref={register(0)} className={`${cardClass} left-0 top-[5%]`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-pine sm:tracking-[0.14em]">
                    <span className="sm:hidden">Örnek profil</span>
                    <span className="hidden sm:inline">Senin profilin</span>
                  </p>
                  <span className="hidden rounded-full bg-soft px-1.5 py-0.5 text-[9px] font-semibold text-muted sm:inline">Örnek</span>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {profile.map(([label, value], index) => (
                    <li key={label} className="text-[10.5px] sm:text-[11.5px]">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-muted">
                          <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: index % 2 ? "var(--teal)" : "var(--pine)" }} />
                          <span className="truncate">{label}</span>
                        </span>
                        <span className="font-semibold text-ink">%{value}</span>
                      </span>
                      <span className="mt-1 hidden h-[3px] overflow-hidden rounded-full bg-soft sm:block">
                        <span className="bar-grow block h-full rounded-full bg-gradient-to-r from-pine to-teal" style={{ width: `${value}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
                <Port side="right" />
              </article>

              <article ref={register(1)} className={`${cardClass} right-0 top-[30%] sm:top-[9%] lg:right-[-3%]`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">Tahmini puan</p>
                <p className="mt-1.5 font-display text-[26px] font-bold leading-none tracking-tight text-ink sm:text-[30px]">
                  60–68
                </p>
                <p className="mt-1 text-[10.5px] text-muted sm:text-[11.5px]">merkez 64 · hedef 72</p>
                <span className="relative mt-2.5 block h-1.5 rounded-full bg-soft">
                  <span className="absolute inset-y-0 left-[40%] w-[16%] rounded-full bg-gradient-to-r from-pine to-teal" />
                  <span className="absolute -top-1 bottom-[-4px] left-[64%] w-0.5 rounded-full bg-ink/70" />
                </span>
                <span className="mt-1 flex justify-between text-[9px] text-muted">
                  <span>40</span>
                  <span>90</span>
                </span>
                <Port side="left" />
              </article>

              <article ref={register(2)} className={`${cardClass} hero-card-wide bottom-[6%] right-[3%] sm:bottom-[7%]`}>
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-soft text-pine">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <circle cx="12" cy="12" r="8" />
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 12l7-7M15 5h4v4" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pine">Bugünkü rotan</p>
                    <p className="mt-1 text-[12px] font-semibold leading-snug text-ink sm:text-[13px]">Zıtlık bağlaçları</p>
                    <p className="text-[10.5px] text-muted sm:text-[11.5px]">12 soru · 18 dk</p>
                  </div>
                </div>
                <Port side="left" />
              </article>

              <p ref={register(4)} className="absolute bottom-0 left-[2%] flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Ölç <span className="text-pine">→</span> Planla <span className="text-pine">→</span> İlerle
              </p>
            </div>
          </div>
        </div>
        <div
          ref={panel}
          className="absolute left-1/2 top-[47%] z-10 hidden w-[min(62rem,86vw)] -translate-x-1/2 -translate-y-1/2 pin:block"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          {report}
        </div>
        <canvas ref={front} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />
        <div ref={captionBox} className="absolute inset-x-0 bottom-[3.5%] z-30 hidden px-5 pin:block" style={{ opacity: 0, visibility: "hidden" }}>
          {caption}
        </div>
      </div>
    </section>
  );
}
