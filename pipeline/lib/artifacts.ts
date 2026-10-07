import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");

export const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : inner,
  );

export type Manifest = {
  document: string;
  stage: string;
  stageVersion: string;
  inputHash: string;
  inputs: Record<string, string>;
  params: unknown;
  code: Record<string, string>;
  outputHash: string;
  files: Record<string, string>;
  stats: Record<string, unknown>;
  warnings: string[];
  createdAt: string;
  durationMs: number;
};

export type StageOutput = {
  files: Record<string, string | Uint8Array>;
  stats?: Record<string, unknown>;
  warnings?: string[];
};

export type StageOptions = {
  document: string;
  stage: string;
  version: string;
  inputs: Record<string, string>;
  params?: unknown;
  /** Source files whose logic shapes the output; editing one changes the input hash. */
  code?: string[];
  /** Immutable stages archive a superseded output instead of replacing it, and refuse to rewrite the same input. */
  immutable?: boolean;
  force?: boolean;
};

export function dataRoot() {
  return process.env.ANALYSIS_DATA_DIR ?? path.join(process.cwd(), ".data/analysis");
}

export const stageDir = (document: string, stage: string) => path.join(dataRoot(), document, stage);

const manifestPath = (document: string, stage: string) => path.join(stageDir(document, stage), "manifest.json");

export function readManifest(document: string, stage: string): Manifest | null {
  const file = manifestPath(document, stage);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Manifest) : null;
}

function intact(manifest: Manifest, dir: string) {
  return Object.entries(manifest.files).every(([name, hash]) => {
    const file = path.join(dir, name);
    return existsSync(file) && sha256(readFileSync(file)) === hash;
  });
}

export const codeHashes = (files: string[] = []) => Object.fromEntries(files.map((file) => [file, sha256(readFileSync(path.join(process.cwd(), file)))]));

export function inputHashOf(options: Pick<StageOptions, "stage" | "version" | "inputs" | "params" | "code">) {
  return sha256(stableJson({ stage: options.stage, version: options.version, inputs: options.inputs, params: options.params ?? null, code: codeHashes(options.code) }));
}

export type StageResult = { manifest: Manifest; cached: boolean };

export async function runStage(options: StageOptions, body: () => Promise<StageOutput>): Promise<StageResult> {
  const dir = stageDir(options.document, options.stage);
  const inputHash = inputHashOf(options);
  const existing = readManifest(options.document, options.stage);
  if (existing && existing.inputHash === inputHash) {
    const ok = intact(existing, dir);
    if (ok && !options.force) return { manifest: existing, cached: true };
    if (!ok && options.immutable && !options.force) {
      throw new Error(`${options.stage} artifact for ${options.document} was modified on disk; refusing to rewrite an immutable stage.`);
    }
  }

  const started = Date.now();
  const output = await body();
  const files = Object.fromEntries(Object.entries(output.files).map(([name, content]) => [name, sha256(content)]));
  const manifest: Manifest = {
    document: options.document,
    stage: options.stage,
    stageVersion: options.version,
    inputHash,
    inputs: options.inputs,
    params: options.params ?? null,
    code: codeHashes(options.code),
    outputHash: sha256(stableJson(files)),
    files,
    stats: output.stats ?? {},
    warnings: output.warnings ?? [],
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - started,
  };

  const temp = `${dir}.tmp-${process.pid}`;
  rmSync(temp, { recursive: true, force: true });
  mkdirSync(temp, { recursive: true });
  for (const [name, content] of Object.entries(output.files)) {
    mkdirSync(path.dirname(path.join(temp, name)), { recursive: true });
    writeFileSync(path.join(temp, name), content);
  }
  writeFileSync(path.join(temp, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (existsSync(dir)) {
    if (options.immutable && existing) renameSync(dir, `${dir}@${existing.inputHash.slice(0, 12)}-${Date.now()}`);
    else rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(path.dirname(dir), { recursive: true });
  renameSync(temp, dir);
  return { manifest, cached: false };
}

export function readArtifact(document: string, stage: string, name: string): string {
  const manifest = readManifest(document, stage);
  if (!manifest) throw new Error(`Run the ${stage} stage for ${document} first.`);
  if (!(name in manifest.files)) throw new Error(`${stage} has no artifact ${name}.`);
  return readFileSync(path.join(stageDir(document, stage), name), "utf8");
}

export function readArtifactBytes(document: string, stage: string, name: string): Buffer {
  return readFileSync(path.join(stageDir(document, stage), name));
}

export const readJson = <T>(document: string, stage: string, name: string): T => JSON.parse(readArtifact(document, stage, name)) as T;

/** Content-addressed cache shared across stages (OCR pages, AI responses). */
export function cached<T>(bucket: string, key: string): T | null {
  const file = path.join(dataRoot(), "cache", bucket, `${key}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : null;
}

export function storeCached(bucket: string, key: string, value: unknown) {
  const dir = path.join(dataRoot(), "cache", bucket);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(value));
}
