import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shell";
import { currentProfile } from "@/server/auth";

export default async function StudyLayout({ children }: { children: React.ReactNode }) {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  return (
    <>
      <AppHeader admin={profile.role === "admin"} />
      <main className="mx-auto w-full max-w-5xl px-5 py-8">{children}</main>
    </>
  );
}
