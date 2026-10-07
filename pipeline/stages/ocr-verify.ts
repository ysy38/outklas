import { loadAIConfig } from "../ai/config";
import { transcribePromptVersion } from "../ai/prompts/verifier.v1";
import { AIRequestError } from "../ai/gemini";
import { AIOutputError, createAIService } from "../ai/service";
import { readArtifactBytes, readJson, readManifest, runStage } from "../lib/artifacts";
import { mapLimit } from "../lib/limit";
import type { ColumnId, OcrColumn, Transcription } from "../extract/types";
import type { StageContext } from "./context";

const imageName = /^images\/page-(\d+)-(left|right|full)\.png$/;

/** A transcription whose length is this far from Tesseract's has skipped or invented text. */
export const lengthRatio = { min: 0.85, max: 1.2 };

const letters = (text: string) => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;

/** Second, independent reading of every column image by a vision model. Columns it declines or garbles fall back to Tesseract downstream. */
export async function ocrVerify(context: StageContext) {
  const slug = context.document.slug;
  const ocr = readManifest(slug, "ocr");
  if (!ocr) throw new Error("Run the ocr stage first.");
  const config = loadAIConfig();
  const ai = createAIService(config);
  const images = Object.keys(ocr.files).filter((name) => imageName.test(name)).sort();

  return runStage(
    {
      document: slug,
      stage: "ocr-verify",
      version: "2",
      inputs: { ocr: ocr.outputHash },
      params: { provider: config.provider, model: config.models.verifier, prompt: transcribePromptVersion, lengthRatio },
      code: ["pipeline/stages/ocr-verify.ts", "pipeline/ai/prompts/verifier.v1.ts"],
      force: context.force,
    },
    async () => {
      let cached = 0;
      const usage = { inputTokens: 0, outputTokens: 0 };
      const transcriptions = await mapLimit(images, 3, async (name) => {
        const [, page, column] = imageName.exec(name)!;
        const file = name.replace("images/", "").replace(".png", ".json");
        const base = { page: Number(page), column: column as ColumnId, provider: config.provider, model: config.models.verifier, promptVersion: transcribePromptVersion };
        let transcription: Transcription;
        try {
          const result = await ai.verifier.transcribe({ image: readArtifactBytes(slug, "ocr", name), label: `page ${Number(page)}, ${column} column` });
          if (result.cached) cached += 1;
          usage.inputTokens += result.usage.inputTokens;
          usage.outputTokens += result.usage.outputTokens;
          const ratio = letters(result.value.lines.join("")) / Math.max(1, letters(readJson<OcrColumn>(slug, "ocr", file).text));
          const status = ratio < lengthRatio.min || ratio > lengthRatio.max ? "incomplete" : "ok";
          transcription = { ...base, model: result.model, status, requestHash: result.requestHash, lines: result.value.lines, uncertain: result.value.uncertain };
          context.log(`verified page ${Number(page)} ${column}: ${status} (length ratio ${ratio.toFixed(2)})${result.cached ? " (cached)" : ""}`);
        } catch (error) {
          if (error instanceof AIOutputError) {
            const declined = error.message.includes("declined");
            transcription = { ...base, status: declined ? "declined" : "invalid", finishReason: error.finishReason, requestHash: null, lines: [], uncertain: [] };
          } else if (error instanceof AIRequestError && error.retryable) {
            transcription = { ...base, status: "error", finishReason: `http ${error.status}`, requestHash: null, lines: [], uncertain: [] };
          } else throw error;
          context.log(`verified page ${Number(page)} ${column}: ${transcription.status} (${transcription.finishReason ?? ""})`);
        }
        return [file, transcription] as const;
      });
      const byStatus = (status: Transcription["status"]) => transcriptions.filter(([, value]) => value.status === status).map(([name]) => name.replace(".json", ""));
      return {
        files: Object.fromEntries(transcriptions.map(([name, value]) => [name, `${JSON.stringify(value, null, 1)}\n`])),
        stats: {
          columns: transcriptions.length,
          ok: byStatus("ok").length,
          declined: byStatus("declined"),
          invalid: byStatus("invalid"),
          incomplete: byStatus("incomplete"),
          error: byStatus("error"),
          cached,
          ...usage,
          uncertainWords: transcriptions.reduce((sum, [, value]) => sum + value.uncertain.length, 0),
          unreadable: transcriptions.reduce((sum, [, value]) => sum + value.lines.join(" ").split("[?]").length - 1, 0),
        },
      };
    },
  );
}
