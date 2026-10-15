/** STARC mark: a progress arc that ends at a star. `id` keeps gradient ids unique when the mark appears twice on a page. */
export function BrandMark({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-tile`} x1="4" y1="0" x2="60" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5B79F4" />
          <stop offset="0.5" stopColor="#4263EB" />
          <stop offset="1" stopColor="#1A2A66" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="44" cy="21" r="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3EC4D0" stopOpacity="0.6" />
          <stop offset="1" stopColor="#3EC4D0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-arc`} x1="18" y1="48" x2="44" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}-tile)`} />
      <rect width="64" height="64" rx="16" fill={`url(#${id}-halo)`} />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.5" />
      <path d="M18.4 46.6 A 17 17 0 1 1 42.2 22.2" fill="none" stroke={`url(#${id}-arc)`} strokeWidth="5" strokeLinecap="round" />
      <path fill="#ffffff" d="M44.5 11 C 45.4 18.2 46.8 19.6 54 20.5 C 46.8 21.4 45.4 22.8 44.5 30 C 43.6 22.8 42.2 21.4 35 20.5 C 42.2 19.6 43.6 18.2 44.5 11 Z" />
    </svg>
  );
}
