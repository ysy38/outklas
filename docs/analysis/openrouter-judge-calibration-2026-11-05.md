# OpenRouter distractor-judge calibration (2026-11-05)

Gold: 54 human-rated items from `blind-review/2026-10-13-calibration` → 216 wrong-option slots (172 good / 44 bad). Prompt: `distractor-judge.v3` (no experiments). Sync only; `OPENROUTER_DATA_COLLECTION=deny`; `FACTORY_PRICES=pipeline/ai/prices.openrouter.json`. Artifacts: `.data/analysis/_factory/judge-calibration/openrouter-2026-11-05-v2/`.

## What was broken

1. **Empty `content` on reasoning models.** DeepSeek (and similar) spent the whole `max_tokens` budget on `message.reasoning` (`finish_reason=length`, `content=""`). Downstream `JSON.parse` failed → ~25% `output is not valid JSON`.
2. **Foreground kill (exit 143).** Long sync bakeoffs were attached to a shell that got SIGTERM; progress was not resumable.
3. **Gemini new-account RPM.** `google/gemini-3.8-flash` is limited to ~20 req/min on new accounts; concurrency 6 immediately 429’d.

## Fixes

- OpenRouter always sends `reasoning: { exclude: true }`; falls back to reasoning text if content is empty.
- `extractJsonText` strips fences / pulls the first balanced `{...}`; 0–5 Likert scores rescale to 0–1 before Zod.
- `factory-judge-calibrate` writes per-model JSONL, skips successful slots on resume, retries errors; parallel workers via `scripts/run-judge-calibrate-parallel.sh`.
- Gemini finished with concurrency 1 after the RPM stop.

## Results (216 slots each)

| Model | Agreement | False-reject | Catch-bad | JSON-error | Cost | Mean latency |
|---|---|---|---|---|---|---|
| `deepseek/deepseek-v4.1-flash` | 115/185 (**62%**) | 49/149 (33%) | 16/37 (43%) | **30/216 (14%)** | ~$0.46 | ~17–24 s |
| `qwen/qwen3.8-flash` | 89/208 (43%) | 108/171 (63%) | 30/43 (70%) | 2/216 (1%) | ~$0.21 | ~28 s |
| `xiaomi/mimo-v2.6-pro` | 88/209 (42%) | 107/172 (62%) | 26/44 (59%) | 0/216 (0%) | ~$0.14 | ~16 s |
| `google/gemini-3.8-flash` | 110/216 (**51%**) | 85/172 (49%) | 23/44 (52%) | 0/216 (0%) | ~$0.51 | ~5.7 s |

Approx total spend for this bakeoff: **~$1.32** (under the $5 cap). No Anthropic direct calls. No bank writes.

## Interpretation (provisional)

- **Drop DeepSeek as distractor-judge** until JSON error rate stays under 10% (still fine as a cheap **writer** after `reasoning.exclude`).
- **Qwen / Xiaomi** are JSON-reliable but reject too many human-good options (~62% false-reject) — they would crush serial yield.
- **Gemini 3.8 Flash** is the only candidate that finished cleanly with middling agreement and no JSON failures. Not “human-criteria ready,” but the least-bad OpenRouter distractor-judge in this bakeoff.
- Production `modelDefaults` stay Claude. Serial OpenRouter runs are **env-only**.

## Recommended serial env (caps + human gate)

```bash
OPENROUTER_API_KEY=          # .env.local only — rotate if exposed
OPENROUTER_DATA_COLLECTION=deny
FACTORY_PRICES=pipeline/ai/prices.openrouter.json
FACTORY_MAX_COST_USD=2
FACTORY_MAX_CALLS=200
FACTORY_MAX_REGENERATIONS=40
AI_MAX_RETRIES=2
AI_MAX_WAIT_MS=45000

GENERATOR_MODEL=openrouter:deepseek/deepseek-v4.1-flash
DISTRACTOR_MODEL=openrouter:deepseek/deepseek-v4.1-flash
EXPLANATION_MODEL=openrouter:qwen/qwen3.8-flash
DISTRACTOR_JUDGE_MODEL=openrouter:google/gemini-3.8-flash
FINAL_JUDGE_MODEL=openrouter:google/gemini-3.8-flash
```

Commands:

```bash
# Capped serial smoke (example ≤12 skeletons) — stop on 429 / budget
npx tsx pipeline/cli.ts factory --family sentence_completion.concession --band medium --count 12 --tag or-serial-smoke

# Blind sheet for human queue (never open key.json in chat)
npx tsx pipeline/cli.ts factory-blind --variants "A=<runDir>" --out .data/analysis/_factory/blind-review/<date>-or-smoke
```

Human review remains mandatory. No auto-approve. No production bank import step in this run.

## Batch later

Use `:batch` + `OpenRouterBatchClient` for offline 54-gold / large serial only after sync stack is stable. Batch cannot use ZDR.

## Security

If an OpenRouter key was pasted into chat, **rotate/revoke it on the OpenRouter dashboard** and keep the new key only in `.env.local`.
