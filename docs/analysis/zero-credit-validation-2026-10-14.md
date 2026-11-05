# Zero-credit validation and cost control (2026-10-14)

No model was called for this work. Everything below comes from stored runs, the local request cache and deterministic tests. Production stays on variant A; no candidate is claimed better.

## Cost of the stored benchmark at list prices

Prices: `pipeline/ai/prices.anthropic.json`, from the local copy of https://platform.claude.com/docs/en/about-claude/pricing. Values are USD per million tokens.

| Model | Input | 5m cache write | 1h cache write | Cache read | Output |
|---|---|---|---|---|---|
| Haiku 5.5 (prompts ≤100k) | 0.10 | 0.125 | 0.20 | 0.01 | 0.50 |
| Sonnet 5.5 | 2 | 2.50 | 4 | 0.10 (0.05×) | 10 |

The cost of every call behind the 40 items of each variant, read from the request cache, is below. Accepted means the item reached the human review queue.

| Variant | Total | Per item | Per accepted item | Spent on items not accepted | Sonnet share |
|---|---|---|---|---|---|
| A | $2.09 | $0.052 | $0.084 (25 accepted) | $0.56 (27%) | 93% |
| B+C | $2.43 | $0.061 | $0.128 (19) | $1.01 (42%) | 94% |
| B+C+ | $2.19 | $0.055 | $1.10 (2) | $2.03 (93%) | 94% |

Every successful Anthropic response in the local cache, summed, comes to $13.20 at list prices. Sonnet distractor judges (v2–v5) account for $8.80 of it, and all Haiku calls together for $0.70. The rest of the reported $15 is not in the local records (calls that failed before a response was stored), so it cannot be attributed.

## Prompt caching

`AnthropicProvider` puts one `cache_control` breakpoint on the system prompt. This is the only prefix that repeats across calls of a stage; user messages differ per item and option. `ANTHROPIC_PROMPT_CACHE` selects `5m` (the default), `1h` or `off`. Usage now records `cacheWriteTokens`, `cacheWrite1hTokens` and `cacheReadTokens`, which flow into the per-call log, `summary.spend` and the cost estimate.

What to expect:

- **Prompt size.** The system prompts are about 400–800 tokens each, estimated as characters ÷ 4: distractor judge v6 ≈ 810, writer v6 ≈ 560. Average total input per Sonnet judge call was 1.8k–2.5k tokens.
- **Minimum length.** The pricing page does not give the minimum cacheable prompt length, so I do not state one. If these prefixes are under it, the API caches nothing and the usage shows no cache tokens.
- **Upper bound if the cache does trigger.** Take the distractor judge with the B+C+ volumes (325 calls). About 800 of 2,477 input tokens would be read at $0.10 instead of $2. That saves about $0.49 of that stage's $2.96 (≈17%), and less across the whole pipeline. That is far from 50–90%: those figures assume long contexts repeated across calls.

## B+C tense losses (`tense_incompatible`)

These come from the stored `bench-bc-s1/s2` traces and judge reasons; the table is in `.data/analysis/_factory/benchmarks/rescore-2026-10-14/bc-stored-rules/rescore.md`.

- **Rule applied.** No deterministic tense rule ran in B+C. The rejection came from `distractorDecision`: under the plausibility experiment, `tenseCompatible=false` from the Sonnet judge (distractor-judge.v4) was a hard failure.
- **Lost items.** 14 lost items had at least one such rejection: 12 condition slots and 2 sequence slots.
- **Flagged attempts.** Of the 30 attempts flagged as tense-incompatible:
  - 11 were real clashes: a past perfect condition on a single completed past event, which the deterministic rule `condition_tense_clash` also catches.
  - 11 were too strict: the tense fits the frame (a simple-past condition or time clause in a past frame, or a past-perfect time clause), and the failure the judge described was the relation, which is how a wrong option should fail.
  - 8 were undetermined: a past perfect condition on an ongoing past, or a frame the rules read as unknown.
- **What the fix would change.** In 6 items, an attempt failed only on a too-strict tense flag: B+C s1 011, 016 and 018, and s2 008, 013 and 014. Three items were lost to real clashes only (s1 009, s1 015, s2 001). Four are undetermined (s1 008, s2 005, s2 011, s2 018). In one item (s2 009) tense was not the deciding failure.
- **Inconsistent in both directions.** The same judge accepted 7 past-perfect conditions on completed past events that the deterministic rule rejects (relabeled under `--as contrast,plausibility,compatibility`).
- **Smallest fix (implemented, B+C+ only).** Under compatibility, the judge's `tenseCompatible=false` becomes the concern `tense_judged_incompatible`, which sends the option to a human instead of rejecting it. Real clashes are rejected deterministically before the judge. `hasPastPerfect` now also skips an adverb in "had publicly criticized", which the rule had missed (s1 009 #3). B+C (first round) keeps its old rule, so its records stay reproducible.

## Offline relabeling (`factory-rescore`)

Stored outputs and stored judge reports are re-scored with the current validator and decision rules. This is not new model output:

- For B+C+, the stored judge reports came from the v5 judge prompt.
- Options the old run never wrote stay `unknown`.

| Run set | First-attempt acceptance, stored → relabeled | Items lost at distractors (stored) → relabeled |
|---|---|---|
| B+C, own rules (sanity) | 73 → 73 of 130 | 17 → 17 lost |
| B+C+, current rules | 31 → 50 of 93 | 35 → 11 lost, 6 complete, 18 unknown |

## Smoke benchmark (planned, not run)

The plan covers specs 002–004 of `sentence_completion.concession.medium`. Their skeletons passed the first time in every stored variant, and the skeleton and gate calls replay from the local cache, so skeleton and key are identical across variants. The variants are A and corrected B+C+, each run once (seed 1) under a hard call, token and cost cap. An offline dry run, with a provider that refuses every request, showed two things:

- **Variant A:** fully replays from the cache, at zero cost.
- **B+C+:** its first paid call is the v6 distractor judge or writer.

With `FACTORY_MAX_REGENERATIONS=0`, all three A items stop at the distractor stage. The smoke therefore checks that the corrected logic runs and that cost is measured. It does not compare quality.

## Human blind review (2026-10-14)

The human ratings of `blind-review/2026-10-13-calibration` are in its `ratings.csv`. The reviewer's labels map to `overall` as follows: Güçlü, Güçlü ancak tekrarlı and Savunulabilir → APPROVE; Revizyon (gerekli) → EDIT; Kritik revizyon and Kritik bağlam sorunu → REJECT. Each exact label is kept in `notes`, and only the critical-context items carry `difficulty=defective`. Fields the reviewer did not judge are left blank.

- **Labels.** 40 strong (one of them repetitive), 3 defensible, 6 revision, 1 critical revision and 4 critical context, out of 54.
- **Key agreement.** The reviewer's answer matched the hidden key on all 54 items. Three of them carry a starred answer: the most reasonable option present, but the item is not a reliable measure.
- **Scorer fix.** `factory-blind-score` had read `none` as option E (from the E in NONE), so every `none` counted as a second defensible answer or a flagged option. It now treats `none` as empty, and a test covers the case.

Per-variant counts are small (A 28, B+C 22, B+C+ 4 items) and from one reviewer; they are not evidence for a candidate.

## Gemini reachability (2026-10-14)

Claude credit is exhausted. One PONG request was sent per id, with no retries and no item content; the result is in `.data/analysis/_factory/gemini-probe-2026-10-14/result.json`.

| Id | Result |
|---|---|
| gemini-3.1-flash | 404, no such model |
| gemini-3.1-flash-lite | PONG, 18 in / 2 out tokens |
| gemini-3.5-flash | PONG, served by `gemini-3.6-flash`, 18 in / 59 out tokens (thinking) |
| gemini-3.5-flash-lite | PONG, 18 in / 2 out tokens |
| gemini-3.8-flash | HTTP 200 but empty text: thinking used the 64-token output cap |
| gemini-3.8-flash-lite | 404; ListModels has only `gemini-3.8-flash-lite-tts` |

No request hit a 429. A successful response does not report the free-tier limit or the remaining quota, so neither is known.

## Gemini smoke (planned, not run)

The smoke was not run, for two reasons. First, no response showed the remaining quota. Second, the repository has no verified Gemini price table, so cost would be `unknown` and `FACTORY_MAX_COST_USD` refuses to start without prices. Its purpose is to show that cost is measurable, not to choose a candidate.

The command below is capped at 3 items per variant and uses Flash-Lite only. Writer and judge are different models, as the factory requires. With `AI_MAX_RETRIES=0`, the first 429 stops the run. Set `FACTORY_PRICES` to a Gemini price file taken from the official pricing page before running it. Without that file, drop `FACTORY_MAX_COST_USD`: tokens are still recorded, and cost is reported as unknown.

```
export AI_MAX_RETRIES=0 FACTORY_SEED=1 FACTORY_MAX_REGENERATIONS=0 FACTORY_MAX_CALLS=60 FACTORY_MAX_TOKENS=150000 \
  FACTORY_PRICES=<gemini price file> FACTORY_MAX_COST_USD=0.05 \
  GENERATOR_MODEL=gemini-3.1-flash-lite DISTRACTOR_MODEL=gemini-3.1-flash-lite EXPLANATION_MODEL=gemini-3.1-flash-lite \
  DISTRACTOR_JUDGE_MODEL=gemini-3.5-flash-lite FINAL_JUDGE_MODEL=gemini-3.5-flash-lite
npx tsx pipeline/cli.ts factory --family sentence_completion.concession --band medium --first 2 --count 3 --tag smoke-gemini-a
FACTORY_EXPERIMENTS=contrast,plausibility,opposition,compatibility,relation \
npx tsx pipeline/cli.ts factory --family sentence_completion.concession --band medium --first 2 --count 3 --tag smoke-gemini-bcplus
```

Gemini skeletons are not in the request cache, so this smoke does not reuse the Claude skeletons. Its results cannot be compared with the Claude benchmark.
