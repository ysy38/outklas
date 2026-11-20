import { contentWords } from "./validator";

/** The three roles that make one event. A stored plan already has them; a sentence does not. */
export type ScenarioRoles = { actor: string; obstacle: string; outcome: string };

/**
 * A repeated plot, not a repeated topic. Each group is one role: the actor, the obstacle, or the outcome.
 * A sentence carries the plot only when every role is present. Sharing three ordinary words does not.
 * One surface word counts once. Endings are not stripped, so evening is not even and listed is not list.
 */
const plots: { id: string; groups: string[][] }[] = [
  { id: "word-list-recall", groups: [["recall", "recalled"], ["list", "lists", "word"], ["accuracy", "accurate"]] },
  { id: "memory-recall", groups: [["recall", "recalled"], ["memory"], ["accuracy", "accurate"]] },
  { id: "granary", groups: [["council"], ["granary"], ["rebuild", "reconstruction"]] },
  { id: "credit-volatility", groups: [["lender", "bank"], ["credit", "lending", "loan", "loans"], ["volatile", "volatility", "deposit"]] },
  { id: "excavation-recovery", groups: [["excavation", "excavators", "excavator"], ["recovered", "recover"], ["lowest", "complete", "pottery", "ceramic", "bowl", "lacquer", "handles"]] },
  { id: "dialysis-water", groups: [["dialysis"], ["water"], ["unit", "session", "sessions", "scheduled"]] },
];

const tokens = (text: string) => contentWords(text);

const carries = (have: Set<string>, groups: string[][]) => groups.every((group) => group.some((word) => have.has(word)));

/** Exact content words in both sentences. This is a similarity note. It is not a duplicate decision. */
export function scenarioWordOverlap(a: string, b: string): string[] {
  const right = tokens(b);
  return [...tokens(a)].filter((word) => right.has(word)).sort();
}

/**
 * True only when both sentences carry the same plot: the same actor, obstacle, and outcome roles.
 * A shared domain, a shared academic word, or a handful of ordinary words does not qualify.
 */
export function sameScenario(a: string, b: string): boolean {
  const left = tokens(a);
  const right = tokens(b);
  return plots.some((plot) => carries(left, plot.groups) && carries(right, plot.groups));
}

const sharesRole = (left: string, right: string) => {
  const other = tokens(right);
  return [...tokens(left)].some((word) => other.has(word));
};

/**
 * True when the stored plans name the same actor, the same obstacle, and the same outcome.
 * One shared role is not enough. This does not look at domain or at the relation label.
 */
export function sameScenarioPlan(a: ScenarioRoles, b: ScenarioRoles): boolean {
  return sharesRole(a.actor, b.actor) && sharesRole(a.obstacle, b.obstacle) && sharesRole(a.outcome, b.outcome);
}

/** An engine-approved candidate keeps its sentence and its plan. Anything else is not a prior event. */
export function scenarioFromApproved(record: unknown): { sentence: string; plan: ScenarioRoles | null } | null {
  if (!record || typeof record !== "object") return null;
  const row = record as { status?: unknown; generation?: { skeleton?: { stem?: unknown; correctAnswer?: unknown; scenario?: Partial<ScenarioRoles> } } };
  if (row.status !== "approved") return null;
  const skeleton = row.generation?.skeleton;
  const stem = typeof skeleton?.stem === "string" ? skeleton.stem : "";
  const answer = typeof skeleton?.correctAnswer === "string" ? skeleton.correctAnswer : "";
  if (!stem.includes("----") || answer.trim() === "") return null;
  const scenario = skeleton?.scenario;
  const plan =
    scenario && typeof scenario.actor === "string" && typeof scenario.obstacle === "string" && typeof scenario.outcome === "string"
      ? { actor: scenario.actor, obstacle: scenario.obstacle, outcome: scenario.outcome }
      : null;
  return { sentence: stem.replace("----", answer.trim()), plan };
}
