import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, mastery, sessions, skills } from "@/db/client";
import { modeLabel, sessionStatusLabel } from "@/content/labels";
import { currentProfile } from "@/server/auth";

export default async function ProgressPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const db = await getDb();
  const rows = await db.select().from(mastery).where(eq(mastery.profileId, profile.id));
  const skillRows = await db.select().from(skills);
  const history = await db.select().from(sessions).where(eq(sessions.profileId, profile.id)).orderBy(desc(sessions.startedAt)).limit(8);
  const weakest = [...rows].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  return (
    <section>
      <h1 className="text-4xl">İlerleme</h1>
      <p className="mt-2 text-muted">
        Tahmin {profile.estimatedLow ?? "—"}–{profile.estimatedHigh ?? "—"}
      </p>
      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <div key={row.skillId}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{skillRows.find((skill) => skill.id === row.skillId)?.name ?? row.skillId}</span>
              <span>{row.mastery}</span>
            </div>
            <div className="h-2 rounded-full bg-line">
              <div className="h-2 rounded-full bg-pine" style={{ width: `${row.mastery}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-muted">Teşhis veya pratik sonrası beceri çubukları burada birikir.</p> : null}
      </div>
      {weakest.length > 0 ? (
        <p className="mt-6 text-sm">En zayıf: {weakest.map((row) => skillRows.find((skill) => skill.id === row.skillId)?.name ?? row.skillId).join(", ")}</p>
      ) : null}
      <ul className="mt-6 space-y-2 text-sm">
        {history.map((session) => (
          <li key={session.id} className="rounded-xl border border-line bg-card px-3 py-2">
            {modeLabel[session.mode] ?? session.mode} · {sessionStatusLabel[session.status] ?? session.status} · {session.score ?? "—"}
          </li>
        ))}
      </ul>
    </section>
  );
}
