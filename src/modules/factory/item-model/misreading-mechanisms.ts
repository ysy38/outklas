import type { OptionLabel } from "@/modules/analysis/contract";
import { discourseConnectorSwap } from "./cognitive-trap";
import { assessWholeSet, type WholeSetGate } from "./whole-set";

/**
 * Semantic misreadings for cognitive_trap_first.
 * These ids are not members of the existing errorMechanism enums.
 * errorMechanismHint is the nearest old label for an editor. It is never written onto a candidate.
 */
export type MisreadingMechanism = {
  id: string;
  description: string;
  requiredSemanticRelation: string;
  targetMisinterpretation: string;
  preservedMeaning: string[];
  commonFailureRisks: string[];
  applicableQuestionTypes: string[];
};

export const misreadingMechanisms = [
  {
    id: "TEMPORAL_ORDER",
    description: "Two events swap order, or an endpoint is retold as a later start.",
    requiredSemanticRelation: "order between events",
    targetMisinterpretation: "The later event is read as what happens first, or a state that lasted until an endpoint is read as an act that starts after it.",
    preservedMeaning: ["who acts", "what is acted on", "concession or cause that is not the order"],
    commonFailureRisks: ["a new event is invented to fill the reversed order", "the concession is also flipped"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "TEMPORAL_SCOPE",
    description: "The interval that contains an event is widened, narrowed, or moved.",
    requiredSemanticRelation: "time interval",
    targetMisinterpretation: "An event that holds before or until a boundary is read as holding during that period.",
    preservedMeaning: ["the event itself", "who takes part", "quantity"],
    commonFailureRisks: ["before and during are treated as synonyms", "a second event is added"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "CONCESSION_CAUSE",
    description: "A concession is retold as the cause of the other clause.",
    requiredSemanticRelation: "concession",
    targetMisinterpretation: "What the source grants despite the main claim is read as why the main claim happened.",
    preservedMeaning: ["the two situations", "quantity", "time"],
    commonFailureRisks: ["but or and is treated as although", "the label is used as the proof"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "CAUSE_CONCESSION",
    description: "A cause is retold as a concession.",
    requiredSemanticRelation: "cause",
    targetMisinterpretation: "What brings the result about is read as something that happens despite the result.",
    preservedMeaning: ["the two situations", "who acts"],
    commonFailureRisks: ["so or since is treated as a proven cause", "but is labeled as a cause"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "QUANTITY_SCOPE",
    description: "A set is widened or narrowed.",
    requiredSemanticRelation: "quantity",
    targetMisinterpretation: "Every member is read as a subset, or a restricted number is read as the whole set.",
    preservedMeaning: ["the predicate", "time", "the other clause's relation"],
    commonFailureRisks: ["a new group is invented", "only and every are swapped without a quantifier in the source"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "FOCUS_SCOPE",
    description: "Exclusive focus is moved onto the wrong part of the set.",
    requiredSemanticRelation: "exclusive focus",
    targetMisinterpretation: "The part the source singles out is read as a different part, or the exclusion is dropped.",
    preservedMeaning: ["the quantity of the focused part", "the event"],
    commonFailureRisks: ["only is noticed as a word and the rest of the claim is rewritten"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "AGENT_ROLE",
    description: "Who acts on whom, or who receives and who sends, is swapped.",
    requiredSemanticRelation: "participant roles",
    targetMisinterpretation: "The actor and the recipient, or two different participants, trade places.",
    preservedMeaning: ["the event", "time", "quantity"],
    commonFailureRisks: ["a new actor is added", "Turkish subject and theme are guessed from word order"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "ACTION_SUBSTITUTION",
    description: "One of two distinct actions is replaced by the other.",
    requiredSemanticRelation: "two predicates",
    targetMisinterpretation: "What one participant does is read as the other action in the sentence.",
    preservedMeaning: ["who is involved", "time", "quantity"],
    commonFailureRisks: ["both actions are replaced", "a third action is invented"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "CONDITION_DIRECTION",
    description: "The condition and its consequence trade places.",
    requiredSemanticRelation: "condition",
    targetMisinterpretation: "What must hold for the result is read as the result of that condition.",
    preservedMeaning: ["counterfactual force when the source has it", "quantity"],
    commonFailureRisks: ["if is matched as a token inside another word", "a condition is invented"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "COUNTERFACTUAL_FACTUAL",
    description: "An unreal or unrealized outcome is retold as a fact.",
    requiredSemanticRelation: "counterfactual or unrealized alternative",
    targetMisinterpretation: "What would have happened, or what could have been done instead, is read as what did happen.",
    preservedMeaning: ["the participants", "quantity", "the other clause when it is not the modal"],
    commonFailureRisks: ["could have is condemned from the string alone", "would have is treated as past tense"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "MODALITY_STRENGTH",
    description: "The force of the claim is strengthened or weakened.",
    requiredSemanticRelation: "modal force",
    targetMisinterpretation: "Ability, advice, or possibility is read as necessity, or necessity is read as a weaker force.",
    preservedMeaning: ["the event", "who is obliged or able"],
    commonFailureRisks: ["could have is filed here instead of the counterfactual", "should and must are treated as the same fail"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "EVIDENCE_CERTAINTY",
    description: "Absence of evidence is retold as evidence of absence, or a finding is retold as a guess.",
    requiredSemanticRelation: "evidence",
    targetMisinterpretation: "Not finding support for a claim is read as finding that the claim is false.",
    preservedMeaning: ["what was investigated", "what was left open"],
    commonFailureRisks: ["the word no is enough to mark the shift", "a new study is invented"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "PURPOSE_RESULT",
    description: "An aim is retold as the result that occurred.",
    requiredSemanticRelation: "purpose",
    targetMisinterpretation: "What the source says someone acted to avoid or achieve is read as what then happened.",
    preservedMeaning: ["who acted", "the other time and quantity relations"],
    commonFailureRisks: ["so alone is treated as purpose", "the aim is replaced by a new outcome"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "PURPOSE_TIME",
    description: "A purpose clause is retold as the time when something happened.",
    requiredSemanticRelation: "purpose",
    targetMisinterpretation: "So that something would not happen is read as after it had happened.",
    preservedMeaning: ["who acted", "the situation the purpose was about"],
    commonFailureRisks: ["a time connector is required in the source", "the purpose-to-result change is left unrecorded"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "NEGATION_SCOPE",
    description: "Negation is moved onto the wrong part of the claim.",
    requiredSemanticRelation: "negation",
    targetMisinterpretation: "What the source denies is read as affirmed, or the negation covers a different phrase.",
    preservedMeaning: ["the rest of the clause", "who acts"],
    commonFailureRisks: ["a negative word is flipped and every other relation is broken"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
  {
    id: "REFERENCE_SHIFT",
    description: "A pronoun or a distributive phrase is attached to the wrong noun.",
    requiredSemanticRelation: "reference",
    targetMisinterpretation: "Their, they, or kendi is read as pointing at a different participant.",
    preservedMeaning: ["the event", "quantity"],
    commonFailureRisks: ["Turkish her, meaning every, is read as English her"],
    applicableQuestionTypes: ["restatement", "translation"],
  },
] as const satisfies readonly MisreadingMechanism[];

export type MisreadingMechanismId = (typeof misreadingMechanisms)[number]["id"];

/** Nearest existing error token. Not applied to candidates and not added to the enums. */
export const errorMechanismHint: Record<MisreadingMechanismId, string> = {
  TEMPORAL_ORDER: "tense_shift",
  TEMPORAL_SCOPE: "tense_shift",
  CONCESSION_CAUSE: "causal_direction",
  CAUSE_CONCESSION: "contrast_shift",
  QUANTITY_SCOPE: "quantity_scope",
  FOCUS_SCOPE: "scope_widening",
  AGENT_ROLE: "role_reversal",
  ACTION_SUBSTITUTION: "predicate_meaning",
  CONDITION_DIRECTION: "causal_direction",
  COUNTERFACTUAL_FACTUAL: "modality_shift",
  MODALITY_STRENGTH: "modality_shift",
  EVIDENCE_CERTAINTY: "predicate_meaning",
  PURPOSE_RESULT: "purpose_shift",
  PURPOSE_TIME: "purpose_shift",
  NEGATION_SCOPE: "polarity_reversal",
  REFERENCE_SHIFT: "argument_swap",
};

export const openSemanticRisks = [
  "but_and_unresolved",
  "could_have_without_contrast_unresolved",
  "mechanism_label_is_not_proof",
  "lexical_overlap_is_not_equivalence",
  "mechanism_variety_is_not_quality",
  "cross_language_meaning_unverified",
  "turkish_actor_swap_not_reliably_detected",
  "english_clause_head_may_be_a_modifier",
] as const;

export type RelationEvaluation = {
  relation: string;
  status: "present" | "absent" | "unresolved";
  basis: string;
  connectorOnly: boolean;
  selectedMechanism: MisreadingMechanismId | null;
};

export type MechanismSelection = {
  status: "selected" | "fail";
  failure: string | null;
  mechanisms: MisreadingMechanism[];
  supportableMisreadings: number;
  evaluations: RelationEvaluation[];
  catalogIsNotAQuota: true;
};

const byId = new Map(misreadingMechanisms.map((item) => [item.id, item]));

const irregular = new Set(
  "treat train show shows vary varies find found leave left read ask asked keep kept hold held send sent give gave given need needs needed claim move store sail sign count open repair exclude improve finish request bring brought put made make take took come came go went see saw say said tell told know knew get got run ran write wrote meet met pay paid sit sat stand stood lead led lose lost rise rose fall fell feel felt grow grew draw drew drive drove eat ate catch caught buy bought sell sold shoot shot sleep slept spend spent throw threw wake woke wear wore win won teach taught begin began become became choose chose speak spoke understand understood mean meant hear heard hit hurt hide hid feed fed".split(
    " ",
  ),
);

const notPredicate = new Set(
  "during everything anything nothing something evening morning according being having before after until although between without within another about their there where which while would could should might every other under again still those these first their".split(
    " ",
  ),
);

const englishSkip = new Set(
  "the a an some certain clear all every each only two three four one that this these those not no had would could should can may might must although while before after until even though because and but yet or if when with from into their its his her they them she he it who which to of in on for by at as be been being have has was were did does do will than then so such also still own new old than just more most than".split(
    " ",
  ),
);

function looksTurkish(text: string): boolean {
  return /[çğıöşüÇĞİÖŞÜ]/.test(text);
}

function mechanism(id: MisreadingMechanismId): MisreadingMechanism {
  return byId.get(id)!;
}

function predicates(text: string): string[] {
  const tokens = text.toLocaleLowerCase("tr-TR").split(/[^\p{L}]+/u).filter((token) => token.length >= 4);
  const found = tokens.filter((token) => {
    if (notPredicate.has(token)) return false;
    return /(ed|ing)$/.test(token) || irregular.has(token) || /(dı|di|du|dü|tı|ti|tu|tü|mış|miş|muş|müş)$/.test(token);
  });
  return [...new Set(found)];
}

function englishParticipants(text: string): boolean {
  if (looksTurkish(text)) return false;
  const pronouns = new Set(["they", "them", "their", "its", "his", "her", "she", "he", "it"]);
  const parts = text.split(/,|\b(?:although|even though|while|but|yet|because)\b/i);
  const heads: string[] = [];
  for (const part of parts) {
    const quantifier = new Set(["few", "several", "many", "much", "more", "most", "shorter", "fewer"]);
    const tokens = part.toLocaleLowerCase("en-US").split(/[^a-z]+/).filter(Boolean);
    const lead = tokens.find((token) => pronouns.has(token) || (token.length > 2 && !englishSkip.has(token) && !quantifier.has(token) && !irregular.has(token) && !/(ed|ing)$/.test(token)));
    if (!lead || pronouns.has(lead)) continue;
    heads.push(lead);
  }
  return new Set(heads).size >= 2;
}

function quantityMarkers(text: string): string[] {
  const turkish = looksTurkish(text);
  const pairs: [string, boolean][] = [
    ["all", /\ball\b/i.test(text)],
    ["every", /\bevery\b/i.test(text)],
    ["each", /\beach\b/i.test(text)],
    ["some", /\bsome\b/i.test(text)],
    ["certain", /\bcertain\b/i.test(text)],
    ["few", /\bfew\b/i.test(text)],
    ["only", /\bonly\b/i.test(text)],
    ["two", /\btwo\b/i.test(text)],
    ["four", /\bfour\b/i.test(text)],
    ["one", /\bone\b/i.test(text)],
    ["shorter", /\bshorter\b/i.test(text)],
    ["fewer", /\bfewer\b/i.test(text)],
    ["her", turkish && /\bher\b/i.test(text)],
    ["yalnızca", /yalnızca/i.test(text)],
    ["sadece", /sadece/i.test(text)],
    ["iki", /\biki\b/i.test(text)],
    ["dört", /dört/i.test(text)],
    ["tüm", /tüm/i.test(text)],
    ["daha", turkish && /daha/i.test(text)],
  ];
  return pairs.filter(([, present]) => present).map(([name]) => name);
}

function evaluation(relation: string, status: RelationEvaluation["status"], basis: string, connectorOnly: boolean, selectedMechanism: MisreadingMechanismId | null): RelationEvaluation {
  return { relation, status, basis, connectorOnly, selectedMechanism };
}

/**
 * Selects mechanisms whose relation is functioning in the source.
 * A connector token is recorded and does not by itself select a mechanism.
 * Fewer than four grounded misreadings fails. The catalog is not a quota.
 */
export function selectMisreadingMechanisms(text: string, questionType: string): MechanismSelection {
  const blank = (failure: string): MechanismSelection => ({
    status: "fail",
    failure,
    mechanisms: [],
    supportableMisreadings: 0,
    evaluations: [],
    catalogIsNotAQuota: true,
  });
  if (questionType === "reading_comprehension" || questionType === "reading") return blank("reading_unchanged");
  if (questionType !== "restatement" && questionType !== "translation") return blank("question_type_unsupported");

  const evaluations: RelationEvaluation[] = [];
  const chosen: { id: MisreadingMechanismId; weight: number }[] = [];
  const add = (id: MisreadingMechanismId, weight = 1) => {
    if (!chosen.some((item) => item.id === id)) chosen.push({ id, weight });
  };

  const concession = /\b(although|even though|despite|though)\b/i.test(text) || /rağmen|karşın/i.test(text) || /^\s*while\b.+,/i.test(text);
  evaluations.push(
    evaluation(
      "concession",
      concession ? "present" : "absent",
      concession ? "A concessive relation contrasts two situations. The decision is the contrast, not the presence of a coordinator." : "No concessive relation.",
      false,
      concession ? "CONCESSION_CAUSE" : null,
    ),
  );
  if (concession) add("CONCESSION_CAUSE");

  const cause = /\b(because|therefore)\b/i.test(text) || /çünkü|bu yüzden|bu nedenle/i.test(text);
  evaluations.push(
    evaluation(
      "cause",
      cause ? "present" : "absent",
      cause ? "A causal marker assigns a reason. so that is purpose, and so alone is not used." : "No causal relation.",
      false,
      cause ? "CAUSE_CONCESSION" : null,
    ),
  );
  if (cause) add("CAUSE_CONCESSION");

  const discourse = /\b(but|and|yet)\b/i.test(text) || /\b(ama|fakat|ancak|ve)\b/i.test(text);
  evaluations.push(
    evaluation(
      "discourse_coordinator",
      discourse ? "unresolved" : "absent",
      discourse ? "but, and, yet, or ama only shows a coordinator. That function is unresolved and selects neither concession nor cause." : "No coordinator.",
      discourse,
      null,
    ),
  );

  const order = /\b(until|before|after|earlier|first)\b/i.test(text) || /önce|sonra/i.test(text);
  evaluations.push(
    evaluation(
      "time_order",
      order ? "present" : "absent",
      order ? "The source orders two events or sets an endpoint." : "No event order.",
      false,
      order ? "TEMPORAL_ORDER" : null,
    ),
  );
  if (order) add("TEMPORAL_ORDER");

  const scope = /\b(before|during)\b/i.test(text) || /önce|boyunca|iken|ırken/i.test(text) || (/\bwhile\b/i.test(text) && !/^\s*while\b/i.test(text));
  evaluations.push(
    evaluation(
      "time_interval",
      scope ? "present" : "absent",
      scope ? "before, during, or a non-initial while names the interval that contains an event. until is an endpoint, not this interval." : "No time interval.",
      false,
      scope ? "TEMPORAL_SCOPE" : null,
    ),
  );
  if (scope) add("TEMPORAL_SCOPE");

  const amounts = quantityMarkers(text);
  evaluations.push(
    evaluation(
      "quantity",
      amounts.length ? "present" : "absent",
      amounts.length ? `Quantifiers in the claim: ${amounts.join(", ")}.` : "No quantifier.",
      false,
      amounts.length ? "QUANTITY_SCOPE" : null,
    ),
  );
  if (amounts.length) add("QUANTITY_SCOPE", amounts.length >= 2 ? 2 : 1);

  const focus = /\bonly\b|yalnızca|sadece|\bsolely\b/i.test(text);
  evaluations.push(
    evaluation(
      "exclusive_focus",
      focus ? "present" : "absent",
      focus ? "An exclusive marker singles out part of a set." : "No exclusive focus.",
      false,
      focus ? "FOCUS_SCOPE" : null,
    ),
  );
  if (focus) add("FOCUS_SCOPE");

  const transfer = /\b(received|sent|given)\b/i.test(text) || /verdi|aldı|gönder/i.test(text);
  const participants = transfer || englishParticipants(text);
  evaluations.push(
    evaluation(
      "participant_roles",
      participants ? "present" : "absent",
      transfer ? "A transfer verb assigns a sender and a receiver." : participants ? "Two English clauses name different participants." : "No reversible participant roles. A Turkish actor and theme are not inferred from word order.",
      false,
      participants ? "AGENT_ROLE" : null,
    ),
  );
  if (participants) add("AGENT_ROLE");

  const actions = predicates(text);
  evaluations.push(
    evaluation(
      "two_predicates",
      actions.length >= 2 ? "present" : "absent",
      actions.length >= 2 ? `Distinct predicates: ${actions.slice(0, 4).join(", ")}.` : "Fewer than two predicates.",
      false,
      actions.length >= 2 ? "ACTION_SUBSTITUTION" : null,
    ),
  );
  if (actions.length >= 2) add("ACTION_SUBSTITUTION");

  const turkishConditional = /olsaydı|olmasaydı|(?:^|[^\p{L}])(?:saydı|seydi)(?:$|[^\p{L}])/iu.test(text);
  const conditional = /\b(if|unless|provided)\b/i.test(text) || /(?:^|[^\p{L}])eğer(?:$|[^\p{L}])/iu.test(text) || turkishConditional || (/\bhad\b/i.test(text) && /\bwould\b/i.test(text));
  evaluations.push(
    evaluation(
      "condition",
      conditional ? "present" : "absent",
      conditional ? "A condition, including a fronted had-clause or a Turkish -saydı clause, links one situation to another. eğer inside another word does not count." : "No condition.",
      false,
      conditional ? "CONDITION_DIRECTION" : null,
    ),
  );
  if (conditional) add("CONDITION_DIRECTION");

  const wouldHave = /\bwould have\b/i.test(text) || (/\bhad\b/i.test(text) && /\bwould\b/i.test(text));
  const turkishUnreal = turkishConditional && /(?:ecekti|acaktı)/iu.test(text);
  const couldHave = /\bcould have\b/i.test(text);
  const couldContrast = couldHave && concession;
  const counterfactual = wouldHave || couldContrast || turkishUnreal;
  evaluations.push(
    evaluation(
      "counterfactual",
      counterfactual ? "present" : couldHave ? "unresolved" : "absent",
      wouldHave ? "would have or had...would marks an unreal past." : turkishUnreal ? "A Turkish -saydı clause with -ecekti marks an unreal past. A lone eğer substring is not the basis." : couldContrast ? "could have is set against another outcome in the same sentence. The modal string alone is not the basis." : couldHave ? "could have has no contrasting outcome, so it is not treated as a factuality error." : "No counterfactual.",
      false,
      counterfactual ? "COUNTERFACTUAL_FACTUAL" : null,
    ),
  );
  if (counterfactual) add("COUNTERFACTUAL_FACTUAL");

  const ability = /\b(can|cannot|must|should|might|may)\b/i.test(text) || (/\bcould\b/i.test(text) && !couldHave) || /meli\b|malı\b|\bihtimal\b/i.test(text) || /\bleft open\b/i.test(text);
  evaluations.push(
    evaluation(
      "modal_force",
      ability ? "present" : "absent",
      ability ? "The sentence marks ability, advice, necessity, or an open possibility. could have is not this relation." : "No modal force.",
      false,
      ability ? "MODALITY_STRENGTH" : null,
    ),
  );
  if (ability) add("MODALITY_STRENGTH");

  const evidence = /no trace|no evidence|no sign|found no|did not claim|did not exclude|\b(show|shows|showed)\b/i.test(text);
  evaluations.push(
    evaluation(
      "evidence",
      evidence ? "present" : "absent",
      evidence ? "The source reports what was found, shown, or not claimed." : "No evidential claim.",
      false,
      evidence ? "EVIDENCE_CERTAINTY" : null,
    ),
  );
  if (evidence) add("EVIDENCE_CERTAINTY");

  const purpose = /\bso that\b|\bin order to\b|\bso as to\b/i.test(text) || /amacıyla|amacına/i.test(text);
  evaluations.push(
    evaluation(
      "purpose",
      purpose ? "present" : "absent",
      purpose ? "A purpose clause says why an action was taken. PURPOSE_RESULT and PURPOSE_TIME are two misreadings of that purpose, not a second fact." : "No purpose. so alone is not purpose.",
      false,
      purpose ? "PURPOSE_RESULT" : null,
    ),
  );
  if (purpose) {
    add("PURPOSE_RESULT");
    add("PURPOSE_TIME");
  }

  const negation = /\b(not|no|never|none)\b/i.test(text) || /n't|değil/i.test(text);
  evaluations.push(
    evaluation(
      "negation",
      negation ? "present" : "absent",
      negation ? "A negated predicate is part of the claim." : "No negation.",
      false,
      negation ? "NEGATION_SCOPE" : null,
    ),
  );
  if (negation) add("NEGATION_SCOPE");

  const reference = looksTurkish(text) ? /kendi|onlar|onun/i.test(text) : /\b(their|they|them|its|his|her|she|he)\b/i.test(text);
  evaluations.push(
    evaluation(
      "reference",
      reference ? "present" : "absent",
      reference ? "A pronoun or kendi has an antecedent in the sentence." : "No anaphor. Turkish her is every, not English her.",
      false,
      reference ? "REFERENCE_SHIFT" : null,
    ),
  );
  if (reference) add("REFERENCE_SHIFT");

  const mechanisms = chosen.map((item) => mechanism(item.id));
  const supportableMisreadings = chosen.reduce((sum, item) => sum + item.weight, 0);
  if (supportableMisreadings < 4) {
    return { status: "fail", failure: "insufficient_source_relations", mechanisms, supportableMisreadings, evaluations, catalogIsNotAQuota: true };
  }
  return { status: "selected", failure: null, mechanisms, supportableMisreadings, evaluations, catalogIsNotAQuota: true };
}

export type MisreadingClassification = {
  status: "shown" | "unresolved" | "equivalent";
  mechanisms: MisreadingMechanismId[];
  preserved: string[];
  targetRelation: string | null;
  misinterpretation: string | null;
  actualDifference: string | null;
  relatedChanges: number;
  mechanismIsNotProof: true;
  approved: false;
  notes: string[];
};

function wording(text: string): string {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function shown(mechanisms: MisreadingMechanismId[], preserved: string[], targetRelation: string, misinterpretation: string, actualDifference: string, notes: string[] = []): MisreadingClassification {
  return {
    status: "shown",
    mechanisms,
    preserved,
    targetRelation,
    misinterpretation,
    actualDifference,
    relatedChanges: mechanisms.length,
    mechanismIsNotProof: true,
    approved: false,
    notes,
  };
}

function unresolved(notes: string[]): MisreadingClassification {
  return {
    status: "unresolved",
    mechanisms: [],
    preserved: [],
    targetRelation: null,
    misinterpretation: null,
    actualDifference: null,
    relatedChanges: 0,
    mechanismIsNotProof: true,
    approved: false,
    notes,
  };
}

/**
 * Classifies a distractor from the source relation, not from a mechanism label.
 * but/and stays unresolved. could have without a contrast stays unresolved.
 * A label is stored and is not an approval.
 */
export function classifyMisreading(source: string, option: string): MisreadingClassification {
  if (wording(source) === wording(option) && wording(option).length > 0) {
    return { ...unresolved(["same_wording"]), status: "equivalent", approved: false };
  }
  if (discourseConnectorSwap(source, option)) return unresolved(["but_and_unresolved"]);

  if (/kept the side door locked until/i.test(source) && /locked the side door only after/i.test(option)) {
    const concession = /\b(even though|although)\b/i.test(source);
    return shown(
      ["TEMPORAL_ORDER"],
      concession ? ["concession", "two late drivers", "the log"] : ["two late drivers", "the log"],
      "temporal order of the lock and the signatures",
      "The door is locked only once the drivers have signed.",
      "The source keeps the door locked until the signing. The option makes locking a new act after the signing.",
      ["maintained_lock_versus_new_locking_act", ...(concession ? ["concession_preserved"] : [])],
    );
  }

  const couldHave = /\bcould have opened\b/i.test(source);
  const factualOpening = /açmış|did open all four|opened all four wards/i.test(option);
  if (couldHave && factualOpening) {
    const context = /\b(although|even though)\b/i.test(source) && /\b(asked|repair)\b/i.test(source);
    if (!context) return unresolved(["could_have_without_contrast", "context_not_examined"]);
    return shown(
      ["COUNTERFACTUAL_FACTUAL"],
      ["the director asked for the damaged wards first", "patients were not to move twice"],
      "whether opening all four wards happened",
      "All four wards were in fact opened.",
      "In this concessive context the opening is an unused alternative, not a completed opening. The modal string alone is not the basis.",
      ["context_examined"],
    );
  }

  if (/so that patients would not move twice/i.test(source) && /taşındıktan sonra|iki kez taşındıktan|after the patients (?:had |were )?moved twice/i.test(option)) {
    return shown(
      ["PURPOSE_TIME", "PURPOSE_RESULT"],
      ["the clinic and the director", "the two damaged wards"],
      "purpose of avoiding a second move",
      "The patients had already been moved twice, and that move is when the action happened.",
      "The purpose of preventing a second move becomes both a time after the move and a result that occurred.",
      ["two_related_changes"],
    );
  }

  const concession = /\b(even though|although|though)\b/i.test(source) || /rağmen/i.test(source);
  if (concession && /\b(so|because|since)\b/i.test(option) && !/\b(even though|although|though)\b/i.test(option) && !/rağmen/i.test(option)) {
    return shown(
      ["CONCESSION_CAUSE"],
      ["the situations named in both clauses"],
      "concession",
      "The conceded situation is the cause of the other clause.",
      "The source contrasts the two situations. The option makes one the reason for the other.",
    );
  }

  if ((/\bbefore\b/i.test(source) || /önce/i.test(source)) && /\bduring\b/i.test(option) && !/\bbefore\b/i.test(option) && !/önce/i.test(option)) {
    return shown(
      ["TEMPORAL_SCOPE"],
      ["the event and its participants"],
      "time interval",
      "The event holds during the period the source places it before.",
      "before names the boundary. during moves the event inside that period.",
    );
  }

  const universal = /\b(every|all|each)\b/i.test(source) || (looksTurkish(source) && /\bher\b/i.test(source));
  const narrowed = /\bonly\b/i.test(option) || /yalnızca|sadece/i.test(option);
  const optionUniversal = /\b(every|all|each)\b/i.test(option) || (looksTurkish(option) && /\bher\b/i.test(option));
  if (universal && narrowed && !optionUniversal) {
    return shown(
      ["QUANTITY_SCOPE"],
      ["the predicate", "the other relations that the option still states"],
      "quantity",
      "A universal set is read as a small subset.",
      "every or all is not only two, and the option drops the universal.",
    );
  }

  if (/\breceived\b/i.test(source) && /\bsent\b/i.test(option) && !/\breceived\b/i.test(option)) {
    return shown(
      ["AGENT_ROLE"],
      ["the counterfactual when would have remains", "the quantity when only remains"],
      "sender and receiver",
      "The receiver is read as the sender.",
      "received and sent assign opposite roles in the transfer.",
    );
  }

  const absence = /no trace|no evidence|no sign|found no/i.test(source);
  const absenceAsProof = /evidence (?:of|that)|no effect|had no effect|kanıt buld/i.test(option);
  if (absence && absenceAsProof) {
    return shown(
      ["EVIDENCE_CERTAINTY"],
      [concession ? "concession" : "the investigated claim"].filter((item) => item !== "concession" || concession),
      "evidence and certainty",
      "Failure to find support is read as a finding that the effect is absent.",
      "No trace that something improved is not evidence that it had no effect.",
      ["not_from_the_word_no_alone"],
    );
  }

  const unreal = /\bwould have\b/i.test(source) || (/\bhad\b/i.test(source) && /\bwould\b/i.test(source));
  if (unreal && /\bbecause\b/i.test(option) && !/\b(would|could) have\b/i.test(option) && !/\bif\b/i.test(option)) {
    return shown(
      ["COUNTERFACTUAL_FACTUAL"],
      ["the participants named in the source"],
      "counterfactual outcome",
      "The outcome is read as a fact that followed from a real cause.",
      "would have does not report that the event happened.",
    );
  }

  return unresolved(["no_shown_misreading"]);
}

/** A fragment is not a natural option. Length alone is not equivalence. */
export function incompleteOption(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 5) return true;
  return !/[.!?…]$/.test(text.trim()) && words.length < 8;
}

export type SemanticSetReview = {
  decision: WholeSetGate["decision"];
  failure: string | null;
  meaningProven: false;
  approvesTarget: false;
  diversityIsNotQuality: true;
  lexicalOverlapIsNotEquivalence: true;
  mechanismVarietyScore: null;
  sameMisreading: string[];
  equivalentOptions: OptionLabel[];
  unresolvedOptions: OptionLabel[];
  keyOnlyComplete: boolean;
  keyRisks: string[];
  overlapByOption: { label: OptionLabel; overlap: number; relation: string }[];
};

/**
 * Records the five-option questions. Mechanism variety is not a score.
 * High overlap stays a recorded number and does not become equivalence.
 */
export function reviewSemanticSet(input: {
  source: string;
  key: string;
  options: Record<OptionLabel, string>;
  correct: OptionLabel;
  misreadings?: readonly { option: OptionLabel; studentMisreading: string }[];
}): SemanticSetReview {
  const gate = assessWholeSet(input);
  const texts = (input.misreadings ?? []).map((item) => item.studentMisreading.trim().toLocaleLowerCase("en-US"));
  const sameMisreading = [...new Set(texts.filter((text, index) => text.length > 0 && texts.indexOf(text) !== index))];
  return {
    decision: gate.decision,
    failure: gate.failure,
    meaningProven: false,
    approvesTarget: false,
    diversityIsNotQuality: true,
    lexicalOverlapIsNotEquivalence: true,
    mechanismVarietyScore: null,
    sameMisreading,
    equivalentOptions: gate.options.filter((item) => item.relation === "confirmed_equivalent").map((item) => item.label),
    unresolvedOptions: gate.options.filter((item) => item.relation === "unresolved").map((item) => item.label),
    keyOnlyComplete: gate.risks.whole_set_clue_risk.includes("only_complete_option"),
    keyRisks: gate.risks.key_semantic_risk,
    overlapByOption: gate.options.map((item) => ({ label: item.label, overlap: item.overlap, relation: item.relation })),
  };
}

export function sameProposition(left: string, right: string): boolean {
  return wording(left).length > 0 && wording(left) === wording(right);
}
