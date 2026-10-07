-- Question-level acceptance: partial exams and topic slices are first-class;
-- confidence is split; topic slices must never be mistaken for a YDS distribution.
-- RLS stays on. No policies. No client grants. Phase 1 knowledge graph is untouched.

ALTER TABLE analysis.documents
  ADD COLUMN IF NOT EXISTS source_class text,
  ADD COLUMN IF NOT EXISTS usable_for_distribution boolean;

ALTER TABLE analysis.documents DROP CONSTRAINT IF EXISTS analysis_documents_source_class_check;
ALTER TABLE analysis.documents ADD CONSTRAINT analysis_documents_source_class_check
  CHECK (source_class IN ('complete_exam','partial_exam','topic_slice','unusable'));

ALTER TABLE analysis.documents DROP CONSTRAINT IF EXISTS analysis_documents_year_check;
ALTER TABLE analysis.documents ADD CONSTRAINT analysis_documents_year_check
  CHECK (year = 0 OR year BETWEEN 2000 AND 2100);

ALTER TABLE analysis.documents DROP CONSTRAINT IF EXISTS analysis_documents_distribution_check;
ALTER TABLE analysis.documents ADD CONSTRAINT analysis_documents_distribution_check
  CHECK (
    (source_class IN ('complete_exam','partial_exam') AND usable_for_distribution)
    OR (source_class IN ('topic_slice','unusable') AND NOT usable_for_distribution)
  );

ALTER TABLE analysis.questions
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS analysis_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS validation_status text,
  ADD COLUMN IF NOT EXISTS human_review_status text;

UPDATE analysis.questions
SET
  extraction_confidence = COALESCE(extraction_confidence, 1),
  analysis_confidence = COALESCE(analysis_confidence, confidence),
  validation_status = COALESCE(validation_status, 'accepted'),
  human_review_status = COALESCE(human_review_status, 'unreviewed');

ALTER TABLE analysis.questions
  ALTER COLUMN extraction_confidence SET NOT NULL,
  ALTER COLUMN analysis_confidence SET NOT NULL,
  ALTER COLUMN validation_status SET NOT NULL,
  ALTER COLUMN human_review_status SET NOT NULL;

ALTER TABLE analysis.questions DROP CONSTRAINT IF EXISTS analysis_questions_extraction_confidence_check;
ALTER TABLE analysis.questions ADD CONSTRAINT analysis_questions_extraction_confidence_check
  CHECK (extraction_confidence BETWEEN 0 AND 1);
ALTER TABLE analysis.questions DROP CONSTRAINT IF EXISTS analysis_questions_analysis_confidence_check;
ALTER TABLE analysis.questions ADD CONSTRAINT analysis_questions_analysis_confidence_check
  CHECK (analysis_confidence BETWEEN 0 AND 1);
ALTER TABLE analysis.questions DROP CONSTRAINT IF EXISTS analysis_questions_validation_status_check;
ALTER TABLE analysis.questions ADD CONSTRAINT analysis_questions_validation_status_check
  CHECK (validation_status IN ('accepted','needs_review','failed'));
ALTER TABLE analysis.questions DROP CONSTRAINT IF EXISTS analysis_questions_human_review_status_check;
ALTER TABLE analysis.questions ADD CONSTRAINT analysis_questions_human_review_status_check
  CHECK (human_review_status IN ('unreviewed','approved','rejected') AND char_length(human_review_status) <= 16);
ALTER TABLE analysis.questions DROP CONSTRAINT IF EXISTS analysis_questions_validation_status_len;
ALTER TABLE analysis.questions ADD CONSTRAINT analysis_questions_validation_status_len
  CHECK (char_length(validation_status) <= 16);

UPDATE analysis.documents SET source_class = COALESCE(source_class, 'complete_exam'), usable_for_distribution = COALESCE(usable_for_distribution, true);

ALTER TABLE analysis.documents
  ALTER COLUMN source_class SET NOT NULL,
  ALTER COLUMN usable_for_distribution SET NOT NULL;
