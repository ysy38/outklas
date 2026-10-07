"use client";

export function PrintButton({ label = "PDF olarak indir" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-pine px-5 py-2.5 text-sm text-cream print:hidden">
      {label}
    </button>
  );
}
