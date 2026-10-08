import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { distributionCorpus } from "@/modules/analysis/corpus";
import type { DnaQuestion } from "@/modules/analysis/dna";
import { optionLabels } from "@/modules/analysis/contract";
import { itemText } from "@/modules/analysis/validate";
import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { generatedQuestionCandidate } from "@/modules/factory/candidate";
import { familyBlueprints } from "@/modules/factory/families";
import { judgeDecision } from "@/modules/factory/judge";
import { buildExamProfile, type YdsExamProfile } from "@/modules/factory/profile";
import { provenance as provenanceSchema, type Provenance } from "@/modules/factory/provenance";
import { applyReview, initialStatus, reviewDecisions, type CandidateRecord, type ReviewDecision } from "@/modules/factory/review";
import { buildQuestionSpec } from "@/modules/factory/spec-engine";
import type { QuestionSpec } from "@/modules/factory/spec";
import { originalityIndex, validateCandidate, type OriginalityIndex, type Sibling } from "@/modules/factory/validator";
import { dnaVersion, factoryVersions } from "@/modules/factory/versions";
import { loadAIConfig } from "../ai/config";
import { generatorPromptVersion } from "../ai/prompts/generator.v2";
import { judgePromptVersion } from "../ai/prompts/judge.v1";
import { solvePromptVersion } from "../ai/prompts/verifier.v1";
import { createAIService, JudgeNotIndependent } from "../ai/service";
import type { AIService } from "../ai/types";
import { dataRoot, readJson, readManifest } from "../lib/artifacts";
import { mapLimit } from "../lib/limit";
import { assertTextFree } from "../lib/text-free";

/** Hard ceiling until bulk generation is approved: the factory only runs vertical slices. */
export const sliceLimit = 20;

const factoryRoot = () => path.join(dataRoot(), "_factory");
const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

function loadDnaRows(): DnaQuestion[] {
  return distributionCorpus.flatMap((slug) => {
    if (!readManifest(slug, "dna")) throw new Error(`DNA missing for ${slug}.`);
    return readJson<{ questions: DnaQuestion[] }>(slug, "dna", "rows.json").questions;
  });
}

/** Text-free YDS exam profile from the four distribution exams. */
export function factoryProfile(): { profile: YdsExamProfile; file: string } {
  const profile = buildExamProfile(loadDnaRows());
  assertTextFree(profile);
  const dir = path.join(factoryRoot(), "profile");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "yds-profile-v1.json");
  writeFileSync(file, json(profile));
  return { profile, file };
}

/** Every reading of every locally reconstructed historical item, reduced to shingles. Used only to reject overlap; never sent to a model. */
function historicalIndex(): { index: OriginalityIndex; documents: number; items: number } {
  const texts: string[] = [];
  let documents = 0;
  for (const slug of readdirSync(dataRoot())) {
    const dir = path.join(dataRoot(), slug, "reconstruct");
    if (!existsSync(dir)) continue;
    const readings = readdirSync(dir).filter((name) => /^questions-[a-z]+\.json$/.test(name));
    if (readings.length > 0) documents += 1;
    for (const name of readings) {
      for (const row of JSON.parse(readFileSync(path.join(dir, name), "utf8")) as { question: ReconstructedQuestion }[]) texts.push(itemText(row.question));
    }
  }
  return { index: originalityIndex(texts), documents, items: texts.length };
}

type Failure = { specId: string; stage: "generator" | "judge"; error: string };

function reviewSheet(records: CandidateRecord[], failures: Failure[]): string {
  const lines = ["# Question factory review sheet", "", "Local only. Original generated items; no historical text.", ""];
  for (const record of records) {
    const current = record.versions[record.versions.length - 1];
    const { candidate, validation } = current;
    lines.push(`## ${record.id} — ${record.status}`, "");
    lines.push(`Spec: ${record.spec.questionFamily} · ${record.spec.difficulty.band}/${record.spec.difficulty.cefr} · domain ${record.spec.contextConstraints.domain} · blank ${record.spec.contextConstraints.blankPosition} · key ${record.spec.answerConstraints.correctOption}`);
    lines.push(`Validator: ${validation.status} (${validation.critical} critical, ${validation.warnings} warn) ${validation.issues.map((issue) => `${issue.code}${issue.option ? `@${issue.option}` : ""}`).join(", ")}`);
    if (record.judge) lines.push(`Judge: ${record.judge.verdict} (model ${record.judge.modelVerdict}, blind ${record.judge.blindAnswer}, quality ${record.judge.qualityScore}) failures: ${record.judge.failures.join(", ") || "none"}; concerns: ${record.judge.concerns.join(", ") || "none"}`);
    lines.push("", `**${candidate.question.stem}**`, "");
    for (const label of optionLabels) lines.push(`- ${label}) ${candidate.question.options[label]}${label === candidate.correctOption ? "  ✓" : ""}`);
    lines.push("", `Açıklama: ${candidate.explanation}`, "");
    for (const entry of [...candidate.distractorRationales].sort((a, b) => (a.option < b.option ? -1 : 1))) lines.push(`- ${entry.option} (${entry.distractorType.split(":")[1]}${entry.misconception ? `, ${entry.misconception.split(":")[1]}` : ""}): ${entry.whyWrong}`);
    lines.push("");
  }
  if (failures.length) lines.push("## Failures", "", ...failures.map((failure) => `- ${failure.specId} (${failure.stage}): ${failure.error}`), "");
  return lines.join("\n");
}

export type SliceOptions = { family: string; count: number; band?: QuestionSpec["difficulty"]["band"]; service?: AIService; log?: (message: string) => void };

/** One vertical slice: spec → generate → validate → judge → store for human review. Nothing is written to the question bank. */
export async function factorySlice(options: SliceOptions) {
  const family = familyBlueprints[options.family];
  if (!family) throw new Error(`Unknown family "${options.family}". Known: ${Object.keys(familyBlueprints).join(", ")}`);
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > sliceLimit) throw new Error(`count must be 1–${sliceLimit}; bulk generation is not enabled.`);
  const config = loadAIConfig();
  if (config.models.generator === config.models.judge) throw new JudgeNotIndependent(config.models.judge);
  const service = options.service ?? createAIService(config);
  const log = options.log ?? (() => undefined);

  const { profile } = factoryProfile();
  const specs = Array.from({ length: options.count }, (_, index) => buildQuestionSpec({ profile, family, ordinal: index + 1, band: options.band }));
  const { index, documents, items } = historicalIndex();
  log(`profile ${profile.version}: ${profile.questions} questions; originality index ${index.shingles.size} shingles from ${items} items in ${documents} documents`);

  const failures: Failure[] = [];
  const generated = await mapLimit(specs, 3, async (spec) => {
    try {
      const result = await service.generator.generate(spec);
      log(`generated ${spec.id}${result.cached ? " (cached)" : ""}`);
      return { spec, result };
    } catch (error) {
      failures.push({ specId: spec.id, stage: "generator", error: (error as Error).message.slice(0, 200) });
      return null;
    }
  });

  const records: CandidateRecord[] = [];
  const siblings: Sibling[] = [];
  for (const entry of generated) {
    if (!entry) continue;
    const { spec, result } = entry;
    const candidate = generatedQuestionCandidate.parse(result.value);
    const validation = validateCandidate({ spec, candidate, originality: index, siblings });
    siblings.push({ id: spec.id, stem: candidate.question.stem, options: candidate.question.options });
    let judge = null;
    const hashes: Provenance["requestHashes"] = { generator: result.requestHash, blindSolve: null, judge: null };
    let judgeModel = config.models.judge;
    if (validation.status === "pass") {
      try {
        const evaluation = await service.judge.evaluate(candidate, spec, validation);
        judge = judgeDecision({ spec, validation, judge: { blindAnswer: evaluation.blind.value.answer, blindConfidence: evaluation.blind.value.confidence, report: evaluation.report.value } });
        hashes.blindSolve = evaluation.blind.requestHash;
        hashes.judge = evaluation.report.requestHash;
        judgeModel = evaluation.report.model;
      } catch (error) {
        failures.push({ specId: spec.id, stage: "judge", error: (error as Error).message.slice(0, 200) });
      }
    }
    const provenance = provenanceSchema.parse({
      provider: result.provider,
      generatorModel: result.model,
      judgeModel,
      generatorPromptVersion,
      judgePromptVersion,
      blindSolvePromptVersion: solvePromptVersion,
      questionSpecVersion: spec.version,
      specId: spec.id,
      knowledgeVersion: spec.knowledgeVersion,
      dnaVersion,
      examProfileVersion: profile.version,
      candidateVersion: factoryVersions.candidate,
      validatorVersion: validation.version,
      judgeVersion: factoryVersions.judge,
      originalityVersion: factoryVersions.originality,
      generatedAt: new Date().toISOString(),
      requestHashes: hashes,
      sourceContextIds: spec.evidenceReferences.documents,
    });
    records.push({
      id: spec.id,
      spec,
      versions: [{ version: 1, author: "generator", candidate, validation, createdAt: provenance.generatedAt }],
      judge,
      provenance,
      reviews: [],
      status: initialStatus(validation, judge),
    });
  }

  const runDir = path.join(factoryRoot(), "runs", `${family.id}.${specs[0].difficulty.band}.n${options.count}.${generatorPromptVersion}`);
  mkdirSync(path.join(runDir, "candidates"), { recursive: true });
  for (const record of records) writeFileSync(path.join(runDir, "candidates", `${record.id}.json`), json(record));
  const count = (status: string) => records.filter((record) => record.status === status).length;
  const verdicts = (verdict: string) => records.filter((record) => record.judge?.verdict === verdict).length;
  const summary = {
    family: family.id,
    band: specs[0].difficulty.band,
    requested: options.count,
    generated: records.length,
    validatorPass: records.filter((record) => record.versions[0].validation.status === "pass").length,
    validatorReject: count("validator_rejected"),
    judge: { APPROVE: verdicts("APPROVE"), REVIEW: verdicts("REVIEW"), REJECT: verdicts("REJECT") },
    pendingReview: count("pending_review"),
    failures,
    issueCodes: Object.entries(
      records.flatMap((record) => record.versions[0].validation.issues.map((issue) => `${issue.severity}:${issue.code}`)).reduce<Record<string, number>>((acc, code) => ({ ...acc, [code]: (acc[code] ?? 0) + 1 }), {}),
    ).sort((a, b) => b[1] - a[1]),
    models: { generator: config.models.generator, judge: config.models.judge },
    versions: { ...factoryVersions, generatorPromptVersion, judgePromptVersion, dnaVersion, knowledgeVersion: specs[0].knowledgeVersion },
  };
  writeFileSync(path.join(runDir, "summary.json"), json(summary));
  writeFileSync(path.join(runDir, "review.md"), reviewSheet(records, failures));
  return { runDir, ...summary };
}

/** Records one human decision on a stored candidate. EDIT takes a JSON file with the full edited candidate. */
export function factoryReview(input: { runDir: string; candidateId: string; decision: string; reviewer: string; notes?: string; editFile?: string }) {
  if (!(reviewDecisions as readonly string[]).includes(input.decision)) throw new Error(`decision must be one of ${reviewDecisions.join(", ")}`);
  const file = path.join(input.runDir, "candidates", `${input.candidateId}.json`);
  if (!existsSync(file)) throw new Error(`No candidate ${input.candidateId} in ${input.runDir}`);
  const record = JSON.parse(readFileSync(file, "utf8")) as CandidateRecord;
  let edit;
  if (input.editFile) {
    const candidate = generatedQuestionCandidate.parse(JSON.parse(readFileSync(input.editFile, "utf8")));
    const siblings = readdirSync(path.join(input.runDir, "candidates"))
      .filter((name) => name !== `${input.candidateId}.json`)
      .map((name) => JSON.parse(readFileSync(path.join(input.runDir, "candidates", name), "utf8")) as CandidateRecord)
      .map((other) => ({ id: other.id, stem: other.versions.at(-1)!.candidate.question.stem, options: other.versions.at(-1)!.candidate.question.options }));
    edit = { candidate, validation: validateCandidate({ spec: record.spec, candidate, originality: historicalIndex().index, siblings }) };
  }
  const next = applyReview(record, { decision: input.decision as ReviewDecision, reviewer: input.reviewer, notes: input.notes, at: new Date().toISOString(), edit });
  writeFileSync(file, json(next));
  return { id: next.id, status: next.status, versions: next.versions.length, reviews: next.reviews.length };
}
