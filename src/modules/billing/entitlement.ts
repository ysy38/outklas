export type PlanCode = "free" | "pro" | "exam_pass" | "lab_90" | "lab_180" | "sprint";

export type CheckoutPlan = "lab_90" | "lab_180" | "sprint";

const paidPlans = new Set<PlanCode>(["pro", "exam_pass", "lab_90", "lab_180", "sprint"]);

export type EntitlementInput = {
  devPro: boolean;
  plan: PlanCode | null;
  status: string | null;
  periodEnd: Date | null;
  now: Date;
};

export function isPro(input: EntitlementInput): boolean {
  if (input.devPro) return true;
  if (!input.plan || input.plan === "free" || input.status !== "active") return false;
  if (input.periodEnd && input.periodEnd.getTime() < input.now.getTime()) return false;
  return paidPlans.has(input.plan);
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
