# Distractor diagnosis — misconception labels for wrong options

Version `distractor-diagnosis.v1`. Code: `src/modules/factory/diagnosis.ts` (catalog, assignment, validation, aggregation), `src/modules/factory/audit.ts` (blind check), tests in `diagnosis.test.ts`.

We write every wrong option ourselves, so each one carries a label saying which misconception it represents. A learner who picks it gets "Bağlacın yönünü karıştırıyorsun…" instead of "yanlış yaptın". Repeated picks of the same label become a skill weakness in the deterministic diagnosis.

## How real YDS sentence-completion distractors are built (corpus evidence)

From the analysed corpus (39 sentence-completion items, 156 wrong options, pattern-level only; no item text is used anywhere):

- 69% are `wrong_discourse_relation`. Each option opens with its own connector, and its content is topical and believable on its own. It fails because the relation the connector signals does not hold with the main clause. 16 of 39 items use four such options.
- 19% are `logical_incompatibility`. The connector is often right (or the option has none), and the content does not follow.
- The rest are `semantic_mismatch`, grammar traps, and two reference traps.
- The recorded misconceptions are `concession_vs_contrast` (11) and `cause_vs_result_direction` (7).

The factory reproduces the first mechanism by construction: one option per relation, each with its own connector. It does not yet reproduce the second, a same-connector content trap (for example *although* followed by a clause that is no obstacle). The catalog already has a label for it (`logic.no_broken_expectation`).

## Levels

Level 1 is the **category**. It is decided by the element that makes the option wrong, so exactly one category applies:

| Code | Decisive element |
|---|---|
| `relation` | the connector signals a relation the sentence does not need |
| `logic` | the content: with its connector in its normal meaning, the sentence is false or illogical |
| `form` | grammar or structure in the blank |
| `lexis` | one word's meaning or collocation |
| `reference` | a pronoun or reference word |
| `fidelity` | faithfulness to a source (paraphrase or translation) |

Level 2 is the **label**, coded `category.slug`. A code never changes meaning: a new meaning gets a new code and a version bump. Each label carries:
- the misconception node, the tracked skill, and the legacy error category it rolls up to;
- the distractor types that can carry it;
- Turkish feedback addressed to the learner as *sen*, plus an optional item-level detail sentence;
- what the factory guarantees deterministically, and the yes/no check a reviewer answers.

- **relation**: the 9 confusion labels are a total, exclusive partition of every (needed, chosen) relation pair. They are computed by `relationConfusion` from five relation groups: opposing, causal, additive, condition, time. Examples:
  - `relation.concession_vs_contrast` (zıtlık ile beklenmedik sonuç (-e rağmen));
  - `relation.polarity_reversed` ("bağlacın yönünü karıştırıyorsun");
  - `relation.condition_misapplied`;
  - `relation.time_for_logic`.
- **logic**: one label per relation-specific failure (`logic.no_real_opposition`, `logic.condition_cannot_restrict`, `logic.time_order`, `logic.no_broken_expectation`, …) plus `logic.self_contradiction`.
- **form / lexis / reference / fidelity**: reserved labels taken from the graph's misconception nodes (for example `form.prepositional_before_clause` for *despite* before a clause). Their `questionTypes` stays empty until a family constrains them.

## Assignment by construction

`buildDistractorSpecs` calls `diagnoseSlot` for each wrong option, and the result is stored as `DistractorSpec.diagnosis`. The LLM never chooses a label. The rule follows what a learner who picks the option has misread:

1. **The option's connector signals a relation other than the one the item needs.** The primary label is that relation confusion: the connector alone rules the option out once the needed relation is known. The content failure is the secondary label.
2. **The connector belongs to the needed relation, or there is none.** The primary label is the content failure, with no secondary.

Inputs the catalog does not map make `diagnoseSlot` throw; there is no fallback. Examples: a relation without a group, a failure mode that doesn't fit the relation, a misconception the labels don't diagnose, or an uncovered question type. Labels are persisted in three places:
- the trace (`distractorSpecs[].diagnosis`);
- the candidate record (`diagnoses`);
- provenance (`distractorDiagnosisVersion`).

For `sentence_completion.concession`:

| Role | Primary | Secondary |
|---|---|---|
| `wrong_discourse_relation:contrast` | `relation.concession_vs_contrast` | `logic.no_real_opposition` |
| `wrong_discourse_relation:cause` | `relation.polarity_reversed` | `logic.reason_supports_opposite` |
| `wrong_discourse_relation:condition` | `relation.condition_misapplied` | `logic.condition_cannot_restrict` |
| `logical_incompatibility:sequence` | `relation.time_for_logic` | `logic.time_order` |

## Validation: does the option really carry its label?

- **Relation label: deterministic.** `validateDistractor` already guarantees two things. The option opens with a graph connector of the planned relation (`distractor_connector_mismatch`, `connector_unrecognised`). It carries no connector or marker of the needed relation (`distractor_has_target_relation`, `forbidden_marker_in_distractor`).
- **Content label: blind AI audit (`item-audit.v1`).** The auditor sees the item without the key, the labels or the variant. For each option it picks one reading:
  - a logic label;
  - a competing non-diagnostic reading: `contradicts_stem`, `unrelated_content` or `implausible_content`;
  - `sentence_works` or `other`.

  `labelStatus` compares this reading with the constructed label and returns `confirmed`, `disputed`, `unsure` or `second_answer`.
- **What the learner sees (`effectiveDiagnosis`).** A relation label stands on its deterministic check. A content label is shown only when confirmed. A logic-primary option that isn't confirmed shows no label at all, so the learner gets only the plain explanation. A label is never guessed.

## Learner feedback

`renderFeedback(code, { correctRelation, expresses, connector })` builds the text deterministically from graph names and contains no item text. Example:

> Bu cümle beklenmedik sonuç (-e rağmen) ilişkisi istiyor, seçtiğin whereas ise zıtlık bildiriyor. Zıtlık ile beklenmedik sonucu (-e rağmen) karıştırıyorsun: …

## Per-student diagnosis

`aggregateDiagnoses(selections, options)` is pure: the same input gives the same output in any order, and it never reads the clock. Each selection counts toward its labels as follows:
- weight decays with a half-life of 14 days, inside a 56-day window;
- a secondary label counts ×0.5;
- an item the learner later answered correctly counts ×0.5.

A label becomes a weakness only with at least 3 selections in at least 3 different items and a score of at least 1.5. Labels roll up to categories and to linked skills. The output is a ranked report with Turkish summaries. It feeds the existing deterministic scoring, SRS and plan as an input signal: the AI never picks questions.

## Extending to other question types

Add the question type to `diagnosisCoverage`, give its failure modes a label (or reserve new codes under the right category), and add relation groups only for new relations. A reserved label becomes active by listing the question type in its `questionTypes`. Tests keep the catalog consistent: node references exist, codes are stable, the partition is total and exclusive, and the Turkish feedback follows the style rules.
