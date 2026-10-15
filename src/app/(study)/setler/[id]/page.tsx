import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { brand } from "@/brand";
import { posLabel } from "@/content/drill-words";
import { offers, tl } from "@/content/offers";
import { kindLabel, letters, studySet, type StudySet } from "@/content/sets";
import { hasTools } from "@/modules/billing/entitlement";
import { PrintButton } from "@/components/print-button";
import { currentProfile } from "@/server/auth";
import { entitlementFor } from "@/server/sessions";

type Props = { params: Promise<{ id: string }> };

const previewRows = 5;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: studySet(id)?.title ?? "Set" };
}

function SheetHeader({ set, part }: { set: StudySet; part?: string }) {
  return (
    <header className="flex items-baseline justify-between gap-4 border-b border-line pb-2 text-xs uppercase tracking-[0.16em] text-muted">
      <span>
        {brand.name} · {set.title}
        {part ? ` · ${part}` : ""}
      </span>
      <span>Ad: ____________________</span>
    </header>
  );
}

function WordSheet({ set, limit }: { set: Extract<StudySet, { kind: "words" }>; limit: number }) {
  const words = set.words.slice(0, limit);
  return (
    <>
      <div className="print-page">
        <SheetHeader set={set} part="Liste" />
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.12em] text-muted">
              <th className="py-2 pr-2 font-normal">#</th>
              <th className="py-2 pr-3 font-normal">Kelime</th>
              <th className="py-2 pr-3 font-normal">Anlamı</th>
              <th className="py-2 font-normal">Örnek</th>
            </tr>
          </thead>
          <tbody>
            {words.map((word, index) => (
              <tr key={word.id} className="break-inside-avoid border-b border-line align-top">
                <td className="py-2 pr-2 text-muted">{index + 1}</td>
                <td className="py-2 pr-3">
                  <span className="font-medium">{word.word}</span>
                  <span className="block text-xs text-muted">{posLabel[word.pos]}</span>
                </td>
                <td className="py-2 pr-3">{word.meaning}</td>
                <td className="py-2 italic text-muted">{word.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit >= set.words.length ? (
        <div className="print-page mt-12">
          <SheetHeader set={set} part="Kendini sına" />
          <p className="mt-3 text-sm text-muted">Listeye bakmadan her kelimenin anlamını yaz. Sonra ilk sayfadan kontrol et, bilemediklerini işaretle.</p>
          <ol className="mt-4 grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2 print:grid-cols-2">
            {set.words.map((word, index) => (
              <li key={word.id} className="flex items-end gap-2 border-b border-line py-3">
                <span className="w-6 text-muted">{index + 1}</span>
                <span className="w-40">
                  <span className="font-medium">{word.word}</span> <span className="text-xs text-muted">{posLabel[word.pos]}</span>
                </span>
                <span className="flex-1" />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </>
  );
}

function ConnectorTable({ set, limit }: { set: Extract<StudySet, { kind: "connector-table" }>; limit: number }) {
  return (
    <div className="print-page">
      <SheetHeader set={set} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        {set.groups.slice(0, Math.max(1, Math.ceil(limit / 3))).map((group) => (
          <section key={group.relation} className="break-inside-avoid rounded-2xl border border-line p-4">
            <h2 className="text-lg capitalize">{group.label}</h2>
            <p className="text-xs text-muted">Ne zaman: {group.hint}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {group.items.map((item) => (
                <li key={item.text} className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{item.text}</span>
                  <span className="text-right text-xs text-muted">{kindLabel[item.kind]}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ConnectorQuiz({ set, limit }: { set: Extract<StudySet, { kind: "connector-quiz" }>; limit: number }) {
  const questions = set.questions.slice(0, limit);
  return (
    <>
      <div className="print-page">
        <SheetHeader set={set} part="Sorular" />
        <p className="mt-3 text-sm text-muted">Boşluğa en uygun ifadeyi seç. Önce iki kısım arasındaki ilişkiyi bul, sonra boşluktan sonra cümle mi isim mi geldiğine bak.</p>
        <ol className="mt-4 space-y-4 text-sm">
          {questions.map((question, index) => (
            <li key={question.id} className="break-inside-avoid">
              <p>
                <span className="mr-2 text-muted">{index + 1}.</span>
                {question.prompt}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 pl-6 text-muted">
                {question.choices.map((choice, choiceIndex) => (
                  <span key={choice}>
                    {letters[choiceIndex]}) {choice}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ol>
      </div>
      {limit >= set.questions.length ? (
        <div className="print-page mt-12">
          <SheetHeader set={set} part="Cevap anahtarı" />
          <ol className="mt-4 grid grid-cols-5 gap-2 text-sm">
            {set.questions.map((question, index) => (
              <li key={question.id} className="rounded-lg border border-line px-2 py-1">
                {index + 1}. {letters[question.answerIndex]}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </>
  );
}

export default async function SetPage({ params }: Props) {
  const { id } = await params;
  const set = studySet(id);
  if (!set) notFound();
  const profile = await currentProfile();
  if (!profile) redirect("/giris");
  const access = await entitlementFor(profile.id);
  const open = hasTools(access.tier);
  const limit = open ? Number.POSITIVE_INFINITY : previewRows;
  return (
    <section className="max-w-3xl print:max-w-none">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/setler" className="text-sm text-muted hover:text-ink">
          ← Bütün setler
        </Link>
        {open ? <PrintButton /> : null}
      </div>
      <article className="print-sheet rounded-3xl border border-line bg-card p-5 sm:p-8 print:rounded-none print:border-0 print:p-0">
        {set.kind === "words" ? <WordSheet set={set} limit={limit} /> : null}
        {set.kind === "connector-table" ? <ConnectorTable set={set} limit={limit} /> : null}
        {set.kind === "connector-quiz" ? <ConnectorQuiz set={set} limit={limit} /> : null}
      </article>
      {!open ? (
        <div className="mt-6 rounded-3xl border border-pine/40 bg-cream p-6 text-center">
          <p className="text-lg">Setin devamı ve PDF indirme {offers.gelisim.name} ile açılır.</p>
          <p className="mt-1 text-sm text-muted">{offers.gelisim.tagline}</p>
          <Link href="/odeme?paket=gelisim" className="mt-4 inline-block rounded-full bg-pine px-5 py-2.5 text-sm text-cream">
            {offers.gelisim.name}’e başla · {tl(offers.gelisim.price)} TL
          </Link>
        </div>
      ) : null}
    </section>
  );
}
