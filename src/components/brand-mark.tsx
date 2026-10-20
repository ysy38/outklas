/**
 * Outklas mark: open frame + out-of-box arrow.
 * Arrowhead is a filled L (not stroked) so tips stay sharp at 18–24px.
 */
export function BrandMark({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" data-mark={id} fill="none">
      <g transform="rotate(-6 16 16)">
        <path
          d="M25 16V22C25 24.7614 22.7614 27 20 27H10C7.23858 27 5 24.7614 5 22V12C5 9.23858 7.23858 7 10 7H16"
          stroke="var(--mark-frame)"
          strokeWidth="1.85"
          strokeLinecap="round"
        />
        {/* Shaft — butt caps keep the join with the head crisp */}
        <path
          d="M11 21 L20.2 11.8"
          stroke="var(--mark-arrow)"
          strokeWidth="2.35"
          strokeLinecap="butt"
        />
        {/* Sharp L arrowhead (filled geometry, not round stroke) */}
        <path
          fill="var(--mark-arrow)"
          d="M15.2 7 H25 V16.8 H22.55 V9.45 H15.2 Z"
        />
        <circle cx="11" cy="21" r="2.35" fill="var(--mark-arrow)" />
      </g>
    </svg>
  );
}
