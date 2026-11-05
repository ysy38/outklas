# OpenRouter on the question factory (2026-11-05)

OpenRouter is wired as a fourth AI provider (`openrouter`) beside gemini / nvidia / anthropic. Production `modelDefaults` stay Claude (Haiku writes, Sonnet judges). Nothing was switched without human criteria. No bank writes, no auto-approve, no ÖSYM text import.

## Enable (env)

Put secrets only in `.env.local` (never Vercel / never `NEXT_PUBLIC_*`):

```bash
OPENROUTER_API_KEY=          # required for openrouter:* roles
OPENROUTER_API_URL=          # optional; default https://openrouter.ai/api/v1
OPENROUTER_DATA_COLLECTION=deny   # optional; prefer no-train / stricter endpoints (exam stems)
FACTORY_PRICES=pipeline/ai/prices.openrouter.json

# Example role overrides (sync models for interactive smoke; use :batch only via Batch API helpers)
GENERATOR_MODEL=openrouter:qwen/qwen3.8-flash
DISTRACTOR_MODEL=openrouter:qwen/qwen3.8-flash
DISTRACTOR_JUDGE_MODEL=openrouter:deepseek/deepseek-v4.1-flash
FINAL_JUDGE_MODEL=openrouter:google/gemini-3.8-flash
EXPLANATION_MODEL=openrouter:qwen/qwen3.8-flash
```

Model settings are `provider:model`. The first `:` is the provider; `/` and a trailing `:batch` stay in the model id:

- `openrouter:google/gemini-3.8-flash` → sync chat/completions
- `openrouter:google/gemini-3.8-flash:batch` → batch catalog id (sync `generate` refuses it)

Do **not** call Anthropic with `CLAUDE_API_KEY` for this research path. `openrouter:anthropic/...` spends the OpenRouter balance only.

## Structured JSON

OpenRouter chat completions send `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`. Zod still validates after the call. Free-text reason fields stay in the schemas for calibration; prompts ask for ≤20 words per reason, and the OpenRouter provider appends a shared brevity line to the system prefix.

## Caching

- Stable system / rubric first; variable item last (same pattern as Gemini/Anthropic).
- Explicit `cache_control: { type: "ephemeral" }` (or `ttl: "1h"`) on the system block when `ANTHROPIC_PROMPT_CACHE` is `5m` / `1h` (shared env; `off` disables).
- OpenAI / Gemini / DeepSeek often cache implicitly above provider minima (OpenAI commonly ≥1024 tokens; Gemini Flash often ≥4096). Factory prompts are often shorter than those minima — expect many runs with `cacheReadTokens = 0`, same lesson as the Gemini note.
- Usage mapping: `prompt_tokens_details.cached_tokens` → `cacheReadTokens`; `cache_write_tokens` → `cacheWriteTokens`; uncached input = `prompt_tokens − cached_tokens`.
- Local disk cache (`cachedGenerate`) still skips identical requests entirely.

## Batch vs sync

| Mode | When | How |
|---|---|---|
| Sync | Interactive smoke, single-item debug | `OpenRouterProvider.generate` with **non-batch** model ids |
| Batch | Offline benchmark / 54-gold calibration | `OpenRouterBatchClient` → `POST /api/v1/batches`, poll `GET /api/v1/batches/{id}` |

Batch is typically ~½ sync token price, async (minutes…24h; Vertex can be longer). One model + one endpoint per batch. Results match via `custom_id`. Batch retains data ≤30 days and **cannot** use Zero Data Retention — for sensitive exam content prefer sync + `OPENROUTER_DATA_COLLECTION=deny`, or providers with clear no-train policies.

`:batch` model ids are rejected in sync `generate` with a clear error. `submit()` strips `:batch` before calling the Batch API.

## Candidate models (catalog 2026-11-05)

Prices = OpenRouter list USD / 1M tokens. All ten user slugs **exist**. Structured outputs advertised on all.

| Slug | Exists | In / Out $/1M | Batch? | Ctx | Structured | Role fit (hypothesis only) | Risks |
|---|---|---|---|---|---|---|---|
| `xiaomi/mimo-v2.6-pro` | yes | 0.435 / 0.87 | no `:batch` in list | ~1.05M | yes | Writer / strong distractor judge candidate | Xiaomi retains ~30d; not free |
| `deepseek/deepseek-v4.1-flash` | yes | 0.045 / 0.5 | yes (`:batch`, but see note) | ~1M | yes | Cheap writer or high-volume distractor judge | **May train** on prompts; batch input listed **higher** than sync on this date |
| `google/gemini-3.8-flash:batch` | yes | 0.375 / 1.875 | batch row | ~1M | yes | Offline final-judge / calibration | Batch latency; not for interactive smoke |
| `qwen/qwen3.8-flash` | yes | 0.15 / 0.47 | no | ~1M | yes | Economical writer | Alibaba often needs explicit cache breakpoints |
| `openai/gpt-6.1-terra-pro:batch` | yes | 0.5 / 2.5 | batch | ~1.05M | yes | Offline distractor / final judge | Moderated; expensive vs Flash-class; long-ctx surcharge |
| `deepseek/deepseek-v4.1-flash-1017` | yes | 0.3 / 1.2 | no | ~1M | yes | Snapshot writer/judge (reproducible) | Same DeepSeek training concern; off-peak overrides in catalog |
| `google/gemini-4-argon:batch` | yes | 1.0 / 5.0 | batch | ~1M | yes | Offline final judge only | Costly for volume |
| `stepfun/step-5-preview` | yes | 1.0 / 2.7 | no | ~1M | yes | Experimental writer | Preview; retention unknown |
| `anthropic/claude-haiku-5.5:batch` | yes | 0.05 / 0.25 | batch | ~1M | yes | Offline writer (closest to current Haiku default) | Via OpenRouter key only; long-ctx override >100k |
| `openai/gpt-6.1-sol:batch` | yes | 1.0 / 5.0 | batch | ~1.05M | yes | Offline final judge | Moderated; expensive |

Sync twins worth knowing: `google/gemini-3.8-flash` 0.825/4.125; `anthropic/claude-haiku-5.5` 0.1/0.5; `openai/gpt-6.1-terra-pro` 1/5; `openai/gpt-6.1-sol` 2/10; `google/gemini-4-argon` 2/10.

## vs prior Balanced recommendation

Prior note suggested: gemini-3.1-flash-lite writer, gpt-5-mini distractor judge, gemini-3.8-flash final (direct Gemini / OpenAI pricing era). On OpenRouter today those remain available (`google/gemini-3.1-flash-lite` 0.25/1.5, `openai/gpt-5-mini` 0.25/2.0, `google/gemini-3.8-flash` 0.825/4.125). Among the **new** list, cheapest structured sync writers look like `deepseek/deepseek-v4.1-flash` and `qwen/qwen3.8-flash`; strongest offline final-judge candidates look like `google/gemini-3.8-flash:batch` or (heavier) `google/gemini-4-argon:batch` / `openai/gpt-6.1-sol:batch`. **No claim that any new stack is better** until judge calibration on the 54 gold items.

## Tiny schema probes (2026-11-05)

With `OPENROUTER_API_KEY` present, two sync probes (`response_format` json_schema, `maxOutputTokens=64`, `data_collection=deny`):

| Model | Schema | Latency | Tokens in/out |
|---|---|---|---|
| `qwen/qwen3.8-flash` | ok | ~6.0 s | 105 / 55 |
| `deepseek/deepseek-v4.1-flash` | ok | ~0.7 s | 171 / 42 |

No cache tokens on these tiny prompts (expected under provider minima). Spend was a few hundred tokens total. No Anthropic direct key used.

## Judge calibration (2026-11-05) — done

Sync distractor-judge bakeoff on the 54 gold items (216 slots × 4 models): see [`openrouter-judge-calibration-2026-11-05.md`](./openrouter-judge-calibration-2026-11-05.md). Artifacts under `.data/analysis/_factory/judge-calibration/openrouter-2026-11-05-v2/`.

Root cause of DeepSeek JSON failures: empty `content` (tokens spent on `reasoning`). Fixed with `reasoning: { exclude: true }` + tolerant JSON extract. Parallel resumable workers: `scripts/run-judge-calibrate-parallel.sh`.

**No production default switch.** Provisional OpenRouter serial stack: DeepSeek writer + Gemini distractor/final judge (env-only). DeepSeek dropped as judge (14% JSON errors).

## Implementation map

| Piece | Path |
|---|---|
| Provider + batch client | `pipeline/ai/openrouter.ts` |
| Config / `parseModel` | `pipeline/ai/config.ts` |
| Router | `pipeline/ai/service.ts` `createProvider` |
| Prices | `pipeline/ai/prices.openrouter.json` |
| Tests | `pipeline/ai/ai.test.ts` (fake transport; no live key required) |

## Explicit non-goals

- No production default switch to OpenRouter.
- No full 54-item spend in this change.
- No Anthropic direct credit spend for OpenRouter research.
- No commit/push unless requested.
