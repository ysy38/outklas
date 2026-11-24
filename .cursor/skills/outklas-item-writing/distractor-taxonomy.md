# Distractor taxonomy (restatement v0.1)

A **plan** is a named misreading of the source, assigned a semantic class **before** wording. A five needs four **distinct** plans. This taxonomy is a working inventory, not an ÖSYM frequency table.

Kinds mixed below are marked per family.

## Plan requirements

| Rule | Kind | Confidence |
| --- | --- | --- |
| Four plans, four different excluded (or hosted) relations | `project-decision` | high |
| Duplicate plans fail the set even if both are `CONTRADICTED` | `project-decision` | high |
| `ENTAILED` plans are not distractors | `project-decision` | high |
| `NOT_ENTAILED_COMPATIBLE` plans are not Strict distractors | `project-decision` | high |
| `UNDETERMINED` plans are not forced | `project-decision` | high |
| Independence: one option should not let the student eliminate another by logic alone | `research` Benedetto 2025 §2.3 | medium for restatement |

Factory plan-pool v1: 0/5 briefs produced four `CONTRADICTED` plans. That is a Writer failure observation, not a reason to loosen classes.

## Families

Each family: typical vs-source class, Strict use, whether seen in keyed ÖSYM restatement, and limits.

### T1 Polarity / discourse flip (excluded)

Flip a polarity the source actually states (scoff vs praise; refuse vs accept; cannot vs can).

- Typical class: `CONTRADICTED`
- Strict: candidate
- ÖSYM: observed in keyed items (e.g. advertisers praise vs scoff, `yds-2018` Q70 B/C). Count = examples, not a rate.
- Kind: `official-item-observation` + `project-decision`
- Confidence: `medium` (same-agent class, DNA unreviewed)

### T2 Reverse causality / reverse illustration

Cause/result swap, or “research causes awareness” vs “research illustrates awareness.”

- Typical class: `CONTRADICTED` when the source states a direction; `UNDETERMINED` if direction is weak
- ÖSYM: `yds-2018` Q71 D (dress changes as contributing to the revolution); `yds-2018-2` Q71 B/C object or direction swap
- Kind: `official-item-observation`
- Confidence: `medium`

### T3 Quantity / superlative upgrade

*Among the oldest* → *the oldest*; *few* → *none*; *some* → *all*.

- Typical class: `CONTRADICTED` for upgrade that the source excludes; `ENTAILED` for downgrade (*only* → *at least*, *widely* → *some*)
- ÖSYM: superlative upgrade on `yds-2018` Q69 A/B/D. *some*/*all* co-occur in several reconstruct stems; **no counted some→all distractor rate** without option-level review of the un-keyed set
- Kind: `official-item-observation` / `unvalidated-hypothesis` for some→all as a preferred ÖSYM trap
- Confidence: `medium` for the superlative examples; `low` for some→all frequency

### T4 Agent / function swap

Who does the act; monitor vs reduce vs combat; residents vs project.

- Typical class: `CONTRADICTED` if the source names a different agent or function that excludes this one; `NOT_ENTAILED_COMPATIBLE` if the new function is a silent extra
- ÖSYM: `yds-2018-2` Q70 A–D (residents contribute / combat / reduce vs cameras enable monitoring)
- Kind: `official-item-observation`
- Confidence: `medium`

### T5 Invented event or extra fact

Blame, discovery location, “still at risk despite,” “need for greater understanding,” “first used to ensure healthy skin.”

- Typical class: extra assertion the source is **silent** on → `NOT_ENTAILED_COMPATIBLE` (and not a Strict distractor); extra assertion the source **excludes** → `CONTRADICTED`; extra assertion that would be a second answer if true → flag `secondAnswerRisk`
- In restatement, extras also fail as keys even when NEC
- Kind: `project-decision` for the class; `official-item-observation` for presence of extras among wrong options
- Confidence: `medium`
- Limit: same-agent; several 2024-11 stems have OCR noise, so extras near garbled words stay `UNDETERMINED`

### T6 Scope cut (incomplete restatement)

Drops a conjunct the source asserts. If the remaining conjunct is still true, the option is `ENTAILED` (second answer), not a distractor.

- ÖSYM candidate: `yds-2018` Q70 E (public thinks some people use subliminal ads) may be a weaker entailment of “widely practiced”
- Kind: `unvalidated-hypothesis` until independent review
- Confidence: `low`

### T7 Modality upgrade

*may* / *appears* / *likely* → *must* / *inevitable*.

- Typical class: `CONTRADICTED` if the source’s modal excludes necessity; else `UNDETERMINED`
- ÖSYM: 10/44 reconstruct stems have *may/might/can*; 1/44 has *must* in the stem. **No counted may→must distractor rate**
- Kind: `official-item-observation` (stem counts) + `unvalidated-hypothesis` (as a preferred trap)
- Confidence: `high` for stem counts; `low` for trap frequency

### T8 Condition / concessive rewrite

*although* → *because*; *even if* → *because*; *regardless* vs *because of*.

- Default class for although→because: `NOT_ENTAILED_COMPATIBLE` (see semantic-validity.md)
- ÖSYM keyed example of **regardless vs because-of** as likely `CONTRADICTED`: `yds-2023-10` Q71 A (*regardless of workload* vs *because of workload*)
- Kind: `official-item-observation` for that item; `project-decision` for although→because
- Confidence: `medium`

### T9 Hypothetical / counterfactual overlay

Factual history rewritten as *if it were not for*; or CF source rewritten as actual.

- Classes differ by direction (see semantic-validity.md)
- ÖSYM: `yds-2018` Q71 C (CF overlay on factual revolution source) — DNA type `logical_incompatibility`; still unreviewed
- Kind: `official-item-observation`
- Confidence: `low`–`medium`

### T10 Until-boundary / temporal endpoint

*until P* vs *after P* vs *not until after P*.

- Default until→after: `NOT_ENTAILED_COMPATIBLE`
- ÖSYM reconstruct: *until* in **1/44** stems (`yds-2015-fall` Q69, **no DNA key**). `yds-2018` Q71 **key** uses *not until after* as a paraphrase of “years following,” which is not an until→after distractor
- Kind: `official-item-observation` + `project-decision`
- Confidence: `high` that until is rare in this reconstruct set; `medium` for the logical class

### T11 Duplicate plan

Two options that implement the same T-code and the same polarity (e.g. two praise-not-scoff wordings).

- Set result: incomplete / fail distinctness
- Kind: `project-decision`; research support Benedetto §2.3 independence
- Confidence: `high` as a set rule

## DNA types (do not reuse as taxonomy)

On 13 keyed DNA restatement items (52 distractor slots):

| DNA type | n |
| --- | --- |
| `distractor_type:meaning_shift` | 36 |
| `distractor_type:wrong_discourse_relation` | 8 |
| `distractor_type:semantic_mismatch` | 4 |
| `distractor_type:logical_incompatibility` | 2 |
| `distractor_type:scope_mismatch` | 1 |
| `distractor_type:syntactic_mismatch` | 1 |

`humanReviewStatus`: unreviewed for all 13. `misconception` is null on 51/52 slots.

Kind: `official-item-observation` of **labels**, not of mechanisms. Confidence that these labels are gold: **none**.

## Incomplete set

A set is incomplete if any of:

- fewer than four distinct plans
- any option `ENTAILED` besides the key
- any option `UNDETERMINED` left in a five that will be published
- any plan only attacks implicature under Strict
- source–key pair not `ENTAILED`

`structurallyComplete` in factory code is not `qualityAccepted`. Kind: `project-decision`. Confidence: `high`.
