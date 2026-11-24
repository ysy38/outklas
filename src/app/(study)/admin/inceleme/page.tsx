import Link from "next/link";
import { redirect } from "next/navigation";
import { optionLabels } from "@/modules/analysis/contract";
import { submitEditorialReviewAction } from "@/server/actions";
import { currentProfile } from "@/server/auth";
import { firstFiveEditorialQueue, getReviewCandidate, listReviewCandidates } from "@/server/factory-review";

export default async function EditorialReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; id?: string; hata?: string; ok?: string }>;
}) {
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  if (profile.role !== "admin") return <p>Bu sayfa yönetici hesabına açık.</p>;

  const query = await searchParams;
  const candidates = listReviewCandidates();
  const hasExplicitQuery = Boolean(query.run && query.id);
  const selected = hasExplicitQuery
    ? getReviewCandidate(query.run!, query.id!)
    : candidates[0]
      ? getReviewCandidate(candidates[0].run, candidates[0].candidateId)
      : null;
  const byKey = new Map(candidates.map((c) => [`${c.run}::${c.candidateId}`, c]));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Editoryal İnceleme</h1>
          <p className="mt-1 text-sm text-muted">
            Oturum: {profile.email} · Yalnızca doğrulanmış admin incelemesi sürüm onayı sayılır (`inspector` sayılmaz). Canlı bankaya yazılmaz.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-pine">
          ← Maddeler
        </Link>
      </div>

      {query.hata ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{query.hata}</div>
      ) : null}
      {query.ok ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Karar kaydedildi (dry-run aktif, canlı bankaya yazılmadı).
        </div>
      ) : null}

      <div className="rounded-2xl border border-line bg-card p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          İlk 5 İnceleme Kuyruğu
        </p>
        <div className="flex flex-wrap gap-2">
          {firstFiveEditorialQueue.map((entry) => {
            const meta = byKey.get(`${entry.run}::${entry.candidateId}`);
            const active = selected?.run === entry.run && selected?.view.candidateId === entry.candidateId;
            return (
              <Link
                key={`${entry.run}::${entry.candidateId}`}
                href={`/admin/inceleme?run=${encodeURIComponent(entry.run)}&id=${encodeURIComponent(entry.candidateId)}`}
                className={`rounded-xl border px-3 py-1.5 text-xs ${
                  active ? "border-pine bg-pine/10 font-semibold text-pine" : "border-line hover:border-pine/50"
                }`}
              >
                {entry.candidateId.replace("sentence_completion.concession.", "")}
                {meta ? ` · ${meta.judgeVerdict}` : " · bulunamadı"}
                {meta?.verifiedHumanApprove ? " · İnsan APPROVE" : meta?.unverifiedApprove ? " · Unverified" : ""}
              </Link>
            );
          })}
        </div>
      </div>

      {hasExplicitQuery && !selected ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          İstenen aday veya kaynak run doğrulanamadı; yanlış soruya yönlendirilmedi.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="max-h-[75vh] overflow-y-auto rounded-2xl border border-line bg-card p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Adaylar ({candidates.length})
          </p>
          <ul className="space-y-1.5 text-xs">
            {candidates.slice(0, 80).map((item) => {
              const active = selected?.run === item.run && selected?.view.candidateId === item.candidateId;
              return (
                <li key={`${item.run}::${item.candidateId}`}>
                  <Link
                    href={`/admin/inceleme?run=${encodeURIComponent(item.run)}&id=${encodeURIComponent(item.candidateId)}`}
                    className={`block rounded-xl border p-2 ${
                      active ? "border-pine bg-pine/5" : "border-transparent hover:border-line"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 font-medium">
                      <span className="truncate">{item.candidateId}</span>
                      <span>v{item.version}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted">
                      <span>{item.status}</span>
                      <span>· Judge: {item.judgeVerdict}</span>
                      {item.verifiedHumanApprove ? (
                        <span className="text-emerald-700">· İnsan APPROVE</span>
                      ) : item.unverifiedApprove ? (
                        <span className="text-amber-700">· Unverified</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        {selected ? (
          <div className="space-y-5 rounded-2xl border border-line bg-card p-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {selected.view.candidateId} (v{selected.view.version})
                </h2>
                <p className="text-xs text-muted">Run: {selected.run} · Durum: {selected.view.status}</p>
              </div>
              <div className="text-right text-xs">
                <p>
                  Dry-run Import:{" "}
                  <strong className={selected.view.dryRunDecision.eligible ? "text-emerald-700" : "text-amber-700"}>
                    {selected.view.dryRunDecision.eligible ? "ELIGIBLE" : "BLOCKED"}
                  </strong>
                </p>
                {selected.view.dryRunDecision.reason ? (
                  <p className="text-muted">{selected.view.dryRunDecision.reason}</p>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="font-medium">Soru Kökü ve Seçenekler</h3>
              <p className="mt-2 rounded-xl bg-black/5 p-3 font-medium">{selected.view.stem}</p>
              <ul className="mt-2 space-y-1.5">
                {optionLabels.map((letter) => {
                  const isKey = letter === selected.view.correctOption;
                  return (
                    <li
                      key={letter}
                      className={`rounded-lg border px-3 py-2 ${
                        isKey ? "border-emerald-400 bg-emerald-50/70 font-medium" : "border-line"
                      }`}
                    >
                      <span className="mr-2 font-semibold">{letter})</span>
                      {selected.view.options[letter]}
                      {isKey ? <span className="ml-2 text-xs text-emerald-700">[Doğru Cevap]</span> : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <h3 className="font-medium">Judge Kararı ve Uyarılar</h3>
                <p className="mt-1">
                  Verdict: <strong>{selected.view.judge?.verdict ?? "Yok"}</strong> · Skor:{" "}
                  {selected.view.judge?.qualityScore ?? "-"} · Blind agrees:{" "}
                  {String(selected.view.judge?.blindAgrees ?? "-")}
                </p>
                {selected.view.riskFlags.length > 0 ? (
                  <p className="mt-1 text-xs text-red-700">Risk bayrakları: {selected.view.riskFlags.join(", ")}</p>
                ) : null}
                {selected.view.judge?.concerns.length ? (
                  <p className="mt-1 text-xs text-amber-700">Uyarılar: {selected.view.judge.concerns.join(", ")}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted">
                  Validator: {selected.view.validation.status} (kritik: {selected.view.validation.critical}, uyarı:{" "}
                  {selected.view.validation.warnings})
                </p>
              </div>

              <div className="rounded-xl border border-line p-3">
                <h3 className="font-medium">Beceri ve Zorluk</h3>
                <p className="mt-1 text-xs">
                  Hedef Beceri: <code>{selected.view.skills.targetSkill}</code> · Bilişsel:{" "}
                  <code>{selected.view.skills.cognitiveSkill}</code>
                </p>
                <p className="mt-1 text-xs">
                  Öğrenci Banka Becerisi:{" "}
                  <strong>{selected.view.skills.studentSkillIds.join(", ") || "Eşlenmedi"}</strong>
                </p>
                <p className="mt-1 text-xs">
                  Hedef Zorluk (Spec): <strong>{selected.view.difficulty.specBand}</strong> ({selected.view.difficulty.cefr}) ·
                  Önerilen/Onaylı: <strong>{selected.view.difficulty.approvedBand ?? "-"}</strong>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-line p-3">
              <h3 className="font-medium">Türkçe Açıklama</h3>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{selected.view.explanation}</p>
            </div>

            <div className="rounded-xl border border-line p-3">
              <h3 className="font-medium">Lesson / Cümle Röntgeni</h3>
              <p className="mt-1 text-xs">
                İlişki: <strong>{selected.view.lesson.relation ?? "-"}</strong> · Teşhis:{" "}
                {selected.view.lesson.xray?.diagnosis.raw ?? "-"}
              </p>
              {selected.view.lessonGaps.filter.length > 0 ? (
                <p className="mt-1 text-xs text-red-700">Lesson eksikleri: {selected.view.lessonGaps.filter.join(", ")}</p>
              ) : (
                <p className="mt-1 text-xs text-emerald-700">Lesson kapısı temiz.</p>
              )}
            </div>

            <div className="rounded-xl border border-line p-3">
              <h3 className="font-medium">Çeldirici Hata Sınıfları ve Açıklamaları</h3>
              <ul className="mt-2 space-y-2 text-xs">
                {selected.view.distractors.map((d) => (
                  <li key={d.letter} className="rounded-lg border border-line p-2">
                    <p className="font-medium">
                      {d.letter}) <code>{d.errorClass ?? "yok"}</code> ({d.distractorType})
                    </p>
                    <p className="mt-0.5 text-muted">Neden çekici: {d.whyPlausible || "-"}</p>
                    <p className="mt-0.5">Neden yanlış: {d.whyWrong || "-"}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-line p-3">
              <h3 className="font-medium">Önceki Review Geçmişi</h3>
              {selected.view.reviews.length === 0 ? (
                <p className="mt-1 text-xs text-muted">Henüz review kaydı yok.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {selected.view.reviews.map((r, idx) => (
                    <li key={idx} className="rounded-lg border border-line p-2">
                      <span className="font-semibold">{r.decision}</span> · v{r.appliesToVersion} ·{" "}
                      <code>{r.reviewer}</code>{" "}
                      <span className={r.verifiedHuman ? "text-emerald-700" : "text-amber-700"}>
                        ({r.verifiedHuman ? "Doğrulanmış İnsan" : "REVIEW_PROVENANCE_UNVERIFIED"})
                      </span>{" "}
                      · {r.at}
                      {r.notes ? <p className="mt-1 text-muted">{r.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form action={submitEditorialReviewAction} className="space-y-3 rounded-xl border border-pine/40 bg-pine/5 p-4">
              <h3 className="font-semibold">İnsan Editör Kararı (v{selected.view.version})</h3>
              <input type="hidden" name="run" value={selected.run} />
              <input type="hidden" name="candidateId" value={selected.view.candidateId} />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  Karar
                  <select name="decision" defaultValue="APPROVE" className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-1.5">
                    <option value="APPROVE">APPROVE (İnsan incelemesiyle onaylandı)</option>
                    <option value="REVISE">REVISE (Düzeltme gerekli)</option>
                    <option value="REJECT">REJECT (Yayınlanmayacak)</option>
                  </select>
                </label>

                <label className="block text-xs">
                  Zorluk Bandı (opsiyonel)
                  <select
                    name="band"
                    defaultValue={selected.view.difficulty.approvedBand ?? selected.view.difficulty.specBand}
                    className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-1.5"
                  >
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs">
                Gerekçe (zorunlu)
                <textarea
                  name="notes"
                  required
                  rows={3}
                  placeholder="Tek doğru cevap, dil doğallığı, açıklama ve çeldiriciler hakkındaki inceleme notu..."
                  className="mt-1 w-full rounded-lg border border-line bg-card p-2"
                />
              </label>

              <button type="submit" className="rounded-xl bg-pine px-4 py-2 text-xs font-medium text-white">
                Kararı Kaydet ({profile.email})
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted">İncelenecek aday bulunamadı.</p>
        )}
      </div>
    </section>
  );
}
