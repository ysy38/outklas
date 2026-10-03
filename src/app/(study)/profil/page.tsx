import { currentProfile } from "@/server/auth";
import { redirect } from "next/navigation";
import { saveOnboardingAction, signOutAction } from "@/server/actions";

export default async function ProfilePage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  return (
    <section className="max-w-lg">
      <h1 className="text-4xl">Profil</h1>
      <p className="mt-2 text-sm text-muted">{profile.email}</p>
      <form action={saveOnboardingAction} className="mt-6 space-y-4">
        <label className="block text-sm">
          Hedef puan
          <input name="targetScore" type="number" defaultValue={profile.targetScore ?? 70} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <label className="block text-sm">
          Sınav tarihi
          <input name="examDate" type="date" defaultValue={profile.examDate ?? ""} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <label className="block text-sm">
          Günlük dakika
          <input name="dailyMinutes" type="number" defaultValue={profile.dailyMinutes ?? 30} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <label className="block text-sm">
          Son puan
          <input name="priorScore" type="number" defaultValue={profile.priorScore ?? ""} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <button className="rounded-full bg-pine px-4 py-2 text-cream">Kaydet</button>
      </form>
      <form action={signOutAction} className="mt-6">
        <button className="text-sm text-muted">Çıkış</button>
      </form>
    </section>
  );
}
