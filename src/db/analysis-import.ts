import type { HumanReviewStatus, SourceClass, ValidationStatus } from "@/modules/analysis/acceptance";
import { difficultyDimensions, type DifficultyDimension, type OptionLabel, type QuestionFacet } from "@/modules/analysis/contract";
import type { DnaQuestion } from "@/modules/analysis/dna";
import type { SourceDocument, SourceProvider } from "@/modules/analysis/sources";
import type { StructuralFormat } from "@/modules/analysis/surface";
import type { SectionId } from "@/modules/exam/blueprint";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import type { Query } from "./drift";

export type AnalysisRun = {
  stage: string;
  stageVersion: string;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  schemaVersion: string;
  knowledgeVersion: string;
  inputHash: string;
  outputHash: string | null;
  status: "succeeded" | "partial" | "failed";
  itemCount: number;
  acceptedCount: number;
  reviewCount: number;
  failedCount: number;
  inputTokens: number;
  outputTokens: number;
  startedAt: string;
  finishedAt: string | null;
};

/** Everything the database receives for one analysed document. No item text anywhere in it. */
export type DnaBundle = {
  sources: SourceProvider[];
  sourceDocuments: SourceDocument[];
  document: {
    slug: string;
    exam: string;
    year: number;
    session: string;
    blueprint: string;
    questionCount: number;
    sourceClass: SourceClass;
    usableForDistribution: boolean;
  };
  run: AnalysisRun;
  questions: DnaQuestion[];
  proposals: { type: string; slug: string; name: string; questions: number[] }[];
};

const lit = (value: string | number | boolean | null | undefined): string => {
  if (value == null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replaceAll("'", "''")}'`;
};

const array = (values: string[]) => (values.length ? `ARRAY[${values.map(lit).join(", ")}]::text[]` : "'{}'::text[]");

const values = (rows: string[][]) => rows.map((row) => `(${row.join(", ")})`).join(",\n  ");

const refParts = (value: NodeRef | null) => {
  if (!value) return [lit(null), lit(null)];
  const parsed = parseRef(value);
  return [lit(parsed.type), lit(parsed.slug)];
};

/** Idempotent: re-importing a document replaces its questions (children cascade) and leaves every other document alone. */
export function analysisImportStatements(bundle: DnaBundle): string[] {
  const docId = `(SELECT doc.id FROM analysis.documents doc JOIN analysis.source_documents sd ON sd.id = doc.source_document_id WHERE sd.slug = ${lit(bundle.document.slug)})`;
  const runId = `(SELECT r.id FROM analysis.runs r WHERE r.document_id = ${docId} AND r.stage = ${lit(bundle.run.stage)} AND r.input_hash = ${lit(bundle.run.inputHash)})`;
  const questionJoin = (alias: string) => `JOIN analysis.questions q ON q.document_id = ${docId} AND q.question_number = ${alias}.number`;
  const statements: string[] = [];

  statements.push(`INSERT INTO analysis.sources AS s (slug, name, kind, url, terms_url) VALUES
  ${values(bundle.sources.map((source) => [lit(source.slug), lit(source.name), lit(source.kind), lit(source.url), lit(source.termsUrl)]))}
ON CONFLICT (slug) DO UPDATE SET name = excluded.name, kind = excluded.kind, url = excluded.url, terms_url = excluded.terms_url
WHERE (s.name, s.kind, s.url, s.terms_url) IS DISTINCT FROM (excluded.name, excluded.kind, excluded.url, excluded.terms_url)`);

  statements.push(`INSERT INTO analysis.source_documents AS d (source_id, slug, document_type, title, authors, publication_year, language, content_hash, storage_path, page_count,
  source_type, license_status, license_name, license_url, commercial_use, derivative_use, redistribution_allowed, text_mining_allowed, attribution_required, verified, verified_at, verified_by)
SELECT s.id, v.slug, v.document_type, v.title, v.authors, v.publication_year::smallint, v.language, v.content_hash, v.storage_path, v.page_count::integer,
  v.source_type, v.license_status, v.license_name, v.license_url, v.commercial_use, v.derivative_use, v.redistribution_allowed, v.text_mining_allowed, v.attribution_required, v.verified, v.verified_at::timestamptz, v.verified_by
FROM (VALUES
  ${values(
    bundle.sourceDocuments.map((document) => [
      lit(document.source),
      lit(document.slug),
      lit(document.documentType),
      lit(document.title),
      array(document.authors),
      lit(document.publicationYear ?? null),
      lit(document.language),
      lit(document.sha256),
      lit(`sources/${document.file}`),
      lit(document.pageCount),
      lit(document.license.sourceType),
      lit(document.license.status),
      lit(document.license.name ?? null),
      lit(document.license.url ?? null),
      lit(document.license.commercialUse),
      lit(document.license.derivativeUse),
      lit(document.license.redistributionAllowed),
      lit(document.license.textMiningAllowed),
      lit(document.license.attributionRequired),
      lit(document.license.verified),
      lit(document.license.verifiedAt ?? null),
      lit(document.license.verifiedBy ?? null),
    ]),
  )}
) AS v (source_slug, slug, document_type, title, authors, publication_year, language, content_hash, storage_path, page_count,
  source_type, license_status, license_name, license_url, commercial_use, derivative_use, redistribution_allowed, text_mining_allowed, attribution_required, verified, verified_at, verified_by)
JOIN analysis.sources s ON s.slug = v.source_slug
ON CONFLICT (slug) DO UPDATE SET
  source_id = excluded.source_id, document_type = excluded.document_type, title = excluded.title, authors = excluded.authors, publication_year = excluded.publication_year,
  language = excluded.language, content_hash = excluded.content_hash, storage_path = excluded.storage_path, page_count = excluded.page_count,
  source_type = excluded.source_type, license_status = excluded.license_status, license_name = excluded.license_name, license_url = excluded.license_url,
  commercial_use = excluded.commercial_use, derivative_use = excluded.derivative_use, redistribution_allowed = excluded.redistribution_allowed,
  text_mining_allowed = excluded.text_mining_allowed, attribution_required = excluded.attribution_required, verified = excluded.verified,
  verified_at = excluded.verified_at, verified_by = excluded.verified_by, updated_at = now()
WHERE (d.source_id, d.document_type, d.title, d.authors, d.publication_year, d.language, d.content_hash, d.storage_path, d.page_count, d.source_type, d.license_status,
  d.license_name, d.license_url, d.commercial_use, d.derivative_use, d.redistribution_allowed, d.text_mining_allowed, d.attribution_required, d.verified, d.verified_at, d.verified_by)
IS DISTINCT FROM (excluded.source_id, excluded.document_type, excluded.title, excluded.authors, excluded.publication_year, excluded.language, excluded.content_hash,
  excluded.storage_path, excluded.page_count, excluded.source_type, excluded.license_status, excluded.license_name, excluded.license_url, excluded.commercial_use,
  excluded.derivative_use, excluded.redistribution_allowed, excluded.text_mining_allowed, excluded.attribution_required, excluded.verified, excluded.verified_at, excluded.verified_by)`);

  const doc = bundle.document;
  statements.push(`INSERT INTO analysis.documents AS doc (source_document_id, exam, year, session, blueprint, question_count, source_class, usable_for_distribution)
SELECT sd.id, ${lit(doc.exam)}, ${lit(doc.year)}, ${lit(doc.session)}, ${lit(doc.blueprint)}, ${lit(doc.questionCount)}, ${lit(doc.sourceClass)}, ${lit(doc.usableForDistribution)} FROM analysis.source_documents sd WHERE sd.slug = ${lit(doc.slug)}
ON CONFLICT (source_document_id) DO UPDATE SET exam = excluded.exam, year = excluded.year, session = excluded.session, blueprint = excluded.blueprint, question_count = excluded.question_count, source_class = excluded.source_class, usable_for_distribution = excluded.usable_for_distribution
WHERE (doc.exam, doc.year, doc.session, doc.blueprint, doc.question_count, doc.source_class, doc.usable_for_distribution) IS DISTINCT FROM (excluded.exam, excluded.year, excluded.session, excluded.blueprint, excluded.question_count, excluded.source_class, excluded.usable_for_distribution)`);

  const run = bundle.run;
  statements.push(`INSERT INTO analysis.runs AS r (document_id, stage, stage_version, provider, model, prompt_version, schema_version, knowledge_version, input_hash, output_hash, status,
  item_count, accepted_count, review_count, failed_count, input_tokens, output_tokens, started_at, finished_at)
VALUES (${docId}, ${[run.stage, run.stageVersion, run.provider, run.model, run.promptVersion, run.schemaVersion, run.knowledgeVersion, run.inputHash, run.outputHash, run.status].map(lit).join(", ")},
  ${[run.itemCount, run.acceptedCount, run.reviewCount, run.failedCount, run.inputTokens, run.outputTokens].map(lit).join(", ")}, ${lit(run.startedAt)}::timestamptz, ${lit(run.finishedAt)}::timestamptz)
ON CONFLICT (document_id, stage, input_hash) DO UPDATE SET output_hash = excluded.output_hash, status = excluded.status, item_count = excluded.item_count,
  accepted_count = excluded.accepted_count, review_count = excluded.review_count, failed_count = excluded.failed_count, input_tokens = excluded.input_tokens,
  output_tokens = excluded.output_tokens, started_at = excluded.started_at, finished_at = excluded.finished_at`);

  statements.push(`DELETE FROM analysis.questions WHERE document_id = ${docId}`);
  if (!bundle.questions.length) return [...statements, "DELETE FROM analysis.families f WHERE NOT EXISTS (SELECT 1 FROM analysis.family_members m WHERE m.family_id = f.id)"];

  const questions = [...bundle.questions].sort((a, b) => a.number - b.number);
  statements.push(`INSERT INTO analysis.questions (document_id, run_id, question_number, section, question_type_node_id, translation_direction, answer_position, option_count,
  structural_format, stimulus_key, stimulus_word_count, stem_word_count, option_word_mean, option_word_max, sentence_count, mean_sentence_length, blank_count, text_sha256, confidence,
  extraction_confidence, analysis_confidence, validation_status, human_review_status, validated_by)
SELECT ${docId}, ${runId}, v.number, v.section, n.id, v.direction, v.answer, v.option_count, v.format, v.stimulus_key, v.stimulus_words, v.stem_words, v.option_mean, v.option_max,
  v.sentences, v.sentence_length, v.blanks, v.text_sha256, v.analysis_confidence, v.extraction_confidence, v.analysis_confidence, v.validation_status, v.human_review_status, 'rules'
FROM (VALUES
  ${values(
    questions.map((question) => [
      lit(question.number),
      lit(question.section),
      ...refParts(question.questionType),
      lit(question.translationDirection),
      lit(question.answer),
      lit(question.surface.optionCount),
      lit(question.surface.structuralFormat),
      lit(question.stimulusKey),
      lit(question.surface.stimulusWordCount),
      lit(question.surface.stemWordCount),
      lit(question.surface.optionWordMean),
      lit(question.surface.optionWordMax),
      lit(question.surface.sentenceCount),
      lit(question.surface.meanSentenceLength),
      lit(question.surface.blankCount),
      lit(question.textSha256),
      lit(question.extractionConfidence),
      lit(question.analysisConfidence),
      lit(question.validationStatus),
      lit(question.humanReviewStatus),
    ]),
  )}
) AS v (number, section, type_type, type_slug, direction, answer, option_count, format, stimulus_key, stimulus_words, stem_words, option_mean, option_max, sentences, sentence_length, blanks, text_sha256, extraction_confidence, analysis_confidence, validation_status, human_review_status)
JOIN knowledge_nodes n ON n.node_type = v.type_type AND n.slug = v.type_slug`);

  statements.push(`INSERT INTO analysis.question_features (question_id, ${difficultyDimensions.join(", ")}, cognitive_demand, transfer_requirement)
SELECT q.id, ${difficultyDimensions.map((dimension) => `v.${dimension}`).join(", ")}, v.cognitive_demand, v.transfer_requirement
FROM (VALUES
  ${values(questions.map((question) => [lit(question.number), ...difficultyDimensions.map((dimension) => lit(question.difficulty[dimension])), lit(question.cognitiveDemand), lit(question.transferRequirement)]))}
) AS v (number, ${difficultyDimensions.join(", ")}, cognitive_demand, transfer_requirement)
${questionJoin("v")}`);

  const nodeRows = questions.flatMap((question) =>
    [...new Set(question.nodes.map((node) => node.facet))].map((facet) => {
      const refs = question.nodes.filter((node) => node.facet === facet).sort((a, b) => a.rank - b.rank);
      if (refs.some((node, index) => node.rank !== index)) throw new Error(`Question ${question.number}: ${facet} ranks must run 0..n-1.`);
      return [lit(question.number), lit(facet), array(refs.map((node) => node.ref))];
    }),
  );
  if (nodeRows.length) {
    statements.push(`INSERT INTO analysis.question_nodes (question_id, facet, node_id, rank)
SELECT q.id, v.facet, n.id, r.ord - 1
FROM (VALUES
  ${values(nodeRows)}
) AS v (number, facet, refs)
CROSS JOIN LATERAL unnest(v.refs) WITH ORDINALITY AS r (ref, ord)
${questionJoin("v")}
JOIN knowledge_nodes n ON n.node_type = split_part(r.ref, ':', 1) AND n.slug = split_part(r.ref, ':', 2)
ON CONFLICT DO NOTHING`);
  }

  const distractorRows = questions.flatMap((question) =>
    question.distractors.map((entry) => [lit(question.number), lit(entry.position), lit(entry.type), lit(entry.expresses), lit(entry.targeted), lit(entry.misconception)]),
  );
  if (distractorRows.length) {
    const node = (alias: string, column: string) => `knowledge_nodes ${alias} ON ${alias}.node_type = split_part(v.${column}, ':', 1) AND ${alias}.slug = split_part(v.${column}, ':', 2)`;
    statements.push(`INSERT INTO analysis.distractors (question_id, position, distractor_type_node_id, expresses_node_id, targeted_node_id, misconception_node_id)
SELECT q.id, v.position, t.id, e.id, g.id, m.id
FROM (VALUES
  ${values(distractorRows)}
) AS v (number, position, type, expresses, targeted, misconception)
${questionJoin("v")}
JOIN ${node("t", "type")}
LEFT JOIN ${node("e", "expresses")}
LEFT JOIN ${node("g", "targeted")}
LEFT JOIN ${node("m", "misconception")}`);
  }

  const familyRows = questions.flatMap((question) =>
    [...new Set(question.nodes.filter((node) => node.facet === "primary_concept").map((node) => node.ref))].map((primary) => [lit(question.number), lit(primary)]),
  );
  if (familyRows.length) {
    const primaryJoin = "JOIN knowledge_nodes n ON n.node_type = split_part(v.ref, ':', 1) AND n.slug = split_part(v.ref, ':', 2)";
    statements.push(`INSERT INTO analysis.families (primary_node_id)
SELECT DISTINCT n.id FROM (VALUES
  ${values(familyRows)}
) AS v (number, ref)
${primaryJoin}
ON CONFLICT (primary_node_id) DO NOTHING`);
    statements.push(`INSERT INTO analysis.family_members (family_id, question_id)
SELECT f.id, q.id FROM (VALUES
  ${values(familyRows)}
) AS v (number, ref)
${primaryJoin}
JOIN analysis.families f ON f.primary_node_id = n.id
${questionJoin("v")}
ON CONFLICT DO NOTHING`);
  }
  statements.push("DELETE FROM analysis.families f WHERE NOT EXISTS (SELECT 1 FROM analysis.family_members m WHERE m.family_id = f.id)");

  if (bundle.proposals.length) {
    statements.push(`INSERT INTO analysis.node_proposals (node_type, slug, name, first_seen_run_id)
SELECT v.node_type, v.slug, v.name, ${runId} FROM (VALUES
  ${values(bundle.proposals.map((proposal) => [lit(proposal.type), lit(proposal.slug), lit(proposal.name)]))}
) AS v (node_type, slug, name)
ON CONFLICT (node_type, slug) DO NOTHING`);
    const links = bundle.proposals.flatMap((proposal) => proposal.questions.map((number) => [lit(number), lit(proposal.type), lit(proposal.slug)]));
    if (links.length) {
      statements.push(`INSERT INTO analysis.question_proposals (question_id, proposal_id)
SELECT q.id, p.id FROM (VALUES
  ${values(links)}
) AS v (number, node_type, slug)
${questionJoin("v")}
JOIN analysis.node_proposals p ON p.node_type = v.node_type AND p.slug = v.slug
ON CONFLICT DO NOTHING`);
    }
  }
  return statements;
}

type QuestionRow = {
  number: number;
  section: SectionId;
  question_type: NodeRef;
  translation_direction: "en_tr" | "tr_en" | null;
  answer_position: OptionLabel;
  stimulus_key: string | null;
  text_sha256: string;
  option_count: number;
  structural_format: StructuralFormat;
  stimulus_word_count: number;
  stem_word_count: number;
  option_word_mean: string;
  option_word_max: number;
  sentence_count: number;
  mean_sentence_length: string;
  blank_count: number;
  confidence: string;
  extraction_confidence: string;
  analysis_confidence: string;
  validation_status: ValidationStatus;
  human_review_status: HumanReviewStatus;
  source_class: SourceClass;
  cognitive_demand: string;
  transfer_requirement: string;
} & Record<DifficultyDimension, string>;

/** Reads a document's DNA back from the database, in the shape the miner and the report use. */
export async function readDnaQuestions(query: Query, documentSlug: string): Promise<DnaQuestion[]> {
  const where = "sd.slug = $1";
  const from = `analysis.questions q JOIN analysis.documents doc ON doc.id = q.document_id JOIN analysis.source_documents sd ON sd.id = doc.source_document_id`;
  const rows = await query<QuestionRow>(
    `select q.question_number as number, q.section, t.node_type || ':' || t.slug as question_type, q.translation_direction, q.answer_position, q.stimulus_key, q.text_sha256,
       q.option_count, q.structural_format, q.stimulus_word_count, q.stem_word_count, q.option_word_mean::text, q.option_word_max, q.sentence_count,
       q.mean_sentence_length::text, q.blank_count, q.confidence::text, q.extraction_confidence::text, q.analysis_confidence::text, q.validation_status, q.human_review_status,
       doc.source_class, f.cognitive_demand, f.transfer_requirement,
       ${difficultyDimensions.map((dimension) => `f.${dimension}::text`).join(", ")}
     from ${from} JOIN knowledge_nodes t ON t.id = q.question_type_node_id JOIN analysis.question_features f ON f.question_id = q.id
     where ${where} order by q.question_number`,
    [documentSlug],
  );
  const nodes = await query<{ number: number; facet: QuestionFacet; ref: NodeRef; rank: number }>(
    `select q.question_number as number, qn.facet, n.node_type || ':' || n.slug as ref, qn.rank
     from ${from} JOIN analysis.question_nodes qn ON qn.question_id = q.id JOIN knowledge_nodes n ON n.id = qn.node_id
     where ${where} order by q.question_number, qn.facet, qn.rank, ref`,
    [documentSlug],
  );
  const distractors = await query<{ number: number; position: OptionLabel; type: NodeRef; expresses: NodeRef | null; targeted: NodeRef | null; misconception: NodeRef | null }>(
    `select q.question_number as number, d.position, t.node_type || ':' || t.slug as type,
       e.node_type || ':' || e.slug as expresses, g.node_type || ':' || g.slug as targeted, m.node_type || ':' || m.slug as misconception
     from ${from} JOIN analysis.distractors d ON d.question_id = q.id JOIN knowledge_nodes t ON t.id = d.distractor_type_node_id
       LEFT JOIN knowledge_nodes e ON e.id = d.expresses_node_id LEFT JOIN knowledge_nodes g ON g.id = d.targeted_node_id LEFT JOIN knowledge_nodes m ON m.id = d.misconception_node_id
     where ${where} order by q.question_number, d.position`,
    [documentSlug],
  );
  const proposals = await query<{ number: number; type: string; slug: string }>(
    `select q.question_number as number, p.node_type as type, p.slug
     from ${from} JOIN analysis.question_proposals qp ON qp.question_id = q.id JOIN analysis.node_proposals p ON p.id = qp.proposal_id
     where ${where} order by q.question_number, p.node_type, p.slug`,
    [documentSlug],
  );
  return rows.map((row) => ({
    document: documentSlug,
    number: row.number,
    section: row.section,
    questionType: row.question_type,
    translationDirection: row.translation_direction,
    answer: row.answer_position,
    stimulusKey: row.stimulus_key,
    textSha256: row.text_sha256,
    surface: {
      optionCount: row.option_count,
      structuralFormat: row.structural_format,
      stimulusWordCount: row.stimulus_word_count,
      stemWordCount: row.stem_word_count,
      optionWordMean: Number(row.option_word_mean),
      optionWordMax: row.option_word_max,
      sentenceCount: row.sentence_count,
      meanSentenceLength: Number(row.mean_sentence_length),
      blankCount: row.blank_count,
    },
    difficulty: Object.fromEntries(difficultyDimensions.map((dimension) => [dimension, Number(row[dimension])])) as Record<DifficultyDimension, number>,
    cognitiveDemand: row.cognitive_demand,
    transferRequirement: row.transfer_requirement,
    confidence: Number(row.analysis_confidence ?? row.confidence),
    extractionConfidence: Number(row.extraction_confidence),
    analysisConfidence: Number(row.analysis_confidence ?? row.confidence),
    validationStatus: row.validation_status,
    humanReviewStatus: row.human_review_status,
    sourceClass: row.source_class,
    nodes: nodes.filter((node) => node.number === row.number).map(({ facet, ref, rank }) => ({ facet, ref, rank })),
    distractors: distractors.filter((entry) => entry.number === row.number).map(({ number: _number, ...entry }) => entry),
    proposals: proposals.filter((entry) => entry.number === row.number).map(({ type, slug }) => ({ type, slug })),
  }));
}
