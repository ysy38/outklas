import { currentProfile } from "@/server/auth";
import { redirect } from "next/navigation";
import { PendingButton } from "@/components/pending-button";
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
          Sınav
          <select name="exam" defaultValue={profile.exam === "ydt" ? "ydt" : "yds"} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
            <option value="yds">YDS / e-YDS</option>
            <option value="ydt">YDT, YKS yabancı dil</option>
          </select>
        </label>
        <label className="block text-sm">
          Hedef {profile.exam === "ydt" ? "net" : "puan"}
          <input name="targetScore" type="number" defaultValue={profile.targetScore ?? 70} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <label className="block text-sm">
          Sınav tarihi
          <input name="examDate" type="date" defaultValue={profile.examDate ?? ""} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <label className="block text-sm">
          Günde kaç dakika çalışacaksın?
          <input name="dailyMinutes" type="number" defaultValue={profile.dailyMinutes ?? 30} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <label className="block text-sm">
          Son sınav puanın (varsa)
          <input name="priorScore" type="number" defaultValue={profile.priorScore ?? ""} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
        </label>
        <PendingButton pendingLabel="Kaydediliyor…" className="w-full rounded-full bg-pine px-4 py-3 text-cream sm:w-auto">
          Kaydet
        </PendingButton>
      </form>
      <form action={signOutAction} className="mt-6">
        <PendingButton pendingLabel="Çıkış yapılıyor…" className="text-sm text-muted">
          Çıkış yap
        </PendingButton>
      </form>
    </section>
  );
}
