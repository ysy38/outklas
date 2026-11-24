# ÖSYM restatement observations v0.1

Not a gold set. Not a frequency ranking of traps. Item wording is not stored here (FSEK / `analysis_only`).

## Provenance

| Layer | What it is | Gold? |
| --- | --- | --- |
| Official booklet PDFs (ÖSYM or third-party scan) | Source documents; some `complete_exam`, some `partial_exam`; license `analysis_only` | No |
| Reconstruct `questions-text` / `questions-ocr` / `questions-verified` | Extracted wording; 2024-11 `questions-verified` is OCR text check, not label gold | No |
| DNA `question_type:closest_meaning`, section `restatement` | Keys + unreviewed analysis rows | **No** |
| Editorial-gold `door`, `snow`, `clinic` | Factory-authored; `humanApproval: pending`; `editoriallyAccepted: 0` | **No** (and not ÖSYM) |
| Factory pilots / Writer fives | Original Outklas sentences | No |

`src/modules/factory/item-model/gold.ts` already marks DNA with `labelTrust: dna_labels_are_not_human_judgment` and `textIncluded: false`. Do not reverse that.

Kind: `project-decision` + `official-item-observation`. Confidence: `high`.

## DNA keyed restatement inventory

13 rows with a stored key. All `humanReviewStatus: unreviewed`. All `validationStatus: accepted` (pipeline, not human gold). All `cognitiveDemand: analyze`.

| document | sourceClass | numbers | keys |
| --- | --- | --- | --- |
| yds-2018 | complete_exam | 69, 70, 71 | C, D, E |
| yds-2018-2 | complete_exam | 68, 69, 70, 71 | C, B, E, A |
| yds-2023-10 | partial_exam | 68, 71 | A, C |
| yds-2024-11 | complete_exam | 68, 69, 70, 71 | D, E, B, D |

yds-2018 reconstruct also has Q68; **no DNA key** — not classified as keyed. yds-2023-10 reconstruct Q69–Q70: **no DNA key**.

Keys are treated as **booklet answer-key candidates** (DNA `answer` plus `answerKeyPage` on the source document). They are **not** independently re-verified in this skill. Kind: `official-item-observation`. Confidence: `medium` (extraction; unreviewed).

## Reconstruct pool (pattern counts only)

Unique restatement-section items after preferring verified > text > ocr: **n = 44** across 12 exam folders (2013–2024).

Stem marker counts (regex, English function words; not discourse-parsed):

| Marker family | stems / 44 |
| --- | --- |
| may / might / can | 10 |
| although / though / even though / despite / in spite of / while | 9 |
| some / few / several / many | 7 |
| because / since / as a result / therefore / due to | 6 |
| after / before / once / when | 4 |
| if / unless / provided | 4 |
| all / every / each / any | 3 |
| only (any) | 2 |
| counterfactual-ish (*would have* / *if … were*) | 2 |
| until / till | 1 |
| must / have to / should | 1 |
| **only if** | **0** |

Kind: `official-item-observation`. Confidence: `medium` (regex over-matches *while*/*as*/*since*; OCR errors in 2024-11). **Do not** turn these into “ÖSYM prefers although traps.”

## Targeted transformations — what was actually seen

| Transformation | In this pool | Allowed claim |
| --- | --- | --- |
| although → because as **distractor** | Concession stems 9/44; cause marker in some option 3/9; in keyed `yds-2024-11` Q70 the cause marker is in the **key** (paraphrase of *given that*), not a flip of *although* | Not shown as a frequent ÖSYM distractor |
| only if → if / sufficient | 0 *only if* strings | Must not be called an ÖSYM pattern |
| may → must | 10 may-stems, 1 must-stem; no counted upgrade rate | Unvalidated as a preferred trap |
| some → all | Both families appear; no option-level rate on the 44 | Unvalidated as a preferred trap |
| until → after | 1 stem with *until* (`yds-2015-fall` Q69, **no key**); 1 keyed **key** uses *not until after* as “years following” (`yds-2018` Q71 E) | Not a counted distractor pattern |
| counterfactual | `yds-2014-spring` Q70 CF **source**, no DNA key; `yds-2018` Q71 C CF **option** on factual source | Two different directions; do not collapse |

Kind: `official-item-observation`. Confidence: `high` for absence of *only if*; `medium` for the rest.

## Option classes on keyed items

Same-agent draft, 2026-11-23. **Independent review: missing.** OCR noise on 2024-11. DNA types ignored as proof.

Classes: E = ENTAILED, C = CONTRADICTED, N = NOT_ENTAILED_COMPATIBLE, U = UNDETERMINED. Key should be E.

### yds-2018 Q69 — among-the-oldest carving (key C)

| Opt | Class | Evidence (paraphrase) |
| --- | --- | --- |
| A | C | Superlative upgrade (*the oldest*); date fused onto the material |
| B | C | Superlative upgrade |
| C | E | Discovery year/place, *one of the oldest*, material preserved |
| D | C | Invented set of many such carvings + superlative |
| E | U | Discovery vs “identified as material”; wording unstable |

### yds-2018 Q70 — public vs advertisers on subliminal ads (key D)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C or U | Ridicule **of the public** vs scoff **at the idea**; extra object |
| B | C | Advertisers *praise* excludes *scoff* |
| C | C | Same polarity flip |
| D | E | Public belief + advertiser ridicule preserved |
| E | E or N | Weaker “some people use it” may be entailed by “widely practiced”; incomplete restatement / second-answer risk. DNA `scope_mismatch`. **U until review** |

### yds-2018 Q71 — revolution then dress change (key E)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C or U | Extra *although*; “only after many years” may overspecify |
| B | C | Extra obligation (*had to allow*) |
| C | U | CF overlay on a factual source; not independently sorted |
| D | C | Reverse causality (fashion as contributing to the revolution) |
| E | E | *not until after* + turmoil as the producer of the change |

### yds-2018-2 Q68 — right to refuse (key C)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C | Actual choice vs right; deadly results attached to **intervention** not refusal |
| B | C or N | *could* vs right; “without considering” extra |
| C | E | Entitlement despite deadly results of **rejecting** |
| D | U | *oppose* vs refuse; extra *aware* |
| E | C | Mere possibility of considering ≠ right to refuse |

### yds-2018-2 Q69 — games waste-of-time vs skill vehicle (key B)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C | Swaps who believes usefulness vs futility |
| B | E | Concession + certain games as training preserved |
| C | C | Extra “they know” |
| D | U | Unspecified thinker; “some people practising” vs certain games |
| E | C | Narrator treats waste-of-time as possibly true, not as some people’s belief |

### yds-2018-2 Q70 — cameras let residents monitor (key E)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C | Residents as contributors / agents of the project |
| B | C | Project monitors to inform; purpose extra; agent swap |
| C | C or N | Invented *reduce* function; source silent on reduction → likely N; if offered as the cameras’ function, still not E |
| D | C or N | *combat* vs *monitor* |
| E | E | Enable residents to monitor (reconstruct text truncated — E **candidate**, U if truncation hides a tail) |

### yds-2018-2 Q71 — awareness illustrated by research volume (key A)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | E | Rise in research volume illustrates growing recognition |
| B | C | Impact itself increased vs awareness of impact |
| C | C | Aware of research volume vs aware of impact |
| D | N | Research *may lead to* awareness: extra cause, not excluded |
| E | C | Invented residual need; extra *although* |

### yds-2023-10 Q68 — flooded forests (key A)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | E | Waterlogged, no longer carbon sinks, emit as they decay |
| B | C | Hypothetical *could be flooded* vs asserted flooded forests |
| C | U | *more likely* / *therefore* hedging |
| D | U | “sufficient amounts” vs cannot act as sinks |
| E | C | Extra necessity of decay as the why |

### yds-2023-10 Q71 — few students explore (key C)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C | *Regardless of* workload excludes *because of* workload |
| B | U | *may discourage* weakens cause; “those who try” may be E of *few* |
| C | E | Best childhood experience + few students + workload cause |
| D | U | Near-paraphrase of C; possible second key |
| E | U | Reconstruct truncated (*admit*) |

### yds-2024-11 Q68 — thanks and later help (key D)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C | More likely to **thank others** vs be helpful again |
| B | U | Different causal path |
| C | U | Social value / thanks order |
| D | E | Repeat helpful behaviour when thanked; pleasure of being valued |
| E | C | Reverse: thanks → being socially valued as the main result |

OCR: stem has garbled tokens. Nearby classes stay conservative.

### yds-2024-11 Q69 — antibiotic crop spray (key E)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C or N | Extra “still at risk despite” |
| B | C | Disease *cannot be controlled* vs used **to control** |
| C | C | Invented CF destruction without streptomycin |
| D | C | Invented *blamed for* the increase |
| E | E | Increase + streptomycin as one agent of control |

### yds-2024-11 Q70 — aloe native / global because antioxidants (key B)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | C | Extra worldwide *realisation* event |
| B | E candidate | *while* + global use + *because* antioxidants. *first grown across* vs *originally native* is a possible mismatch → **U until review** |
| C | C | Extra “first discovered there”; *as* as cause of origin |
| D | C | Extra “considering its benefits” as reason for first growing |
| E | C | Extra historical *used to ensure* healthy skin |

Note: key *because* restates *given that*, not *although*. This is **not** an although→because distractor example.

### yds-2024-11 Q71 — sedentary lifestyles and health shift (key D)

| Opt | Class | Evidence |
| --- | --- | --- |
| A | U | Drops tech as cause of sedentary; close chain |
| B | C | Extra *inevitable*; *more and more* |
| C | U | Reordered chain tech → habits → sedentary |
| D | E | Tech → sedentary; health shift; seems to result from new habits |
| E | U | Extra contrast *but* |

## What this inventory is not

- Not human gold
- Not a claim that ÖSYM “usually” uses any T-code
- Not permission to copy stems into Writer prompts
- Not independent review

Kind: `official-item-observation` with `independent_review: missing`. Confidence per cell: `low`–`medium`.
