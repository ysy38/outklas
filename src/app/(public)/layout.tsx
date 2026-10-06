import { CursorGlow } from "@/components/cursor-glow";
import { PublicFooter, PublicHeader } from "@/components/shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CursorGlow />
      <PublicHeader />
      <main className="page-enter">{children}</main>
      <PublicFooter />
    </>
  );
}
