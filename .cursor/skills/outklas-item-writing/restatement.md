# Restatement writing methodology

YDS/YÖKDİL restatement (ÖSYM instruction: verilen cümleye anlamca en yakın olan cümleyi bulunuz; blueprint band 68–71 on `yds-en`). Five options, one key.

This file is the procedure. It does not authorise production generate.

## Preconditions

- Feature flags stay closed. No Writer/Judge/selector/prompt edit.
- No paid model call unless a later human turn names one.
- Do not write student-bank rows.
- Do not paste ÖSYM stems into this skill or into a prompt that will leave the analysis_only store.

Kind: `project-decision`. Confidence: `high`.

## Step 1 — Source meaning analysis

Parse the source into propositions. For each:

- polarity (asserted / negated / reported)
- discourse relation (concession, cause, result, condition, sequence)
- scope (quantifiers, *only*, *few*, *among*)
- modality (*may*, *appears*, *likely*)
- temporal boundary (*until*, *after*, *following*)
- mood (actual vs counterfactual)

Write `entails`, `excludes`, `pragmaticOnly`. If a connective is ambiguous, stop and mark `UNDETERMINED`; do not pick the reading that makes a favourite trap work.

Kind: `project-decision`. Confidence: `high` as method.

## Step 2 — Source–key equivalence

Draft or inspect the key as a restatement, not as a gloss that “helps the student.”

Fail the pair if the key:

- adds negation or rejection the source does not entail
- turns concession into cause
- turns *only if* into a guarantee
- adds an event, purpose, or agent
- drops a conjunct that changes truth conditions in the other direction (key weaker is sometimes still `ENTAILED`; key **stronger** is `NON_EQUIVALENT`)

Record `key_vs_source`. Only `ENTAILED` keys proceed. `UNDETERMINED` keys do not proceed.

Stage 0 found mixing: the same brief name used different source/key pairs across experiments (although-only source vs rejection-in-source). Do not compare those as one defect.

Kind: `project-decision`. Confidence: `high` for the gate; `medium` for Stage 0 pair classes (same-agent).

## Step 3 — Semantic relation inventory

List relations that are **in the source**, not relations this skill knows how to flip.

Do not add *only if*, *until*, or counterfactual to the inventory because they are famous traps. If they are absent, they are absent.

Kind: `project-decision` + `official-item-observation` (several famous traps are rare or absent in the reconstruct set). Confidence: `high`.

## Step 4 — Distinct distractor plans

Write four plans as structured records, not as sentences:

```
plan_id:
mutation:
source_proposition:
excluded_if_contradicted:
vs_source:
duplicate_of: none | plan_id
```

Rules:

- Four different `mutation` values
- Prefer T1–T5 families that the source actually supports as exclusions
- Do not schedule until-cessation, only→at least, only-if→sufficient, or although→because as Strict `CONTRADICTED` plans
- Do not schedule a plan whose only job is to contradict an **invalid key**

Kind: `project-decision`. Confidence: `high` as a set rule.

## Step 5 — Meaning and scope evaluation

For each plan, argue entailment in both directions. If the option would still be true whenever the source is true, it is `ENTAILED`. If a cooperative reader would reject it but logic does not, it is `NOT_ENTAILED_COMPATIBLE` and you record the implicature in `pragmaticOnly`.

If two plans collapse to the same exclusion, mark duplicate and replace one.

Kind: `project-decision`. Confidence: `medium` without independent review.

## Step 6 — Natural English wording

Only after steps 4–5. Constraints:

- One sentence preferred; do not let sentence count uniquely mark the key (`project-decision`, editorial-gold `door` clueRisk note; confidence `medium`)
- Similar length and syntax (`research` Benedetto §2.3; confidence `medium` for restatement)
- No unique technical word only in the key
- Do not copy ÖSYM option templates

If wording cannot express the plan without adding an extra event, drop the plan.

## Step 7 — Option-vs-source verification

Re-read each worded option against the **source**, blind to Writer labels if possible.

Check:

- Did weakening create an `ENTAILED` second answer?
- Did a discourse flip stay NEC (although→because)?
- Did an extra clause invent an event?
- Did the key and a distractor share a plan?

Output the review block from SKILL.md. Set `independent_review: no` unless step 8 has happened.

The model that wrote the five must not tick verification as done.

Kind: `project-decision` + `research` Alhazmi 2024 §6.2, Crk & Gultepe 2026 expert-validation protocol. Confidence: `high` as a prohibition.

## Step 8 — Independent review

Minimum:

- Reviewer did not write the five
- Reviewer sees source + shuffled options without the author’s classes (blinding `unvalidated-hypothesis` as a protocol, required in spirit)
- Reviewer assigns the four-way class and source–key status
- Disagreement → `UNDETERMINED`, not majority of the same agent

Editorial-gold `humanApproval: pending` is this step **not done**. DNA `unreviewed` is this step **not done**.

Kind: `project-decision`. Confidence: `high` that it is missing today.

## Step 9 — Pilot and calibration

After independent acceptance of meaning:

- Pretest on learners
- Traditional Distractor Analysis (selection rates, not just p-value on the key)
- Only then may HARD / observedDifficulty be other than `not_run`

Without responses, report `hard: not_run`. Do not estimate HARD from syntax, trap names, or model logprobs.

Kind: `research` Benedetto 2025 §4.1, §6; Crk & Gultepe 2026 §2.3. Confidence: `high`.

## Failure stops

| Fail | Stop at |
| --- | --- |
| Source unreadable / OCR | 1 — `UNDETERMINED` |
| Key not equivalent | 2 |
| Fewer than four distinct non-ENTAILED plans | 4–5 |
| Wording invents events or duplicates | 6–7 |
| No independent review | 8 — never set verified |
| No student data | 9 — HARD `not_run` |
