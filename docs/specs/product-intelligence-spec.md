
# YDS INTELLIGENCE SPECIFICATION
## Version 1.0

**Project:** YDS Adaptive Learning Platform  
**Document Type:** Domain Model + Intelligence Architecture + Technical Specification  
**Status:** Foundational / Implementation Blueprint  
**Version:** 1.0  
**Date:** 7 October 2026

---

# 0. EXECUTIVE DEFINITION

Bu sistem bir:

- soru bankası,
- AI soru üreticisi,
- kelime uygulaması,
- online deneme sınavı,
- chatbot

değildir.

Sistem:

> **YDS/e-YDS'nin ölçtüğü bilgi, dilbilgisi, kelime, discourse, okuma ve sınav becerilerini yapılandırılmış bir Knowledge Graph üzerinde temsil eden; her sorunun neyi, neden ve nasıl ölçtüğünü bilen; her öğrencinin bilgi durumunu zaman içinde modelleyen; bu iki modeli birleştirerek öğrencinin bir sonraki en faydalı öğrenme adımını otomatik olarak seçen adaptif bir öğrenme sistemidir.**

Ana hedef:

> **“Öğrenci ne çalışacağını düşünmek zorunda kalmasın. Sistem bunu onun için düşünsün.”**

Ürünün temel deneyimi:

> **Test et → Anla → Önceliklendir → Çalış → Ölç → Uyarlat → Tekrar et.**

---

# 1. PRODUCT NORTH STAR

## 1.1 North Star

Her öğrencinin:

> **“Sistem beni gerçekten tanıyor.”**

hissine ulaşması.

Bunu sağlayan üç temel yetenek:

### A. Knowledge Awareness

Sistem YDS bilgisinin yapısını bilir.

### B. Learner Awareness

Sistem öğrencinin ne bildiğini, neyi bilmediğini, hangi hatayı neden yaptığını bilir.

### C. Decision Intelligence

Sistem:

> **“Şu anda bu öğrenci için yapılabilecek en faydalı şey nedir?”**

sorusuna cevap verebilir.

---

# 2. CORE PRINCIPLES

## Principle 1 — Question ≠ Learning Unit

Bir soru yalnızca bir soru değildir.

Her soru:

- concept
- skill
- grammar
- vocabulary
- discourse
- misconception
- difficulty
- prerequisite
- distractor mechanism
- cognitive demand

ile ilişkilendirilir.

---

## Principle 2 — Wrong Answer ≠ Simple Failure

Yanlış cevap:

> “öğrenci bunu bilmiyor”

anlamına gelmez.

Yanlış cevap aşağıdakilerden biri olabilir:

- vocabulary gap
- grammar gap
- discourse confusion
- misconception
- distractor susceptibility
- careless error
- time pressure
- inference failure
- paraphrase failure
- context failure
- weak elimination
- low confidence
- guessing

Sistem mümkün olduğunca bunları birbirinden ayırmalıdır.

---

# 3. EXAM MODEL

2026 itibarıyla e-YDS uygulamalarında çoktan seçmeli 80 soru ve 180 dakika formatı kullanılmaktadır.

Platformun sınav modeli konfigüre edilebilir olmalıdır.

```text
Exam
 ├── language
 ├── question_count
 ├── duration
 ├── scoring
 ├── question_distribution
 ├── question_types
 └── version
```

Örneğin:

```json
{
  "exam": "YDS",
  "language": "English",
  "question_count": 80,
  "duration_minutes": 180
}
```

Ancak sistem kod içerisinde 80/180'e hard-code edilmemelidir.

---

# 4. SYSTEM ARCHITECTURE

Ana sistem:

```text
                         ┌───────────────────────┐
                         │       SOURCES         │
                         │                       │
                         │ YDS / e-YDS           │
                         │ Academic              │
                         │ Literary              │
                         │ Vocabulary            │
                         │ Licensed              │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   SOURCE ANALYZER     │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   KNOWLEDGE GRAPH     │
                         │                       │
                         │ concepts              │
                         │ grammar               │
                         │ vocabulary            │
                         │ discourse             │
                         │ misconceptions        │
                         │ relationships          │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
          ┌──────────────────┐              ┌──────────────────┐
          │ QUESTION ENGINE  │              │ LEARNER ENGINE   │
          │                  │              │                  │
          │ generation       │              │ mastery          │
          │ evaluation       │              │ errors           │
          │ tagging          │              │ memory           │
          │ relationships    │              │ goals            │
          └────────┬─────────┘              └────────┬─────────┘
                   │                                 │
                   └────────────────┬────────────────┘
                                    ▼
                         ┌───────────────────────┐
                         │  ADAPTIVE ENGINE      │
                         │                       │
                         │ What next?            │
                         │ Why?                  │
                         │ How difficult?        │
                         │ Which intervention?   │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │       STUDENT         │
                         └───────────────────────┘
```

---

# 5. KNOWLEDGE GRAPH

Knowledge Graph sistemin temel entelektüel varlığıdır.

## 5.1 Node Types

Minimum node türleri:

```text
Exam
ExamSection
QuestionType
Skill
Concept
SubConcept
GrammarConcept
VocabularyItem
Collocation
DiscourseRelation
Topic
Misconception
CognitiveSkill
Question
QuestionFamily
LearningObjective
Source
AcademicText
LiteraryText
```

---

# 6. TAXONOMY

## 6.1 Exam

```text
YDS
e-YDS
```

Gelecekte:

```text
YÖKDİL
YDT
TOEFL
IELTS
```

eklenebilir.

Architecture exam-agnostic olmalıdır.

---

# 7. QUESTION TAXONOMY

QuestionType:

```text
vocabulary
grammar
sentence_completion
cloze
paragraph_completion
translation_en_to_tr
translation_tr_to_en
reading_comprehension
dialogue
closest_meaning
irrelevant_sentence
paragraph_question
```

QuestionType kendi altında alt becerilere sahip olabilir.

Örneğin:

```text
sentence_completion
 ├── grammar_completion
 ├── vocabulary_completion
 ├── discourse_completion
 ├── semantic_completion
 └── mixed_completion
```

---

# 8. SKILL TAXONOMY

## Vocabulary

```text
word meaning
contextual meaning
synonym
antonym
collocation
phrasal verb
word formation
register
polysemy
lexical distinction
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

---

# 9. COGNITIVE SKILL LAYER

Bu katman özellikle önemlidir.

İngilizce bilgisi ile sınav çözme becerisi ayrılmalıdır.

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

Örneğin öğrenci:

- vocabulary = güçlü
- inference = zayıf

olabilir.

Bu durumda daha fazla vocabulary sorusu sormak yanlış adaptasyondur.

---

# 10. VOCABULARY GRAPH

Her vocabulary item:

```json
{
  "lemma": "mitigate",
  "part_of_speech": "verb",
  "meanings": [],
  "synonyms": [],
  "antonyms": [],
  "collocations": [],
  "derivatives": [],
  "register": "academic",
  "frequency": {},
  "difficulty": {},
  "confusions": [],
  "concepts": []
}
```

Vocabulary relationships:

```text
synonym_of
antonym_of
derived_from
collocates_with
often_confused_with
semantic_neighbor
belongs_to_topic
```

Örneğin:

```text
affect
 │
 ├── confused_with → effect
 ├── related_to → influence
 └── related_to → impact
```

---

# 11. GRAMMAR GRAPH

Grammar yalnızca konu listesi olmayacak.

Örneğin:

```text
CONCESSION
│
├── although
├── though
├── even though
├── despite
├── in spite of
└── however
```

Fakat bunların syntactic requirements'ları farklıdır.

```text
although + clause

despite + noun / gerund

however + independent clause / discourse position
```

Bu ilişkiler graph'ta tutulacaktır.

---

# 12. DISCOURSE GRAPH

Discourse relations birinci sınıf knowledge node olmalıdır.

Örneğin:

```text
CONTRAST
├── however
├── whereas
├── while
└── in contrast

CONCESSION
├── although
├── even though
├── despite
└── in spite of

CAUSE
├── because
├── since
├── due to
└── owing to

RESULT
├── therefore
├── thus
├── consequently
└── hence
```

Ancak lexical listeden ziyade **logical relationship** temel alınacaktır.

---

# 13. MISCONCEPTION GRAPH

Sistemin en önemli varlıklarından biri.

Örnek:

```text
MISCONCEPTION:
"despite can be followed directly by a finite clause"

         │
         ├── related_to → despite
         ├── related_to → although
         ├── prerequisite → clause_structure
         └── correction → despite + noun/gerund
```

Başka:

```text
MISCONCEPTION:
"however and although are interchangeable"
```

Bu node:

```text
however
although
contrast
concession
sentence_structure
```

ile bağlanır.

---

# 14. QUESTION AS A KNOWLEDGE OBJECT

Her soru aşağıdaki minimum metadata'yı taşımalıdır:

```json
{
  "id": "q_000001",

  "exam": "YDS",

  "question_type": "sentence_completion",

  "difficulty": 0.74,

  "skills": [],

  "concepts": [],

  "grammar_concepts": [],

  "vocabulary_items": [],

  "discourse_relations": [],

  "cognitive_skills": [],

  "misconceptions_targeted": [],

  "prerequisites": [],

  "related_questions": [],

  "question_family": null,

  "correct_answer": "B",

  "answer_explanation": "",

  "wrong_answer_explanations": {},

  "distractors": [],

  "source_metadata": {},

  "generation_metadata": {},

  "quality_metadata": {},

  "status": "draft"
}
```

---

# 15. DISTRACTOR ONTOLOGY

Yanlış cevaplar rastgele üretilmeyecektir.

Distractor types:

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

Her distractor:

```json
{
  "option": "because",
  "type": "wrong_discourse_relation",
  "grammatically_valid": true,
  "semantically_plausible": true,
  "reason_wrong": "The clauses express concession rather than cause."
}
```

---

# 16. ANSWER EXPLANATION MODEL

Sistem yalnızca:

> B doğru.

dememelidir.

Şunları açıklayabilmelidir:

### Correct answer

Neden doğru?

### Each distractor

Neden yanlış?

### Concept

Hangi kavram test edildi?

### Trap

Öğrencinin düşebileceği aldatmaca ne?

### Transfer

Bu bilgi başka hangi sorularda kullanılabilir?

---

# 17. QUESTION GRAPH

Sorular birbirinden bağımsız olmayacaktır.

Relationships:

```text
tests_same_concept_as
prerequisite_for
harder_than
easier_than
similar_to
contrasts_with
reinforces
remediates
targets_same_misconception
same_question_family
```

Örneğin:

```text
Q100
 ├── tests → concession
 ├── prerequisite → Q72
 ├── reinforces → Q145
 ├── harder_than → Q91
 └── targets → M13
```

---

# 18. QUESTION FAMILY

Aynı öğrenme hedefini farklı yüzlerle ölçen sorular Question Family oluşturur.

Örneğin:

```text
Family: concession_01

Q1 → sentence completion
Q2 → cloze
Q3 → reading
Q4 → vocabulary-context
Q5 → paragraph completion
```

Bu sayede sistem:

> “Öğrenci aynı soruyu ezberledi.”

problemini azaltır.

Öğrenci gerçekten kavramı öğrendi mi?

**Transfer question** ile ölçülür.

---

# 19. SOURCE MODEL

Her kaynak:

```json
{
  "id": "",
  "title": "",
  "author": "",
  "publisher": "",
  "url": "",
  "source_type": "",
  "license": "",
  "commercial_use": false,
  "derivative_use": false,
  "redistribution_allowed": false,
  "text_mining_allowed": false,
  "attribution_required": false,
  "verified": false
}
```

taşımalıdır.

---

# 20. SOURCE CLASSES

## Tier A — Owned

Kendi ürettiğimiz içerikler.

En değerli üretim kaynağı.

---

## Tier B — Licensed

Ticari kullanım için lisanslanmış içerikler.

---

## Tier C — Open / Permitted

Lisansı ticari kullanım ve ilgili kullanım biçimlerine izin veren açık içerikler.

---

## Tier D — Reference Only

ÖSYM YDS/e-YDS gibi telifli kaynaklar.

Bunlar:

- analysis
- calibration
- taxonomy extraction
- difficulty calibration
- pattern research

amacıyla kullanılabilir; ancak hukuki kullanım koşulları doğrulanmadan türetilmiş soruların üretim corpus'u haline getirilmemelidir.

ÖSYM, 2025 ve 2026 YDS duyurularında soruların FSEK kapsamında eser olduğunu ve telif haklarının ÖSYM'ye ait olduğunu; yazılı izin olmadan çoğaltılamayacağını, dağıtılamayacağını ve yayımlanamayacağını açıkça belirtiyor.

---

# 21. ACADEMIC SOURCE STRATEGY

Akademik kaynaklar dört temel amaçla kullanılacaktır:

```text
1. topic discovery
2. vocabulary enrichment
3. discourse/context enrichment
4. original passage generation context
```

Kaynak metin doğrudan soruya dönüştürülmemelidir.

Doğru pipeline:

```text
Academic Paper
      ↓
Metadata
      ↓
License Verification
      ↓
Semantic Analysis
      ↓
Concept Extraction
      ↓
Vocabulary Extraction
      ↓
Discourse Extraction
      ↓
Topic Extraction
      ↓
Original Passage Specification
      ↓
NEW ORIGINAL PASSAGE
      ↓
Question Specification
      ↓
NEW ORIGINAL QUESTION
```

---

# 22. RECOMMENDED ACADEMIC SOURCES

## CORE

CORE, farklı araştırma sağlayıcılarından metadata ve full-text araştırma içeriklerini harmonize eden ve makine erişimi sağlayan geniş bir açık erişim araştırma altyapısıdır.

Kullanım:

```text
topic discovery
open-access full text discovery
academic corpus
```

---

## Semantic Scholar

Semantic Scholar API:

- paper search
- metadata
- authors
- citations
- references
- open-access PDF filtering
- embeddings

gibi alanları destekliyor.

Kullanım:

```text
topic discovery
research graph
paper ranking
academic context
citation relationships
```

---

## DOAJ

DOAJ açık erişimli dergi ve makaleleri indeksler ve API, OAI-PMH, CSV gibi veri erişim seçenekleri sunar.

DOAJ'ın açık erişim yaklaşımı, içeriklerin açık lisansla çeşitli yeniden kullanım biçimlerine izin vermesini esas alır; ancak yine de her içeriğin lisans şartları sistemde ayrıca kaydedilmelidir.

Kullanım:

```text
peer-reviewed academic corpus
open-access source discovery
```

---

# 23. LITERARY SOURCES

Public-domain / appropriately licensed literary sources kullanılabilir.

Örneğin:

```text
Project Gutenberg
Internet Archive
University digital collections
Public-domain corpora
Licensed literary corpora
```

Ancak:

> “Internette okunabiliyor”

asla

> “ticari olarak yeniden kullanılabilir”

anlamına gelmez.

Her kaynak License Registry'den geçmeden production corpus'a alınmayacaktır.

---

# 24. SOURCE QUALITY SCORE

Her kaynak:

```text
authority
academic_quality
language_quality
topic_relevance
text_quality
license_confidence
YDS_relevance
```

boyutlarında puanlanacaktır.

Örnek:

```json
{
  "authority": 0.94,
  "academic_quality": 0.96,
  "language_quality": 0.95,
  "topic_relevance": 0.91,
  "license_confidence": 1.0,
  "yds_relevance": 0.82
}
```

---

# 25. ORIGINAL PASSAGE ENGINE

Sistem gerçek akademik metni kopyalamaz.

Bunun yerine:

```text
source concepts
+
topic
+
academic register
+
vocabulary targets
+
discourse structure
+
difficulty target
```

ile özgün pasaj oluşturur.

Passage constraints:

```text
grammatically natural
academically plausible
factually coherent
B1/B2/C1/C2 controlled
no source sentence copying
no unnecessary lexical clues
```

---

# 26. QUESTION GENERATION PIPELINE

Soru üretimi:

```text
1. Select learning objective
2. Select concept
3. Select difficulty
4. Select cognitive skill
5. Select passage/context
6. Generate QuestionSpec
7. Generate original question
8. Generate distractors
9. Generate explanations
10. Run automated validation
11. Run independent AI evaluation
12. Run originality checks
13. Run ambiguity checks
14. Human review
15. Approve
16. Index
17. Add to graph
```

---

# 27. QUESTION SPECIFICATION

Model doğrudan soru üretmemelidir.

Önce:

```json
{
  "question_type": "sentence_completion",
  "target_concept": "concession",
  "target_skill": "discourse_relationship",
  "difficulty": 0.76,
  "cognitive_demand": "semantic_discrimination",

  "required_knowledge": [
    "concession",
    "although",
    "despite",
    "clause_structure"
  ],

  "distractor_plan": [
    "cause",
    "contrast",
    "condition",
    "purpose"
  ],

  "constraints": [
    "one defensible answer",
    "no lexical giveaway",
    "all distractors grammatically plausible"
  ]
}
```

oluşturulacaktır.

---

# 28. AI GENERATOR

Generator prompt:

```text
You are an expert English language assessment item writer.

Generate an entirely original assessment item from the supplied
QuestionSpec.

Do not reproduce, paraphrase, translate, or imitate any source item.

Follow the specified:
- target concept
- skill
- difficulty
- cognitive demand
- distractor mechanisms
- grammar constraints
- lexical constraints

The item must contain exactly one defensible correct answer.

Every distractor must be plausible and must fail for a principled reason.

Do not introduce accidental clues.
```

---

# 29. QUALITY ENGINE

Her soru aşağıdaki testlerden geçer.

## A. Grammar

```text
pass/fail
```

## B. Semantic coherence

```text
0–1
```

## C. Single-answer validity

```text
0–1
```

## D. Distractor quality

```text
0–1
```

## E. Difficulty accuracy

```text
0–1
```

## F. Unintended clue detection

```text
pass/fail
```

## G. Ambiguity

```text
pass/fail
```

## H. Originality

```text
0–1
```

## I. YDS structural alignment

```text
0–1
```

---

# 30. AUTOMATIC REJECTION RULES

Aşağıdakilerden biri gerçekleşirse soru production'a giremez:

```text
multiple defensible answers
grammar error
semantic incoherence
obvious correct option
weak distractors
incorrect explanation
unintended clue
source overlap above threshold
wrong difficulty classification
missing metadata
unsupported concept
broken relationship
```

---

# 31. HUMAN-IN-THE-LOOP

AI final authority değildir.

Workflow:

```text
AI generated
      ↓
Automated QA
      ↓
AI Judge
      ↓
Human Review
      ↓
Approve / Reject / Edit
```

Human reviewer:

```text
approve
reject
request_revision
change_difficulty
change_tags
change_explanation
```

yapabilir.

Human correction'ları sistem ayrıca öğrenme verisi olarak kaydeder.

---

# 32. QUESTION QUALITY SCORE

Örnek:

```text
quality_score =
  grammar        × 0.15
+ semantics      × 0.15
+ answerability  × 0.20
+ distractors    × 0.15
+ difficulty     × 0.10
+ originality    × 0.10
+ yds_alignment  × 0.15
```

Ancak:

> Weighted score yüksek olsa bile critical failure varsa soru reject edilir.

Örneğin:

```text
quality_score = 0.94
ambiguity = FAIL
```

sonucu:

```text
REJECT
```

olmalıdır.

---

# 33. LEARNER MODEL

Her öğrenci için:

```text
LearnerProfile
 ├── goals
 ├── target_score
 ├── exam_date
 ├── available_time
 ├── current_level
 ├── mastery_state
 ├── misconceptions
 ├── vocabulary_state
 ├── grammar_state
 ├── discourse_state
 ├── reading_state
 ├── cognitive_skill_state
 ├── question_history
 ├── response_history
 ├── confidence
 ├── response_time
 └── study_behavior
```

---

# 34. MASTERY MODEL

Mastery yalnızca:

```text
0 = bilmiyor
1 = biliyor
```

olmayacaktır.

Her concept için:

```json
{
  "mastery": 0.63,
  "confidence": 0.71,
  "evidence_count": 17,
  "recent_accuracy": 0.58,
  "long_term_accuracy": 0.71,
  "response_time": 21.4,
  "last_seen": "2026-10-06",
  "forgetting_risk": 0.34
}
```

tutulabilir.

---

# 35. MASTERY STATES

UI için:

```text
unknown
introduced
learning
fragile
developing
proficient
mastered
```

kullanılabilir.

Ancak backend continuous score tutmalıdır.

---

# 36. ERROR MODEL

Her yanlış cevap bir ErrorEvent üretir.

```json
{
  "student_id": "",
  "question_id": "",
  "concept_id": "",
  "selected_option": "",
  "correct_option": "",
  "error_type": "",
  "confidence": null,
  "response_time": null,
  "timestamp": ""
}
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

# 37. ERROR INFERENCE

Sistem tek bir yanlış cevaptan kesin teşhis koymamalıdır.

Örneğin:

```text
1 wrong
```

→ evidence weak.

```text
3 similar wrong answers
```

→ evidence moderate.

```text
5 repeated errors across different question families
```

→ strong evidence.

Bu nedenle mastery updates Bayesian/probabilistic mantıkla tasarlanmalıdır.

---

# 38. KNOWLEDGE EVIDENCE

Her learner-concept ilişkisinin evidence history'si bulunmalıdır.

```text
Student
  │
  └── mastery_of → concession
                     │
                     ├── evidence Q1 correct
                     ├── evidence Q4 wrong
                     ├── evidence Q9 wrong
                     ├── evidence Q18 correct
                     └── evidence Q31 correct
```

Böylece sistem kararını açıklayabilir.

---

# 39. “WHY THIS QUESTION?”

Sistem her seçtiği soruya explanation metadata üretmelidir.

Örneğin:

```text
selection_reason:
"Student has strong general discourse knowledge but
repeatedly confuses concession with contrast.
This item isolates that distinction at a moderate difficulty."
```

UI:

> **Bu soruyu sana neden getirdik?**

---

# 40. ADAPTIVE ENGINE

Ana fonksiyon:

```text
getNextBestLearningAction(student_id)
```

çıktısı yalnızca soru olmak zorunda değildir.

Şunlardan biri olabilir:

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

Bu çok önemli.

Çünkü:

> **Her problem soru çözerek çözülmez.**

---

# 41. NEXT BEST ACTION

Decision score:

```text
learning_gain
× relevance
× mastery_gap
× goal_alignment
× difficulty_fit
× retention_need
× misconception_relevance
× diversity
```

eksi:

```text
recent_repetition
fatigue
overexposure
```

---

# 42. ADAPTIVE QUESTION SELECTION

Candidate pool:

```text
all approved questions
        ↓
exam compatible
        ↓
skill compatible
        ↓
difficulty compatible
        ↓
knowledge gap compatible
        ↓
misconception compatible
        ↓
not recently repeated
        ↓
rank
        ↓
best question
```

---

# 43. DIFFICULTY MODEL

Difficulty:

```text
lexical_complexity
syntactic_complexity
semantic_complexity
inference_load
distractor_similarity
context_dependency
```

ile modellenmelidir.

Örnek:

```json
{
  "overall": 0.81,
  "lexical": 0.67,
  "syntax": 0.79,
  "semantic": 0.86,
  "inference": 0.82,
  "distractor": 0.88
}
```

---

# 44. DIFFICULTY IS EMPIRICAL

AI tarafından verilen difficulty yalnızca başlangıç tahminidir.

Gerçek öğrenci verisi geldikçe:

```text
predicted difficulty
        ↓
actual response data
        ↓
empirical difficulty
```

oluşturulmalıdır.

Yeterli veri geldiğinde:

```text
item difficulty
item discrimination
option performance
```

gibi psychometric metrikler hesaplanabilir.

---

# 45. QUESTION CALIBRATION

Her production sorusu zaman içinde:

```text
predicted
↓
pilot
↓
observed
↓
calibrated
```

olmalıdır.

Bu nedenle question database:

```text
difficulty_predicted
difficulty_observed
discrimination
attempt_count
accuracy
option_distribution
```

tutmalıdır.

---

# 46. LEARNING LOOP

Temel loop:

```text
ASSESS
 ↓
MODEL
 ↓
SELECT
 ↓
TEACH
 ↓
PRACTICE
 ↓
MEASURE
 ↓
UPDATE
 ↓
REPEAT
```

---

# 47. DAILY SESSION ENGINE

Sistem öğrenciye:

> “Bugün 2 saat çalış.”

demek yerine optimal minimum session üretir.

Örneğin:

```text
Today's Mission

1. 3 min — misconception review
2. 7 min — vocabulary
3. 8 min — adaptive questions
4. 4 min — error correction
5. 2 min — recall
```

Toplam:

```text
24 minutes
```

---

# 48. COGNITIVE LOAD PRINCIPLE

Öğrenci aynı anda çok fazla açıkla karşılaştırılmamalıdır.

Öncelik:

```text
high-impact
+
high-confidence diagnosis
+
manageable difficulty
```

olan eksiklere verilmelidir.

---

# 49. TARGET SCORE ENGINE

Öğrencinin:

```text
current_score
target_score
exam_date
available_days
available_minutes
```

bilgileri alınır.

Sistem:

```text
target_gap
↓
knowledge gaps
↓
highest ROI concepts
↓
study plan
```

oluşturur.

---

# 50. SCORE FORECAST

Sistem:

> “Kesin 75 alırsın.”

dememelidir.

Bunun yerine:

```text
current estimated performance
confidence interval
target scenario
```

sunmalıdır.

Örneğin:

> Mevcut performans göstergelerine göre tahmini seviyen: 61–64.

> Belirli bilgi açıklarının kapatılması halinde 70+ performans bölgesine ulaşma potansiyelin artabilir.

---

# 51. PERSONALIZED STUDY PLAN

Plan:

```text
Goal
 ↓
Exam deadline
 ↓
Current mastery
 ↓
Priority concepts
 ↓
Available time
 ↓
Daily workload
 ↓
Adaptive tasks
```

ile oluşturulur.

Plan statik olmamalıdır.

Bir öğrenci beklenenden hızlı ilerliyorsa plan değişir.

Yavaş ilerliyorsa değişir.

---

# 52. “PLAN BENİ YÖNETSİN” UX

Öğrenciye:

> “Bu hafta 17 konu bitirmelisin.”

denmemelidir.

Bunun yerine:

> **Bugünkü görevin hazır.**

denmelidir.

Ve:

> **Bugün sadece bunu tamamlaman yeterli.**

Bu ürünün anxiety-reduction mekanizmasının temelidir.

---

# 53. STUDENT-FACING INTELLIGENCE

Öğrenciye sistem zaman zaman şu tarz açıklamalar yapabilir:

> “Son 8 sorunda kelime bilgisinde iyisin. Ancak `cause / result` ilişkisini test eden sorularda hata oranın yükseliyor.”

ve:

> “Bu nedenle bugün yeni kelime öğretmek yerine discourse ilişkisini çalıştırıyoruz.”

Bu açıklamalar Learner Graph'tan üretilmelidir.

AI bunları doğal dile çevirebilir.

---

# 54. MEMORY

Öğrenci memory sistemi:

```text
short_term_memory
medium_term_memory
long_term_mastery
```

olarak düşünülebilir.

Ancak canonical data database'de tutulmalıdır.

LLM conversation memory **source of truth değildir.**

---

# 55. SPACED RETENTION

Her concept için:

```text
last_seen
last_correct
last_wrong
success_streak
failure_streak
forgetting_risk
next_review_at
```

tutulmalıdır.

Sistem gerektiğinde eski bilgiyi tekrar getirir.

---

# 56. INTERLEAVING

Sistem sürekli:

```text
concession
concession
concession
concession
```

sormamalıdır.

Öğrenci öğrenmeye başladıktan sonra:

```text
concession
cause
contrast
concession
condition
concession
```

gibi interleaving uygulanabilir.

Bu transferi test eder.

---

# 57. QUESTION SELECTION EXAMPLE

Öğrenci:

```text
Vocabulary = 78%
Grammar = 76%
Discourse = 49%
Inference = 42%
```

Sistem:

❌ 10 vocabulary question

getirmemeli.

Bunun yerine:

```text
1. discourse/concession
2. inference
3. paraphrase
```

önceliklendirmelidir.

---

# 58. KNOWLEDGE GRAPH + LEARNER GRAPH

Büyük fikir:

```text
                 KNOWLEDGE GRAPH

       concession
       /         \
  although      despite
      |             |
   clause        noun phrase
      \             /
       \           /
        misconception
              |
              |
        LEARNER GRAPH
              |
        Student_001
              |
      mastery = 0.43
              |
       error_count = 5
              |
        forgetting = 0.62
```

Adaptive engine bu iki graph arasında köprü kurar.

---

# 59. QUESTION GENERATION VS QUESTION SELECTION

Bunlar iki farklı problemdir.

## Question Generation

> “İyi bir soru üretebilir miyim?”

## Question Selection

> “Bu öğrenciye şu anda hangi soru en faydalı?”

Ürün açısından ikinci problem daha değerlidir.

---

# 60. QUESTION BANK STRATEGY

Amaç:

> 100.000 AI-generated question

değildir.

Amaç:

> **yüksek kaliteli, iyi etiketlenmiş, birbirleriyle ilişkili, psychometrically calibrated question network**

oluşturmaktır.

Örneğin:

```text
10,000 excellent questions
>
100,000 mediocre questions
```

---

# 61. ORIGINALITY

Yeni soru:

- source sentence copy olmamalı
- source sentence paraphrase olmamalı
- source distractor pattern'ını birebir taşımamalı
- aynı unique lexical combination'ı gereksiz şekilde tekrar etmemeli

Sistem similarity detection çalıştırmalıdır.

---

# 62. SOURCE SEPARATION

Production question:

```text
question.source_id
```

taşıyabilir.

Ancak:

```text
source_usage = "conceptual_reference"
```

gibi kullanım amacı da kaydedilmelidir.

Production content'in hangi kaynaktan ne şekilde türediği denetlenebilir olmalıdır.

---

# 63. AI MODEL ARCHITECTURE

AI tek model değildir.

Mantıksal roller:

```text
Analyzer
Generator
Critic
Verifier
Explainer
Tutor
```

olarak ayrılmalıdır.

Aynı model kullanılabilir.

Ancak **prompt/context/role separation** korunmalıdır.

---

# 64. GENERATOR ≠ JUDGE

Generator'ın kendi sorusunu değerlendirmesi tek kalite mekanizması olarak kabul edilmez.

Mümkün olduğunca:

```text
Generator
      ↓
Independent Evaluator
      ↓
Rule Engine
      ↓
Human
```

kullanılır.

---

# 65. DETERMINISTIC RULE ENGINE

AI'ın karar vermemesi gereken kurallar:

```text
exactly 5 options
exactly 1 correct option
required metadata exists
question_type valid
concept exists
difficulty range valid
source license valid
```

gibi deterministic kurallardır.

---

# 66. AI'IN KARAR VEREBİLECEĞİ ALANLAR

AI:

```text
semantic coherence
explanation quality
distractor plausibility
topic classification
concept suggestion
misconception hypothesis
naturalness
```

gibi alanlarda kullanılabilir.

---

# 67. DATABASE STRATEGY

İlk mimari:

```text
PostgreSQL / Supabase
+
pgvector
```

üzerine kurulmalıdır.

Ayrı graph database ilk aşamada zorunlu değildir.

Graph ilişkileri relational edge tables ile tutulabilir.

Örneğin:

```text
knowledge_nodes
knowledge_edges

question_nodes
question_edges

learner_mastery
learner_evidence
```

---

# 68. CORE DATABASE TABLES

Minimum:

```text
exams
question_types
skills
concepts
grammar_concepts
vocabulary_items
discourse_relations
misconceptions
topics
knowledge_edges

sources
source_documents
source_licenses

questions
question_options
question_concepts
question_skills
question_edges
question_evaluations

learners
learner_mastery
learner_evidence
learner_errors
learner_goals
learner_sessions

study_plans
study_tasks

attempts
responses
events
```

---

# 69. EVENT SYSTEM

Her önemli davranış event olarak kaydedilir.

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

Bu event'ler Learner Model'i günceller.

---

# 70. OBSERVABILITY

Her adaptive decision explainable olmalıdır.

Örneğin:

```json
{
  "decision": "serve_question",
  "question_id": "Q8821",
  "reasons": [
    "low_mastery_concession",
    "recent_misconception",
    "appropriate_difficulty",
    "goal_alignment"
  ]
}
```

Bu debugging için kritik.

---

# 71. ADMIN / CONTENT STUDIO

İçerik ekibinin görebileceği ekran:

```text
Question Queue
 ├── Generated
 ├── QA Failed
 ├── Needs Review
 ├── Approved
 ├── Rejected
 └── Retired
```

Question detail:

```text
Question
Correct Answer
Why Correct
Why Others Wrong
Concepts
Skills
Misconceptions
Difficulty
Source
Similarity
AI Evaluation
Human Review
Related Questions
```

---

# 72. QUESTION RETIREMENT

Bir soru zamanla:

- ambiguity
- poor discrimination
- too easy
- too hard
- bad explanation
- outdated content

gibi nedenlerle production'dan çıkarılabilir.

Silinmemeli.

```text
status = retired
```

olmalıdır.

---

# 73. VERSIONING

Question değişiklikleri versioned olmalıdır.

```text
Q100 v1
Q100 v2
Q100 v3
```

Öğrencinin eski attempt'leri hangi version ile yaptığını bilmeliyiz.

---

# 74. DATA PRIVACY

Learner data:

- minimum necessary collection
- secure storage
- access control
- auditability
- deletion/export capability

ilkeleriyle tutulmalıdır.

---

# 75. PRODUCT EXPERIENCE

Öğrencinin temel deneyimi:

```text
ONBOARDING
   ↓
PLACEMENT TEST
   ↓
DIAGNOSIS
   ↓
PERSONAL PROFILE
   ↓
TODAY'S MISSION
   ↓
ADAPTIVE PRACTICE
   ↓
INSTANT FEEDBACK
   ↓
PROGRESS
   ↓
NEXT MISSION
```

---

# 76. DIAGNOSTIC RESULT

Sonuç ekranında:

```text
Current estimated range
Strengths
Weaknesses
High-impact gaps
Target score
Potential improvement areas
```

gösterilir.

Ancak bütün intelligence ücretsiz kullanıcıya açılmak zorunda değildir.

---

# 77. PREMIUM DEVELOPMENT REPORT

Ücretli rapor:

```text
7–10 critical findings

Priority
Current mastery
Evidence
Expected impact
Recommended intervention
```

sunabilir.

---

# 78. FREE LOOP

Ücretsiz kullanıcı:

```text
10 vocabulary/day
10 discourse/connector/day
```

çalışabilir.

Ancak sistem bunları da Learner Model'e işler.

Dolayısıyla free kullanıcı da intelligence loop'un içine girer.

---

# 79. PAID SELF-STUDY

Self-study package:

```text
personal diagnosis
+
targeted content
+
PDF resources
+
adaptive practice
+
progress tracking
```

---

# 80. PREMIUM PERSONAL CAMP

Personal Camp:

```text
personal target
+
adaptive study plan
+
daily missions
+
personalized question selection
+
misconception remediation
+
progress tracking
+
reassessment
```

sunmalıdır.

---

# 81. PERSONALIZATION DEPTH

Kişiselleştirme:

### Level 1

“Bu konu zayıf.”

### Level 2

“Bu alt konu zayıf.”

### Level 3

“Bu hata tipinde zayıf.”

### Level 4

“Bu hatayı hangi durumda yaptığını biliyoruz.”

### Level 5

“Bu hatayı düzeltmek için hangi sırayla hangi intervention'ın yapılması gerektiğini biliyoruz.”

Ürün Level 5'e ulaşmayı hedeflemelidir.

---

# 82. THE “WOW” MOMENTS

Sistem aşağıdaki deneyimleri üretmelidir.

### Wow #1

> “Bu soruyu neden bana sorduğunu biliyor.”

### Wow #2

> “Benim hangi bağlaçlarda zorlandığımı gerçekten biliyor.”

### Wow #3

> “Yanlışımı sadece göstermedi, neden yaptığımı buldu.”

### Wow #4

> “Geçen hafta öğrendiğim şeyi bugün tekrar karşıma çıkardı.”

### Wow #5

> “Ben düşünmeden bugün ne çalışacağımı hazırlamış.”

### Wow #6

> “Bana kolay gelen şeyi gereksiz yere tekrar ettirmiyor.”

### Wow #7

> “Hedef puanımı biliyor ve ona göre çalıştırıyor.”

---

# 83. SUCCESS METRICS

## Question Quality

```text
human approval rate
ambiguity rate
AI judge agreement
question retirement rate
observed discrimination
```

## Learning

```text
concept mastery improvement
error recurrence
retention
transfer performance
```

## Product

```text
daily active learners
session completion
7-day retention
30-day retention
questions/session
free → paid conversion
target achievement
```

---

# 84. LEARNING SUCCESS > ENGAGEMENT

Sistem öğrenciyi daha uzun tutmak için tasarlanmamalıdır.

Ana KPI:

> **öğrencinin hedeflediği bilgi/puan seviyesine ilerlemesi**

olmalıdır.

Engagement bunun sonucudur.

---

# 85. ADAPTIVE ENGINE PSEUDOCODE

```text
function getNextBestAction(student):

    state = getLearnerState(student)

    goal = getGoal(student)

    candidateConcepts =
        identifyPriorityGaps(state, goal)

    candidates =
        retrieveCompatibleQuestions(candidateConcepts)

    candidates =
        filterByDifficulty(candidates, state)

    candidates =
        filterRecentlySeen(candidates)

    candidates =
        filterByQuestionDiversity(candidates)

    ranked =
        rankByExpectedLearningGain(
            candidates,
            state,
            goal
        )

    if interventionRequired(state):
        return createIntervention(state)

    return ranked.top()
```

---

# 86. EXPECTED LEARNING GAIN

Ana optimizasyon hedeflerinden biri:

```text
Expected Learning Gain
```

olmalıdır.

Basitleştirilmiş:

```text
ELG =
gap
× relevance
× probability_of_success
× retention_value
× goal_impact
```

---

# 87. DO NOT OVER-PERSONALIZE

Sistem sürekli öğrencinin zayıf olduğu şeyi sormamalıdır.

Çünkü:

```text
weakness
→ practice
→ improvement
→ transfer
```

olmalıdır.

Bir concept mastered olduğunda sistem:

> “Bu konuda iyisin. Artık daha ileri seviyeye geçiyoruz.”

demelidir.

---

# 88. ADAPTIVE DIFFICULTY CURVE

Hedef:

```text
too easy
     ↓
optimal challenge
     ↓
mastery
     ↓
harder transfer
```

olmalıdır.

Sürekli zor soru vermek de sürekli kolay soru vermek de yanlış.

---

# 89. CONTENT DIVERSITY

Aynı concept farklı:

```text
topic
sentence structure
question type
vocabulary
context
distractor structure
```

ile tekrar edilmelidir.

Bu, memorization yerine transfer sağlar.

---

# 90. KNOWLEDGE GRAPH BUILD PIPELINE

İlk kurulum:

```text
sources/
   ↓
document parser
   ↓
source normalization
   ↓
concept extraction
   ↓
taxonomy mapping
   ↓
relationship extraction
   ↓
human validation
   ↓
knowledge graph
```

---

# 91. YDS SOURCE ANALYSIS

Elimizdeki YDS/e-YDS kaynakları ilk olarak:

```text
question type
skill
concept
grammar
vocabulary
discourse
difficulty
distractor
topic
cognitive demand
```

açısından analiz edilecektir.

Ama:

> yeni sorular kaynak soruların yüzeysel paraphrase'leri olmayacaktır.

ÖSYM materyallerinin telif statüsü nedeniyle bu özellikle production policy olarak kabul edilmelidir.

---

# 92. YDS DNA

Source analysis sonucunda:

```text
YDS_DNA
```

oluşturulacaktır.

Örneğin:

```text
sentence_length_distribution
lexical_difficulty_distribution
topic_distribution
question_type_distribution
distractor_patterns
grammar_patterns
discourse_patterns
semantic_relationships
difficulty_distribution
```

Bu bir “copying model” değil:

> **assessment calibration model**

olacaktır.

---

# 93. CONTENT GENERATION POLICY

AI:

```text
learn from patterns
```

yapabilir.

AI:

```text
copy source
```

yapamaz.

AI:

```text
lightly paraphrase source
```

yapamaz.

AI:

```text
create new content satisfying abstract constraints
```

yapmalıdır.

---

# 94. ORIGINALITY PIPELINE

Her generated content:

```text
new content
 ↓
semantic similarity
 ↓
n-gram overlap
 ↓
phrase overlap
 ↓
source comparison
 ↓
risk score
```

ile kontrol edilir.

Threshold aşılırsa:

```text
REJECT
```

---

# 95. ACADEMIC CONTENT PIPELINE

Önerilen pipeline:

```text
Semantic Scholar
       │
       ├── topic discovery
       │
       ▼
CORE
       │
       ├── full-text/open access discovery
       │
       ▼
DOAJ / institutional repositories / licensed sources
       │
       ▼
License validation
       │
       ▼
Academic Corpus
       │
       ▼
Knowledge Extraction
       │
       ▼
Original Content Generation
```

Semantic Scholar açık erişim PDF filtresi ve paper/citation/reference metadata'sı sunuyor. CORE makine erişimli metadata ve full-text araştırma içeriği sağlıyor. DOAJ ise açık erişimli dergi ve makale dizini ile API/OAI-PMH/CSV erişimleri sunuyor.

---

# 96. LICENSE REGISTRY

Her document için:

```text
license_type
commercial_use
modification
text_mining
redistribution
attribution
source_url
verification_date
verified_by
```

tutulmalıdır.

Production corpus'a girecek bir document:

```text
license_status = verified
```

olmadan kullanılamaz.

---

# 97. CONTENT PROVENANCE

Her generated question:

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

metadata'sına sahip olmalıdır.

---

# 98. MODEL VERSIONING

AI model değiştiğinde:

```text
model_version
prompt_version
taxonomy_version
evaluator_version
```

kaydedilmelidir.

Böylece:

> “Bu soru neden eskisinden farklı üretildi?”

sorusu cevaplanabilir.

---

# 99. PROMPT MANAGEMENT

Prompt'lar kod içine dağılmamalıdır.

```text
ai/
├── prompts/
│   ├── analyzer/
│   ├── generator/
│   ├── evaluator/
│   ├── explainer/
│   └── tutor/
│
└── schemas/
```

Prompt versioning uygulanmalıdır.

---

# 100. CURSOR PROJECT STRUCTURE

Önerilen:

```text
/
├── docs/
│   ├── YDS-INTELLIGENCE-SPECIFICATION-v1.0.md
│   ├── KNOWLEDGE-GRAPH.md
│   ├── QUESTION-ENGINE.md
│   ├── LEARNER-MODEL.md
│   ├── ADAPTIVE-ENGINE.md
│   └── DATA-MODEL.md
│
├── sources/
│   ├── reference/
│   ├── academic/
│   ├── literary/
│   ├── licensed/
│   └── metadata/
│
├── knowledge/
│   ├── taxonomy/
│   ├── concepts/
│   ├── vocabulary/
│   ├── grammar/
│   ├── discourse/
│   └── misconceptions/
│
├── questions/
│   ├── generated/
│   ├── evaluated/
│   ├── approved/
│   └── retired/
│
├── ai/
│   ├── prompts/
│   ├── schemas/
│   └── evaluators/
│
├── learner/
│   ├── mastery/
│   ├── errors/
│   ├── history/
│   └── goals/
│
├── adaptive/
│   ├── selection/
│   ├── ranking/
│   ├── retention/
│   └── interventions/
│
└── tests/
```

---

# 101. CURSOR RULES

`.cursor/rules/`:

```text
yds-domain.mdc
knowledge-graph.mdc
question-generation.mdc
question-quality.mdc
learner-model.mdc
adaptive-engine.mdc
content-provenance.mdc
architecture.mdc
```

---

# 102. ARCHITECTURE RULE

Kod:

- duplicate service logic içermemeli
- aynı business logic farklı yerlerde tekrar edilmemeli
- domain logic UI içine gömülmemeli
- AI çağrıları rastgele component'lerde yapılmamalı
- prompts component'lere dağılmamalı
- database queries component'lere dağılmamalı

Architecture:

```text
UI
 ↓
Application Services
 ↓
Domain
 ↓
Repositories
 ↓
Infrastructure
```

olmalıdır.

---

# 103. AI SERVICE BOUNDARY

AI:

```text
AIService
 ├── analyze
 ├── generate
 ├── evaluate
 ├── explain
 └── tutor
```

üzerinden çağrılmalıdır.

UI doğrudan OpenAI/LLM API çağırmamalıdır.

---

# 104. DOMAIN SERVICES

Minimum:

```text
QuestionService
KnowledgeService
LearnerService
MasteryService
AdaptiveService
AssessmentService
StudyPlanService
ContentGenerationService
EvaluationService
```

---

# 105. MVP

İlk MVP'de her şeyi yapmaya çalışma.

## MVP 1

```text
source ingestion
taxonomy
question metadata
knowledge nodes
question graph
basic learner mastery
adaptive question selection
```

Amaç:

> **Sistem gerçekten öğrencinin zayıflığına göre soru seçebiliyor mu?**

---

# 106. MVP 2

```text
misconception engine
spaced repetition
personalized explanations
study missions
question generation
AI QA
```

---

# 107. V3

```text
empirical difficulty
psychometric calibration
advanced learner modeling
transfer detection
score forecasting
fully adaptive study plans
```

---

# 108. FUTURE

Daha ileri:

```text
knowledge tracing
Bayesian mastery
IRT
deep knowledge tracing
reinforcement learning
personalized intervention optimization
```

gibi yöntemler araştırılabilir.

Ancak bunlar MVP'de zorunlu değildir.

---

# 109. WHAT NOT TO BUILD

İlk aşamada:

```text
❌ giant generic chatbot
❌ 100k low-quality AI questions
❌ unnecessary graph database
❌ complex ML before enough data
❌ static study plans
❌ random question generation
❌ AI-only quality control
❌ source paraphrasing pipeline
```

yapılmamalıdır.

---

# 110. PRODUCT MOAT

Uzun vadeli moat:

```text
YDS Knowledge Graph
+
Question Graph
+
Learner Graph
+
Misconception Graph
+
Empirical Question Data
+
Learner Response Data
+
Adaptive Decision History
```

olacaktır.

Bir rakip aynı LLM API'sini kullanabilir.

Ama:

> **senin yıllar içinde oluşturduğun knowledge + question + learner graph'ını kolayca kopyalayamaz.**

---

# 111. FINAL SYSTEM

Nihai sistem:

```text
                  YDS INTELLIGENCE

                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      KNOWLEDGE       QUESTIONS      SOURCES
        GRAPH           GRAPH
          │              │
          └──────┬───────┘
                 │
                 ▼
          LEARNER MODEL
                 │
                 ▼
        ADAPTIVE ENGINE
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      TEACH    TEST     REVIEW
        │        │        │
        └────────┼────────┘
                 ▼
              UPDATE
                 │
                 └──────────► LOOP
```

---

# 112. NORTH STAR SENTENCE

Bu projenin bütün ekip tarafından ezberlenmesi gereken cümle:

> **“Biz soru sunmuyoruz; öğrencinin hedef puanına ulaşması için sıradaki en doğru öğrenme adımını seçiyoruz.”**

---

# 113. FINAL ACCEPTANCE CRITERIA

YDS Intelligence v1.0 başarılı sayılabilmesi için sistem:

### Knowledge

- [ ] YDS taxonomy mevcut
- [ ] concepts mevcut
- [ ] grammar graph mevcut
- [ ] vocabulary graph mevcut
- [ ] discourse graph mevcut
- [ ] misconception graph mevcut
- [ ] relationship model mevcut

### Questions

- [ ] Her soru metadata taşıyor
- [ ] Her sorunun doğru cevap gerekçesi var
- [ ] Her distractor'ın hata gerekçesi var
- [ ] Sorular concept'lere bağlı
- [ ] Sorular skill'lere bağlı
- [ ] Sorular misconception'lara bağlanabiliyor
- [ ] Difficulty metadata mevcut
- [ ] Question families mevcut

### Learner

- [ ] Mastery state mevcut
- [ ] Error state mevcut
- [ ] Evidence history mevcut
- [ ] Forgetting/retention state mevcut
- [ ] Goal model mevcut

### Adaptive

- [ ] Candidate retrieval mevcut
- [ ] Ranking mevcut
- [ ] Difficulty matching mevcut
- [ ] Misconception targeting mevcut
- [ ] Spaced repetition mevcut
- [ ] Next-best-action mevcut

### Generation

- [ ] QuestionSpec mevcut
- [ ] Generator mevcut
- [ ] Evaluator mevcut
- [ ] Rule engine mevcut
- [ ] Originality check mevcut
- [ ] Human review mevcut

### Content

- [ ] Source provenance mevcut
- [ ] License registry mevcut
- [ ] Academic ingestion mevcut
- [ ] Original passage generation mevcut

### UX

- [ ] “Why this question?” açıklaması mevcut
- [ ] Daily mission mevcut
- [ ] Progress mevcut
- [ ] Personalized feedback mevcut

---

# 114. IMPLEMENTATION ORDER

Cursor'a bütün sistemi tek seferde yazdırma.

Sıra:

```text
PHASE 1
Domain model
        ↓
PHASE 2
Database schema
        ↓
PHASE 3
Taxonomy + Knowledge Graph
        ↓
PHASE 4
Source ingestion
        ↓
PHASE 5
Question model
        ↓
PHASE 6
Question QA
        ↓
PHASE 7
Learner model
        ↓
PHASE 8
Mastery engine
        ↓
PHASE 9
Adaptive selection
        ↓
PHASE 10
Study plan
        ↓
PHASE 11
Question generation
        ↓
PHASE 12
Production UI
```

---

# 115. THE FINAL PRODUCT DEFINITION

Bu platform:

> **YDS için hazırlanmış statik bir eğitim sitesi değildir.**

> **Öğrencinin bilgi durumunu sürekli güncelleyen, YDS bilgisini bir knowledge graph üzerinde temsil eden, her sorunun pedagojik rolünü bilen, öğrencinin yanlışlarının altında yatan olası misconception'ları modelleyen ve her etkileşimden sonra bir sonraki öğrenme adımını yeniden hesaplayan adaptif bir öğrenme sistemidir.**

Öğrencinin sistemden beklediği şey:

> **“Bana daha fazla soru verme.”**

değil.

> **“Beni tanı. Eksiklerimi bul. Doğru zamanda doğru şeyi öğret. Ne yapacağımı düşünmek zorunda bırakma.”**

olmalıdır.

Ve sistemin cevabı:

> **“Tamam. Bugün senin için hazırladığım görev bu.”**

olmalıdır.

---

# VERSION 1.0 END

**Canonical architecture principle:**

```text
Knowledge
    +
Questions
    +
Learner State
    +
Evidence
    +
Adaptation
    =
YDS Intelligence
```

**Primary objective:**

> **Maximize learning gain per unit of student effort.**