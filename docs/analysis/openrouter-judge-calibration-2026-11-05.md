# OpenRouter distractor-judge calibration (2026-11-05)

Sync bakeoff on the 54 human-rated blind-review items (`.data/analysis/_factory/blind-review/2026-10-13-calibration`). No item regeneration, no bank writes, no Anthropic direct spend. `OPENROUTER_DATA_COLLECTION=deny`. Prices: `pipeline/ai/prices.openrouter.json`. Prompt: baseline `distractor-judge.v3` (empty `FACTORY_EXPERIMENTS`) so every model shares one rubric.

## Gold

| | |
|---|---|
| Rated items | 54 |
| Wrong-option slots | 216 (4 × 54) |
| Good (APPROVE, unflagged) | 172 — judge should **ACCEPT** |
| Bad (EDIT/REJECT or option flags) | 44 — judge should **REGENERATE** |

CLI: `npx tsx pipeline/cli.ts factory-judge-calibrate --dir … --out … --models …`

Artifacts: `.data/analysis/_factory/judge-calibration/openrouter-2026-11-05/{summary.md,summary.json,results.json}`.

## Results

| Model | Judged | Errors | Agreement | False-reject | Miss-flaw | Human-review | Fresh cost (approx) | Notes |
|---|---|---|---|---|---|---|---|---|
| `deepseek/deepseek-v4.1-flash` | 182 | 34 JSON | **109/182 (60%)** | 47/143 (**33%**) | 26/39 (**67%**) | 0 | ~$0.36 (first pass) | Best agreement among complete runs; often accepts bad options; schema fragility |
| `qwen/qwen3.8-flash` | 213 | 3 | 84/209 (40%) | 113/169 (**67%**) | 12/44 (27%) | 4 | ~$0.15–0.3* | Harsh: rejects many human-good distractors |
| `xiaomi/mimo-v2.6-pro` | 216 | **0** | 95/211 (45%) | 101/172 (59%) | 15/44 (34%) | 5 | **$0.14** | Most reliable JSON; middle agreement |
| `google/gemini-3.8-flash` | 23 | 193 (mostly post-429) | 14/23 (61%)* | 9/23 (39%)* | — | 0 | $0.05 then **429** | Incomplete — do not rank |

\*Gemini rates are on a 23-slot stub after quota; not comparable. \*Qwen fresh cost was mostly cached on the final summary pass; first-pass spend was higher than the $0.001 cache residual.

Agreement = ACCEPT on good + REGENERATE on bad (HUMAN_REVIEW out of the hard denominator). False-reject = REGENERATE on good. Miss-flaw = ACCEPT on bad.

## Interpretation (provisional)

- **No model meets a “switch production defaults” bar.** Top complete agreement is ~60%, with painful tradeoffs.
- **DeepSeek** maximizes agreement and minimizes false-reject, but **misses critical flaws** (67%) and fails structured JSON ~16% of slots — risky as sole distractor judge.
- **Qwen** is a poor distractor judge here (67% false-reject → factory yield collapse).
- **Xiaomi** is the safest *operational* judge (0 schema errors) but still ~45% agreement / high false-reject.
- **Gemini 3.8 Flash** hit OpenRouter **429** mid-run; unfinished. Keep as a final-judge *candidate* only after quota recovers; not calibrated here.

**Do not claim a winning stack.** Code `modelDefaults` stay Claude. Use env overrides for experiments.

## Recommended env for capped serial A (research only)

Independent writer ≠ distractor judge. Prefer cheap schema-OK writer + least-bad judge from this table; final judge provisional Gemini when quota allows:

```bash
OPENROUTER_API_KEY=          # .env.local only — rotate if ever pasted into chat
OPENROUTER_DATA_COLLECTION=deny
FACTORY_PRICES=pipeline/ai/prices.openrouter.json
FACTORY_MAX_COST_USD=1.0
FACTORY_MAX_CALLS=80
FACTORY_MAX_REGENERATIONS=2
AI_MAX_RETRIES=2

GENERATOR_MODEL=openrouter:deepseek/deepseek-v4.1-flash
DISTRACTOR_MODEL=openrouter:deepseek/deepseek-v4.1-flash
EXPLANATION_MODEL=openrouter:deepseek/deepseek-v4.1-flash
DISTRACTOR_JUDGE_MODEL=openrouter:xiaomi/mimo-v2.6-pro
FINAL_JUDGE_MODEL=openrouter:google/gemini-3.8-flash
```

Rationale (hypothesis, not proven superiority): DeepSeek as writer (cheap + prior schema OK); Xiaomi as distractor judge (zero JSON failures, mid metrics); Gemini as final judge when not 429. DeepSeek-as-judge is *not* recommended despite higher agreement, because miss-flaw is unacceptable for quality gates.

Stop conditions: budget / calls / **429**. Human review gate before any bank write. No auto-approve.

## Batch later

Interactive calibration stayed **sync**. For offline serial / 54-gold re-runs at ~½ token price, use `OpenRouterBatchClient` and `:batch` model ids (not sync `generate`). Batch cannot use ZDR — prefer sync + `deny` for sensitive stems.

## Serial smoke

Not run in this pass: no clear distractor-judge winner and Gemini final-judge quota 429. Re-run a ≤12-skeleton A smoke only after Gemini quota recovers or with a non-429 final judge, under the caps above.

## Human next steps

1. **Rotate** any OpenRouter key that was pasted into chat.
2. Rate any new blind-sheet items before changing defaults.
3. Decide human criteria for “good enough” judge agreement / false-reject / miss-flaw (see gemini-factory note thresholds for full stack promotion).
