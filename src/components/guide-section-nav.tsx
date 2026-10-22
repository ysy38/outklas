import Link from "next/link";
import { rehberNeighbors } from "@/content/rehber";

export function GuideSectionNav({ section, className = "" }: { section: string; className?: string }) {
  const { prev, next } = rehberNeighbors(section);
  if (!prev && !next) return null;

  return (
    <nav aria-label="Önceki ve sonraki soru türü" className={`flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between ${className}`}>
      {prev ? (
        <Link
          href={`/rehber/${prev.section}`}
          className="group flex min-h-12 flex-1 flex-col justify-center rounded-2xl border border-line bg-card px-4 py-3 transition hover:border-pine sm:max-w-[48%]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Önceki</span>
          <span className="mt-0.5 text-sm font-semibold text-ink group-hover:text-pine">← {prev.title}</span>
        </Link>
      ) : (
        <span className="hidden flex-1 sm:block" aria-hidden />
      )}
      {next ? (
        <Link
          href={`/rehber/${next.section}`}
          className="group flex min-h-12 flex-1 flex-col justify-center rounded-2xl border border-line bg-card px-4 py-3 text-left transition hover:border-pine sm:max-w-[48%] sm:items-end sm:text-right"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Sonraki</span>
          <span className="mt-0.5 text-sm font-semibold text-ink group-hover:text-pine">{next.title} →</span>
        </Link>
      ) : null}
    </nav>
  );
}
