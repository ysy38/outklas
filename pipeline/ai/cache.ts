import { cached, sha256, stableJson, storeCached } from "../lib/artifacts";
import type { AIProvider, ModelRequest, ModelResponse } from "./types";

/**
 * Provider name, model, prompt version, the prompt, temperature, maxOutputTokens, thinking, and JSON schema
 * are the request. `wire` is what the provider adds on the way out (reasoning effort, the token ceiling it actually sends).
 * The same prompt with a different wire does not reuse an older reply. Images are hashed by content.
 */
export function requestHash(provider: string, promptVersion: string, request: ModelRequest, wire?: Record<string, unknown>): string {
  const parts = request.parts.map((part) => ("text" in part ? part : { image: { mimeType: part.image.mimeType, sha256: sha256(part.image.data) } }));
  return sha256(stableJson({ provider, promptVersion, ...(wire ? { wire } : {}), request: { ...request, parts } }));
}

type Entry = { requestHash: string; provider: string; promptVersion: string; response: ModelResponse; createdAt: string };

export async function cachedGenerate(provider: AIProvider, promptVersion: string, request: ModelRequest) {
  const key = requestHash(provider.name, promptVersion, request, provider.wireIdentity?.(request));
  const hit = cached<Entry>("ai", key);
  if (hit) return { response: hit.response, requestHash: key, cached: true };
  const { cacheSalt: _salt, ...sent } = request;
  const response = await provider.generate(sent);
  storeCached("ai", key, { requestHash: key, provider: provider.name, promptVersion, response, createdAt: new Date().toISOString() } satisfies Entry);
  return { response, requestHash: key, cached: false };
}
