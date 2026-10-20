/** Outklas mark: acid tile + solid carbon arrow. Same glyph in both themes. */
export function BrandMark({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" data-mark={id}>
      <rect width="32" height="32" rx="8" fill="#d7ff62" />
      <path
        fill="#10110f"
        d="M10 21.5 19.5 12h-3.3V9H24.5v8.3h-3.3v-3.5L13 22.3z"
      />
    </svg>
  );
}
