"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { drillAnswerAction } from "@/server/actions";

type Question = { id: string; prompt: string; note: string | null; choices: string[] };
type Result = { correct: boolean; answerIndex: number; explanation: string };

const letters = ["A", "B", "C", "D", "E"];

export function DrillPlayer({
  kind,
  questions,
  startDone,
  startCorrect,
  yesterday,
  limit,
  unlimited,
}: {
  kind: "word" | "connector";
  questions: Question[];
  startDone: number;
  startCorrect: number;
  yesterday: { done: number; correct: number };
  limit: number;
  unlimited: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ done: startDone, correct: startCorrect });
  const [busy, setBusy] = useState(false);
  const question = questions[index];
  const noun = kind === "word" ? "kelime" : "bağlaç";

  async function choose(choiceIndex: number) {
    if (!question || result || busy) return;
    setBusy(true);
    setPicked(choiceIndex);
    const response = await drillAnswerAction(question.id, choiceIndex);
    setBusy(false);
    if ("error" in response) {
      setError(response.error);
      return;
    }
    setResult(response);
    setScore((current) => ({ done: current.done + 1, correct: current.correct + (response.correct ? 1 : 0) }));
  }

  function next() {
    setIndex((value) => value + 1);
    setPicked(null);
    setResult(null);
  }

  if (!question) {
    const roundDone = score.done - startDone;
    return (
      <div className="rounded-3xl border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">{unlimited && roundDone > 0 ? "Tur bitti" : "Bugünlük bu kadar"}</p>
        <p className="mt-3 font-serif text-5xl">
          {score.correct}/{score.done}
        </p>
        <p className="mt-2 text-sm text-muted">Bugün çözdüğün {noun} soruları.</p>
        {yesterday.done > 0 ? (
          <p className="mt-4 text-sm">
            Dün: {yesterday.correct}/{yesterday.done} · Bugün: {score.correct}/{score.done}
            {score.done > 0 && score.correct / score.done > yesterday.correct / yesterday.done ? " · Düne göre daha iyisin." : ""}
          </p>
        ) : null}
        {unlimited ? (
          <button type="button" onClick={() => router.refresh()} className="mt-6 rounded-full bg-pine px-5 py-3 text-cream">
            10 soru daha
          </button>
        ) : (
          <div className="mt-6 space-y-3 text-sm leading-6">
            <p>Yarın {limit} yeni {noun} sorusu seni bekliyor. Yanlış yaptıkların da tekrar karşına çıkacak.</p>
            <p className="text-muted">
              Günlük sınır olmadan çalışmak ve kelime ile bağlaç setlerini indirmek için{" "}
              <Link href="/odeme?paket=gelisim" className="text-pine">
                Gelişim Paketi’ne bak
              </Link>
              .
            </p>
          </div>
        )}
        <Link href="/bugun" className="mt-6 block text-sm text-pine">
          Bugün sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-card p-6">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {index + 1}/{questions.length}
        </span>
        <span>
          Bugün {score.correct}/{score.done}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-line">
        <div className="h-1.5 rounded-full bg-pine transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <p className="mt-6 text-sm text-muted">
        {kind === "connector"
          ? "Boşluğa en uygun bağlacı seç."
          : question.note === null
            ? "Bu anlama gelen kelimeyi seç."
            : "Bu kelimenin anlamını seç."}
      </p>
      <h2 className={`mt-2 break-words ${kind === "word" ? "font-serif text-4xl" : "text-xl leading-snug sm:text-2xl"}`}>{question.prompt}</h2>
      {question.note ? <p className="mt-2 text-sm italic text-muted">{question.note}</p> : null}
      <ol className="mt-6 space-y-2">
        {question.choices.map((choice, choiceIndex) => {
          const right = result && choiceIndex === result.answerIndex;
          const wrong = result && choiceIndex === picked && !result.correct;
          return (
            <li key={choice}>
              <button
                type="button"
                disabled={Boolean(result) || busy}
                onClick={() => void choose(choiceIndex)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${right ? "border-moss bg-moss/10" : wrong ? "border-clay bg-clay/5" : picked === choiceIndex ? "border-pine" : "border-line hover:border-pine"}`}
              >
                <span className="mr-2 text-muted">{letters[choiceIndex]}</span>
                {choice}
              </button>
            </li>
          );
        })}
      </ol>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
      {result ? (
        <div className="mt-5 rounded-xl bg-paper p-4 text-sm leading-6">
          <p className="font-medium">{result.correct ? "Doğru!" : "Doğru cevap yeşil çerçeveli şık."}</p>
          <p className="mt-1">{result.explanation}</p>
          <button type="button" onClick={next} className="mt-4 rounded-full bg-pine px-5 py-2 text-cream">
            {index + 1 < questions.length ? "Sonraki" : "Sonucu gör"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
