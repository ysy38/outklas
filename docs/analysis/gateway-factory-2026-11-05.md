# Factory on Vercel AI Gateway + verdict judge (2026-11-05)

## Why calibration kept failing

1. **The judge design, not the models.** `distractor-judge.v3` asks for eight 0..1 scores and regenerates the option when *any one* crosses 0.5. It was tuned on Claude Sonnet. Cheaper models each misfire on one dimension or another (`too_obvious` most of all), and with eight vetoes the misfires add up: 33–67% of human-approved options were thrown away. Same model, same 216 options: Claude Haiku rejects 63% of good options with the rubric and 17% with a single verdict.
2. **A parsing bug.** The 0–5 rescue added in 878164a rescaled *every* number from 1 to 5 in *every* schema (an analyzer `question_number: 3` became 0.6) and read a 0–5 "1" as certainty. It now touches only fields the schema declares as 0..1, and only when one of them in the same object is above 1.
3. **The gold set measures less than it seemed.** No option was flagged individually in `ratings.csv`; all 44 "bad" options are the four options of EDIT/REJECT items, mostly rejected for the scenario or a shaky key. So "catch-bad" and "agreement" say little about a distractor judge. What the set does measure well is the **false-reject rate on the 172 options of approved items**, which is what drives yield.
4. **Operational noise.** OpenRouter 429s on Gemini, reasoning eating the token budget (empty content), and a shell timeout killing the run.

## What changed

- `gateway` provider (`pipeline/ai/gateway.ts`): `AI_GATEWAY_API_KEY`, Chat Completions, strict JSON schema (closed objects), `providerOptions.gateway.caching: "auto"`, `disallowPromptTraining: true` (off with `AI_GATEWAY_NO_TRAINING=off`), reasoning effort from `<ROLE>_THINKING`, cache-token accounting.
- `FACTORY_DISTRACTOR_JUDGE=verdict` → `distractor-judge.v7`: one verdict (`good`, `second_answer`, `repeats_answer`, `ungrammatical`, `unnatural`, `too_obvious`) + `sure` + one short reason. `reportFromVerdict` maps it onto the rubric report, so `distractorDecision` stays the single decision point. An unsure verdict becomes HUMAN_REVIEW (the option is kept and flagged). Default stays `rubric`.
- Prices: `pipeline/ai/prices.gateway.json` (live `/v1/models`).
- Calibration CLI works for any provider; summary adds Flag-bad and Human-review.

## Calibration (54 rated items, 216 wrong options; gateway, verdict unless noted)

| Judge | False-reject on approved items | Accepts outright | Cost / 216 | Mean latency |
|---|---|---|---|---|
| `anthropic/claude-sonnet-5.5` | **1/172 (1%)** | 35% (rest HUMAN_REVIEW) | $0.27 | 2.1 s |
| `google/gemini-3.8-flash` | **6/172 (3%)** | 97% | $0.29 | 4.8 s |
| `deepseek/deepseek-v4.1-flash` | 20/172 (12%) | 78% | $0.35 | 6.1 s |
| `anthropic/claude-haiku-5.5` | 30/172 (17%) | 38% | $0.04 | 2.7 s |
| `xiaomi/mimo-v2.6-pro` (partial, 146) | 25/146 (17%) | 78% | — | slow |
| `alibaba/qwen3.8-flash` (partial, 126) | 27/126 (21%) | 52% | — | slow |
| `openai/gpt-5-mini` | 122/172 (71%) | 27% | $0.32 | 8.7 s |
| `anthropic/claude-haiku-5.5` **rubric** | 109/172 (63%) | 30% | $0.09 | 5.1 s |

Artifacts: `.data/analysis/_factory/judge-calibration/gateway-2026-11-05/{verdict,rubric}/`.

Gemini 3.8 Flash keeps good options and is decisive, but it also accepts almost every option of the EDIT/REJECT items (flags 4/44). Whether it catches real distractor flaws is **not measured yet**; that needs option-level negatives (see next steps). Human review stays the gate.

## End-to-end smoke (6 skeletons, concession, medium)

Stack: writer/distractor/explanation Haiku 5.5 (`low` thinking), distractor judge Gemini 3.8 Flash (verdict), final judge Sonnet 5.5.

- 5/6 items reached HUMAN_REVIEW, 1 rejected by the final judge (Gemini-only stack: 1/12).
- Distractor slots accepted first try: 19/24 (79%); Claude A was ~70%, Gemini A 16%.
- 96 calls, 0 errors, prompt-cache reads on 47 calls; **$0.18 total, $0.030/item, $0.036/accepted item** (Claude A direct: $0.052/item).
- Run: `.data/analysis/_factory/runs/sentence_completion.concession.medium.n6-from2.atomic.v1.gateway-smoke-v7`
- Blind sheet: `.data/analysis/_factory/blind-review/2026-11-05-gateway/`

## Serial run settings (provisional until blind-rated)

```bash
# .env.local holds AI_GATEWAY_API_KEY; never commit it
FACTORY_PRICES=pipeline/ai/prices.gateway.json
FACTORY_DISTRACTOR_JUDGE=verdict
GENERATOR_MODEL=gateway:anthropic/claude-haiku-5.5
DISTRACTOR_MODEL=gateway:anthropic/claude-haiku-5.5
EXPLANATION_MODEL=gateway:anthropic/claude-haiku-5.5
GENERATOR_THINKING=low
DISTRACTOR_THINKING=low
DISTRACTOR_JUDGE_MODEL=gateway:google/gemini-3.8-flash
FINAL_JUDGE_MODEL=gateway:anthropic/claude-sonnet-5.5
FACTORY_MAX_COST_USD=2
FACTORY_MAX_CALLS=800
AI_MAX_RETRIES=3

npx tsx pipeline/cli.ts factory --family sentence_completion.concession --band medium --first 2 --count 20 --tag gateway-a-seed1
```

Run long jobs detached (`nohup … > log 2>&1 &`) so a shell timeout cannot kill them; the request cache makes a rerun resume.

Cost levers, measured: the final judge (Sonnet) is ~60% of spend and the distractor judge ~30%; `DISTRACTOR_JUDGE_THINKING=low` is the next saving to try. Batch (`-batch` ids, ~½ price) fits offline reruns only.

## Next steps

1. Rate `2026-11-05-gateway` (6 items) with `factory-blind-score`.
2. Build an option-level negative set (≈40 wrong options a human marks as second answer / repeats / ungrammatical / too obvious) so judge flaw-catch can be measured; mark individual options in future ratings.
3. Two seeds × 20 skeletons with the stack above, blind-rated, against the default criteria in `gemini-factory-2026-10-14.md` (≥30 rated, ≥75% approve, ≤10% critical, ≥50% reach review, $/approved ≤ Claude).
4. Defaults in `modelDefaults` stay Claude-direct until then; the stack runs from env.
