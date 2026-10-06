"use client";

import { useEffect, useRef } from "react";

export function CursorGlow() {
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = glow.current;
    if (!node) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    function move(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        node!.style.transform = `translate(${event.clientX - 220}px, ${event.clientY - 220}px)`;
        node!.style.opacity = "1";
      });
    }
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <div
      ref={glow}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 -z-10 h-[440px] w-[440px] rounded-full opacity-0 transition-opacity duration-700"
      style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--pine) 14%, transparent), transparent 68%)" }}
    />
  );
}
