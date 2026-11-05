#!/usr/bin/env bash
# Detached parallel distractor-judge calibration. Resumable via JSONL. Never prints secrets.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
set -a; source .env.local; set +a
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY missing in .env.local}"

OUT="${OUT:-.data/analysis/_factory/judge-calibration/openrouter-2026-11-05}"
DIR="${DIR:-.data/analysis/_factory/blind-review/2026-10-13-calibration}"
CONCURRENCY="${CONCURRENCY:-6}"
export OPENROUTER_DATA_COLLECTION="${OPENROUTER_DATA_COLLECTION:-deny}"
export FACTORY_PRICES="${FACTORY_PRICES:-pipeline/ai/prices.openrouter.json}"
# Per-process spend cap; four models ≈ ≤$5 total
export FACTORY_MAX_COST_USD="${FACTORY_MAX_COST_USD:-1.25}"
export AI_MAX_RETRIES="${AI_MAX_RETRIES:-2}"
export AI_MAX_WAIT_MS="${AI_MAX_WAIT_MS:-45000}"

mkdir -p "$OUT"
MODELS=(
  "openrouter:deepseek/deepseek-v4.1-flash"
  "openrouter:qwen/qwen3.8-flash"
  "openrouter:xiaomi/mimo-v2.6-pro"
  "openrouter:google/gemini-3.8-flash"
)

echo "launching ${#MODELS[@]} workers → $OUT (concurrency=$CONCURRENCY)"
PIDS=()
for model in "${MODELS[@]}"; do
  slug="${model#openrouter:}"
  slug="${slug//\//__}"
  slug="${slug//:/__}"
  log="$OUT/worker-${slug}.log"
  nohup npx tsx pipeline/cli.ts factory-judge-calibrate \
    --dir "$DIR" \
    --out "$OUT" \
    --models "$model" \
    --concurrency "$CONCURRENCY" \
    >"$log" 2>&1 &
  PIDS+=("$!")
  echo "  pid $!  $model  → $log"
done

echo "${PIDS[*]}" >"$OUT/pids.txt"
echo "waiting on ${PIDS[*]}"
fail=0
for pid in "${PIDS[@]}"; do
  if ! wait "$pid"; then
    echo "worker $pid failed"
    fail=1
  fi
done

npx tsx pipeline/cli.ts factory-judge-calibrate-merge \
  --out "$OUT" \
  --models "$(IFS=,; echo "${MODELS[*]}")" \
  --dir "$DIR" | tee "$OUT/merge.json"

exit "$fail"
