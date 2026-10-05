export default function Loading() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-line" role="status" aria-label="Yükleniyor">
      <div className="h-full w-1/3 animate-[load_0.9s_ease-in-out_infinite] bg-pine" />
    </div>
  );
}
