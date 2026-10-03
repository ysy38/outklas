const correctDays = [3, 7, 21, 45];

export type ReviewState = {
  step: number;
  lapses: number;
};

export type ReviewUpdate = ReviewState & {
  dueAt: Date;
  stabilityDays: number;
};

function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * 60_000);
}

export function nextReview(state: ReviewState, correct: boolean, now: Date): ReviewUpdate {
  if (!correct) {
    const lapses = state.lapses + 1;
    const minutes = lapses <= 1 ? 10 : 60 * 24;
    return {
      dueAt: addMinutes(now, minutes),
      step: 0,
      lapses,
      stabilityDays: Math.round((minutes / (60 * 24)) * 100) / 100,
    };
  }
  const step = state.step + 1;
  const days = correctDays[Math.min(step - 1, correctDays.length - 1)] ?? 45;
  return {
    dueAt: addMinutes(now, days * 60 * 24),
    step,
    lapses: state.lapses,
    stabilityDays: days,
  };
}
