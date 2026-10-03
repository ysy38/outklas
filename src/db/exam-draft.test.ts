import { ydsBlueprint, bandForSlot, type SectionId } from "@/modules/exam/blueprint";
import { publishBlockers } from "@/modules/content/publish";
import { selectDiagnostic, selectMock, type PoolItem } from "@/modules/exam/select";
import { examDraft, stimuli } from "./exam-draft";
import { describe, expect, it } from "vitest";

describe("exam draft", () => {
  it("publishes a full original mock in booklet order", () => {
    expect(examDraft).toHaveLength(80);
    const slots = examDraft.map((item) => item.slot).sort((a, b) => a - b);
    expect(slots).toEqual(Array.from({ length: 80 }, (_, index) => index + 1));
    for (const draft of examDraft) {
      const band = bandForSlot(draft.slot);
      expect(band?.section).toBe(draft.section);
      expect(band?.layout).toBe(draft.layout);
      const blockers = publishBlockers({
        stem: draft.stem,
        explanation: draft.explanation,
        difficulty: draft.difficulty,
        skillIds: draft.skills,
        layout: draft.layout,
        choices: draft.choices.map((choice) => ({
          body: choice.text,
          correct: Boolean(choice.correct),
          distractorType: choice.distractor ?? null,
        })),
      });
      expect(blockers, `slot ${draft.slot}`).toEqual([]);
      if (draft.stimulusKey) expect(stimuli.some((stimulus) => stimulus.key === draft.stimulusKey)).toBe(true);
    }
    const pool: PoolItem[] = examDraft.map((draft) => ({
      id: `item-${draft.slot}`,
      slot: draft.slot,
      section: draft.section as SectionId,
      stimulusId: draft.stimulusKey ?? null,
      difficulty: draft.difficulty,
      skillIds: draft.skills,
    }));
    expect(selectMock(pool)).toHaveLength(ydsBlueprint.questionCount);
    expect(selectDiagnostic(pool)).toHaveLength(24);
  });
});
