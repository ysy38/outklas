import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildEditorialView, submitEditorialReview, type EditorialDecision } from "@/modules/factory/editorial-review";
import { currentVersion, isVerifiedHumanReviewer, type CandidateRecord } from "@/modules/factory/review";
import type { difficultyBands } from "@/modules/factory/spec";
type DifficultyBand = (typeof difficultyBands)[number];

const runsRoot = path.join(process.cwd(), ".data/analysis/_factory/runs");

export const firstFiveEditorialQueue = [
  {
    run: "sentence_completion.concession.easy.n8-from2.atomic.v1.gateway-band",
    candidateId: "sentence_completion.concession.easy.004",
  },
  {
    run: "sentence_completion.concession.easy.n8-from2.atomic.v1.gateway-band",
    candidateId: "sentence_completion.concession.easy.006",
  },
  {
    run: "sentence_completion.concession.easy.n8-from2.atomic.v1.gateway-band",
    candidateId: "sentence_completion.concession.easy.007",
  },
  {
    run: "sentence_completion.concession.hard.n10-from212.atomic.v1.gateway-hard-pilot",
    candidateId: "sentence_completion.concession.hard.221",
  },
  {
    run: "sentence_completion.concession.hard.n5-ord252.atomic.v1.gateway-relational-4",
    candidateId: "sentence_completion.concession.hard.260",
  },
] as const;

export type ReviewListItem = {
  run: string;
  candidateId: string;
  version: number;
  status: CandidateRecord["status"];
  judgeVerdict: string;
  verifiedHumanApprove: boolean;
  unverifiedApprove: boolean;
  stem: string;
};

function candidateFilePath(run: string, candidateId: string): string {
  const safeRun = path.basename(run);
  const safeId = path.basename(candidateId);
  return path.join(runsRoot, safeRun, "candidates", `${safeId}.json`);
}

export function listReviewCandidates(): ReviewListItem[] {
  if (!existsSync(runsRoot)) return [];
  const items: ReviewListItem[] = [];
  for (const run of readdirSync(runsRoot).sort()) {
    const dir = path.join(runsRoot, run, "candidates");
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      const record = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as CandidateRecord;
      if (record.spec?.questionType !== "question_type:sentence_completion") continue;
      const latest = currentVersion(record);
      if (!latest) continue;
      const verifiedHumanApprove = record.reviews.some(
        (r) => r.decision === "APPROVE" && r.appliesToVersion === latest.version && isVerifiedHumanReviewer(r.reviewer),
      );
      const unverifiedApprove =
        !verifiedHumanApprove &&
        record.reviews.some((r) => r.decision === "APPROVE" && r.appliesToVersion === latest.version);
      items.push({
        run,
        candidateId: record.id,
        version: latest.version,
        status: record.status,
        judgeVerdict: record.judge?.verdict ?? "NONE",
        verifiedHumanApprove,
        unverifiedApprove,
        stem: latest.candidate.question.stem,
      });
    }
  }
  // Surface items needing human review first: approved without verified human provenance, then pending_review
  return items.sort((a, b) => {
    const rank = (x: ReviewListItem) =>
      x.unverifiedApprove ? 0 : x.status === "approved" && !x.verifiedHumanApprove ? 1 : x.status === "pending_review" ? 2 : x.verifiedHumanApprove ? 3 : 4;
    return rank(a) - rank(b) || a.candidateId.localeCompare(b.candidateId);
  });
}

export function getReviewCandidate(run: string, candidateId: string) {
  const file = candidateFilePath(run, candidateId);
  if (!existsSync(file)) return null;
  const record = JSON.parse(readFileSync(file, "utf8")) as CandidateRecord;
  if (record.id !== candidateId || (record.spec?.id && record.spec.id !== candidateId)) {
    return null;
  }
  return {
    run,
    record,
    view: buildEditorialView(record, `${run}::${record.id}`),
  };
}

export function saveEditorialReview(input: {
  run: string;
  candidateId: string;
  decision: EditorialDecision;
  adminEmail: string;
  notes: string;
  band?: DifficultyBand;
}) {
  const file = candidateFilePath(input.run, input.candidateId);
  if (!existsSync(file)) throw new Error("Aday dosyası bulunamadı.");
  const record = JSON.parse(readFileSync(file, "utf8")) as CandidateRecord;
  if (record.id !== input.candidateId || (record.spec?.id && record.spec.id !== input.candidateId)) {
    throw new Error("Aday ID ile kaynak dosya eşleşmiyor.");
  }
  const result = submitEditorialReview(record, {
    decision: input.decision,
    adminEmail: input.adminEmail,
    notes: input.notes,
    band: input.band,
    sourceKey: `${input.run}::${record.id}`,
  });
  writeFileSync(file, `${JSON.stringify(result.record, null, 2)}\n`);
  return result;
}
