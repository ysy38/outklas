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

  it("extraction modules do not import the AI layer", () => {
    const offenders = files("pipeline/extract").filter((file) => imports(file).some((target) => target.includes("/ai/") || target.includes("pipeline/ai")));
    expect(offenders).toEqual([]);
  });

  it("the extract alias never runs analyze, so extraction works with AI disabled", () => {
    const cli = readFileSync(path.join(root, "pipeline/cli.ts"), "utf8");
    expect(cli).toMatch(/extract:\s*\[[^\]]*"validate"/);
    expect(cli).toMatch(/"text-exam":\s*\[[^\]]*"dna-skeleton"/);
    expect(cli).not.toMatch(/extract:\s*\[[^\]]*analyze/);
    expect(cli).not.toMatch(/"text-exam":\s*\[[^\]]*analyze/);
  });

  it("only the Gemini provider talks to the Gemini API and reads no env itself", () => {
    const callers = [...files("src"), ...files("pipeline")].filter((file) => !file.endsWith(".test.ts") && readFileSync(path.join(root, file), "utf8").includes("generativelanguage.googleapis.com"));
    expect(callers).toEqual(["pipeline/ai/gemini.ts"]);
    expect(readFileSync(path.join(root, "pipeline/ai/gemini.ts"), "utf8")).not.toContain("process.env");
  });

  it("model names live only in the central config", () => {
    const offenders = [...files("src"), ...files("pipeline")].filter(
      (file) => file !== "pipeline/ai/config.ts" && file !== "pipeline/ai/smoke.ts" && !file.endsWith(".test.ts") && /["'`](gemini|gemma)-\d/.test(readFileSync(path.join(root, file), "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("question factory logic stays out of UI and routes, and never touches a database", () => {
    const ui = [...files("src/app"), ...files("src/components")].filter((file) => imports(file).some((target) => target.startsWith("@/modules/factory")));
    expect(ui).toEqual([]);
    const domain = files("src/modules/factory").filter((file) => imports(file).some((target) => /^@\/(db|server|app|components)\b/.test(target) || target.includes("pipeline")));
    expect(domain).toEqual([]);
    expect(imports("pipeline/stages/factory.ts").some((target) => target.includes("lib/db") || target.startsWith("@/db"))).toBe(false);
  });

  it("no NEXT_PUBLIC variable carries AI settings", () => {
    const env = readFileSync(path.join(root, ".env.example"), "utf8");
    expect(env).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(GEMINI|AI|MODEL)/);
  });
});
