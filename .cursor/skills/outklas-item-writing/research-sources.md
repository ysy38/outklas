# Research sources and finding matrix

Papers were read from full text (ACL PDFs, PMC HTML, Frontiers full article), not abstracts only. None is ÖSYM-specific. Transfer to YDS restatement is stated per row.

Evidence types: `survey` | `slr` | `classroom-psychometrics` | `citation-inside-survey` | `official-item-count` | `project-decision`.

Confidence: `high` | `medium` | `low`.

## Source records

| ID | Work | Venue | What was read |
| --- | --- | --- | --- |
| S1 | Alhazmi, Sheng, Zhang, Zaib & Alhazmi. *Distractor Generation in Multiple-Choice Tasks: A Survey of Methods, Datasets, and Evaluation.* | EMNLP 2024, pp. 14437–14458. ACL Anthology 2024.emnlp-main.799 | Full PDF: tasks §2, methods §3, evaluation §4, findings/future §5–6, limitations §7, appendix C |
| S2 | Benedetto, Taslimipoor & Buttery. *A Survey on Automated Distractor Evaluation in Multiple-Choice Tasks.* | BEA 2025, pp. 55–69. ACL Anthology 2025.bea-1.5 | Full PDF: §1–2.3, taxonomy §3, dynamic §4, static §5, discussion §6, limitations |
| S3 | Awalurahman & Budi. *Automatic distractor generation in multiple-choice questions: a systematic literature review.* | PeerJ Comput. Sci. 2024. PMC11623049 | Full PMC text: Kitchenham method, RQ1–RQ3, closest-in-meaning notes, evaluation tables, discussion/limitations |
| S4 | Crk & Gultepe. *Evaluating the instrumental quality of LLM-generated assessment items.* | Front. Educ. 2026. 10.3389/feduc.2026.1837523 | Full article: methods §2, results §3, discussion §4, conclusion §5, ethics/data statements |

Companion factory contracts (not papers): restatement semantic-validity v1; Stage 0 source–key integrity v1; editorial-gold v1 (`humanApproval: pending`).

## Finding matrix

### S1-F1 — DG is a distinct task from generic MCQ generation

- Section: §1, contribution list
- Claim: Prior MCQ surveys under-discuss distractor generation; this survey covers FITB and MCQ DG, datasets, methods, metrics.
- Evidence: `survey` of 100+ papers
- YDS restatement: useful as a map of **other** item types. Restatement / closest-meaning is not a DG benchmark here.
- Limits: English DG; rapid ageing (§7)
- Confidence: `high` as a literature map; `low` as a restatement method source
- Kind: `research`

### S1-F2 — Automatic metrics miss semantic relatedness and multiple valid distractors

- Section: §4.1.1–4.1.2
- Claim: Ranking and n-gram metrics (incl. BLEU) struggle with semantic relatedness, multiple answers, and nonsensical distractors.
- Evidence: `survey` of metric use
- YDS restatement: forbids overlap-with-reference as a quality gate
- Limits: does not propose a restatement-specific metric
- Confidence: `high`
- Kind: `research`

### S1-F3 — PLM DG still needs human verification

- Section: §6.1–6.2, §7
- Claim: Hallucination and costly human labels remain; instructors must verify plausibility, reliability, diversity, objective alignment, ethics. Survey coverage of SOTA may lag.
- Evidence: `survey` discussion
- YDS restatement: workflow steps 7–8
- Limits: not a controlled comparison of review protocols
- Confidence: `high` as process; `medium` as a claim about any one model
- Kind: `research`

### S2-F1 — Good distractors are incorrect, plausible, independent, form-matched

- Section: §2.3
- Claim: Objectively unacceptable yet plausible; capture misconceptions where possible; independent; semantically/grammatically coherent; similar length/style/form. Language-pedagogy “false synonyms” / same word class is a **lexical** guideline.
- Evidence: `survey` of educational guidelines (Yeung 2019; Lee 2016; Pho 2015; Gao 2019; Heaton 1988; Goodrich 1977)
- YDS restatement: independence + no form clue + objectively wrong apply. False-synonym advice does **not** automatically apply to full-sentence options.
- Limits: domain differences acknowledged in §2.3
- Confidence: `high` general MCQ; `medium` restatement transfer
- Kind: `research`

### S2-F2 — Traditional Distractor Analysis is the gold standard for performance

- Section: §3, §4.1, §6
- Claim: Dynamic evaluation on real learner responses measures exam behaviour. Static metrics are substitutes. BLEU/ROUGE assume unique high-quality reference distractors; those assumptions are not well supported (incl. RACE).
- Evidence: `survey` taxonomy + critique
- YDS restatement: HARD / observedDifficulty stay `not_run` without student data; do not score Writer output against ÖSYM option strings
- Limits: authors do not yet offer a replacement static metric; pretesting may be infeasible for security
- Confidence: `high`
- Kind: `research`

### S2-F3 — Generation is easier to iterate than evaluation is to get right

- Section: §1–2.2
- Claim: LLMs make it easy to dump many distractors; evaluation literature is thinner and often misaligned with exam performance.
- Evidence: `survey`
- YDS restatement: more Writer samples ≠ more proven items
- Confidence: `high`
- Kind: `research`

### S3-F1 — 60 studies, 2009–2024; transformers dominant; eval not standardised

- Section: Results, RQ2–RQ3, Discussion
- Claim: Statistical/transformer methods cover the most question types. Top metrics: accuracy, difficulty, fluency, readability, relevance, precision, recall, BLEU, ROUGE, METEOR. Split between human-annotated and automatic. Literature still lacks a gold-standard MCQ/distractor eval (citing Ch & Saha 2020; Kurdi 2020; Das 2021).
- Evidence: `slr` (Kitchenham; QA score ≥ 6)
- YDS restatement: do not treat “BLEU went up” as restatement quality
- Limits: linguistic-method papers often omitted scoring; top-10 metric cut; English-heavy
- Confidence: `high` for the SLR’s own corpus; `medium` as completeness of the field
- Kind: `research`

### S3-F2 — Closest-in-meaning is rare in DG research

- Section: RQ1 results (question types / data sources)
- Claim: Closest-in-meaning and mixed types were uncommon (three studies: Yusuf et al. 2023 collocation/POS; Susanti et al. 2015 corpus+WordNet; Susanti et al. 2018 WordNet+JACET8000). Not LLM restatement fives.
- Evidence: `slr` extraction
- YDS restatement: **no** published DG recipe in this SLR is a YDS restatement engine
- Limits: possible missed studies; those three are vocabulary-oriented
- Confidence: `high` inside the SLR; `low` that the next paper will stay rare
- Kind: `research`

### S4-F1 — Expert-validated zero-shot ChatGPT-4 MCQs matched human items in one OS course

- Section: §2 methods, §3.1–3.4 results, §4 discussion, §5 conclusion
- Claim: n = 42 students, 14 LLM + 21 human MCQs. No significant difference on item difficulty, discrimination index, corrected point-biserial, item reliability, or network invariance/strength. Failed LLM items were discarded, not iteratively steered. Items were easy (ceiling, low DI). Predictive validity to projects was weak/negative for **both** human and LLM items.
- Evidence: `classroom-psychometrics` (two cohorts, matched pairs, IRB)
- YDS restatement: supports **expert validation before use**; does **not** support self-validation; does **not** speak to restatement or high-stakes language exams
- Limits: small n, one CS course, ChatGPT-4.0 only, easy items, not restatement, results may be tool-specific (§4)
- Confidence: `medium` in-domain; `low` for YDS
- Kind: `research`

### S4-F2 — Iterative prompt-repair may bias difficulty

- Section: §4 comparison with Law et al. 2025
- Claim: Other studies iterate failed LLM items until they pass; this study discards and re-prompts. Authors suggest iteration may steer items easier.
- Evidence: cross-paper comparison, not a controlled ablation
- YDS restatement: do not “fix” a bad five by chatting until it looks like a key
- Confidence: `low`–`medium`
- Kind: `research`

## Unvalidated assumptions (real item data missing or insufficient)

Do not promote these to rules.

1. ÖSYM restatement **prefers** although→because, only-if→if, may→must, some→all, until→after, or CF→factual as distractor engines. **Counter-evidence:** *only if* count 0/44; *until* 1/44 stems; although→because not shown as a keyed distractor pattern. Kind: `unvalidated-hypothesis`.
2. DNA `distractor_type:*` on closest-meaning rows names the true mechanism. All 13 keyed rows `unreviewed`; 36/52 slots are generic `meaning_shift`. Kind: `unvalidated-hypothesis`.
3. Exam-oriented policy (hosted NEC misreadings as distractors) matches ÖSYM keys. Not selected; not independently reviewed. Kind: `unvalidated-hypothesis` + `project-decision` to keep it off.
4. Same-agent option classes in osym-patterns.md are correct. Independent review missing. Kind: `unvalidated-hypothesis`.
5. Factory original sentences (archive, port, ethics, ferry, …) are psychometrically HARD. No student responses. Kind: `unvalidated-hypothesis`.
6. Crk & Gultepe’s expert-validation protocol transfers to YDS restatement Writer output. Different construct, stakes, and language. Kind: `unvalidated-hypothesis`.
7. Four `CONTRADICTED` plans are always constructable for every well-formed source. Plan-pool v1: 0/5. Kind: `unvalidated-hypothesis` (may be false for some sources).
8. `questions-verified.json` wording is character-accurate. 2024-11 stems still show OCR tokens. Kind: `unvalidated-hypothesis` that verified = clean.

## What this matrix does not claim

- That production yield improved
- That the Writer prompt should change
- That any paper measured YDS or YÖKDİL restatement
- That editorial-gold or DNA is human gold
