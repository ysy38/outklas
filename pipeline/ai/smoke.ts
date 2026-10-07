import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataRoot } from "../lib/artifacts";
import { loadAIConfig, smokeModels } from "./config";
import { GeminiProvider } from "./gemini";

const ping = "Reply with the single word PONG and nothing else. This is a connectivity check.";

export type SmokeResult = {
  ok: boolean;
  keyLocation: "env.local" | "missing";
  clientExposed: boolean;
  probed: { model: string; status: "ok" | "error"; httpStatus?: number; message: string }[];
  working: string[];
  proPreview: "ok" | "error" | "untried";
};

export async function geminiSmoke(): Promise<SmokeResult> {
  const envFile = existsSync(".env.local");
  const config = loadAIConfig();
  const clientExposed = Boolean(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
  const probed: SmokeResult["probed"] = [];
  const working: string[] = [];
  if (!config.apiKey) {
    return { ok: false, keyLocation: envFile ? "env.local" : "missing", clientExposed, probed, working, proPreview: "untried" };
  }
  const provider = new GeminiProvider({ apiKey: config.apiKey, maxRetries: 0, timeoutMs: 25_000 });
  for (const model of smokeModels) {
    console.error(`probe ${model}`);
    try {
      const response = await provider.generate({ model, parts: [{ text: ping }], temperature: 0, maxOutputTokens: 64 });
      const text = response.text.trim();
      const ok = text.length > 0;
      probed.push({ model, status: ok ? "ok" : "error", message: ok ? text.slice(0, 24) : `empty:${response.finishReason ?? "none"}` });
      if (ok) working.push(model);
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? Number((error as { status: number }).status) : 0;
      probed.push({ model, status: "error", httpStatus: status || undefined, message: error instanceof Error ? error.message.slice(0, 180) : "error" });
    }
  }
  const dir = path.join(dataRoot(), "gemini-smoke");
  mkdirSync(dir, { recursive: true });
  const result: SmokeResult = {
    ok: working.length > 0,
    keyLocation: "env.local",
    clientExposed,
    probed,
    working,
    proPreview: probed.find((entry) => entry.model === smokeModels[0])?.status === "ok" ? "ok" : "error",
  };
  writeFileSync(path.join(dir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
