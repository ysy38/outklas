import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shell";
import { currentProfile } from "@/server/auth";

export default async function StudyLayout({ children }: { children: React.ReactNode }) {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  return (
    <>
      <AppHeader admin={profile.role === "admin"} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-5 print:max-w-none print:p-0">{children}</main>
    </>
  );
}
