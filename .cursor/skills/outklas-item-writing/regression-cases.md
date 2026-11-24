# Semantic regression cases v0.1

Cases from factory pilots and the semantic-validity contract. **Original Outklas sentences**, not ÖSYM stems. Expected decisions are a **project contract**. Proof status: `not_independently_proven`. HARD: `not_run`. `meaningProven: false`. `qualityAccepted: false`.

Do not mutate prior pilot JSON. Do not call a paid model to “confirm” these.

Legend: E = ENTAILED, C = CONTRADICTED, N = NOT_ENTAILED_COMPATIBLE, U = UNDETERMINED.

## R1 until cessation / after

**Mutation:** *until P* → remained withheld *after P*.

Source (contract `until-to-after`): the office held back the chart until both crews had delivered readings; a concurrent timetable fact is concessive, not the boundary.

Option: the office remained withheld after both crews had delivered.

| Field | Expected |
| --- | --- |
| vs_source | N |
| Strict distractor | no |
| Why | *Until P* entails holding through the interval up to P. It does not entail that holding **stopped** at P. Cessation is implicature. |
| Fail if | Classed C so the five can “pass” Strict |

Kind: `project-decision`. Confidence: `medium`.

## R2 only → at least

**Mutation:** exclusive *only* → *at least*.

Source (contract `only-to-at-least`): had the convoy cleared, only the two highland stations would have received the seed.

Option: … at least the two highland stations would have received the seed.

| Field | Expected |
| --- | --- |
| vs_source | E |
| Strict distractor | no |
| Why | If only those two received, at least those two received. Weaker bound remains true. |
| Fail if | Used as a “quantity trap” distractor |

Kind: `project-decision`. Confidence: `high` for the logic.

## R3 only-if → sufficient

**Mutation:** *only if P* → *P guarantees Q*.

Source (contract `only-if-to-sufficient`): the board releases tables only if both sites have locked logs before sponsor review.

Option: both sites locking logs guarantees release.

| Field | Expected |
| --- | --- |
| vs_source | N |
| Strict distractor | no |
| Why | *Only if* is Q → P, not P → Q. The converse is not excluded. Not iff. |
| Fail if | Classed C because “students confuse only if with if” |

ÖSYM reconstruct pool: 0 *only if* strings. Do not add an ÖSYM-frequency reason.

Kind: `project-decision`. Confidence: `medium`.

## R4 although → because

**Mutation:** concessive *although P, Q* → *because P, Q*.

Source (contract `although-to-because`): loan held back until both reports; although posted hours stayed in force.

Option: because the gallery kept hours posted, the archive postponed the loan.

| Field | Expected |
| --- | --- |
| vs_source | N |
| Strict distractor | no |
| Why | *Although P, Q* does not entail ¬(Q because P). Discourse clash ≠ exclusion. |
| Fail if | Classed C as a default concession trap |

Kind: `project-decision`. Confidence: `medium`.

## R5 source–key extra negation

**Mutation:** key adds “authority does not accept” when the source only has *although [claim]*.

Source (contract `authority-accepts` / Stage 0 port.benchmark-5): ban until both wrecks inspected, although the contractor maintains the channel is already cleared.

Key (invalid): … and the authority does not accept the contractor’s claim.

Option: … and the authority **accepts** the contractor’s claim.

| Field | Expected |
| --- | --- |
| key_vs_source | NON_EQUIVALENT |
| option vs source | N (*although* ≠ rejection) |
| option vs key | C (polarity on the extra negation) |
| Strict distractor vs source | not_forced |
| Fail if | Treating option-vs-key C as option-vs-source C; mixing this pair with sources that **already** contain rejection (Stage 0 mixing `yes_in_part`) |

Kind: `project-decision`. Confidence: `medium`.

## R6 incomplete distractor set

**Mutation:** fewer than four distinct non-E plans, or a leftover E option besides the key.

Factory observation: semantic plan-pool v1 produced **0/5** briefs with four C plans.

| Field | Expected |
| --- | --- |
| set_complete | no |
| qualityAccepted | false |
| structurallyComplete | not sufficient |
| Fail if | Shipping a five with two C + two N under Strict, or with a second E option, or with duplicate plans counted as four |

Kind: `project-decision` + factory observation (do not rewrite those records). Confidence: `high` as a set rule.

## R7 invented event

**Mutation:** option asserts an event or purpose the source never states (blame, reduction of pollution, worldwide “realisation,” residual “need for research”).

Prototype (factory, not ÖSYM): cameras enable residents to **monitor** air pollution → option: cameras help residents **reduce** / **combat** pollution, or residents **contribute to** the project.

| Field | Expected |
| --- | --- |
| vs_source if source **excludes** the event | C |
| vs_source if source is **silent** | N (extra information; not a Strict distractor) |
| extraSourceInformationRisk | high |
| Fail if | Silent extras classed C “because they are not in the source”; or silent extras used as keys |

Kind: `project-decision`. Official items show extras among wrong options (osym-patterns.md) but those classes are unreviewed. Confidence: `medium`.

## R8 duplicate semantic plan

**Mutation:** two options implement the same exclusion (e.g. both flip *scoff* → *praise* with different synonyms).

| Field | Expected |
| --- | --- |
| each option vs_source | may both be C |
| set | fail distinctness |
| Fail if | Counting synonym duplicates as two plans, or as “diversity” |

Kind: `project-decision`; `research` Benedetto 2025 §2.3 independence. Confidence: `high` as a set rule.

## Runner checklist

When a new restatement five is reviewed (methodology only in this version):

```
R1 until/after not C
R2 only→at least not a distractor
R3 only-if converse not C
R4 although→because not C
R5 classify vs source, not vs a strengthened key
R6 four distinct non-E plans
R7 invented silent events not C-by-default
R8 no duplicate plans
independent_review: no unless a different reviewer signed
hard: not_run
meaningProven: false
qualityAccepted: false
```
