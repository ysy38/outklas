import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

if (!process.env.OPENROUTER_API_KEY && existsSync(".env.local")) process.loadEnvFile(".env.local");

const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error("OPENROUTER_API_KEY missing");

const models = ["deepseek/deepseek-v4.1-flash", "qwen/qwen3.8-flash", "xiaomi/mimo-v2.6-pro", "google/gemini-3.8-flash"];
const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "grammaticalValidity",
    "semanticCoherence",
    "unintendedCorrectness",
    "standaloneSentenceAcceptable",
    "answerClauseReuse",
    "obviouslyWrong",
    "ambiguity",
    "competentCandidateCouldSelect",
    "confidence",
    "reasons",
  ],
  properties: {
    grammaticalValidity: { type: "number" },
    semanticCoherence: { type: "number" },
    unintendedCorrectness: { type: "number" },
    standaloneSentenceAcceptable: { type: "boolean" },
    answerClauseReuse: { type: "number" },
    obviouslyWrong: { type: "number" },
    ambiguity: { type: "number" },
    competentCandidateCouldSelect: { type: "boolean" },
    confidence: { type: "number" },
    reasons: { type: "array", items: { type: "string" } },
  },
};

const outDir = ".data/analysis/_factory/judge-calibration/debug-raw";
mkdirSync(outDir, { recursive: true });

async function probe(model: string, extra: Record<string, unknown>) {
  const body = {
    model,
    messages: [
      { role: "system", content: "DISTRACTOR REVIEWER\nOutput JSON only." },
      {
        role: "user",
        content:
          "Stem: Although the plan was risky, ----.\nKey: the board approved it after review\nWrong option: because the board approved it after review\nScore the wrong option as JSON.",
      },
    ],
    temperature: 0,
    max_tokens: 2048,
    response_format: { type: "json_schema", json_schema: { name: "output", strict: true, schema } },
    provider: { data_collection: "deny", require_parameters: true },
    ...extra,
  };
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  const tag = Object.keys(extra).length ? "with-reasoning-exclude" : "baseline";
  const stem = `${model.replace(/\//g, "__")}__${tag}`;
  writeFileSync(path.join(outDir, `${stem}.json`), raw);
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  const choice = (parsed?.choices as { message?: Record<string, unknown>; finish_reason?: string }[] | undefined)?.[0];
  const msg = choice?.message ?? {};
  const content = String(msg.content ?? "");
  const reasoning = String(msg.reasoning ?? msg.reasoning_content ?? "");
  const summary = {
    model,
    tag,
    http: res.status,
    finish_reason: choice?.finish_reason ?? null,
    contentLen: content.length,
    contentHead: content.slice(0, 220),
    reasoningLen: reasoning.length,
    reasoningHead: reasoning.slice(0, 160),
    messageKeys: Object.keys(msg),
    usage: parsed?.usage ?? null,
    error: parsed?.error ?? null,
  };
  writeFileSync(path.join(outDir, `${stem}.summary.json`), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
}

async function main() {
  for (const model of models) {
    await probe(model, {});
    await probe(model, { reasoning: { exclude: true } });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
