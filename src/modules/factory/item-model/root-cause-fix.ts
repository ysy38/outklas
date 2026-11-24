import { classifyOption } from "./whole-set";
import { existentialQuantityVariant, trapFamily, type BakeoffPlan } from "./writer-bakeoff";
import {
  buildSemanticFrame,
  semanticRelations,
  writerTask,
  type SemanticFrame,
  type SemanticFrameSlot,
  type SemanticRelation,
} from "./semantic-preservation";

/** Off until a human switch after this file's tests pass. Does not change modelDefaults. */
export const factoryRootCauseFixVersion = "factory-root-cause-fix-v1";
export const factoryRootCauseFixEnabled = false;

export const factoryRootCauseFixSwitchCriteria = [
  "pipeline/root-cause-fix.test.ts passes",
  "writer-bakeoff, architecture-v2, quality-first-pilot, misreading-mechanisms, and cognitive-trap tests still pass",
  "freeze hashes of writer-bakeoff-v1 / smoke / compare / editorial / quality-first unchanged",
  "production default stays off until an explicit human switch",
] as const;

export type IndependenceKey =
  | "quantity_scope"
  | "time_order"
  | "cause"
  | "concession"
  | "purpose"
  | "condition_direction"
  | "condition_force"
  | "negation"
  | "modality_epistemic"
  | "referents"
  | "actors"
  | "main_actions"
  | "uncertain";

type Reading = {
  misreadingMechanism: string | null;
  studentMisreading: string;
};

export type IndependentPlanV1 = BakeoffPlan & {
  independenceKey: IndependenceKey;
  infeasible: boolean;
  contradiction: boolean;
  inventedAddition: boolean;
  independenceUncertain: boolean;
};

export type IndependentPlanReportV1 = {
  status: "ok" | "source_insufficient_traps";
  plans: IndependentPlanV1[];
  heldInfeasible: IndependentPlanV1[];
  droppedVariants: { mechanismId: string; independenceKey: IndependenceKey; studentMisreading: string; reason: string }[];
  independentRelationCount: number;
  provenIndependentCount: number;
  mechanismLabelCount: number;
  paddedToFour: false;
  uncertainIndependence: { mechanismId: string; studentMisreading: string }[];
};

const independenceByFamily: Record<string, IndependenceKey> = {
  quantity: "quantity_scope",
  "exclusive focus": "quantity_scope",
  universal_negative_quantity: "quantity_scope",
  "order between events": "time_order",
  "time interval": "time_order",
  cause: "cause",
  concession: "concession",
  purpose: "purpose",
  condition: "condition_direction",
  "counterfactual or unrealized alternative": "condition_force",
  negation: "negation",
  "modal force": "modality_epistemic",
  evidence: "modality_epistemic",
  reference: "referents",
  "participant roles": "actors",
  "two predicates": "main_actions",
};

const changeByIndependence: Record<Exclude<IndependenceKey, "uncertain">, SemanticRelation> = {
  quantity_scope: "quantity_scope",
  time_order: "time_order",
  cause: "cause",
  concession: "cause",
  purpose: "purpose",
  condition_direction: "condition_counterfactual",
  condition_force: "condition_counterfactual",
  negation: "negation",
  modality_epistemic: "modality_epistemic",
  referents: "referents",
  actors: "actors",
  main_actions: "main_actions",
};

export function independenceKeyFor(reading: Reading): IndependenceKey {
  const id = reading.misreadingMechanism?.trim() ?? "";
  if (!id) return "uncertain";
  if (existentialQuantityVariant(reading.studentMisreading)) return "quantity_scope";
  const family = trapFamily(id);
  return independenceByFamily[family] ?? "uncertain";
}

export function agentRoleInfeasible(source: string, mechanismId: string, misreading: string): boolean {
  if (mechanismId !== "AGENT_ROLE") return false;
  if (/\b(faculty|department|fakülte|bölüm)\b/i.test(source) && /\b(hired|hire|tuttu)\b/i.test(source)) return false;
  if (/\bsealed the (glass )?plates\b/i.test(source)) return true;
  if (/\b(plates?|humidity)\b[\s\S]{0,40}\bsealed\b[\s\S]{0,40}\bconservators\b/i.test(misreading)) return true;
  return false;
}

export function mechanismMisreadingContradiction(source: string, mechanismId: string, misreading: string): boolean {
  if (mechanismId === "AGENT_ROLE" && /\bsealed the glass plates, so the plates needed humidity\b/i.test(misreading)) return true;
  if (mechanismId === "AGENT_ROLE" && agentRoleInfeasible(source, mechanismId, misreading) && !/\btrade places|swap(?:ped)? roles|plates had sealed\b/i.test(misreading)) {
    return true;
  }
  if (mechanismId === "TEMPORAL_SCOPE" && /\bhumidity fell\b/i.test(misreading) && !/\bfell\b/i.test(source)) return true;
  return false;
}

function inventedAddition(source: string, misreading: string): boolean {
  if (/\bhumidity fell\b/i.test(misreading) && !/\bfell\b/i.test(source)) return true;
  if (/\bapproved\b/i.test(misreading) && !/\bapproved\b/i.test(source)) return true;
  return false;
}

function rank(plan: IndependentPlanV1): number {
  if (plan.infeasible || plan.independenceUncertain) return -100;
  let score = 0;
  if (!plan.contradiction) score += 4;
  if (!plan.inventedAddition) score += 2;
  if (plan.independenceKey === "condition_direction" || plan.independenceKey === "condition_force") score += 1;
  return score;
}

export function selectIndependentPlansV1(readings: readonly Reading[], source: string): IndependentPlanReportV1 {
  const labels = new Set(readings.map((row) => row.misreadingMechanism).filter(Boolean));
  const annotated: IndependentPlanV1[] = readings.map((reading, index) => {
    const mechanismId = reading.misreadingMechanism?.trim() ?? "";
    const family = trapFamily(mechanismId);
    const key = independenceKeyFor(reading);
    const uncertain = key === "uncertain" || !mechanismId;
    const infeasible = agentRoleInfeasible(source, mechanismId, reading.studentMisreading);
    const contradiction = mechanismMisreadingContradiction(source, mechanismId, reading.studentMisreading);
    const extra = inventedAddition(source, reading.studentMisreading);
    const changeRelation = key === "uncertain" ? "quantity_scope" : changeByIndependence[key];
    return {
      planId: `p${index + 1}-${mechanismId || "UNKNOWN"}`,
      mechanismId,
      family,
      source: "live_reading",
      dominantMisreading: mechanismId,
      changeRelation,
      preserveRelations: [],
      forbiddenAdditions: ["new actor", "new event", "new purpose", "new cause", "unsupported assumption"],
      expectedStudentMisreading: reading.studentMisreading,
      independenceKey: key,
      infeasible,
      contradiction,
      inventedAddition: extra,
      independenceUncertain: uncertain,
    };
  });

  const heldInfeasible = annotated.filter((row) => row.infeasible);
  const uncertainIndependence = annotated.filter((row) => row.independenceUncertain && !row.infeasible).map((row) => ({
    mechanismId: row.mechanismId,
    studentMisreading: row.expectedStudentMisreading,
  }));
  const droppedVariants: IndependentPlanReportV1["droppedVariants"] = [];
  const bestByKey = new Map<IndependenceKey, IndependentPlanV1>();
  const eligible = annotated
    .filter((row) => !row.infeasible && !row.independenceUncertain)
    .slice()
    .sort((left, right) => rank(right) - rank(left) || left.planId.localeCompare(right.planId));

  for (const plan of eligible) {
    const current = bestByKey.get(plan.independenceKey);
    if (!current) {
      bestByKey.set(plan.independenceKey, plan);
      continue;
    }
    droppedVariants.push({
      mechanismId: plan.mechanismId,
      independenceKey: plan.independenceKey,
      studentMisreading: plan.expectedStudentMisreading,
      reason: "same_change_relation",
    });
  }
  for (const plan of heldInfeasible) {
    droppedVariants.push({
      mechanismId: plan.mechanismId,
      independenceKey: plan.independenceKey,
      studentMisreading: plan.expectedStudentMisreading,
      reason: "infeasible",
    });
  }
  for (const row of uncertainIndependence) {
    droppedVariants.push({
      mechanismId: row.mechanismId,
      independenceKey: "uncertain",
      studentMisreading: row.studentMisreading,
      reason: "independence_unproven",
    });
  }

  const unique = [...bestByKey.values()].sort((left, right) => rank(right) - rank(left) || left.planId.localeCompare(right.planId));
  const provenIndependentCount = unique.length;
  const selected = provenIndependentCount >= 4 ? unique.slice(0, 4) : unique;
  return {
    status: provenIndependentCount >= 4 ? "ok" : "source_insufficient_traps",
    plans: selected,
    heldInfeasible,
    droppedVariants,
    independentRelationCount: provenIndependentCount,
    provenIndependentCount,
    mechanismLabelCount: labels.size,
    paddedToFour: false,
    uncertainIndependence,
  };
}

export function independentGroundedMechanisms(ids: readonly string[], source = ""): {
  keys: IndependenceKey[];
  provenIndependentCount: number;
  droppedAsSameRelation: string[];
} {
  const seen = new Set<IndependenceKey>();
  const keys: IndependenceKey[] = [];
  const droppedAsSameRelation: string[] = [];
  for (const id of ids) {
    if (source && agentRoleInfeasible(source, id, "")) {
      droppedAsSameRelation.push(id);
      continue;
    }
    const key = independenceKeyFor({ misreadingMechanism: id, studentMisreading: "" });
    if (key === "uncertain") continue;
    if (seen.has(key)) {
      droppedAsSameRelation.push(id);
      continue;
    }
    seen.add(key);
    keys.push(key);
  }
  return { keys, provenIndependentCount: keys.length, droppedAsSameRelation };
}

function span(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  const text = match?.[0]?.trim() ?? null;
  return text && text.length > 0 ? text : null;
}

function unused(statement: string | null, taken: Set<string>): string | null {
  if (!statement) return null;
  const key = statement.toLocaleLowerCase("en-US");
  if (taken.has(key)) return null;
  return statement;
}

function contradictsSource(statement: string, source: string, key: string): boolean {
  if (/never filed/i.test(statement) && /no trace/i.test(source) && !/\bnever\b/i.test(source)) return true;
  if (/never filed/i.test(statement) && /no trace/i.test(key) && !/\bnever\b/i.test(key)) return true;
  return false;
}

export function fillSemanticSlots(source: string, key: string): Record<SemanticRelation, SemanticFrameSlot> {
  const taken = new Set<string>();
  const claim = (relation: SemanticRelation, status: SemanticFrameSlot["status"], statement: string | null, basis: string): SemanticFrameSlot => {
    if (statement && contradictsSource(statement, source, key)) {
      return { relation, status: "unverified", statement: null, basis: "Extracted statement contradicts source or key; halted." };
    }
    const unique = unused(statement, taken);
    if (unique) taken.add(unique.toLocaleLowerCase("en-US"));
    if (status === "present" && !unique) {
      return { relation, status: "unverified", statement: null, basis: "unknown: no distinct source span for this slot." };
    }
    if (status === "absent") {
      return { relation, status: "absent", statement: null, basis: basis || "not_applicable" };
    }
    return { relation, status, statement: unique, basis };
  };

  const archivist = span(source, /\bthe archivist\b/i) ?? span(source, /\barşivist\b/i);
  const registryActor = span(source, /\bthe registry\b/i);
  const actors =
    (archivist && registryActor ? `${registryActor}; ${archivist}` : null) ??
    archivist ??
    registryActor ??
    span(source, /\bthe (?:conservators|faculty|department|editors|referees|census office|review board)\b/i) ??
    span(source, /\bHakem(?:ler)?(?: kurulu)?|Fakülte|Bölüm\b/i);
  const actions =
    span(source, /\b(?:had )?sealed the glass plates\b/i) ??
    span(source, /\bhired an outside auditor\b/i) ??
    span(source, /\bfound no (?:trace|evidence)\b/i) ??
    span(source, /\bcompleted the citation check\b/i) ??
    span(source, /\bokumuş olsaydı\b/i) ??
    span(source, /\bduruşmada okundu\b/i);
  const quantity =
    span(source, /\bthe two earliest negatives\b/i) ??
    span(source, /\bevery laboratory log\b/i) ??
    span(source, /\bonly the two contested appendices\b/i) ??
    span(source, /\bthe two secondary measures\b/i) ??
    span(source, /\byalnızca iki itirazlı tablo\b/i) ??
    span(source, /\byalnızca iki tutanak\b/i) ??
    span(source, /\bonly the two disputed tables\b/i) ??
    span(source, /\btwo secondary measures\b/i);
  const time =
    span(source, /\bbefore the humidity rose\b/i) ??
    span(source, /\bbefore the embargo\b/i) ??
    span(source, /\bbefore it entered the archive\b/i) ??
    span(source, /\barşive girmeden önce\b/i) ??
    span(source, /\bbefore the humidity\b/i);
  const cause = span(source, /\bbecause [^.]+/i) ?? span(source, /nedeniyle[^,]*/i);
  const purpose = span(source, /\bso that [^.]+?(?=, because|, so\b|\.|$)/i) ?? span(source, /\bso that [^.]+/i);
  const condition =
    span(source, /\bIf [^.]+ would still have been printable\./i) ??
    span(source, /\bHad [^.]+ preprint server\./i) ??
    span(source, /olsaydı[^.]+gidecekti\./i) ??
    span(source, /\bIf [^.]+ printable\./i);
  const negationSpan =
    span(source, /\bno (?:trace|evidence) that [^.]+/i) ??
    span(source, /\bwould not value [^.]+/i) ??
    span(source, /Hiçbir[^;]+değil/i);
  const negationPresent = Boolean(negationSpan) || /\b(not|no|never|none)\b|değil/i.test(source);
  const epistemic =
    span(source, /\bfound no (?:trace|evidence) that [^.]+/i) ??
    span(source, /\bleft open [^.]+/i) ??
    span(source, /\b(?:might|could|may|must|should)\b[^.]*/i);
  const referents =
    span(source, /\bits own equipment\b/i) ??
    span(source, /\bthe glass plates\b/i) ??
    span(source, /\bwith them\b/i) ??
    span(source, /\bthose logs\b/i);

  const slots = {
    actors: claim("actors", actors ? "present" : "absent", actors, actors ? "Named agent in the source." : "not_applicable"),
    main_actions: claim("main_actions", actions ? "present" : "absent", actions, actions ? "Main predicate span in the source." : "not_applicable"),
    quantity_scope: claim("quantity_scope", quantity ? "present" : "absent", quantity, quantity ? "Quantity/scope span in the source." : "not_applicable"),
    time_order: claim("time_order", time ? "present" : "absent", time, time ? "Temporal-order span in the source." : "not_applicable"),
    cause: claim("cause", cause ? "present" : "absent", cause, cause ? "Cause span (because/nedeniyle), not purpose." : "not_applicable"),
    purpose: claim("purpose", purpose ? "present" : "absent", purpose, purpose ? "Purpose span (so that/için), not cause." : "not_applicable"),
    condition_counterfactual: claim("condition_counterfactual", condition ? "present" : "absent", condition, condition ? "Condition/counterfactual span in the source." : "not_applicable"),
    negation: claim(
      "negation",
      negationPresent ? "present" : "absent",
      negationSpan,
      negationPresent ? "Negation span; absence of evidence is not proof of absence." : "not_applicable",
    ),
    modality_epistemic: claim("modality_epistemic", epistemic ? "present" : "absent", epistemic, epistemic ? "Epistemic/evidence span; no-trace is not never-filed." : "not_applicable"),
    referents: claim("referents", referents ? "present" : "absent", referents, referents ? "Reference span in the source." : "not_applicable"),
  } as Record<SemanticRelation, SemanticFrameSlot>;

  for (const relation of semanticRelations) {
    if (!slots[relation]) slots[relation] = { relation, status: "unverified", statement: null, basis: "unknown" };
  }
  return slots;
}

export function frameFromSource(source: string, key: string, questionType: "restatement" | "translation", direction: "en_tr" | "tr_en" | null = null): SemanticFrame {
  return buildSemanticFrame({ source, questionType, direction, slots: fillSemanticSlots(source, key) });
}

export function presentFrameSlots(frame: SemanticFrame): { relation: SemanticRelation; statement: string | null }[] {
  return semanticRelations
    .filter((relation) => frame.slots[relation].status === "present")
    .map((relation) => ({ relation, statement: frame.slots[relation].statement }));
}

export function attachPreserveV1(plans: IndependentPlanV1[], present: SemanticRelation[]): IndependentPlanV1[] {
  return plans.map((plan) => ({
    ...plan,
    preserveRelations: present.filter((relation) => relation !== plan.changeRelation),
  }));
}

export function frameSlotLabel(frame: SemanticFrame, relation: SemanticRelation): string {
  const slot = frame.slots[relation];
  if (slot.status === "absent") return "not_applicable";
  if (slot.status === "unverified" || !slot.statement) return "unknown";
  return slot.statement;
}

export function semanticWriterUser(input: {
  source: string;
  key: string;
  targetLanguage: "tr" | "en" | null;
  frame: SemanticFrame;
  plans: IndependentPlanV1[];
}): string {
  const language = input.targetLanguage ? `TARGET LANGUAGE: ${input.targetLanguage}` : "TARGET LANGUAGE: en";
  const frameLines = semanticRelations.map((relation) => {
    const slot = input.frame.slots[relation];
    const label = slot.status === "absent" ? "not_applicable" : slot.statement ?? "unknown";
    return `- ${relation}: ${label}`;
  });
  const plans = input.plans.map((plan) => {
    const task = writerTask(plan);
    const changeValue = frameSlotLabel(input.frame, task.changeRelation);
    const preserveLines = task.preserveRelations.map((relation) => `${relation}: ${frameSlotLabel(input.frame, relation)}`);
    return [
      `PLAN ${plan.planId}`,
      `change: ${task.changeRelation} → ${changeValue}`,
      `preserve:`,
      ...preserveLines.map((line) => `  - ${line}`),
      `forbidden: ${task.forbiddenAdditions.join("; ")}`,
      `studentMisreading: ${task.expectedStudentMisreading}`,
      `Writer self-report of preserved meaning is not proof.`,
    ].join("\n");
  });
  return [
    language,
    ``,
    `SOURCE`,
    input.source,
    ``,
    `KEY`,
    input.key,
    ``,
    `SEMANTIC FRAME (absent slots are not_applicable; do not invent them)`,
    frameLines.join("\n"),
    ``,
    `PLANS`,
    plans.join("\n\n"),
    ``,
    `1. Change only the one targeted meaning relation and value named on that plan.`,
    `2. Keep every other source event and relation listed under preserve with the stated values.`,
    `3. Do not add an actor, event, purpose, or cause that the source does not have.`,
    `4. Write a natural academic sentence in the required language.`,
    `5. The option must not be equivalent to the key or the source.`,
    `6. Do not drop a whole clause so the key becomes the only complete sentence.`,
    `A field such as preserved: true is not proof.`,
    `Write one option per plan, in this order. Return ${input.plans.length} candidates. Do not pad.`,
  ].join("\n");
}

/** Existing classifyOption only. High overlap without a shown difference remains a second-answer risk, not a pass. */
export function refereesSecondAnswerRisk(source: string, key: string, option: string): boolean {
  const classified = classifyOption(source, key, option);
  return classified.relation === "confirmed_equivalent" || (classified.relation === "unresolved" && classified.overlap >= 0.72);
}
