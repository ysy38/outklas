# Assessment principles

Rules for MCQ / restatement quality that do not depend on ÖSYM. Every rule is tagged.

## 1. A distractor is incorrect and plausible

**Claim:** High-quality distractors are incorrect but plausible, consistent with the context, and objectively wrong. They should be independent of one another; length, style, and grammatical form should not uniquely mark the key.

- Source: `research` — Benedetto, Taslimipoor & Buttery, BEA 2025, §2.3 (citing Yeung et al. 2019; Pho et al. 2015; Gao et al. 2019; Ghanem & Fyshe 2023).
- Evidence: literature synthesis, not a new experiment.
- YDS restatement: applies to sentence-level options (independence, no form clue, objectively wrong). “False synonym” and same word-class advice in §2.3 is **vocabulary/cloze**, not restatement — do not import it as a restatement rule (`unvalidated-hypothesis` if used there).
- Confidence: `high` for the general MCQ properties; `medium` for restatement transfer; `low` for lexical “false synonym” on full-sentence options.
- Limit: §2.3 notes domain differences; language-learning ≠ mathematics ≠ restatement.

## 2. Non-equivalence is not the same as incorrectness

**Claim:** An option can fail to restate the source without being excluded by the source.

- Source: `project-decision` — semantic-validity contract (`NOT_ENTAILED_COMPATIBLE`). Supported by `research` Benedetto §2.3 “objectively unacceptable,” which is stronger than “different wording.”
- Evidence: definitional + prior factory cases (until-cessation, although→because).
- YDS restatement: the task stem asks for the closest meaning, which is **not** a license to treat every non-paraphrase as a valid wrong answer under Strict.
- Confidence: `high` as a project contract; `medium` as a claim about how ÖSYM keys were written (not independently reviewed).
- Limit: exam-oriented policy is **not selected** in v0.1.

## 3. Student responses are the gold standard for distractor *performance*

**Claim:** Traditional Distractor Analysis on real learner responses is the gold-standard evaluation of how distractors perform in exams. Static metrics are substitutes used when pretesting is infeasible.

- Source: `research` — Benedetto 2025 §3–§4.1, §6; also Nunnally & Bernstein 1994 as cited there.
- Evidence: survey taxonomy (dynamic vs static), not a YDS field study.
- YDS restatement: HARD, observedDifficulty, and “this trap works” stay `not_run` until student data exist.
- Confidence: `high`.
- Limit: pretesting can be infeasible for security (Ha et al. 2019, cited in Benedetto §1). That does not make static scores a substitute proof.

## 4. BLEU / ROUGE / n-gram overlap are not exam quality

**Claim:** The most common automatic DG metrics compare generated distractors to reference distractors and assume (i) the references are high quality and (ii) they are the only high-quality distractors. Both assumptions are strong and not well supported, including on RACE.

- Source: `research` — Benedetto 2025 §5.1, §6; Alhazmi et al. EMNLP 2024 §4.1.2 (ranking/n-gram struggle with semantic relatedness, multiple answers, nonsensical distractors); Awalurahman & Budi 2024 RQ3 / Discussion (no agreed gold-standard MCQ/distractor metric).
- Evidence: survey of published DG papers; not an ablation on YDS.
- YDS restatement: never score a Writer five by overlap with a gold distractor string, an ÖSYM option, or another model’s option.
- Confidence: `high` as a prohibition; the papers are not about ÖSYM.
- Limit: stand-alone semantic metrics exist but are not validated here.

## 5. Closest-in-meaning is sparsely studied in DG

**Claim:** Automatic distractor generation research is dominated by cloze, reading MCQ, and science items. Closest-in-meaning appears in only three of 60 SLR studies (2009–2024), using corpus/WordNet/collocation methods, not LLM restatement fives.

- Source: `research` — Awalurahman & Budi, PeerJ CS 2024, results on question types (Yusuf, Hidayah & Adji 2023; Susanti, Iida & Tokunaga 2015; Susanti et al. 2018).
- Evidence: SLR extraction, Kitchenham quality filter (score ≥ 6).
- YDS restatement: do not treat cloze/RACE DG recipes as restatement recipes.
- Confidence: `high` for the count in that SLR; `low` for any method transfer.
- Limit: SLR may have missed studies; linguistic-method papers often omitted scoring details.

## 6. LLM-written MCQs are not self-validating

**Claim:** In one OS-course study, expert-validated ChatGPT-4.0 zero-shot MCQs were not psychometrically different from human MCQs (difficulty, discrimination, point-biserial, network invariance). Items that failed two-pass expert validation were discarded, not iterated. n = 42 students, 14 LLM + 21 human items, ceiling effect (easy items, low DI).

- Source: `research` — Crk & Gultepe, Front. Educ. 2026, Methods §2, Results §3, Discussion §4, Conclusion §5.
- Evidence: classroom psychometrics, two cohorts, matched pairs, IRB.
- YDS restatement: **does not** show that an LLM can declare restatement fives valid. It shows that **expert-validated** CS MCQs can match human items on that course. Transfer to high-stakes YDS restatement is `unvalidated-hypothesis`.
- Confidence: `medium` inside that course; `low` for YDS.
- Limit: small n, one domain, ChatGPT-4.0 only, easy items, no restatement construct.

## 7. Instructors must verify automated DG

**Claim:** PLM distractor generation still hallucinates; humans must check plausibility, reliability, diversity, objective alignment, and ethics.

- Source: `research` — Alhazmi et al. EMNLP 2024 §6.1–6.2, Limitations §7.
- Evidence: survey discussion, not a controlled YDS trial.
- YDS restatement: maps to workflow steps 7–8.
- Confidence: `high` as a process requirement; `medium` as a claim about current Writer failure modes (those come from factory pilots, `project-decision` / observation).

## 8. HARD is not an editorial label

**Claim:** Difficulty and discrimination are psychometric quantities from responses (item difficulty p, discrimination index, point-biserial). Editorial “this looks hard” is not that quantity.

- Source: `research` — Crk & Gultepe 2026 §2.3; Benedetto 2025 §4.1; `project-decision` HARD `not_run`.
- Confidence: `high`.

## 9. Do not redistribute ÖSYM item text

**Claim:** Booklets in this repo are `analysis_only` / FSEK, all rights reserved. Skill files store ids, hashes, counts, and paraphrased mechanisms — not stems.

- Source: `project-decision` + DNA `license.status: analysis_only`.
- Confidence: `high`.
