import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function files(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(relative);
    return /\.(ts|tsx|mts)$/.test(entry.name) ? [relative] : [];
  });
}

const imports = (file: string) => [...readFileSync(path.join(root, file), "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((match) => match[1]);

describe("architecture", () => {
  it("the app never imports the offline pipeline, so AI code cannot reach a client bundle", () => {
    const offenders = files("src").filter((file) => imports(file).some((target) => target.includes("pipeline/") || target.startsWith("@/../pipeline")));
    expect(offenders).toEqual([]);
  });

  it("the pipeline never imports UI or route code", () => {
    const offenders = files("pipeline").filter((file) => imports(file).some((target) => /^@\/(app|components|server)\b/.test(target)));
    expect(offenders).toEqual([]);
  });

  it("only the Gemini provider talks to the Gemini API and reads no env itself", () => {
    const callers = [...files("src"), ...files("pipeline")].filter((file) => !file.endsWith(".test.ts") && readFileSync(path.join(root, file), "utf8").includes("generativelanguage.googleapis.com"));
    expect(callers).toEqual(["pipeline/ai/gemini.ts"]);
    expect(readFileSync(path.join(root, "pipeline/ai/gemini.ts"), "utf8")).not.toContain("process.env");
  });

  it("model names live only in the central config", () => {
    const offenders = [...files("src"), ...files("pipeline")].filter(
      (file) => file !== "pipeline/ai/config.ts" && !file.endsWith(".test.ts") && /["'`](gemini|gemma)-\d/.test(readFileSync(path.join(root, file), "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("no NEXT_PUBLIC variable carries AI settings", () => {
    const env = readFileSync(path.join(root, ".env.example"), "utf8");
    expect(env).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(GEMINI|AI|MODEL)/);
  });
});
