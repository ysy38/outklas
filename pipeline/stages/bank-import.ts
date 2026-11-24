import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  importBankCandidates,
  sourceFromFactoryRow,
  type BankImportMode,
  type BankImportReport,
  type BankImportSource,
  type BankWriter,
  type FactoryCandidateRow,
} from "@/modules/factory/bank-import";
import type { CandidateRecord } from "@/modules/factory/review";

function asRecord(value: unknown): CandidateRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as CandidateRecord;
  if (!record.spec || !Array.isArray(record.versions) || !Array.isArray(record.reviews)) return null;
  return record;
}

export function loadBankImportSources(options: { runDir?: string; runsRoot?: string; records?: BankImportSource[] }): BankImportSource[] {
  if (options.records) return options.records;
  const sources: BankImportSource[] = [];
  const runDir = options.runDir;
  if (runDir) {
    const dir = path.join(runDir, "candidates");
    const folder = existsSync(dir) ? dir : runDir;
    if (!existsSync(folder)) throw new Error(`bank import needs candidate JSON in ${runDir}`);
    const runName = path.basename(runDir.replace(/[\\/]+$/, ""));
    for (const name of readdirSync(folder).filter((entry) => entry.endsWith(".json")).sort()) {
      const record = asRecord(JSON.parse(readFileSync(path.join(folder, name), "utf8")));
      if (!record) continue;
      sources.push({ sourceKey: `${runName}::${record.id}`, record });
    }
    return sources;
  }
  const root = options.runsRoot ?? ".data/analysis/_factory/runs";
  if (!existsSync(root)) return sources;
  for (const run of readdirSync(root).sort()) {
    const candidates = path.join(root, run, "candidates");
    if (!existsSync(candidates)) continue;
    sources.push(...loadBankImportSources({ runDir: path.join(root, run) }));
  }
  return sources;
}

export function sourcesFromFactoryRows(rows: FactoryCandidateRow[]): BankImportSource[] {
  return rows.map(sourceFromFactoryRow);
}

export async function runBankImport(options: {
  sources: BankImportSource[];
  mode?: BankImportMode;
  confirmStudentBank?: boolean;
  writer?: BankWriter;
  out?: string;
}): Promise<BankImportReport> {
  const mode: BankImportMode = options.mode ?? "dry-run";
  if (mode === "apply" && !options.confirmStudentBank) {
    throw new Error("factory-bank-import writes the student bank only with --apply --confirm-student-bank");
  }
  const report = await importBankCandidates({
    sources: options.sources,
    mode,
    writer: mode === "apply" ? options.writer : undefined,
  });
  if (options.out) {
    mkdirSync(options.out, { recursive: true });
    writeFileSync(path.join(options.out, "import-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}
