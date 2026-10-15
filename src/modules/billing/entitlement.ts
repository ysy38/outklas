export type PlanCode = "free" | "gelisim" | "kamp" | "pro" | "exam_pass" | "lab_90" | "lab_180" | "sprint";

export type CheckoutPlan = "gelisim" | "kamp";

/**
 * free (Başlangıç): test + daily drills + one mock.
 * gelisim (sold as Sprint; the code stays because stored subscriptions use it): full report, tools, daily program, a few mocks.
 * kamp: everything, unlimited mocks.
 */
export type Tier = "free" | "gelisim" | "kamp";

const tierOfPlan: Record<PlanCode, Tier> = {
  free: "free",
  gelisim: "gelisim",
  kamp: "kamp",
  pro: "kamp",
  exam_pass: "kamp",
  lab_90: "kamp",
  lab_180: "kamp",
  sprint: "kamp",
};

export type EntitlementInput = {
  devPro: boolean;
  plan: PlanCode | null;
  status: string | null;
  periodEnd: Date | null;
  now: Date;
};

export function tierFor(input: EntitlementInput): Tier {
  if (input.devPro) return "kamp";
  if (!input.plan || input.status !== "active") return "free";
  if (input.periodEnd && input.periodEnd.getTime() < input.now.getTime()) return "free";
  return tierOfPlan[input.plan] ?? "free";
}

export function isPro(input: EntitlementInput): boolean {
  return tierFor(input) === "kamp";
}

export function hasTools(tier: Tier): boolean {
  return tier !== "free";
}

export function hasProgram(tier: Tier): boolean {
  return tier !== "free";
}

/** Total completed mocks allowed; Sprint's mocks come on top of the free one. */
export function simulatorLimit(tier: Tier, limits: { free: number; sprint: number }): number {
  if (tier === "kamp") return Number.POSITIVE_INFINITY;
  return tier === "gelisim" ? limits.free + limits.sprint : limits.free;
}

export function canStartPractice(input: { pro: boolean; answeredToday: number; limit: number }): boolean {
  return input.pro || input.answeredToday < input.limit;
}

export function canStartSimulator(input: { pro: boolean; completed: number; limit: number }): boolean {
  return input.pro || input.completed < input.limit;
}

export function practiceAllowance(input: { pro: boolean; answeredToday: number; limit: number; requested: number }): number {
  if (input.pro) return input.requested;
  return Math.max(0, Math.min(input.requested, input.limit - input.answeredToday));
}

export function drillAllowance(input: { tier: Tier; answeredToday: number; limit: number }): number {
  if (hasTools(input.tier)) return input.limit;
  return Math.max(0, input.limit - input.answeredToday);
}
