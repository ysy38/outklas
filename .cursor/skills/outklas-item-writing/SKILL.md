---
name: outklas-item-writing
description: >-
  Guides YDS/YÖKDİL restatement (closest-meaning) item writing and semantic
  review from published research and observed ÖSYM booklets: source–key
  equivalence, distinct distractor plans, and ENTAILED / CONTRADICTED /
  NOT_ENTAILED_COMPATIBLE / UNDETERMINED classification. Use when writing or
  reviewing restatement items, ÖSYM closest-meaning questions, distractors,
  YDS/YÖKDİL item-writing methodology, or Outklas Factory Writer quality work.
---

# Outklas Item Writing v0.1

Restatement methodology and evidence base. This version does **not** generate
exam items, does **not** change the production Writer, selector, Judge, or
prompts, and does **not** raise production yield.

## Standing locks

| Lock | Value | Kind |
| --- | --- | --- |
| Production Writer / Judge / selector / prompt | Unchanged | project-decision |
| `factoryRootCauseFixEnabled` | false | project-decision |
| `meaningProven` / `qualityAccepted` | false | project-decision |
| HARD calibration | `not_run` | project-decision + research (no student responses) |
| Student bank writes | 0 | project-decision |
| Same-agent classification as proof | Forbidden | project-decision + research |
| Copying ÖSYM stems into this skill | Forbidden | project-decision (FSEK / analysis_only) |

## Epistemic labels

Tag every rule. Do not mix kinds.

| Kind | Meaning |
| --- | --- |
| `research` | Claim in a named paper/section, with evidence type |
| `official-item-observation` | Count or classification from an identified booklet item; not gold unless human-approved |
| `project-decision` | Outklas contract or lock, not a scientific finding |
| `unvalidated-hypothesis` | Useful guess; not yet shown on real items or independent review |

Confidence: `high` = replicated or counted with n and provenance; `medium` = single study or small n; `low` = transfer, same-agent class, or hypothesis.

Read [research-sources.md](research-sources.md) before citing a paper as ÖSYM-specific. None of the four core papers is.

## When this skill applies

- Authoring or reviewing a **restatement / closest-meaning** five (source + key + four options).
- Classifying an option against a source.
- Deciding whether a plan is a valid distractor under Strict or exam-oriented policy.
- Inspecting ÖSYM restatement patterns.

If asked to generate production items this turn, refuse the generate step and stay on methodology.

## Semantic relations

Classify **option vs source**, never vs the Writer's key alone.

| Label | Definition | Strict distractor? |
| --- | --- | --- |
| `ENTAILED` | If the source is true, the option's claim must be true (equivalent or weaker). | No. Second-answer risk. |
| `CONTRADICTED` | If the source is true, a relevant claim in the option cannot be true. | Yes, if the other risk checks later allow. |
| `NOT_ENTAILED_COMPATIBLE` | Source does not make the option true and does not make it false. | No under Strict. Exam-oriented: not forced in v0.1. |
| `UNDETERMINED` | Scope, OCR, source–key mismatch, or missing independent review. | Do not coerce to PASS or FAIL. |

Source: project-decision, restatement semantic-validity contract; research (Benedetto 2025 §2.3: objectively wrong ≠ merely different). Confidence: high for the four-way split as a **project contract**; medium for any single option class without independent review.

Do not mix these labels with HARD, trapType, studentMisreading, or qualityAccepted.

## Restatement workflow

Copy this checklist. Stop at the first fail. Do not skip independent review.

```
- [ ] 1. Source meaning analysis
- [ ] 2. Source–key equivalence review
- [ ] 3. Semantic relation inventory
- [ ] 4. Distinct distractor plans (four, non-duplicate)
- [ ] 5. Meaning and scope evaluation of each plan
- [ ] 6. Natural English wording (after plans, not instead of them)
- [ ] 7. Option-vs-source verification
- [ ] 8. Independent review (different person or blinded protocol)
- [ ] 9. Pilot and calibration (student responses before HARD)
```

Detail: [restatement.md](restatement.md). Principles: [assessment-principles.md](assessment-principles.md). Relations: [semantic-validity.md](semantic-validity.md). Plans: [distractor-taxonomy.md](distractor-taxonomy.md).

### 1. Source meaning analysis

List what the source **entails**, what it **excludes**, and what is **pragmatic only** (implicature, cancellable).

Until-cessation, exclusive *only*, concessive *although*, and counterfactual mood are frequent implicature traps. Treat implicature as non-entailment until a source clause actually excludes the alternative.

Source: project-decision + semantic-validity cases; research (Benedetto 2025 §2.3 independence of distractors). Confidence: high as method; low as ÖSYM frequency (see [osym-patterns.md](osym-patterns.md)).

### 2. Source–key equivalence

The key must be an `ENTAILED` restatement of the source and must not add polarity, extra negation, extra cause, or a new event.

If the key is stronger than the source, later “distractors” that contradict the **key** may still be `NOT_ENTAILED_COMPATIBLE` vs the **source**. Record `NON_EQUIVALENT` and do not proceed as if the five were valid.

Source: project-decision, Stage 0 source–key integrity. Confidence: high for the rule; medium for any one pair without independent review.

### 3. Semantic relation inventory

Name the discourse and scope relations actually in the source (concession, cause, necessity *only if*, until-boundary, quantity, modality, actual vs counterfactual). Inventory is not a license to use a transformation that was not observed in ÖSYM.

### 4–5. Distinct plans, then evaluate

Four plans, four different excluded (or, under a later exam-oriented policy, hosted) misreadings. Duplicate plans fail even if both are `CONTRADICTED`.

Evaluate each plan as `ENTAILED` / `CONTRADICTED` / `NOT_ENTAILED_COMPATIBLE` / `UNDETERMINED` **before wording**.

Canonical fails (expected decisions in [regression-cases.md](regression-cases.md)):

| Plan | Typical vs-source class | Strict distractor |
| --- | --- | --- |
| until → after / cessation implicature | `NOT_ENTAILED_COMPATIBLE` | no |
| only → at least | `ENTAILED` | no |
| only if → sufficient (converse) | `NOT_ENTAILED_COMPATIBLE` | no |
| although → because | `NOT_ENTAILED_COMPATIBLE` | no |
| extra negation present only in the key | classify vs source | not forced |
| invented event the source is silent on | often `NOT_ENTAILED_COMPATIBLE` | no |
| invented event the source excludes | `CONTRADICTED` | candidate |
| duplicate semantic plan | n/a | fail set |

These classes are **project-decision** from the semantic-validity contract, not ÖSYM frequency claims. Confidence: medium (same-agent; not independently proven).

### 6. Natural English wording

Write options after plans. Match length and syntax enough to avoid form clues (Benedetto 2025 §2.3, research, medium for restatement transfer). Do not repair a bad plan by elegant prose.

### 7. Option-vs-source verification

Re-classify the **worded** option against the source. Wording can turn `CONTRADICTED` into `ENTAILED` (weaker bound, dropped conjunct) or into `UNDETERMINED` (scope).

A Writer label, `shownDifference`, `classifyOption`, or this skill's own previous class is not verification.

### 8. Independent review

A different human, or a documented blinded protocol. Same-agent editorial is not independent proof.

Source: project-decision; research (Crk & Gultepe 2026: LLM items used only after expert validation; Alhazmi 2024 §6.2 instructor verification). Confidence: high as a requirement; the review protocol itself is not yet specified (unvalidated).

### 9. Pilot and calibration

HARD, observedDifficulty, and “students fall for this trap” require student responses (Traditional Distractor Analysis). Without that data, HARD stays `not_run`.

Source: research, Benedetto 2025 §4.1 / §6. Confidence: high.

## Must not

- Declare the model's own output verified, gold, or `qualityAccepted`.
- Label DNA rows, editorial-pending factory items, or reconstruct-without-key items as gold.
- Modify existing ÖSYM wording, keys, or prior pilot records.
- Claim an ÖSYM transformation is frequent without an item id list and a count.
- Treat BLEU/ROUGE/n-gram overlap with a reference distractor as exam quality.
- Set HARD from model self-report or editorial impression.
- Copy substantial copyrighted ÖSYM stems into chat, skill files, or prompts.

## Gold status (this round)

There is **no human-approved ÖSYM restatement gold set** in this repo.

- DNA closest-meaning rows: official booklet provenance, keys present, `validationStatus=accepted`, `humanReviewStatus=unreviewed`, `labelTrust: dna_labels_are_not_human_judgment`.
- Editorial-gold `door` (and siblings): factory-authored, `humanApproval: pending`, not ÖSYM.
- Reconstruct-only restatement items without a DNA key: observation candidates, not gold.

Details and option classes: [osym-patterns.md](osym-patterns.md).

## Output when reviewing an item

```
source_entails: [...]
source_excludes: [...]
pragmatic_only: [...]
key_vs_source: ENTAILED | NON_EQUIVALENT | UNDETERMINED
plans: [{id, mutation, vs_source, duplicate_of}]
options: [{label, vs_source, evidence, independent_review: no}]
set_complete: yes | no
hard: not_run
meaningProven: false
qualityAccepted: false
```

## References

- [assessment-principles.md](assessment-principles.md)
- [semantic-validity.md](semantic-validity.md)
- [distractor-taxonomy.md](distractor-taxonomy.md)
- [restatement.md](restatement.md)
- [osym-patterns.md](osym-patterns.md)
- [research-sources.md](research-sources.md)
- [regression-cases.md](regression-cases.md)
