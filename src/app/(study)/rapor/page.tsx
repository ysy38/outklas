import Link from "next/link";
import { redirect } from "next/navigation";
import { DiagnosticReport } from "@/components/diagnostic-report";
import { currentProfile, readGuestId } from "@/server/auth";
import { diagnosticReport, latestDiagnosticId } from "@/server/report";
import { entitlementFor } from "@/server/sessions";

export const metadata = { title: "Seviye testi raporun" };

export default async function ReportPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const [sessionId, access, guestId] = await Promise.all([latestDiagnosticId(profile.id), entitlementFor(profile.id), readGuestId()]);
  const report = sessionId ? await diagnosticReport(sessionId, profile.id, guestId ?? "") : null;
  if (!report) {
    return (
      <section className="max-w-xl">
        <h1 className="display">Raporun henüz yok</h1>
        <p className="mt-3 leading-7 text-muted">Seviye testini çözdüğünde tahmini puanın, puanını aşağı çeken bölümler ve bulguların burada görünür.</p>
        <Link href="/teshis" className="mt-6 inline-block rounded-full bg-pine px-5 py-3 text-cream">
          Seviye testine başla
        </Link>
      </section>
    );
  }
  return (
    <div className="landing max-w-3xl">
      <DiagnosticReport report={report} tier={access.tier} signedIn />
    </div>
  );
}
