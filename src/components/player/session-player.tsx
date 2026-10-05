"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { asExam, blueprintFor } from "@/modules/exam/blueprint";
import { distractorText } from "@/content/labels";
import { answerAction, flagAction, submitAction } from "@/server/actions";

type Choice = { id: string; body: string };
type Reveal = { correct: boolean; explanation: string; correctChoiceId: string; note: string | null };
export type PlayerItem = {
  id: string;
  position: number;
  slot: number | null;
  section: string;
  layout: string;
  stem: string;
  stimulusBody: string | null;
  flagged: boolean;
  selectedChoiceId: string | null;
  choices: Choice[];
  reveal: Reveal | null;
};

const letters = ["A", "B", "C", "D", "E"];

function gaps(stem: string) {
  const parts = stem.split("----");
  return parts.map((part, index) => (
    <span key={`${index}-${part.slice(0, 12)}`}>
      {part}
      {index < parts.length - 1 ? <span className="mx-1 inline-block min-w-16 border-b border-ink" /> : null}
    </span>
  ));
}

export function SessionPlayer({
  sessionId,
  mode,
  exam = "yds",
  endsAt,
  items,
}: {
  sessionId: string;
  mode: string;
  exam?: string;
  endsAt: string | null;
  items: PlayerItem[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [reveals, setReveals] = useState<Record<string, Reveal>>({});
  const [struck, setStruck] = useState<Record<string, boolean>>({});
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [now, setNow] = useState(Date.now());
  const [startedAt, setStartedAt] = useState(Date.now());
  const [finishing, setFinishing] = useState(false);
  const item = items[index];

  useEffect(() => {
    const initialSelected: Record<string, string> = {};
    const initialFlags: Record<string, boolean> = {};
    const initialReveals: Record<string, Reveal> = {};
    for (const row of items) {
      if (row.selectedChoiceId) initialSelected[row.id] = row.selectedChoiceId;
      if (row.flagged) initialFlags[row.id] = true;
      if (row.reveal) initialReveals[row.id] = row.reveal;
    }
    setSelected((current) => ({ ...current, ...initialSelected }));
    setFlags((current) => ({ ...current, ...initialFlags }));
    setReveals((current) => ({ ...current, ...initialReveals }));
  }, [items]);

  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  useEffect(() => {
    setStartedAt(Date.now());
    setMarks({});
  }, [index]);

  const remaining = endsAt ? Math.max(0, new Date(endsAt).getTime() - now) : null;
  useEffect(() => {
    if (remaining === 0) void submitAction(sessionId);
  }, [remaining, sessionId]);

  const instruction = useMemo(() => {
    if (!item) return null;
    const previous = items[index - 1];
    if (previous && previous.section === item.section) return null;
    return blueprintFor(asExam(exam)).bands.find((band) => band.section === item.section)?.instruction ?? null;
  }, [exam, item, index, items]);

  if (!item) return null;
  const reveal = reveals[item.id];
  const sentences = (item.stimulusBody ?? "").split(/(?<=\.)\s+/).filter(Boolean);

  async function choose(choiceId: string) {
    if (reveal && mode === "practice") return;
    setSelected((current) => ({ ...current, [item.id]: choiceId }));
    const result = await answerAction({
      sessionId,
      itemId: item.id,
      choiceId,
      responseTimeMs: Date.now() - startedAt,
    });
    if (result && "reveal" in result && result.reveal) {
      setReveals((current) => ({ ...current, [item.id]: result.reveal as Reveal }));
    }
    if (result && "submitted" in result && result.submitted) router.push(`/oturum/${sessionId}/sonuc`);
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    await submitAction(sessionId);
  }

  async function toggleFlag() {
    const next = !flags[item.id];
    setFlags((current) => ({ ...current, [item.id]: next }));
    await flagAction(sessionId, item.id, next);
  }

  const clock = remaining == null ? null : `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-2xl border border-line bg-card p-3">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span>{mode === "simulator" ? "Deneme" : mode === "diagnostic" ? "Teşhis" : "Pratik"}</span>
          {clock ? <span className="font-mono text-pine">{clock}</span> : null}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {items.map((row, rowIndex) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setIndex(rowIndex)}
              className={`h-8 rounded text-xs ${rowIndex === index ? "bg-pine text-cream" : selected[row.id] ? "bg-moss/15 text-moss" : "bg-paper"} ${flags[row.id] ? "ring-1 ring-clay" : ""}`}
            >
              {row.slot ?? rowIndex + 1}
            </button>
          ))}
        </div>
        <button type="button" disabled={finishing} onClick={() => void finish()} className="mt-4 w-full rounded-full bg-pine px-3 py-2 text-sm text-cream disabled:opacity-70">
          {finishing ? "Kaydediliyor…" : "Bitir"}
        </button>
      </aside>
      <article className="rounded-2xl border border-line bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted">
          <span>{blueprintFor(asExam(exam)).bands.find((band) => band.section === item.section)?.title}</span>
          <button type="button" onClick={toggleFlag} className="rounded-full border border-line px-3 py-1">
            {flags[item.id] ? "İşaretli" : "İşaretle"}
          </button>
        </div>
        {instruction ? <p className="mb-4 text-sm text-muted">{instruction}</p> : null}
        {item.layout === "dialogue" && item.stimulusBody ? (
          <pre className="mb-5 whitespace-pre-wrap font-sans leading-7">{item.stimulusBody}</pre>
        ) : item.stimulusBody ? (
          <div className="mb-5 space-y-2 leading-7">
            {sentences.map((sentence, sentenceIndex) => (
              <button
                key={sentenceIndex}
                type="button"
                onClick={() => setMarks((current) => ({ ...current, [sentenceIndex]: !current[sentenceIndex] }))}
                className={`block text-left ${marks[sentenceIndex] ? "bg-pine/10" : ""}`}
              >
                {sentence}
              </button>
            ))}
          </div>
        ) : null}
        {item.layout === "dialogue" ? null : <h1 className="mb-5 text-xl leading-snug break-words sm:text-2xl">{item.layout === "blank" ? gaps(item.stem) : item.stem}</h1>}
        <ol className="space-y-2">
          {item.choices.map((choice, choiceIndex) => {
            const active = (selected[item.id] ?? item.selectedChoiceId) === choice.id;
            const show = Boolean(reveal);
            const right = reveal?.correctChoiceId === choice.id;
            return (
              <li key={choice.id} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => choose(choice.id)}
                  className={`min-w-0 flex-1 rounded-xl border px-4 py-3 text-left break-words ${active ? "border-pine bg-pine/5" : "border-line"} ${show && right ? "border-moss" : ""} ${show && active && !right ? "border-clay" : ""} ${struck[choice.id] ? "line-through opacity-60" : ""}`}
                >
                  <span className="mr-2 text-muted">{letters[choiceIndex]}</span>
                  {choice.body}
                </button>
                {mode !== "practice" ? (
                  <button type="button" aria-label="Şıkkı ele" onClick={() => setStruck((current) => ({ ...current, [choice.id]: !current[choice.id] }))} className="rounded-xl border border-line px-3 text-xs text-muted">
                    ele
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
        {reveal ? (
          <div className="mt-5 rounded-xl bg-paper p-4 text-sm leading-6">
            <p className="font-medium">{reveal.correct ? "Doğru." : "Bu şık tutmadı."}</p>
            <p className="mt-2">{reveal.explanation}</p>
            {reveal.note ? <p className="mt-2 text-muted">Neden tutmadı: {distractorText(reveal.note)}</p> : null}
          </div>
        ) : null}
        <div className="mt-6 flex justify-between">
          <button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className="rounded-full border border-line px-4 py-2 disabled:opacity-40">
            Önceki
          </button>
          <button type="button" disabled={index === items.length - 1} onClick={() => setIndex((value) => value + 1)} className="rounded-full bg-pine px-4 py-2 text-cream disabled:opacity-40">
            Sonraki
          </button>
        </div>
      </article>
    </div>
  );
}
