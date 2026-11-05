import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { normalized, optionBody } from "./validator";

/**
 * Context compatibility between a wrong option's relation and the main clause it completes. Deterministic and
 * deliberately narrow: it only encodes what a rule can decide reliably (the main clause's time frame, tense rules of
 * condition and time clauses). Whether an option's event plausibly stands in its relation to the main clause is a
 * semantic question for the distractor judge (compatibility experiment), never decided here.
 */
export const mainClauseFrames = ["past_event", "past_ongoing", "present_general", "future", "counterfactual", "unknown"] as const;
export type MainClauseFrame = (typeof mainClauseFrames)[number];

const irregularPast = new Set(
  "arose ate began bit blew broke brought built bought caught chose came cost cut did drew drank drove fell fed felt fought found flew forgot froze gave went grew hung heard hid held hurt kept knew laid led left lent let lay lost made meant met paid put quit ran rang rose said saw sought sold sent set shook shone shot showed shut sang sank sat slept slid spoke spent spread stood stole stuck struck swam swept took taught tore told thought threw understood woke wore won wrote withdrew underwent undertook overtook".split(" "),
);
const irregularParticiple = new Set(
  "arisen been begun bitten blown broken brought built bought caught chosen come cost cut done drawn drunk driven eaten fallen fed felt fought found flown forgotten frozen given gone grown hung heard hidden held hurt kept known laid led left lent let lain lost made meant met paid put quit risen run rung said seen sought sold sent set shaken shone shot shown shut sung sunk sat slept slid spoken spent spread stood stolen stuck struck swum swept taken taught torn told thought thrown understood woken worn won written withdrawn undergone undertaken overtaken dug become".split(" "),
);
/** -ed words that usually stand before a noun as adjectives ("the prescribed dose", "had limited funds"). */
const adjectivalEd = new Set(["limited", "varied", "mixed", "detailed", "skilled", "qualified", "talented", "advanced", "sophisticated", "dedicated", "specialised", "specialized", "complicated", "renowned", "prescribed", "related", "isolated", "repeated", "unexpected"]);
const determiners = new Set(["the", "a", "an", "its", "their", "his", "her", "our", "your", "this", "that", "these", "those", "some", "many", "most", "several", "each", "every", "no", "any", "more", "less", "well", "newly", "highly", "poorly", "carefully"]);
const ongoingMarkers =
  /\b(throughout|steadily|steady|continued|continuously|kept|remained|stayed|persisted|gradually|consistently|repeatedly|routinely|regularly|usually|often|used to|(every|each) (day|night|week|month|year|season|morning|evening|summer|winter|spring|autumn|time)|without (any )?interruption|all (day|night|year|week|month|season|afternoon|morning|evening|summer|winter|spring|autumn)|for (several|many|two|three|four|five|six|ten|\d+) (hours|days|weeks|months|years|decades|centuries|seasons)|over the (course|years|decades|centuries|following|next|past))\b/;

const tokens = (text: string) => normalized(text).split(" ").filter(Boolean);

/** Finite past-tense verbs, skipping -ed words used as adjectives after a determiner or before "the"-less nouns. */
function pastVerbs(text: string): string[] {
  const list = tokens(text);
  return list.filter((word, i) => {
    if (["was", "were", "had", "did"].includes(word)) return true;
    if (irregularPast.has(word)) return true;
    if (!word.endsWith("ed") || word.length < 5 || adjectivalEd.has(word)) return false;
    return i > 0 && !determiners.has(list[i - 1]);
  });
}

/**
 * The time frame of the stem's main clause (the stem without the blank). Conservative: present and past verbs in
 * the same clause give "unknown", and unknown frames get no frame-specific rule.
 */
export function mainClauseFrame(stem: string): MainClauseFrame {
  const text = normalized(stem.replaceAll("----", " "));
  if (/\b(would|could|might|should) (not )?have \w+/.test(text)) return "counterfactual";
  if (/\b(will|shall) (not )?\w+|\b(is|are|am) going to\b/.test(text)) return "future";
  const past = pastVerbs(text).length > 0;
  const present = /\b(is|are|am|has|have|does|do|can|may|must)\b/.test(text);
  if (past && present) return "unknown";
  if (!past) return "present_general";
  return ongoingMarkers.test(text) ? "past_ongoing" : "past_event";
}

/** A past perfect verb phrase ("had shown", "had already been"), the form of a counterfactual or earlier-past clause. */
export function hasPastPerfect(text: string): boolean {
  const list = tokens(text);
  for (let i = 0; i < list.length; i++) {
    if (list[i] !== "had") continue;
    let j = i + 1;
    while (j < list.length && (["not", "never", "already", "just", "recently", "previously", "first", "ever", "also", "long", "since", "once"].includes(list[j]) || /^[a-z]{3,}ly$/.test(list[j]))) j++;
    const next = list[j];
    if (!next) continue;
    if (irregularParticiple.has(next)) return true;
    if (next.endsWith("ed") && next.length >= 5 && !adjectivalEd.has(next)) return true;
  }
  return false;
}

/** "will"/"shall" as the verb of the clause: English uses the present for future reference in time and condition clauses. */
export const hasFutureWill = (text: string) => /\b(will|shall|won't)\b/.test(normalized(text).replace("won t", "won't"));

const slug = (value: NodeRef | null) => (value ? parseRef(value).slug : null);

export type ContextIssue = { code: string; severity: "critical" | "warn"; detail?: string };

/**
 * Tense rules a wrong option's clause must keep with the main clause, by the relation its connector expresses:
 * - condition + past perfect on a single completed past event, with no "would have" in the main clause, is the
 *   tense clash "The council approved the bridge if the pilings had shown corrosion";
 * - a time clause never takes "will"; a condition clause rarely does (a warning, since volitional "will" exists).
 * Past perfect stays allowed for time clauses, habitual or ongoing past frames and counterfactual main clauses.
 */
export function contextIssues(input: { expresses: NodeRef | null; frame: MainClauseFrame; text: string }): ContextIssue[] {
  const relation = slug(input.expresses);
  const body = optionBody(input.text);
  const issues: ContextIssue[] = [];
  if (relation === "condition") {
    if (input.frame === "past_event" && hasPastPerfect(body)) issues.push({ code: "condition_tense_clash", severity: "critical", detail: "past perfect condition on a completed past event" });
    if (hasFutureWill(body)) issues.push({ code: "future_in_condition", severity: "warn" });
  }
  if (relation === "sequence" && hasFutureWill(body)) issues.push({ code: "future_in_time_clause", severity: "critical" });
  return issues;
}
