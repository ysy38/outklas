import { PublicFooter, PublicHeader } from "@/components/shell";
import { currentProfile } from "@/server/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await currentProfile();
  return (
    <>
      <PublicHeader signedIn={Boolean(profile)} />
      {children}
      <PublicFooter />
    </>
  );
}
