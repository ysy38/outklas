# Semantic validity

How to classify a restatement option against its source. Classes are a **project contract**, not an ÖSYM scoring rubric.

Proof status for every class in this file: `not_independently_proven` unless a named human review says otherwise.

## Comparison object

Always classify **option vs source**.

If a Writer key adds polarity, extra negation, extra cause, or a new event, the pair is `NON_EQUIVALENT`. An option can then be `CONTRADICTED` vs the key and `NOT_ENTAILED_COMPATIBLE` vs the source. Using the key as the sole comparison object is a method error.

- Source: `project-decision` — Stage 0 source–key integrity; semantic-validity case `authority-accepts`.
- Confidence: `high` as a rule; `medium` for any one pair.

## Four classes

| Class | Test | Use as Strict distractor |
| --- | --- | --- |
| `ENTAILED` | Source true ⇒ option true | Never |
| `CONTRADICTED` | Source true ⇒ a relevant option claim false | Candidate |
| `NOT_ENTAILED_COMPATIBLE` | Neither forced nor excluded | No |
| `UNDETERMINED` | Cannot assign without unresolved scope, OCR, or review | No |

Weaker restatement is `ENTAILED` (example: exclusive *only* ⇒ *at least*). Partial restatement of one conjunct, if that conjunct is true, is also `ENTAILED` and is a second-answer risk.

- Source: `project-decision`. Aligns with `research` Benedetto 2025 §2.3 (objectively wrong).
- Confidence: `high` for the definitions; `low`–`medium` for a live option without independent review.

## Implicature vs entailment

Record three lists before classifying:

1. `entails` — what must hold if the source is true
2. `excludes` — what cannot hold if the source is true
3. `pragmaticOnly` — what a cooperative reader often infers, but can cancel

A plan that attacks only `pragmaticOnly` is `NOT_ENTAILED_COMPATIBLE` unless the source actually excludes the alternative.

### until → after / cessation

Administrative *until P* often implicates that the wait **ends at P**. That implicature is cancellable. “Remained withheld after P” is typically `NOT_ENTAILED_COMPATIBLE`, not `CONTRADICTED`.

- Source: `project-decision` — semantic-validity case `until-to-after`; factory acceptance list `until_cessation_or_concurrent_endpoint_implicature`.
- Official ÖSYM: **not** counted as a frequent trap (see osym-patterns.md).
- Confidence: `medium` (same-agent). Independent review required.

### only → at least

If only those two received the seed, then at least those two did. The weaker bound is `ENTAILED`. Hearing “and maybe more” is implicature of *at least*, not a failure of entailment.

- Source: `project-decision` — case `only-to-at-least`.
- Confidence: `high` for the logical direction; still not independently reviewed as an exam option.

### only if → sufficient

*Q only if P* is Q → P (necessity). “P guarantees Q” is P → Q (converse). The source does not exclude the converse, so the guarantee is `NOT_ENTAILED_COMPATIBLE`. Policy English sometimes uses *only if* as iff; that is a reading, not the connective.

- Source: `project-decision` — case `only-if-to-sufficient`.
- Official ÖSYM: **zero** reconstructed restatement items in the scanned set contain *only if* (n = 44 unique reconstruct items). Do not call this an ÖSYM pattern.
- Confidence: `medium` as logic; `high` for the zero count of the string *only if*.

### although → because

*Although P, Q* does not entail ¬(Q because P). Discourse incompatibility is not logical exclusion. Default class: `NOT_ENTAILED_COMPATIBLE`.

- Source: `project-decision` — case `although-to-because`.
- Official ÖSYM: concession markers appear in 9/44 reconstruct stems; cause markers appear in some option in 3 of those 9; in the one keyed example the cause marker is in the **key**, paraphrasing *given that*, not flipping *although*. No frequency claim for although→because **distractors**.
- Confidence: `medium` for the logic; `high` that frequency is unproven.

### Counterfactual → factual

*Had P, would Q* does not entail ¬P. Mood mismatch plus an extra *so* is a second claim. Default: `NOT_ENTAILED_COMPATIBLE` unless the source excludes actualization.

- Source: `project-decision` — case `counterfactual-to-factual`.
- Official ÖSYM: at least one keyed item uses a counterfactual **option** against a factual historical source (`yds-2018` Q71 C). That is a different direction (factual source, CF distractor). Do not collapse the two.
- Confidence: `medium`.

### Extra negation in the key

*Although the contractor maintains that the channel is cleared* does not entail that the authority **rejects** the claim. A key that adds “does not accept” is stronger than the source.

- Source: `project-decision` — Stage 0 port mixing; case `authority-accepts`.
- Confidence: `medium`.

## Policies (not selected)

| Policy | Valid distractor if | v0.1 |
| --- | --- | --- |
| Strict | `CONTRADICTED` only | Documented; not a production gate |
| Exam-oriented | `CONTRADICTED`, or a hosted non-equivalent misreading after four risk scores | **Not accepted** for any case in this skill |

Risk scores (exam-oriented, still `not_forced`): `secondAnswerRisk`, `ambiguityRisk`, `extraSourceInformationRisk`, `studentChallengeRisk`.

- Source: `project-decision`. Unresolved questions stay in the semantic-validity contract list.

## What is not proof

`shownDifference`, `classifyOption`, `assessMeaningIntegrity`, Writer trap labels, DNA `distractor_type:*`, and this skill’s own previous answer are surface heuristics.

DNA restatement distractor types on 13 keyed items are mostly `meaning_shift` (36/52 slots) with `humanReviewStatus: unreviewed`. Do not treat those types as gold mechanism labels.

- Source: `official-item-observation` (label inventory) + `project-decision` (`labelTrust: dna_labels_are_not_human_judgment`).
- Confidence: `high` that the labels are unreviewed; `low` that any one DNA type is correct.

## Independent review

Same-agent editorial is allowed as a **draft**. It cannot set `meaningProven`, `qualityAccepted`, or gold. Independent review means a different person or a documented blinded protocol that the author of the five cannot satisfy by re-reading.

The protocol (who, blinding, adjudication) is `unvalidated-hypothesis` until written and used.
