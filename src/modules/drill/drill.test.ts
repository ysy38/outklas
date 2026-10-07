import { describe, expect, it } from "vitest";
import { connectors, connectorSentences } from "@/content/drill-connectors";
import { drillWords } from "@/content/drill-words";
import { connectorQuestion, connectorRelation, feedback, pickDaily, questionById, wordQuestion } from "./drill";

describe("word drill", () => {
  it("gives five different choices with the right meaning among them", () => {
    for (const word of drillWords) {
      for (const direction of ["en", "tr"] as const) {
        const question = wordQuestion(word.id, direction);
        expect(question).not.toBeNull();
        if (!question) continue;
        expect(new Set(question.choices).size).toBe(5);
        expect(question.choices[question.answerIndex]).toBe(direction === "en" ? word.meaning : word.word);
      }
    }
  });

  it("rebuilds the same question from its id", () => {
    const question = wordQuestion("hinder", "tr");
    expect(questionById(question?.id ?? "")).toEqual(question);
  });
});

describe("connector drill", () => {
  it("never offers another connector of the same meaning unless it is the grammar trap", () => {
    const byText = new Map(connectors.map((item) => [item.text, item]));
    for (const sentence of connectorSentences) {
      const question = connectorQuestion(sentence.id);
      expect(question, sentence.id).not.toBeNull();
      if (!question) continue;
      expect(new Set(question.choices).size).toBe(5);
      const answer = byText.get(question.choices[question.answerIndex]);
      expect(answer?.id).toBe(sentence.answer);
      const trap = sentence.trap ? connectors.find((item) => item.id === sentence.trap)?.text : undefined;
      for (const [index, text] of question.choices.entries()) {
        if (index === question.answerIndex || text === trap) continue;
        const other = byText.get(text);
        expect(other?.relation, `${sentence.id} offers ${text}`).not.toBe(answer?.relation);
      }
    }
  });

  it("explains the grammar when the trap is chosen", () => {
    const question = connectorQuestion("s04");
    if (!question) throw new Error("missing s04");
    const trapIndex = question.choices.indexOf("although");
    const result = feedback(question, trapIndex);
    expect(result.correct).toBe(false);
    expect(result.explanation).toContain("anlam olarak yakın");
    expect(connectorRelation("s04")).toBe("concession");
  });
});

describe("daily pick", () => {
  it("puts due reviews first, then new targets, and skips today's answers", () => {
    const now = new Date("2026-10-07T09:00:00Z");
    const picked = pickDaily({
      targets: ["a", "b", "c", "d", "e"],
      due: new Map([
        ["c", new Date("2026-10-06T00:00:00Z")],
        ["a", new Date("2026-10-09T00:00:00Z")],
      ]),
      seen: new Set(["a", "c", "e"]),
      doneToday: new Set(["e"]),
      now,
      count: 3,
    });
    expect(picked).toEqual(["c", "b", "d"]);
  });
});

describe("printable sets", () => {
  it("covers every word and sentence once, with an answer key", async () => {
    const { studySets } = await import("@/content/sets");
    const words = studySets.flatMap((set) => (set.kind === "words" ? set.words.map((word) => word.id) : []));
    const questions = studySets.flatMap((set) => (set.kind === "connector-quiz" ? set.questions : []));
    expect(new Set(words).size).toBe(drillWords.length);
    expect(new Set(questions.map((question) => question.id)).size).toBe(connectorSentences.length);
    for (const question of questions) expect(question.choices[question.answerIndex]).toBeTruthy();
  });
});
