import { redirect } from "next/navigation";
import { currentProfile } from "@/server/auth";
import { ensureDailyPlan } from "@/server/sessions";
import { asExam, blueprintFor } from "@/modules/exam/blueprint";
import { daysUntilExam } from "@/modules/learning/plan";
import { PendingButton } from "@/components/pending-button";
import { saveOnboardingAction, startTodayAction } from "@/server/actions";

export default async function TodayPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  if (!profile.onboardingCompleted) {
    return (
      <section className="max-w-lg">
        <h1 className="display">Hangi sınav, nereyi tutturmak istiyorsun?</h1>
        <form action={saveOnboardingAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            Sınav
            <select name="exam" defaultValue="yds" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
              <option value="yds">YDS / e-YDS</option>
              <option value="ydt">YDT, YKS yabancı dil</option>
            </select>
          </label>
          <label className="block text-sm">
            Hedef
            <select name="targetScore" defaultValue={70} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
              {[50, 60, 70, 80, 90].map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted">YDS’de hedef puandır. YDT’de nettir. Yanlış yalnız YDT’de neti düşürür.</p>
          <label className="block text-sm">
            Sınav tarihi
            <input name="examDate" type="date" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
          </label>
          <label className="block text-sm">
            Günlük dakika
            <select name="dailyMinutes" defaultValue={30} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
              {[10, 20, 30, 45, 60].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Varsa son puanın
            <input name="priorScore" type="number" min={0} max={100} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" />
          </label>
          <PendingButton pendingLabel="Kuruluyor…" className="w-full rounded-full bg-pine px-4 py-3 text-cream sm:w-auto">
            Listeyi kur
          </PendingButton>
        </form>
      </section>
    );
  }
  const exam = asExam(profile.exam);
  const blueprint = blueprintFor(exam);
  const unit = exam === "ydt" ? "net" : "puan";
  const plan = await ensureDailyPlan(profile.id, profile.dailyMinutes ?? 30, profile.targetScore, profile.examDate);
  const daysLeft = daysUntilExam(profile.examDate);
  const midpoint =
    profile.estimatedLow != null && profile.estimatedHigh != null ? Math.round((profile.estimatedLow + profile.estimatedHigh) / 2) : null;
  const gap = midpoint != null && profile.targetScore != null ? profile.targetScore - midpoint : null;
  const title = (section: string) => blueprint.bands.find((band) => band.section === section)?.title ?? section;
  const skip = (plan.skipSections ?? []).map(title);
  return (
    <section className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{blueprint.title}</p>
      <h1 className="display mt-2">
        {gap != null && gap > 0 ? `Hedefe ${gap} ${unit} var` : gap != null && gap <= 0 ? "Hedefin üstündesin" : "Bugünün işi"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {plan.totalMinutes} dakika
        {midpoint != null ? ` · tahmin ${profile.estimatedLow}–${profile.estimatedHigh} ${unit}` : ""}
        {daysLeft != null && daysLeft >= 0 ? ` · sınava ${daysLeft === 0 ? "bugün" : `${daysLeft} gün`}` : ""}
      </p>
      {profile.streak > 0 ? <p className="mt-2 text-sm text-muted">Seri: {profile.streak} gün</p> : null}
      {daysLeft != null && daysLeft >= 0 && daysLeft <= 14 ? (
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Sınav yakın. Bugün yeni sorudan çok, daha önce kaçırdığın soru var.</p>
      ) : null}
      <article className="mt-6 rounded-3xl border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Tek iş</p>
        <p className="mt-3 text-2xl">Zayıf bölüm, tekrar, bir parça yeni soru.</p>
        <p className="mt-3 text-sm leading-6 text-muted">Liste bunun dışında dağılmaz. Bitince bugünün işi kapanır.</p>
        {skip.length > 0 ? <p className="mt-3 text-sm leading-6">Bugün çalışma: {skip.join(", ")}.</p> : null}
      </article>
      <form action={startTodayAction} className="mt-6">
        <PendingButton pendingLabel="Oturum açılıyor…" className="w-full rounded-full bg-pine px-5 py-3 text-cream sm:w-auto">
          İşe başla
        </PendingButton>
      </form>
    </section>
  );
}
