import { redirect } from "next/navigation";
import { DrillPlayer } from "@/components/drill-player";
import { hasTools } from "@/modules/billing/entitlement";
import { currentProfile } from "@/server/auth";
import { dailyDrill } from "@/server/drills";
import { entitlementFor } from "@/server/sessions";

export const metadata = { title: "Günün bağlaçları" };

export default async function ConnectorDrillPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const access = await entitlementFor(profile.id);
  const drill = await dailyDrill(profile.id, "connector", access.tier);
  return (
    <section className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Günün bağlaçları</p>
      <h1 className="display mt-2">Bugünün {drill.limit} bağlacı</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Her cümlede iki kısım arasındaki ilişkiye bak: zıtlık mı, sebep mi, sonuç mu? Sonra bağlacın arkasından cümle mi, isim mi geldiğini kontrol et.
      </p>
      <div className="mt-6">
        <DrillPlayer
          key={drill.questions.map((question) => question.id).join(",")}
          kind="connector"
          questions={drill.questions}
          startDone={drill.today.done}
          startCorrect={drill.today.correct}
          yesterday={drill.yesterday}
          limit={drill.limit}
          unlimited={hasTools(access.tier)}
        />
      </div>
    </section>
  );
}
