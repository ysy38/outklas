# Calibration fixes and controlled benchmark (2026-10-13)

Family `sentence_completion.concession.medium`, 20 QuestionSpecs × 2 seeds. Fixed models: Haiku 5.5 as skeleton, distractor and explanation writer; Sonnet 5.5 as skeleton gate, distractor judge and final judge. Thresholds and retry limits are the defaults. Every item is newly generated; no historical exam text was used. Nothing was written to the question bank and nothing was approved.

## What changed

- **Calibrated difficulty** (`item-audit.v2`, `calibratedBand`): defective / easy / medium / hard, from evidence only. Defective covers: blind solve misses the key, the key is not true, the key is not natural, or a wrong option is defensible. A weak blind solve (confidence < 0.6) leaves the item uncalibrated. Hard requires every wrong option to be functional and another option to share the key's relation, so the label stays conservative. The requested band is stored separately.
- **Skeleton gate** (`skeleton-check.v1`, `skeleton-gate.v1`): the distractor-judge model checks the stem and key before any distractor is written. Within the skeleton attempt limit it rejects ungrammatical, unnatural, untrue, weak-relation or ambiguous keys. Gate rejections are counted separately from distractor failures.
- **Second-round experiments**: `opposition` (a contrast option states a parallel fact); `compatibility` (the main-clause time frame and a clause form per role, plus deterministic tense rules); `relation` (the judge asks whether the sentence reads as the item's target relation and whether another reading of the connector makes it correct); `overlap` (copied phrasing versus natural topic words).
- **Seeds**: `FACTORY_SEED>1` salts the cache key only. Seed 1 replays existing requests byte for byte. Before the runs, the recorded request hashes of all five earlier variants were recomputed and all matched, so the old prompts are unchanged.
- **Blind sheet v2** and `factory-blind-score`: key and variant are hidden and options are shuffled per item. Items sharing a stem go to different parts. The key is in a separate `key.json`. The command refuses to overwrite filled ratings.

## Variants

- **A**: baseline (`distractor.v4`, `distractor-judge.v3`).
- **B+C**: `contrast,plausibility` (`distractor.v5`, `distractor-judge.v4`).
- **B+C+**: `contrast,plausibility,opposition,compatibility,relation` (`distractor.v6`, `distractor-judge.v5`, distractor-spec.v5 with the condition→purpose swap).
- **L**: B+C+ plus `overlap`. Invalid: API credit ran out during the run (89 of 215 attempts failed with a credit error).

All variants share the skeletons and keys of their seed; this was verified: 0 of 40 skeletons differ.

Artifacts:

- Comparison: `.data/analysis/_factory/benchmarks/calibration-2026-10-13/comparison.{md,json}`.
- Runs: `.data/analysis/_factory/runs/*.n20.atomic.v1.bench-{a,bc,bcplus,l}-s{1,2}`.
- Blind review: `.data/analysis/_factory/blind-review/2026-10-13-calibration/` (54 items, 34 stems, 3 parts; `key.json` separate).

## Results (pooled over both seeds; AI metrics, not human review)

| Metric | A | B+C | B+C+ |
|---|---|---|---|
| Skeleton pass (items) | 39/40 (98%) | 39/40 (98%) | 39/40 (98%) |
| Skeleton gate rejections (checks) | 3/42 | 3/42 | 3/42 |
| Distractor first-attempt acceptance (slots) | 100/143 (70%) | 73/130 (56%) | 31/93 (33%) |
| Regenerated slots / extra attempts | 43/143 (30%) / 63 | 57/130 (44%) / 83 | 62/93 (67%) / 109 |
| Items lost at distractor stage (of skeletons) | 10/39 (26%) | 17/39 (44%) | 35/39 (90%) |
| Reached final judge | 28/40 | 22/40 | 4/40 |
| Final judge rejection | 3/28 (11%) | 3/22 (14%) | 2/4 |
| Second answer, final judge | 3/28 (11%) | 2/22 (9%) | 2/4 |
| Suspicious stem echo (deterministic, wrong options) | 2/112 (2%) | 5/88 (6%) | 0/16 |
| Estimated latency per item / per judged item | 78 s / 112 s | 81 s / 147 s | 67 s / 674 s |
| Tokens per item in/out | 18.5k/8.8k | 22.7k/8.6k | 24.0k/6.9k |

The AI audit (metrics 6b–8, 10, 11) did not run: every audit call failed with "credit balance is too low". Cost is not reported because `FACTORY_PRICES` is not configured.

## Findings

- **B+C+ is a regression, caused by two second-round design errors:**
  - The judge's `contextCompatible` question asked whether the option's event "can stand in the stated relation to the main clause". For a wrong option that is exactly the relation that must fail. The judge marked it false whenever an option failed as intended ("grammatical, realistic and tense-compatible; it fails on logic"). It appeared in 95 rejections, and was the only failure in 41 of them.
  - Swapping the condition slot for a purpose slot on past-event stems produced self-contradictory purposes. Purpose options were accepted in 5 of 67 attempts, and were also rejected as too obvious or implausible.
- **The relation dimension caught what it was built for.** `alternative_reading_correct` fired 24 times and `relation_holds` 21 times in B+C+. Because few items survived, its effect on final second answers cannot be measured.
- **B+C loses more items than A** (17 against 10). The cause is the plausibility judge's `tenseCompatible`: condition slots passed on the first try in 7 of 37 slots.
- **The skeleton gate is cheap and identical across variants:** 3 rejections in 42 checks, all `key_not_true`, each one a self-contradictory key.

## Fixes after the benchmark (not yet validated)

- `distractor-judge.v6` drops `contextCompatible`; time-frame fit stays with the deterministic tense rules and `tenseCompatible`. v5 is archived byte for byte.
- distractor-spec.v6 drops the role swap. A condition on a past main clause asks for a simple-past standing condition, and a past-perfect condition on a completed past event is rejected deterministically, so only that option is regenerated.

These need a rerun with restored API credit before any variant can be called a candidate.

## Rerun

```
GENERATOR_MODEL=anthropic:claude-haiku-5-5 DISTRACTOR_MODEL=anthropic:claude-haiku-5-5 EXPLANATION_MODEL=anthropic:claude-haiku-5-5 \
DISTRACTOR_JUDGE_MODEL=anthropic:claude-sonnet-5-5 FINAL_JUDGE_MODEL=anthropic:claude-sonnet-5-5 \
FACTORY_EXPERIMENTS=contrast,plausibility,opposition,compatibility,relation FACTORY_SEED=1 \
npx tsx pipeline/cli.ts factory --family sentence_completion.concession --band medium --count 20 --tag bench-bcplus2-s1
```

Repeat with `FACTORY_SEED=2`. Then run `factory-audit` on every run (A and B+C included), then `factory-compare`.
