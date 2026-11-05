# Distractor revision benchmark (2026-10-13)

Family `sentence_completion.concession.medium`, 12 QuestionSpecs. Fixed models: Haiku 5.5 writer, Sonnet 5.5 distractor judge, final judge and item auditor; thinking on. Retry limits and thresholds were unchanged. All items are newly generated; no historical exam text was used. AI audit results are AI review, not human approval.

Variants, toggled via `FACTORY_EXPERIMENTS` (empty means the exact baseline):

- **A, baseline:** distractor.v4 and distractor-judge.v3. Cached replay of `v4-claude`; it reproduces it exactly.
- **B, contrast:** separate judge dimensions, reasons before verdict, and `relationHolds`.
- **C, plausibility:** structured semantic and temporal constraints, with a plausibility review.
- **D, lexical:** stem overlap is a diagnostic (`stem_echo` warning); answer-wording reuse stays critical.
- **E:** B, C and D combined.

B to E reuse A's cached skeletons, so stems and keys are identical and only the distractor stage differs.

Artifacts:

- Comparison: `.data/analysis/_factory/benchmarks/distractor-revision-2026-10-13/comparison.{md,json}`.
- Blind sheet: `.data/analysis/_factory/blind-review/2026-10-13/` (`sheet.md`, `ratings.csv`, separate `key.json`).

## Results

| | A | B | C | D | E |
|---|---|---|---|---|---|
| First-pass distractor acceptance | 71% | 60% | 66% | 67% | 57% |
| Items lost at distractor stage | 4 | 2 | 3 | 4 | 8 |
| Final-judge reject (of judged) | 1/8 | 4/10 | 2/9 | 0/8 | 0/4 |
| Eliminable without target relation | 50% | 28% | 31% | 53% | 19% |
| Functional distractors (AI audit) | 47% | 65% | 67% | 41% | 81% |
| Calibrated difficulty easy/medium | 5/3 | 3/7 | 2/7 | 5/3 | 2/2 |
| Contrast slot placed, blank at start | 2/6 | 5/6 | 5/6 | 3/6 | 5/6 |
| Pipeline tokens | 301k | 379k | 345k | 320k | 342k |

The auditor has run-to-run noise: re-auditing A changed 3 of 8 bands. With 8–10 judged items per variant, a 1–2 item difference is within noise.

## Findings

- **Difficulty.** The final judge's difficulty is an unanchored enum assigned with the key and explanation visible; it labels most items easy. The calibrated band (`calibratedBand`) uses blind-audit evidence instead: answer found without the target relation, cheaply eliminable options, and key-relation uniqueness. No item can be hard under the current blueprint, because the key is the only concession-connector option.
- **Condition slot.** "provided that / if + past perfect" attached to a past-tense factual main clause is a built-in tense clash. A tolerated it, but the plausibility judge (C and E) enforces it. This alone explains most of E's losses: condition slot 1/3 accepted, 16 `tense_incompatible` rejections.
- **Contrast slot.** Making the whereas clause contextually plausible (B, C) fixes most blank-at-start failures. But it opens a concessive reading of "whereas": B items 001 and 007 and C item 012 were rejected as second answers.
- **Lexical.** Treating stem overlap as a diagnostic did not improve quality on its own (D is close to A).

## Decisions

- **Relation validation.** The earlier decision assigned role and relation checks to the deterministic validator only. That stays in place: connector family and the absence of target-relation markers remain deterministic. `relationHolds` is added as a separate judge dimension; it asks only whether the signalled relation actually holds, independent of the intended failure mode. The two do not overlap: one checks form, the other checks meaning.
- **Sentence-initial whereas.** Reasons-first is not the sole cause of the improvement, since C also improved without it. Recommendation: keep the contrast role but require content that plainly supports the main clause (`no_real_opposition`), and judge it with `relationHolds`.
- **Condition role.** For past-factual stems, replace condition with a role that is tense-neutral (for example a second cause/result trap). Alternatively, keep condition only for stems with generic present or future main clauses. This is a QuestionSpec/blueprint change and needs its own run.
- **No new production candidate yet.** B and C improve functional distractors and calibrated difficulty but raise second-answer risk; E loses too many items until the condition role is fixed. Next validation: the condition-role fix, 20 items × 2 seeds, plus human ratings from the blind sheet.
