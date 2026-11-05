# Gemini on the question factory (2026-10-14)

Claude credit is exhausted, so the production defaults (Haiku writes, Sonnet judges) cannot run. This note records what Gemini costs and what one capped smoke and one 12-item benchmark showed. Nothing was written to the question bank and nothing was approved. Variant A stays the default, and Claude stays the default model setting.

## Prices

The prices come from https://ai.google.dev/gemini-api/docs/pricing (read 2026-10-14; page last updated 2026-10-13). They are Paid Tier, Standard (interactive) inference, in USD per 1M tokens. On the Free Tier these models are free of charge, so every cost below is a list-price estimate, not a charge. The table is in `pipeline/ai/prices.gemini.json`; set `FACTORY_PRICES` to that path to use it.

| Model | Input | Output (incl. thinking) | Cached input | Explicit cache storage |
|---|---|---|---|---|
| gemini-3.1-flash-lite | 0.25 | 1.50 | 0.025 | $1.00 per 1M tokens per hour |
| gemini-3.5-flash-lite | 0.30 | 2.50 | 0.03 | $1.00 per 1M tokens per hour |
| gemini-3.6-flash (also serves `gemini-3.5-flash`) | 0.75 | 3.75 | 0.075 | $0.50 per 1M tokens per hour |
| gemini-3.8-flash | 0.75 | 3.75 | 0.075 | $0.50 per 1M tokens per hour |

The 3.6 and 3.8 Flash prices hold through 2026-12-31 and double on 2027-01-01. Batch and Flex inference cost half as much.

## Caching

- **Implicit caching.** Source: https://ai.google.dev/gemini-api/docs/caching. It is on by default for Gemini 2.5 and newer, needs no configuration, and passes the saving on automatically.
  - Minimum prompt: 4,096 tokens for 3.6 and 3.8 Flash. The page lists no minimum for Flash-Lite.
- **Our prompts are far smaller.** The skeleton check sends 334 prompt tokens. Across the smoke and the benchmark, fresh calls ranged from 197 to 2,113 input tokens, 567 on average.
  - Observed result: 0 cached tokens on all 127 fresh calls (`cachedContentTokenCount` never appeared).
  - Padding prompts past 4,096 tokens would cost more than it saves. At Flash-Lite prices, 4,096 cached tokens cost about as much as 400 uncached ones, which is most of a whole call.
- **Explicit `cachedContents`.** Not used, for three reasons:
  - The Free Tier lists context caching as "Not available" for Flash-Lite.
  - It adds an hourly storage charge.
  - Our prefixes are too small to gain from it.
- **What the code does now.** The Gemini provider already sends the fixed rules first (`systemInstruction`) and the item text last. It now splits `cachedContentTokenCount` out of `promptTokenCount`, which includes the cached prefix. The cached part is recorded as `cacheReadTokens` and billed at the cache rate, so a cache hit shows up in the per-call log, in `summary.spend` and in the cost.
- **What actually cut cost.** The local request cache: an identical request is never sent twice. Variant B+C+ replayed A's skeleton and skeleton-gate calls, which made 6 of the 28 smoke calls free. The benchmark replayed 12 calls from the smoke.
- **Other levers.** Flash-Lite prices, the thinking level (thinking tokens are billed as output), and later the Batch API at −50% (Paid Tier, asynchronous).

## Probe

One request per id: the real `skeleton-check.v1` prompt and schema, on stored spec 001 and its stored skeleton, with `maxOutputTokens=1024` as in production. The result is in `.data/analysis/_factory/gemini-probe-2026-10-14/schema-probe.json`.

| Id (served as) | Thinking | Latency | Prompt / output tokens | Schema |
|---|---|---|---|---|
| gemini-3.1-flash-lite | minimal | 1.5 s | 334 / 117 | ok |
| gemini-3.5-flash-lite | minimal | 1.1 s | 334 / 128 | ok |
| gemini-3.5-flash (3.6) | low | 2.0 s | 334 / 131 | ok |
| gemini-3.8-flash | low | 2.5 s | 334 / 129 | ok |

None of the four produced thinking tokens at these levels, and none returned a 429. `<ROLE>_THINKING` (`GENERATOR_THINKING`, `DISTRACTOR_JUDGE_THINKING`, `FINAL_JUDGE_THINKING`, …) now sets Gemini's `thinkingLevel` per role. It enters the request hash only when set, so existing cached requests are unchanged.

## Role assignment used

| Role | Model | Why |
|---|---|---|
| Writer: skeleton, distractor, explanation | gemini-3.1-flash-lite | Cheapest model that passed the schema probe |
| Distractor judge and skeleton gate | gemini-3.5-flash-lite | Different model from the writer; the highest-volume judge role, so it needs Lite quota |
| Final judge | gemini-3.8-flash, `FINAL_JUDGE_THINKING=low` | A third, stronger model; only 3 calls per item that reaches it |

Writer, distractor judge and final judge are three different models, so `assertIndependent` holds.

## Smoke

Variants A and corrected B+C+, specs 002–004, `FACTORY_MAX_REGENERATIONS=0`, with call, token and cost caps.

| | A | B+C+ |
|---|---|---|
| Skeletons | 3/3 pass; B+C+ replayed the same three from the cache | |
| Reached final judge | 0/3 | 0/3 |
| Fresh calls / tokens | 12 / 7,029 | 11 / 12,192 |
| List-price cost | $0.0044 | $0.0073 |
| Quota errors | 0 | 0 |

With no regeneration, an item stops at its first rejected option. The smoke shows that the pipeline runs on Gemini, that the caps hold and that cost is measurable. It says nothing about quality.

## Benchmark: variant A on Gemini, specs 001–012, seed 1

Regeneration followed the pipeline's own per-slot limit of 3 attempts. Caps: 300 calls, 600k tokens, $0.40, 60 regenerations. The run used 106 calls, 68,084 tokens and 29 regenerations, at $0.0438 list price. No cap was reached and no quota error occurred. The run's own `summary.json` shows its cost as unknown: it was written before the fix that keys logged Gemini models as `gemini:<model>` for price lookup. The figure above comes from the spend budget, and the comparison recomputes cost from the cache. The comparison is in `.data/analysis/_factory/benchmarks/gemini-2026-10-14/`; the Claude column is the stored 40-item benchmark (specs 001–020, 2 seeds).

| | Claude A (40) | Gemini A (12) |
|---|---|---|
| Skeleton pass | 39/40 | 12/12 |
| Distractor first-attempt acceptance (slots) | 100/143 (70%) | 3/19 (16%) |
| Items lost at distractor stage | 10/39 | 11/12 |
| Reached final judge (human queue) | 28/40 | 1/12 |
| Cost per item (list) | $0.052 | $0.0040 |
| Cost per item reaching the final judge | $0.075 | $0.047 (n=1) |
| Estimated latency per item | 78 s | 11 s |
| Tokens per item in/out | 18.5k / 8.8k | 5.1k / 1.1k |

Breakdown of the 48 Gemini distractor attempts:
- **Deterministic validator:** rejected 7, of which 5 repeated an already rejected text.
- **Distractor judge:** rejected 33.
- **Accepted:** 8.

The judge's failure codes were `competent_candidate_could_select` 24, `unintended_correctness` 21, `sentence_acceptable_alone` 13, `answer_clause_reuse` 10 and `too_obvious` 8.

Reading the judge's reasons shows it is unreliable:
- On item 010 it rejected three cause options as "identical to the correct answer" although none shares a clause with the key.
- On item 007 it called an option illogical and then rejected it as a second correct answer.

Some rejections are fair (whereas-clauses that support the decision, item 005). The losses therefore cannot be attributed to the writer alone. That needs a judge calibration against human labels. An older Flash-Lite slice from before the Claude switch, with older prompts, lost 12 of 12 items at the same stage (0/15 slots accepted first try).

## Blind review

`.data/analysis/_factory/blind-review/2026-10-14-gemini/` holds the one Gemini item that reached the human queue. Variant and model are hidden, and the key is only in `key.json`, which has not been opened. After rating:

```
npx tsx pipeline/cli.ts factory-blind-score --dir .data/analysis/_factory/blind-review/2026-10-14-gemini
```

## Decision: production defaults

The model defaults stay unchanged, on Claude. Gemini gave 1 human-queue item out of 12 against Claude's 28 of 40, and it has no human rating yet. Claude defaults cannot run until credit is restored. To run the factory on Gemini now, override the roles by environment:

```
GENERATOR_MODEL=gemini-3.1-flash-lite
DISTRACTOR_MODEL=gemini-3.1-flash-lite
EXPLANATION_MODEL=gemini-3.1-flash-lite
DISTRACTOR_JUDGE_MODEL=gemini-3.5-flash-lite
FINAL_JUDGE_MODEL=gemini-3.8-flash
FINAL_JUDGE_THINKING=low
FACTORY_PRICES=pipeline/ai/prices.gemini.json
AI_MAX_RETRIES=2
AI_MAX_WAIT_MS=65000
```

A model or variant becomes the production default only when all of these hold on the same family and spec set:

1. **Sample.** At least 30 items reached the human queue, from at least 2 seeds, and all were rated on a blind sheet.
2. **Human approval.** At least 75% APPROVE (Claude A reached 21/28 = 75%). Critical labels (REJECT) are at most 10% (Claude A had 4/28 = 14%). Key agreement is at least 95%.
3. **Yield.** At least 50% of skeletons reach the human queue (Claude A: 28/39).
4. **Cost.** Cost per human-approved item is no higher than Claude A's: about $2.09 / 21 ≈ $0.10 at list price.
5. **Second answers.** The human marks a second defensible answer on at most 5% of items.

## Remaining build steps

1. **Judge calibration (next API step).** Build an option-level gold set from the 54 human-rated items: options of APPROVE items count as good distractors, and options of items rated critical or revision count as suspect. Run only the candidate distractor judges on it. This means no generation, about 4 judge calls per item, with a hard call and cost cap. Pick the distractor judge by agreement with the human labels.
2. **Re-run Gemini A** on specs 001–012 with the calibrated judge. Skeletons and accepted calls replay from the cache. Rate the result blind.
3. **If Gemini reaches the criteria above:** run 2 seeds × 20 items and a full blind review, and only then switch defaults. Keep Claude selectable by environment.
4. **Import step.** Build the step that moves human-APPROVED records, with provenance, from run folders into the `factory` schema and then into the question bank. It does not exist yet; review stays mandatory.
5. **More families.** Extend the factory beyond `sentence_completion.concession`.
6. **Bulk generation on the Paid Tier:** a Batch API runner (−50%).
