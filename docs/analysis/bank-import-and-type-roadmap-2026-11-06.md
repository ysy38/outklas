# Bank import path + multi-type roadmap (2026-11-06)

Human-rated gateway stack reached **30/38 APPROVE (79%)**, **37/37 key agreement**, **1 REJECT**. Sentence-completion concession is good enough to design import — not to auto-write the live bank.

## A. Path: approved items → question bank

Nothing in the repo writes factory candidates into the live question bank today. Review lives in run folders + (schema-ready) `factory.*` tables. The import must stay a **human-gated, append-only, provenance-preserving** step.

### Stages

```
blind ratings (APPROVE)
    → map blind_id → run/specId via key.json
    → factory-review APPROVE on each candidate (append-only review row)
    → factory schema upsert (run + candidate + version + review)   [staging]
    → bank-import CLI (explicit --apply)                            [live questions]
```

1. **Resolve the 30 APPROVE rows** from `blind-review/2026-11-05-gateway-20x2/{ratings.csv,key.json}` to `(runDir, specId, factoryOption key)`.
2. **`factory-review --decision APPROVE`** for each (reviewer id required). Status → `approved`. EDIT/REJECT stay out.
3. **Persist into `factory` schema** (already designed: runs, candidates, versions, reviews). This is staging, not the learner-facing bank. Idempotent on `(run_id, spec_id)`.
4. **`factory-bank-import`** (new): reads only `status=approved` candidates with a human APPROVE review; writes into the app question tables with:
   - stem + options + key + explanation (TR)
   - skill / question_type / family tags from the QuestionSpec
   - provenance: run id, models, prompt versions, blind sheet id, reviewer, approved_at
   - originality hash / shingle check against live bank (reject duplicates)
5. **Guards (hard):**
   - no import without human APPROVE review row
   - no LLM call in the import path
   - `--dry-run` default; `--apply` required for writes
   - RLS stays on; import uses server credentials only
   - never import ÖSYM / historical stem text

### First concrete slice (when you say implement)

- Input: the 30 APPROVE ids from the 20×2 sheet
- Output: dry-run report (what would be inserted) + optional `--apply` into staging `factory.*` first; live bank only after you confirm the dry-run

## B. Do not calibrate all 10 types the expensive way

Full 20+20 + blind (~$1 + your time) per type × 10 ≈ weeks and ~$10–20 API, plus review load. Unnecessary: the **stack** (Haiku write / Gemini verdict distractor-judge / Sonnet final) transferred; what changes is the **family blueprint + prompts + a few deterministic checks**.

### YDS types → build clusters (shared machinery)

| Cluster | Types | Shared core | Type-specific work |
|---|---|---|---|
| **A. Connector / blank** | sentence_completion ✅, cloze, dialogue_completion | optionShape connector/blank, distractor roles, verdict judge | family blueprints + stem/dialogue frames |
| **B. Paraphrase** | **closest_meaning (restatement)**, translation_en_tr / tr_en | faithfulness / scope / negation distractors (already sketched in `diagnosis.ts`) | source sentence + 4 paraphrases; no connector plan |
| **C. Passage structure** | paragraph_completion, irrelevant_sentence, reading_comprehension | passage + 5 options; coherence / main-idea checks | longer context budget; different skeleton schema |
| **D. Lexical / pragmatic** | vocabulary, grammar, situation_appropriate | short stem, single skill node | misconception sets per skill |

Restatement in our graph = `question_type:closest_meaning` (DNA: 13 items, paraphrase skill).

### Lean protocol per new type (default)

1. **Spec only:** 1 family blueprint + skeleton/distractor/explanation prompt stubs + unlock `unsupported_question_type` for that type.
2. **Smoke:** 8–12 items, 1 seed, same gateway stack, `$≤0.40` hard cap.
3. **Blind:** you rate once (≈15–20 min).
4. **Gate:** ≥70% APPROVE and ≥95% key agreement → type “online” for serial; else fix prompts (not full recalibration).
5. **Escalate only if yield collapses** (review rate &lt;50% or APPROVE &lt;60%): then 20×2 like concession.

Judge calibration on 54 gold items is **not** repeated per type unless the distractor *shape* changes a lot (paraphrase cluster: one short verdict-prompt tweak is enough).

### Suggested order (cost ↑ skill reuse)

1. **closest_meaning (restatement)** — next; diagnosis already has paraphrase probes  
2. **cloze** — reuses blank + discourse machinery  
3. **dialogue_completion** — short context, high exam weight  
4. **paragraph_completion** / **irrelevant_sentence** — passage cluster  
5. **vocabulary** / **grammar** — high volume, simpler items  
6. **translation_*** — bilingual; careful with no-train routing  
7. **reading_comprehension** / **situation_appropriate** — last (long context / pragmatics)

### Cost sketch

| Mode | Per type | 9 remaining types |
|---|---|---|
| Lean smoke 10 + blind | ~$0.3–0.5 | ~$3–5 |
| Full 20×2 every type | ~$1–1.5 | ~$10–15 + weeks of review |

## C. Decision

- Bank path: design above; implement when you approve dry-run scope (30 APPROVE → `factory.*` first).
- Types: lean transfer, restatement next — not another 40-item concession-style loop.
