import { cached, sha256, stableJson, storeCached } from "../lib/artifacts";
import type { AIProvider, ModelRequest, ModelResponse } from "./types";

/** Provider, model, prompt version and the full request (images by hash): the same input is never billed twice. */
export function requestHash(provider: string, promptVersion: string, request: ModelRequest): string {
  const parts = request.parts.map((part) => ("text" in part ? part : { image: { mimeType: part.image.mimeType, sha256: sha256(part.image.data) } }));
  return sha256(stableJson({ provider, promptVersion, request: { ...request, parts } }));
}

type Entry = { requestHash: string; provider: string; promptVersion: string; response: ModelResponse; createdAt: string };

export async function cachedGenerate(provider: AIProvider, promptVersion: string, request: ModelRequest) {
  const key = requestHash(provider.name, promptVersion, request);
  const hit = cached<Entry>("ai", key);
  if (hit) return { response: hit.response, requestHash: key, cached: true };
  const response = await provider.generate(request);
  storeCached("ai", key, { requestHash: key, provider: provider.name, promptVersion, response, createdAt: new Date().toISOString() } satisfies Entry);
  return { response, requestHash: key, cached: false };
}
