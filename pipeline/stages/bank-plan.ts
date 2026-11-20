import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { OptionLabel } from "@/modules/analysis/contract";
import type { CandidateRecord } from "@/modules/factory/review";

/**
 * Dry-run plan for moving human-APPROVED factory items toward the bank.
 * Reads ratings + key + candidate files. Writes a manifest. Never touches the database or the live bank.
 */

const parseCsv = (file: string) => {
  const [header, ...lines] = readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.trim());
  const columns = header.split(",");
  return lines.map((line) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (quoted) {
        if (char === '"' && line[i + 1] === '"') (current += '"'), i++;
        else if (char === '"') quoted = false;
        else current += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") cells.push(current), (current = "");
      else current += char;
    }
    cells.push(current);
    return Object.fromEntries(columns.map((column, index) => [column, (cells[index] ?? "").trim()]));
  });
};

export type BankPlanRow = {
  blindId: string;
  overall: string;
  specId: string;
  run: string;
  status: string;
  key: OptionLabel;
  stem: string;
  eligible: boolean;
  block: string | null;
};

export function planBankImport(options: { blindDir: string; runsRoot?: string; out: string }) {
  const keyFile = path.join(options.blindDir, "key.json");
  const ratingsFile = path.join(options.blindDir, "ratings.csv");
  if (!existsSync(keyFile) || !existsSync(ratingsFile)) throw new Error(`bank plan needs key.json and ratings.csv in ${options.blindDir}`);
  const key = JSON.parse(readFileSync(keyFile, "utf8")) as { items: Record<string, { run: string; specId: string; key: OptionLabel }> };
  const ratings = new Map(parseCsv(ratingsFile).map((row) => [row.blind_id, row]));
  const runsRoot = options.runsRoot ?? ".data/analysis/_factory/runs";
  const rows: BankPlanRow[] = [];

  for (const [blindId, item] of Object.entries(key.items)) {
    const rating = ratings.get(blindId);
    const overall = (rating?.overall ?? "").toUpperCase();
    const candidatePath = path.join(runsRoot, item.run, "candidates", `${item.specId}.json`);
    if (!existsSync(candidatePath)) {
      rows.push({ blindId, overall, specId: item.specId, run: item.run, status: "missing", key: item.key, stem: "", eligible: false, block: "candidate file missing" });
      continue;
    }
    const record = JSON.parse(readFileSync(candidatePath, "utf8")) as CandidateRecord;
    const stem = record.versions.at(-1)?.candidate.question.stem ?? "";
    const approved = overall === "APPROVE";
    const humanReview = record.reviews.some((review) => review.decision === "APPROVE");
    rows.push({
      blindId,
      overall: overall || "unrated",
      specId: item.specId,
      run: item.run,
      status: record.status,
      key: item.key,
      stem,
      eligible: approved,
      block: approved ? (humanReview ? null : "eligible for staging; human APPROVE review row not written yet (dry-run does not write it)") : `overall is ${overall || "blank"}`,
    });
  }

  const eligible = rows.filter((row) => row.eligible);
  const plan = {
    at: new Date().toISOString(),
    blindDir: options.blindDir,
    mode: "dry-run",
    writes: 0,
    note: "No database write and no live-bank insert. Next step, only after you confirm: record APPROVE reviews, upsert factory.*, then factory-bank-import --apply.",
    counts: {
      items: rows.length,
      approve: eligible.length,
      edit: rows.filter((row) => row.overall === "EDIT").length,
      reject: rows.filter((row) => row.overall === "REJECT").length,
      other: rows.filter((row) => !["APPROVE", "EDIT", "REJECT"].includes(row.overall)).length,
    },
    eligible: eligible.map(({ blindId, specId, run, key, stem }) => ({ blindId, specId, run, key, stem })),
    held: rows.filter((row) => !row.eligible).map(({ blindId, overall, block }) => ({ blindId, overall, block })),
  };
  mkdirSync(options.out, { recursive: true });
  writeFileSync(path.join(options.out, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  const lines = [
    "# Bank import plan (dry-run)",
    "",
    `At: ${plan.at}`,
    `APPROVE ${plan.counts.approve} · EDIT ${plan.counts.edit} · REJECT ${plan.counts.reject}`,
    "",
    "No rows were written.",
    "",
    "## Eligible",
    ...eligible.map((row) => `- ${row.blindId} \`${row.specId}\` key ${row.key}`),
    "",
    "## Held back",
    ...plan.held.map((row) => `- ${row.blindId} ${row.overall}: ${row.block}`),
  ];
  writeFileSync(path.join(options.out, "plan.md"), `${lines.join("\n")}\n`);
  return plan;
}
