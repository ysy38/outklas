import { existsSync, writeFileSync } from "node:fs";
import { loadAIConfig } from "../pipeline/ai/config";
import { OpenRouterProvider } from "../pipeline/ai/openrouter";
import { extractJsonText } from "../pipeline/ai/service";

if (!process.env.OPENROUTER_API_KEY && existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  const config = loadAIConfig();
  const key = config.keys.openrouter;
  if (!key) throw new Error("missing key");
  const provider = new OpenRouterProvider({ apiKey: key, dataCollection: "deny", promptCache: "off", minOutputTokens: 2048 });
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
  const response = await provider.generate({
    model: "deepseek/deepseek-v4.1-flash",
    system: "DISTRACTOR REVIEWER\nJSON only.",
    parts: [{ text: "Stem: Although X, ----.\nKey: Y happened\nWrong: because Y happened\nScore." }],
    jsonSchema: schema,
    maxOutputTokens: 2048,
    temperature: 0,
  });
  const out = {
    finishReason: response.finishReason,
    textLen: response.text.length,
    textHead: response.text.slice(0, 400),
    extractHead: extractJsonText(response.text).slice(0, 400),
    usage: response.usage,
  };
  writeFileSync(".data/analysis/_factory/judge-calibration/debug-raw/provider-deepseek-after-fix.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
