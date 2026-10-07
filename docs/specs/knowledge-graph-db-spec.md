# YDS INTELLIGENCE
## Knowledge Graph, Taxonomy & Supabase/Drizzle Database Specification v1.0

**Status:** Implementation Specification  
**Audience:** Cursor / Engineering Agent  
**Stack:** TypeScript + PostgreSQL + Supabase + Drizzle ORM  
**Primary Objective:** YDS'nin bilgisini, soru yapısını ve öğrencinin öğrenme durumunu makine tarafından işlenebilir bir modele dönüştürmek.

---

# 1. SYSTEM MISSION

Bu sistem bir soru bankası değildir.

Temel ürün:

> Öğrencinin hedef puanına ulaşması için bir sonraki en faydalı öğrenme adımını belirleyen adaptif öğrenme motorudur.

Bunun veri altyapısı üç ayrı fakat birbirine bağlı graph'tan oluşur:

```text
                    KNOWLEDGE GRAPH
                          │
                          ▼
                    QUESTION GRAPH
                          │
                          ▼
                     LEARNER GRAPH
                          │
                          ▼
                   ADAPTIVE ENGINE
                          │
                          ▼
                NEXT BEST LEARNING ACTION
```

Sistem şu dört şeyi aynı anda bilmelidir:

1. YDS neyi ölçüyor?
2. Her soru hangi bilgiyi/skill'i ölçüyor?
3. Öğrenci hangi bilgiyi ne seviyede biliyor?
4. Öğrenci için sıradaki en verimli öğrenme aksiyonu ne?

---

# 2. CORE ARCHITECTURE

```text
┌───────────────────────────────────────────────┐
│                    SOURCES                    │
│                                               │
│  YDS / e-YDS / YÖKDİL / Academic / Grammar   │
│  Vocabulary / Linguistics / Research          │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              SOURCE ANALYZER                   │
│                                               │
│  question decomposition                       │
│  concept extraction                            │
│  skill extraction                              │
│  distractor analysis                           │
│  difficulty analysis                           │
│  misconception detection                       │
│  discourse analysis                            │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                KNOWLEDGE GRAPH                 │
│                                               │
│ Concepts / Skills / Grammar / Vocabulary      │
│ Discourse / Misconceptions / Topics           │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                 QUESTION GRAPH                 │
│                                               │
│ Questions / Options / Families / Distractors  │
│ Difficulty / Quality / Provenance             │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                  LEARNER GRAPH                 │
│                                               │
│ Mastery / Evidence / Errors / Attempts       │
│ Goals / Retention / Confidence                │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                ADAPTIVE ENGINE                 │
│                                               │
│ next-best-question                            │
│ next-best-review                              │
│ next-best-lesson                              │
│ next-best-vocabulary                          │
│ next-best-study-task                          │
└───────────────────────────────────────────────┘
```

---

# 3. TECHNOLOGY DECISIONS

## 3.1 Database

Use:

- PostgreSQL
- Supabase
- pgvector when semantic search is required

Do NOT introduce Neo4j or another graph database in v1.

The knowledge graph will initially be represented using relational PostgreSQL tables.

---

# 4. DRIZZLE ARCHITECTURE

Drizzle is the application's type-safe database layer.

Architecture:

```text
UI
 ↓
Application Service
 ↓
Domain Service
 ↓
Repository
 ↓
Drizzle
 ↓
PostgreSQL / Supabase
```

Never:

```text
React Component
 ↓
Drizzle
```

Never place business logic in UI components.

Never place adaptive logic inside database queries.

Never scatter raw SQL throughout the application.

---

# 5. DATABASE DIRECTORY STRUCTURE

Create:

```text
src/
├── db/
│   ├── index.ts
│   ├── schema/
│   │   ├── enums.ts
│   │   ├── exams.ts
│   │   ├── taxonomy.ts
│   │   ├── knowledge.ts
│   │   ├── questions.ts
│   │   ├── learners.ts
│   │   ├── attempts.ts
│   │   ├── mastery.ts
│   │   ├── adaptive.ts
│   │   └── sources.ts
│   ├── relations.ts
│   └── index.ts
│
├── repositories/
│   ├── question-repository.ts
│   ├── knowledge-repository.ts
│   ├── learner-repository.ts
│   ├── mastery-repository.ts
│   └── attempt-repository.ts
│
└── domain/
    ├── knowledge/
    ├── questions/
    ├── learner/
    └── adaptive/
```

Migration:

```text
drizzle/
├── migrations/
└── meta/
```

---

# 6. DATABASE NAMING CONVENTION

Use:

- snake_case in PostgreSQL
- singular conceptual names, plural table names
- UUID primary keys
- timestamptz for dates
- numeric for scores/probabilities
- JSONB only where flexibility is genuinely needed

Example:

```text
learner_mastery
question_concepts
knowledge_edges
learner_evidence
```

Primary IDs:

```sql
id uuid primary key default gen_random_uuid()
```

---

# 7. TAXONOMY

## 7.1 Exam

Examples:

```text
YDS
e-YDS
YÖKDİL
YDT
TOEFL
IELTS
```

The system must not hard-code YDS as the only exam.

---

# 8. QUESTION TYPES

Seed these initial question types:

```text
VOCABULARY
GRAMMAR
SENTENCE_COMPLETION
CLOZE
PARAGRAPH_COMPLETION
TRANSLATION_EN_TR
TRANSLATION_TR_EN
READING_COMPREHENSION
DIALOGUE
CLOSEST_MEANING
IRRELEVANT_SENTENCE
PARAGRAPH_QUESTION
```

Each question type must be extensible.

---

# 9. SKILL TAXONOMY

## Vocabulary

```text
word_meaning
contextual_meaning
synonym
antonym
collocation
phrasal_verb
word_formation
register
polysemy
lexical_distinction
```

## Grammar

```text
tense
aspect
modal
passive
conditional
relative_clause
noun_clause
adverbial_clause
participle
gerund
infinitive
preposition
conjunction
subject_verb_agreement
article
determiner
pronoun
inversion
parallelism
comparison
```

## Reading

```text
main_idea
detail
inference
reference
purpose
tone
attitude
paraphrase
cause_effect
argument_structure
author_position
```

## Discourse

```text
cause
effect
contrast
concession
condition
purpose
addition
sequence
comparison
example
qualification
emphasis
```

## Cognitive Skills

```text
literal_comprehension
inference
semantic_discrimination
paraphrase_recognition
context_integration
logical_relationship
elimination
prediction
evidence_identification
distractor_detection
```

---

# 10. KNOWLEDGE NODE MODEL

The central concept is:

```text
knowledge_nodes
```

A node represents an entity in the YDS knowledge graph.

Examples:

```text
concession
contrast
although
despite
however
past_perfect
relative_clause
inference
main_idea
```

Do not put all knowledge into a single flat vocabulary table.

Use typed knowledge nodes.

---

# 11. KNOWLEDGE NODE TYPES

```text
concept
subconcept
grammar
vocabulary
collocation
discourse_relation
skill
cognitive_skill
topic
misconception
learning_objective
```

---

# 12. KNOWLEDGE NODES TABLE

```sql
knowledge_nodes
----------------
id
node_type
slug
name
description
difficulty_level
status
metadata
created_at
updated_at
```

Constraints:

```text
UNIQUE(node_type, slug)
```

Example:

```json
{
  "id": "...",
  "node_type": "discourse_relation",
  "slug": "concession",
  "name": "Concession",
  "description": "A relationship where an opposing fact is acknowledged.",
  "difficulty_level": "B2",
  "status": "active"
}
```

---

# 13. KNOWLEDGE EDGES

Relationships must be first-class data.

Table:

```text
knowledge_edges
```

Columns:

```text
id
from_node_id
to_node_id
edge_type
weight
confidence
metadata
created_at
```

Example:

```text
concession
  ├── related_to → contrast
  ├── expressed_by → although
  ├── expressed_by → despite
  ├── expressed_by → even_though
  ├── expressed_by → however
  └── prerequisite → clause_structure
```

Initial edge types:

```text
parent_of
child_of
related_to
prerequisite
depends_on
expressed_by
synonym_of
antonym_of
collocates_with
derived_from
often_confused_with
semantic_neighbor
belongs_to_topic
supports
requires
contrasts_with
```

Constraint:

```text
UNIQUE(from_node_id, to_node_id, edge_type)
```

---

# 14. GRAMMAR MUST BE STRUCTURAL

Do not model grammar only as:

```text
grammar = "concession"
```

Instead:

```text
CONCESSION
 ├── although + clause
 ├── even though + clause
 ├── despite + noun/gerund
 ├── in spite of + noun/gerund
 └── however + independent clause
```

The system must know syntactic requirements.

Example metadata:

```json
{
  "pattern": "despite + noun_or_gerund",
  "requires": ["noun_phrase", "gerund_phrase"],
  "cannot_directly_take": ["finite_clause"]
}
```

This allows misconception detection.

---

# 15. VOCABULARY MODEL

Table:

```text
vocabulary_items
```

Columns:

```text
id
lemma
part_of_speech
definition
difficulty_level
frequency_band
register
metadata
created_at
updated_at
```

Relationships must be represented through knowledge_edges.

Example:

```text
abandon
 ├── synonym_of → leave
 ├── synonym_of → forsake
 ├── antonym_of → retain
 ├── belongs_to_topic → behavior
 └── semantic_neighbor → abandonment
```

---

# 16. MISCONCEPTION MODEL

Misconceptions are first-class knowledge objects.

Table:

```text
misconceptions
```

Columns:

```text
id
slug
title
description
severity
status
metadata
created_at
updated_at
```

Example:

```json
{
  "slug": "despite_finite_clause",
  "title": "Using despite directly before a finite clause",
  "description": "Learner incorrectly treats despite as equivalent to although.",
  "severity": "medium"
}
```

Relationships:

```text
misconception
 ↓
related_concept
 ↓
trigger_questions
 ↓
remediation_questions
```

---

# 17. QUESTION MODEL

Questions are knowledge objects, not simple records.

Table:

```text
questions
```

Columns:

```text
id
exam_id
question_type_id
question_family_id
version
status

stem
context
passage

correct_option_id

difficulty_predicted
difficulty_observed

lexical_complexity
syntactic_complexity
semantic_complexity
inference_load
distractor_similarity

quality_score

generation_model
generation_prompt_version
question_spec_version
knowledge_version

source_context_ids
provenance

created_at
updated_at
```

Statuses:

```text
draft
generated
qa_failed
needs_review
approved
retired
```

---

# 18. QUESTION OPTIONS

Table:

```text
question_options
```

Columns:

```text
id
question_id
option_key
option_text
is_correct
distractor_type
distractor_rationale
position
created_at
```

A question must have exactly one correct option.

This should be enforced in application/domain validation.

---

# 19. DISTRACTOR TYPES

Initial taxonomy:

```text
semantic_mismatch
wrong_discourse_relation
grammatical_mismatch
syntactic_mismatch
near_synonym
collocation_failure
scope_mismatch
tense_mismatch
reference_mismatch
logical_incompatibility
part_of_speech_mismatch
register_mismatch
partial_truth
```

Example:

```json
{
  "option": "however",
  "is_correct": false,
  "distractor_type": "wrong_discourse_relation",
  "distractor_rationale": "The sentence requires concession within a subordinate clause."
}
```

---

# 20. QUESTION ↔ KNOWLEDGE

Never store concepts as a JSON array inside `questions`.

Use junction tables.

```text
question_concepts
```

Columns:

```text
question_id
knowledge_node_id
relationship
importance
```

Relationships:

```text
tests
requires
supports
remediates
```

Unique:

```text
(question_id, knowledge_node_id, relationship)
```

---

# 21. QUESTION ↔ SKILL

Table:

```text
question_skills
```

Columns:

```text
question_id
skill_node_id
role
weight
```

Example:

```text
Q100
 ├── tests → concession
 ├── tests → clause_structure
 ├── requires → context_integration
 └── requires → semantic_discrimination
```

---

# 22. QUESTION FAMILY

A question family represents the same underlying learning objective presented through different surfaces.

Example:

```text
CONCESSION FAMILY

Q1 → sentence completion
Q2 → cloze
Q3 → reading
Q4 → paragraph completion
Q5 → vocabulary context
```

The student should not be considered mastered simply because they memorized one question format.

Table:

```text
question_families
```

Columns:

```text
id
slug
name
description
primary_concept_id
created_at
updated_at
```

---

# 23. QUESTION RELATIONSHIPS

Table:

```text
question_edges
```

Types:

```text
similar_to
prerequisite_for
harder_than
easier_than
reinforces
remediates
targets_same_misconception
same_question_family
```

This enables:

```text
Q1
 ↓
student fails
 ↓
find related remediation question
 ↓
adaptive engine selects Q2
```

---

# 24. SOURCE MODEL

Every external source must have provenance.

Tables:

```text
sources
source_documents
source_licenses
```

Sources have types:

```text
owned
licensed
open
reference_only
```

The system must distinguish:

```text
ANALYSIS CORPUS
```

from:

```text
PRODUCTION CONTENT
```

Historical YDS/e-YDS questions may be used as reference/calibration data only subject to legal review and applicable permissions.

Production questions must be original.

---

# 25. SOURCE TABLE

```text
sources
```

Columns:

```text
id
title
author
publisher
url
source_type
license_status
commercial_use
derivative_use
redistribution_allowed
text_mining_allowed
attribution_required
verified
metadata
created_at
updated_at
```

Do not ingest an external source into the production content pipeline until its license status has been verified.

---

# 26. SOURCE DOCUMENTS

```text
source_documents
```

Columns:

```text
id
source_id
document_type
title
content_hash
storage_path
language
publication_year
metadata
created_at
```

The content hash prevents accidental duplicate ingestion.

---

# 27. ANALYSIS CORPUS

Create:

```text
analysis_documents
analysis_questions
analysis_question_features
```

These are NOT production questions.

Their purpose is:

```text
Historical YDS question
        ↓
Analyzer
        ↓
Question decomposition
        ↓
Feature extraction
        ↓
Knowledge Graph
        ↓
Exam blueprint
        ↓
Original Question Generation
```

---

# 28. HISTORICAL QUESTION ANALYSIS

For every reference question extract:

```text
exam
year
session
question_number
question_type
tested_skill
tested_concept
subconcept
grammar
vocabulary
discourse_relation
cognitive_skill
difficulty_estimate
distractor_types
required_knowledge
prerequisites
question_structure
context_length
syntactic_complexity
semantic_complexity
inference_load
ambiguity_risk
```

Also extract:

```text
WHY IS THE CORRECT ANSWER CORRECT?
```

and:

```text
WHY IS EACH DISTRACTOR WRONG?
```

This is essential.

---

# 29. SOURCE ANALYSIS PIPELINE

Implement:

```text
Source
 ↓
Document Parser
 ↓
Question Segmentation
 ↓
Question Type Classifier
 ↓
Question Decomposer
 ↓
Concept Extractor
 ↓
Skill Extractor
 ↓
Grammar Analyzer
 ↓
Vocabulary Analyzer
 ↓
Discourse Analyzer
 ↓
Distractor Analyzer
 ↓
Difficulty Analyzer
 ↓
Misconception Detector
 ↓
Human/AI Validation
 ↓
Knowledge Graph
```

The analyzer must produce structured JSON.

Never rely on free-form AI output.

---

# 30. QUESTION ANALYSIS SCHEMA

Example:

```json
{
  "question_type": "sentence_completion",
  "primary_concept": "concession",
  "secondary_concepts": [
    "clause_structure"
  ],
  "skills": [
    "semantic_discrimination",
    "context_integration"
  ],
  "grammar": [
    "subordinate_clause"
  ],
  "discourse_relation": "concession",
  "cognitive_skill": "logical_relationship",
  "difficulty": {
    "predicted": 0.68,
    "lexical": 0.52,
    "syntactic": 0.61,
    "semantic": 0.72,
    "inference": 0.55
  },
  "distractors": [
    {
      "option": "however",
      "type": "wrong_discourse_relation"
    }
  ],
  "misconceptions": [
    "confusing_concession_and_contrast"
  ]
}
```

---

# 31. QUESTION SPEC

The generator must NEVER directly generate a production question from:

```text
"Create a YDS question."
```

First generate:

```text
QuestionSpec
```

Schema:

```json
{
  "question_type": "sentence_completion",
  "primary_concept": "concession",
  "secondary_concepts": [
    "clause_structure"
  ],
  "target_skill": "semantic_discrimination",
  "cognitive_skill": "logical_relationship",
  "difficulty": "B2",
  "required_knowledge": [
    "concession",
    "clause_structure"
  ],
  "target_misconception": "confusing_concession_and_contrast",
  "distractor_plan": [
    "wrong_discourse_relation",
    "syntactic_mismatch",
    "near_semantic_match"
  ],
  "constraints": {
    "single_correct_answer": true,
    "avoid_unintended_clues": true
  }
}
```

Then:

```text
QuestionSpec
 ↓
Generator
 ↓
Question
```

---

# 32. PRODUCTION QUESTION GENERATION

Pipeline:

```text
1. Select learning objective
2. Select concept
3. Select skill
4. Select difficulty
5. Select cognitive demand
6. Select misconception
7. Create QuestionSpec
8. Generate original context
9. Generate question
10. Generate options
11. Generate explanations
12. Run deterministic validation
13. Run independent AI evaluation
14. Run originality/similarity checks
15. Human review
16. Approve
17. Store
18. Index into Question Graph
```

---

# 33. GENERATION MUST BE ORIGINAL

The generation engine must not:

- copy source sentences
- minimally paraphrase source sentences
- reproduce historical YDS questions
- reproduce distinctive distractors
- reproduce identifiable source wording

It may use:

- topic
- difficulty
- grammar concept
- vocabulary target
- discourse relation
- cognitive skill
- question structure

The generated text must be independently authored.

---

# 34. QUALITY ENGINE

Every generated question passes:

```text
Grammar QA
Semantic QA
Single-answer QA
Distractor QA
Difficulty QA
Ambiguity QA
Unintended-clue QA
Originality QA
YDS-alignment QA
```

Critical failure:

```text
if single_answer == false
    REJECT

if ambiguity_detected == true
    REJECT

if grammar_invalid == true
    REJECT

if originality_risk > threshold
    REJECT
```

A weighted score alone is insufficient.

---

# 35. EXPLANATIONS

Every approved question must have:

```text
why_correct
why_option_A_wrong
why_option_B_wrong
why_option_C_wrong
why_option_D_wrong
why_option_E_wrong
concept_explanation
trap_explanation
transfer_example
```

Example:

```json
{
  "why_correct": "The sentence expresses concession and requires a subordinating conjunction.",
  "why_wrong": {
    "A": "Expresses contrast but does not satisfy the syntactic requirement.",
    "B": "Creates a causal relation.",
    "C": "Requires an independent clause.",
    "D": "Does not establish the required relationship."
  }
}
```

---

# 36. LEARNER MODEL

Table:

```text
learners
```

Columns:

```text
id
auth_user_id
current_level
target_score
exam_date
available_daily_minutes
status
created_at
updated_at
```

Supabase Auth remains the authentication source.

Do not duplicate authentication credentials.

---

# 37. LEARNER GOALS

Table:

```text
learner_goals
```

Columns:

```text
id
learner_id
goal_type
target_value
priority
deadline
status
created_at
updated_at
```

Examples:

```text
target_score = 80
exam_date = ...
daily_time = 30
```

---

# 38. LEARNER MASTERY

This is one of the most important tables.

```text
learner_mastery
```

Columns:

```text
id
learner_id
knowledge_node_id

mastery
confidence

evidence_count

recent_accuracy
long_term_accuracy

success_streak
failure_streak

response_time_avg

forgetting_risk

last_seen_at
last_correct_at
next_review_at

state

model_version

created_at
updated_at
```

State:

```text
unknown
introduced
learning
fragile
developing
proficient
mastered
```

Unique:

```text
(learner_id, knowledge_node_id)
```

---

# 39. MASTERY IS NOT TRUTH WITHOUT EVIDENCE

Never trust:

```text
mastery = 0.72
```

without being able to answer:

```text
Why is mastery 0.72?
```

Therefore every mastery state requires evidence.

---

# 40. LEARNER EVIDENCE

Table:

```text
learner_evidence
```

Columns:

```text
id
learner_id
knowledge_node_id
attempt_id
evidence_type
result
strength
confidence
response_time
created_at
```

Evidence types:

```text
correct_answer
wrong_answer
hint_used
explanation_reviewed
successful_recall
failed_recall
lesson_completed
```

Example:

```json
{
  "learner_id": "...",
  "knowledge_node_id": "concession",
  "attempt_id": "...",
  "evidence_type": "wrong_answer",
  "result": "failure",
  "strength": 0.82,
  "confidence": 0.91
}
```

---

# 41. LEARNER ERRORS

Table:

```text
learner_errors
```

Columns:

```text
id
learner_id
question_id
attempt_id
knowledge_node_id
misconception_id

selected_option
correct_option

error_type
confidence
response_time

created_at
```

Error types:

```text
knowledge_gap
misconception
lexical_confusion
grammar_confusion
discourse_confusion
inference_failure
paraphrase_failure
attention_error
time_pressure
guess
unknown
```

---

# 42. ATTEMPTS

Table:

```text
attempts
```

Columns:

```text
id
learner_id
question_id
session_id

started_at
answered_at

selected_option
is_correct

response_time_ms
confidence

hint_used
explanation_opened

created_at
```

Every attempt is immutable historical evidence.

Do not overwrite old attempts.

---

# 43. EVENTS

Track:

```text
question_started
question_answered
question_skipped
answer_changed
hint_requested
explanation_opened
concept_reviewed
lesson_completed
session_started
session_completed
```

Table:

```text
learner_events
```

Columns:

```text
id
learner_id
event_type
entity_type
entity_id
payload
created_at
```

`payload` may be JSONB.

---

# 44. STUDY SESSIONS

```text
study_sessions
```

Columns:

```text
id
learner_id
started_at
completed_at
duration_seconds
session_type
metadata
```

---

# 45. STUDY TASKS

```text
study_tasks
```

Columns:

```text
id
learner_id
session_id
task_type
target_node_id
question_id
priority
status
reason
scheduled_at
completed_at
metadata
```

The `reason` field is important.

Example:

```json
{
  "reason": {
    "codes": [
      "low_mastery",
      "recent_misconception",
      "target_score_alignment"
    ],
    "human_readable": "Concession structures have been repeatedly confused with contrast."
  }
}
```

---

# 46. ADAPTIVE DECISIONS

Every adaptive decision should be observable.

Table:

```text
adaptive_decisions
```

Columns:

```text
id
learner_id
decision_type
selected_entity_type
selected_entity_id

candidate_count
decision_score

reasons
model_version

created_at
```

Example:

```json
{
  "decision_type": "next_question",
  "selected_entity_type": "question",
  "selected_entity_id": "...",
  "decision_score": 0.87,
  "reasons": [
    "low_mastery_concession",
    "recent_misconception",
    "appropriate_difficulty",
    "goal_alignment"
  ]
}
```

This is essential for debugging the adaptive engine.

---

# 47. ADAPTIVE ENGINE INPUTS

The adaptive engine should use:

```text
learner_mastery
learner_evidence
learner_errors
attempts
learner_goals
question_concepts
question_skills
question difficulty
question families
question edges
retention state
recent exposure
```

---

# 48. ADAPTIVE DECISION

Conceptual scoring:

```text
score =
    learning_gain
  + relevance
  + mastery_gap
  + goal_alignment
  + difficulty_fit
  + retention_need
  + misconception_relevance
  + diversity
  - recent_repetition
  - fatigue
  - overexposure
```

The exact mathematical model can evolve.

Do not hard-code an overly complex ML model in MVP.

---

# 49. NEXT BEST LEARNING ACTION

The engine must not always return:

```text
question
```

It can return:

```text
question
review
mini_lesson
vocabulary_drill
grammar_explanation
contrast_exercise
spaced_recall
reading_passage
mock_test
rest
```

Interface:

```ts
type LearningAction =
  | QuestionAction
  | ReviewAction
  | LessonAction
  | VocabularyDrillAction
  | GrammarExplanationAction
  | RecallAction
  | MockTestAction;
```

---

# 50. POSTGRESQL INDEX STRATEGY

Critical indexes:

```text
learner_mastery
  UNIQUE(learner_id, knowledge_node_id)

learner_evidence
  INDEX(learner_id, knowledge_node_id, created_at)

learner_errors
  INDEX(learner_id, knowledge_node_id, created_at)

learner_errors
  INDEX(learner_id, misconception_id, created_at)

attempts
  INDEX(learner_id, created_at)

attempts
  INDEX(question_id, created_at)

question_concepts
  INDEX(knowledge_node_id, question_id)

question_skills
  INDEX(skill_node_id, question_id)

question_edges
  INDEX(from_question_id, edge_type)

question_edges
  INDEX(to_question_id, edge_type)

knowledge_edges
  INDEX(from_node_id, edge_type)

knowledge_edges
  INDEX(to_node_id, edge_type)

questions
  INDEX(status, question_type_id)

questions
  INDEX(status, difficulty_predicted)
```

Do not add indexes without a query/use-case reason.

---

# 51. JSONB POLICY

Do NOT use JSONB for core relational data.

Bad:

```text
questions.concepts JSONB
questions.skills JSONB
learners.mastery JSONB
```

Good:

```text
question_concepts
question_skills
learner_mastery
learner_evidence
```

Use JSONB for:

```text
AI evaluation results
generation metadata
prompt metadata
provenance metadata
flexible configuration
event payload
experimental model output
```

---

# 52. ENUM STRATEGY

Avoid PostgreSQL enums for rapidly changing domain taxonomies where possible.

Use text + application validation / lookup tables for:

```text
question types
skills
knowledge node types
misconception types
```

This allows the taxonomy to evolve without painful migrations.

Use constrained values where stability is high.

---

# 53. UUID POLICY

All domain entities use UUID.

Do not expose sequential IDs publicly.

Example:

```sql
id uuid primary key default gen_random_uuid()
```

---

# 54. TIMESTAMP POLICY

Use:

```sql
timestamptz
```

Store everything in UTC.

Convert to user's timezone only in UI.

---

# 55. SOFT DELETE / RETIREMENT

Questions must not be physically deleted after being used by learners.

Use:

```text
status = retired
```

Old attempts must remain valid forever.

Question versions:

```text
Q100 v1
Q100 v2
Q100 v3
```

An attempt references the exact question version used.

---

# 56. QUESTION PROVENANCE

Every production question stores:

```text
generated_at
generator_model
prompt_version
question_spec_version
knowledge_version
source_context_ids
evaluation_version
human_review_version
```

This allows us to answer:

> "Why does this question exist?"

---

# 57. CONTENT VERSIONING

Knowledge taxonomy itself must be versioned.

Example:

```text
knowledge_version = 1.0
knowledge_version = 1.1
knowledge_version = 2.0
```

Never silently change the meaning of historical data.

---

# 58. RLS

Supabase Row Level Security must protect learner-owned data.

Students may access only their own:

```text
learners
learner_goals
learner_mastery
learner_evidence
learner_errors
attempts
study_sessions
study_tasks
learner_events
adaptive_decisions
```

Concepts/questions that are intentionally public to authenticated users may be readable.

Content authoring tables must be restricted to authorized staff/service roles.

---

# 59. RLS PRINCIPLE

Example:

```sql
auth.uid() = auth_user_id
```

Never trust a client-supplied:

```text
learner_id
```

without validating ownership.

Server-side services may use privileged access where appropriate.

---

# 60. DRIZZLE CONFIG

Create:

```text
drizzle.config.ts
```

Conceptually:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/**/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

# 61. DATABASE CONNECTION

Create:

```text
src/db/index.ts
```

Use:

```ts
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

export const client = postgres(connectionString, {
  prepare: false,
});

export const db = drizzle(client);
```

If Supabase transaction pooling is used, keep prepared statements disabled.

---

# 62. DRIZZLE SCHEMA STYLE

Example:

```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const knowledgeNodes = pgTable(
  "knowledge_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    nodeType: text("node_type").notNull(),

    slug: text("slug").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    difficultyLevel: text("difficulty_level"),

    status: text("status").notNull().default("active"),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("knowledge_nodes_type_slug_unique").on(
      table.nodeType,
      table.slug,
    ),

    index("knowledge_nodes_type_idx").on(table.nodeType),

    index("knowledge_nodes_status_idx").on(table.status),
  ],
);
```

Use this structure as the pattern for all schema modules.

---

# 63. RELATIONS

Drizzle relations should be defined separately from schema declarations where appropriate.

Example:

```ts
export const learnerMasteryRelations = relations(
  learnerMastery,
  ({ one }) => ({
    learner: one(learners, {
      fields: [learnerMastery.learnerId],
      references: [learners.id],
    }),

    knowledgeNode: one(knowledgeNodes, {
      fields: [learnerMastery.knowledgeNodeId],
      references: [knowledgeNodes.id],
    }),
  }),
);
```

Relations are application query metadata.

Database foreign keys remain the actual integrity mechanism.

---

# 64. MIGRATION POLICY

Development:

```text
schema change
 ↓
drizzle-kit generate
 ↓
review SQL
 ↓
apply migration
```

Never blindly push schema changes to production.

Use migrations as the source of truth.

Do not manually modify production tables outside migration history unless absolutely necessary and documented.

---

# 65. SEED SYSTEM

Create:

```text
src/db/seed/
├── index.ts
├── exams.ts
├── question-types.ts
├── skills.ts
├── knowledge.ts
├── misconceptions.ts
└── discourse.ts
```

Seed order:

```text
1. Exams
2. Question Types
3. Skills
4. Knowledge Nodes
5. Knowledge Edges
6. Misconceptions
7. Question Families
```

Production questions are NOT inserted through generic seed files.

They have their own content ingestion pipeline.

---

# 66. INITIAL SEED

At minimum seed:

```text
Exam:
YDS
e-YDS
YÖKDİL
YDT
```

Question types:

all initial question types defined above.

Knowledge:

```text
vocabulary
grammar
reading
discourse
cognitive skills
```

Discourse:

```text
cause
effect
contrast
concession
condition
purpose
addition
sequence
comparison
example
qualification
emphasis
```

---

# 67. ANALYSIS INGESTION TOOL

Create:

```text
scripts/
├── ingest-source.ts
├── analyze-document.ts
├── analyze-question.ts
├── validate-analysis.ts
└── build-knowledge-graph.ts
```

CLI examples:

```bash
npm run source:ingest
npm run source:analyze
npm run source:validate
npm run knowledge:build
```

---

# 68. ANALYSIS OUTPUT

Every analyzed question should first be written as an immutable analysis artifact.

Example:

```text
analysis/
└── yds/
    └── 2025/
        └── yds-question-001.json
```

Only validated analysis results are imported into the graph.

This prevents a bad AI analysis from silently corrupting the knowledge graph.

---

# 69. ANALYSIS VALIDATION

AI analysis must pass:

```text
Schema validation
Concept validation
Skill validation
Question type validation
Answer validation
Distractor validation
Confidence threshold
```

If confidence is low:

```text
status = needs_review
```

Never automatically insert uncertain analysis into canonical knowledge.

---

# 70. AI ANALYZER CONTRACT

The Analyzer must return structured JSON matching a strict Zod schema.

Example:

```ts
const QuestionAnalysisSchema = z.object({
  questionType: z.string(),
  primaryConcept: z.string(),
  secondaryConcepts: z.array(z.string()),
  skills: z.array(z.string()),
  grammarConcepts: z.array(z.string()),
  vocabularyItems: z.array(z.string()),
  discourseRelations: z.array(z.string()),
  cognitiveSkills: z.array(z.string()),
  misconceptions: z.array(z.string()),
  difficulty: z.object({
    overall: z.number().min(0).max(1),
    lexical: z.number().min(0).max(1),
    syntactic: z.number().min(0).max(1),
    semantic: z.number().min(0).max(1),
    inference: z.number().min(0).max(1),
  }),
});
```

Never trust raw LLM output.

---

# 71. AI ROLE SEPARATION

Use separate logical AI roles:

```text
Analyzer
Generator
Evaluator
Verifier
Explainer
Tutor
```

Even if the same underlying model is used, their prompts and responsibilities must be separated.

Never let:

```text
Generator
```

be the sole evaluator of its own question.

---

# 72. QUESTION QUALITY PIPELINE

```text
Generator
    ↓
Deterministic Validator
    ↓
Independent AI Evaluator
    ↓
Originality Check
    ↓
Ambiguity Check
    ↓
Human Review
    ↓
Approved
```

---

# 73. HUMAN REVIEW UI

Admin question page should display:

```text
Question
Correct Answer
All Options

Why Correct
Why Others Wrong

Concepts
Skills
Grammar
Vocabulary
Discourse
Misconceptions

Difficulty

Source Context
Provenance

AI Evaluation

Similarity / Originality

Related Questions
Question Family
```

Reviewer actions:

```text
Approve
Reject
Request Revision
Edit
Retag
Change Difficulty
Retire
```

---

# 74. QUESTION GENERATION DATA FLOW

The system should eventually work like this:

```text
Knowledge Graph
      +
Exam Blueprint
      +
Question Family
      +
Target Learner Gap
      +
QuestionSpec
      ↓
Original Question Generator
      ↓
Question
      ↓
Quality Engine
      ↓
Question Graph
```

---

# 75. EXAM BLUEPRINT

The historical analysis corpus should eventually produce an exam blueprint.

Example:

```json
{
  "exam": "YDS",
  "question_distribution": {
    "vocabulary": 6,
    "grammar": 10,
    "cloze": 10,
    "sentence_completion": 10,
    "translation": 6,
    "reading": 20
  },
  "concept_distribution": {
    "concession": 0.08,
    "contrast": 0.07
  }
}
```

These numbers must be empirically derived from analyzed data.

Do not invent them as hard-coded assumptions.

---

# 76. YDS DECOMPOSITION GOAL

The source analysis system must eventually answer:

### What does YDS measure?

Not merely:

```text
Question 17 = grammar
```

But:

```text
Question 17
 ↓
grammar
 ↓
relative clause
 ↓
reduced relative clause
 ↓
participle structure
 ↓
syntactic parsing
 ↓
context integration
 ↓
specific distractor pattern
```

This is the level of decomposition required.

---

# 77. EXAMPLE ANALYSIS

A historical question may produce:

```text
Question
 ├── type: sentence_completion
 │
 ├── concept:
 │     └── concession
 │
 ├── grammar:
 │     └── subordinate_clause
 │
 ├── discourse:
 │     └── concession
 │
 ├── cognitive:
 │     └── logical_relationship
 │
 ├── skill:
 │     ├── context_integration
 │     └── semantic_discrimination
 │
 ├── misconception:
 │     └── concession_vs_contrast
 │
 └── distractors:
       ├── wrong_discourse_relation
       ├── syntactic_mismatch
       └── near_semantic_match
```

This is much more valuable than simply storing the question.

---

# 78. ADAPTIVE EXAMPLE

Suppose student data:

```text
concession mastery = 0.61
contrast mastery = 0.84

recent errors:
3

misconception:
concession_vs_contrast

question family exposure:
sentence_completion = high
reading = low
```

Adaptive engine should NOT simply give another sentence completion question.

Instead:

```text
1. short contrast/concession explanation
2. different question family
3. medium difficulty
4. transfer test
5. spaced review later
```

This is the intended intelligence.

---

# 79. NO DUPLICATE BUSINESS LOGIC

Do not implement:

```text
calculateMastery()
```

in:

```text
UI
API
repository
adaptive engine
```

There must be exactly one canonical mastery calculation service.

Same principle for:

```text
difficulty
question eligibility
learner ownership
adaptive ranking
score estimation
```

---

# 80. DOMAIN SERVICES

Create:

```text
KnowledgeService
QuestionService
QuestionAnalysisService
QuestionGenerationService
QuestionEvaluationService

LearnerService
MasteryService
EvidenceService
ErrorAnalysisService

AdaptiveService
StudyPlanService
AssessmentService

SourceService
ProvenanceService
```

---

# 81. REPOSITORIES

Repositories are responsible for persistence.

Examples:

```text
KnowledgeRepository
QuestionRepository
LearnerRepository
MasteryRepository
EvidenceRepository
AttemptRepository
AdaptiveDecisionRepository
SourceRepository
```

Repositories do not contain pedagogical decisions.

---

# 82. DOMAIN VS AI

AI may suggest:

```text
"This question appears to test concession."
```

Domain validation determines:

```text
Does "concession" exist?
Is it an allowed node?
Is this relationship valid?
Should it be inserted?
```

AI proposes.

Domain validates.

Database persists.

---

# 83. CANONICAL SOURCE OF TRUTH

Canonical truth:

```text
PostgreSQL
```

Not:

```text
LLM memory
JSON files
React state
prompt context
```

JSON analysis artifacts are provenance/intermediate data, not the final canonical learner state.

---

# 84. EMBEDDINGS

Use pgvector only when it adds actual value.

Potential embeddings:

```text
question semantic embedding
passage embedding
concept embedding
explanation embedding
```

Use cases:

```text
semantic similarity
duplicate detection
question retrieval
related-question discovery
source similarity checking
```

Do not replace relational taxonomy with embeddings.

Embeddings are complementary.

---

# 85. SEARCH ARCHITECTURE

For:

```text
"What questions test concession?"
```

Use relational graph.

For:

```text
"Find questions semantically similar to this question."
```

Use pgvector.

For:

```text
"Find all questions that target misconception X."
```

Use relational tables.

Do not use vector search for deterministic relationships.

---

# 86. DATA INTEGRITY RULES

The application must reject:

```text
Question with zero correct options
Question with >1 correct option
Question without question type
Question referencing nonexistent concept
Mastery without learner
Evidence without attempt
Attempt referencing nonexistent question
Knowledge edge referencing nonexistent node
Question concept referencing nonexistent question
```

---

# 87. TESTING

Create:

```text
tests/
├── db/
├── knowledge/
├── questions/
├── learner/
├── mastery/
├── adaptive/
└── ingestion/
```

Test:

```text
knowledge graph integrity
foreign keys
unique constraints
question validation
mastery updates
error classification
adaptive ranking
RLS
source ingestion
AI schema validation
```

---

# 88. FIRST IMPLEMENTATION MILESTONE

Do NOT build the entire adaptive engine first.

First prove:

```text
Source
 ↓
Historical Question Analysis
 ↓
Knowledge Graph
 ↓
Original Question
 ↓
Question Graph
```

Then:

```text
Student
 ↓
Attempt
 ↓
Evidence
 ↓
Mastery
 ↓
Adaptive Selection
```

---

# 89. IMPLEMENTATION ORDER

Cursor must implement in this order:

## Phase 1

Repository audit.

Inspect existing project.

Do not overwrite existing architecture blindly.

Identify:

```text
framework
database
existing Supabase setup
existing schema
authentication
existing question model
existing source folder
existing API structure
existing AI integration
```

---

## Phase 2

Database foundation.

Implement:

```text
exams
question_types
knowledge_nodes
knowledge_edges
skills
misconceptions
```

---

## Phase 3

Question graph.

Implement:

```text
questions
question_options
question_families
question_concepts
question_skills
question_edges
```

---

## Phase 4

Source system.

Implement:

```text
sources
source_documents
source_licenses
analysis_documents
analysis_questions
```

---

## Phase 5

Historical question analyzer.

Implement:

```text
parser
segmenter
classifier
decomposer
validator
graph importer
```

---

## Phase 6

Original question generation.

Implement:

```text
QuestionSpec
generator
evaluator
verifier
originality checker
approval workflow
```

---

## Phase 7

Learner model.

Implement:

```text
learners
learner_goals
attempts
learner_evidence
learner_errors
learner_mastery
```

---

## Phase 8

Adaptive engine.

Implement:

```text
candidate retrieval
eligibility filtering
ranking
decision logging
next-best-action
```

---

# 90. DEFINITION OF DONE

The first meaningful milestone is complete only when:

```text
A historical YDS question
        ↓
is analyzed into structured components
        ↓
concepts are added/linked to Knowledge Graph
        ↓
question structure is stored as analysis data
        ↓
QuestionSpec is generated
        ↓
an original question is created
        ↓
quality validation passes
        ↓
question is stored in Question Graph
        ↓
student answers it
        ↓
attempt is recorded
        ↓
evidence is created
        ↓
mastery is updated
        ↓
adaptive engine can select the next action
```

---

# 91. CRITICAL ARCHITECTURAL PRINCIPLE

The system must never become:

```text
PDFs
 ↓
LLM
 ↓
Questions
```

It must become:

```text
SOURCES
 ↓
ANALYSIS
 ↓
KNOWLEDGE GRAPH
 ↓
QUESTION GRAPH
 ↓
LEARNER GRAPH
 ↓
ADAPTIVE ENGINE
 ↓
LEARNING
```

---

# 92. FINAL PRODUCT LOOP

The complete system eventually operates as:

```text
ASSESS
   ↓
UNDERSTAND
   ↓
MODEL
   ↓
PRIORITIZE
   ↓
TEACH
   ↓
PRACTICE
   ↓
MEASURE
   ↓
UPDATE
   ↓
ADAPT
   ↓
REPEAT
```

The student should not have to decide:

> "What should I study now?"

The system should answer that automatically.

---

# 93. CURSOR IMPLEMENTATION RULE

Before writing code:

1. Inspect the existing repository.
2. Inspect current Supabase schema.
3. Inspect current Drizzle configuration if present.
4. Inspect existing source files.
5. Inspect existing question models.
6. Identify conflicts with this specification.
7. Do NOT create duplicate tables/services.
8. Do NOT delete existing production data.
9. Propose migration strategy if schema already exists.
10. Only then implement.

If the existing architecture conflicts with this specification, preserve working functionality while migrating toward this architecture.

---

# 94. CURSOR MUST NOT DO

Do not:

```text
create duplicate QuestionService
create multiple mastery calculators
put SQL in React components
put adaptive logic in UI
store core graph relationships as JSON
hard-code YDS question distribution
hard-code one LLM provider
hard-code one exam
copy historical questions into production
generate questions without QuestionSpec
let generator self-evaluate
delete historical attempts
delete used questions
bypass provenance
ignore source licensing
```

---

# 95. CURSOR MUST DO

Always:

```text
use typed schemas
use Zod for AI boundaries
use foreign keys
use indexes based on actual query patterns
use migrations
use RLS
store provenance
version prompts
version question specs
version questions
keep attempts immutable
keep adaptive decisions observable
keep canonical learner state in PostgreSQL
```

---

# 96. IMMEDIATE TASK

Start by auditing the existing project.

Then create an implementation plan containing:

```text
A. Existing architecture
B. Existing database
C. Existing Supabase configuration
D. Existing Drizzle configuration
E. Existing source ingestion
F. Existing question model
G. Conflicts with this specification
H. Required migrations
I. Files to create
J. Files to modify
K. Files to remove only if demonstrably redundant
```

Do NOT begin by generating hundreds of files.

First establish the architecture.

Then implement the database foundation.

Then implement the source-analysis pipeline.

Then implement question generation.

Then implement learner/adaptive intelligence.

---

# 97. SUCCESS CRITERION

The system is successful when the database can answer questions like:

### Knowledge

> What concepts are related to concession?

### Questions

> Which questions test concession through a reading-comprehension context?

### Misconceptions

> Which questions target the misconception "although = however"?

### Learner

> What does this student currently struggle with?

### Evidence

> Why does the system believe the student struggles with concession?

### Adaptive

> Why was this question selected for this student?

### Progress

> Is the student's mastery actually improving?

### Target score

> Which knowledge gaps have the highest expected impact on reaching the target score?

If the database cannot answer these questions efficiently and reliably, the architecture is incomplete.

---

# 98. NORTH STAR

The ultimate data relationship is:

```text
KNOWLEDGE
    +
QUESTIONS
    +
LEARNER STATE
    +
EVIDENCE
    +
GOALS
    +
TIME
    ↓
ADAPTIVE DECISION
    ↓
NEXT BEST LEARNING ACTION
```

This is the foundation of YDS Intelligence.

The goal is not to build the largest YDS question bank.

The goal is to build the system that becomes progressively better at answering:

> **"Bu öğrenci için şu anda yapılabilecek en faydalı şey nedir?"**