import { redirect } from "next/navigation";
import { currentProfile } from "@/server/auth";
import { ensureDailyPlan } from "@/server/sessions";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { bucketLabel } from "@/content/labels";
import { saveOnboardingAction, startTodayAction } from "@/server/actions";

export default async function TodayPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  if (!profile.onboardingCompleted) {
    return (
      <section className="max-w-lg">
        <h1 className="text-4xl">Hedefin</h1>
        <form action={saveOnboardingAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            Hedef puan
            <select name="targetScore" defaultValue={70} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2">
              {[50, 60, 70, 80, 90].map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </label>
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
          <button className="rounded-full bg-pine px-4 py-2 text-cream">Planı kur</button>
        </form>
      </section>
    );
  }
  const plan = await ensureDailyPlan(profile.id, profile.dailyMinutes ?? 30, profile.targetScore);
  const estimate =
    profile.estimatedLow != null && profile.estimatedHigh != null ? `${profile.estimatedLow}–${profile.estimatedHigh}` : "henüz yok";
  const rows = plan.blocks.reduce<Array<{ key: string; label: string; minutes: number }>>((groups, block) => {
    const label =
      block.kind === "vocab"
        ? "Kelime tekrarı"
        : `${ydsBlueprint.bands.find((band) => band.section === block.section)?.title ?? block.section} · ${bucketLabel[block.bucket]}`;
    const last = groups.at(-1);
    if (last && last.label === label) last.minutes += block.minutes;
    else groups.push({ key: `${block.kind}-${block.id}`, label, minutes: block.minutes });
    return groups;
  }, []);
  return (
    <section>
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Bugün</p>
      <h1 className="mt-2 text-4xl">Bugün {plan.totalMinutes} dakika</h1>
      <p className="mt-2 text-sm text-muted">Hedef {profile.targetScore ?? "—"} · tahmin {estimate}</p>
      <ol className="mt-6 space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
            <span>{row.label}</span>
            <span className="text-muted">{row.minutes} dk</span>
          </li>
        ))}
      </ol>
      <form action={startTodayAction} className="mt-6">
        <button className="rounded-full bg-pine px-5 py-3 text-cream">Çalışmaya başla</button>
      </form>
    </section>
  );
}
