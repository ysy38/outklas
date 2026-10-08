# YDS DNA v1

Tarih: 8 Ekim 2026 · Kaynak: 2018 İlkbahar + 2018 Sonbahar + 2023 Ekim + 2024 Kasım · Satır: **254** kabul edilmiş, metinsiz `analysis.questions`

Bu rapor soru metni içermez. Graph hâlâ v1.0 (155 / 280 / 113). Proposal’lar canonical düğüm değildir.

Dağılım kanıtı yalnızca `complete_exam` ve `partial_exam`. e-YDS dilimleri `evidence_scope = pattern_only`; “YDS’de preposition oranı %X” demek için kullanılmaz.

Yeni PDF avı durdu. Doygunluk sinyali (4. sınav neredeyse yeni grammar/discourse/çeldirici tipi getirmedi) durma kararıdır.

## Corpus

| Belge | Sınıf | DNA satır |
|---|---|---|
| yds-2024-11 | complete_exam | 64 |
| yds-2018 | complete_exam | 67 |
| yds-2018-2 | complete_exam | 63 |
| yds-2023-10 | partial_exam | 60 |

## Soru tipleri

| Tip | n | Not |
|---|---|---|
| reading_comprehension | 69 | en sık |
| grammar | 37 | |
| sentence_completion | 34 | |
| cloze | 27 | |
| vocabulary | 21 | |
| paragraph_completion | 15 | |
| closest_meaning | 13 | |
| irrelevant_sentence | 12 | |
| translation_en_tr | 10 | |
| translation_tr_en | 10 | |
| dialogue_completion | **6** | tek doymamış tip (`< 8`) |

## Beceriler ve bilişsel yük

En sık primary skill: `contextual_meaning` (63), `coherence` (56), `detail` (36), `paraphrase` (34), `collocation` (21), `inference` (18).

Bilişsel: `context_integration` (138), `logical_relationship` (137), `paraphrase_recognition` (67), `semantic_discrimination` (64), `evidence_identification` (55).

Pedagoji: analyze 184 / apply 34 / understand 24. Transfer çoğunlukla medium (208).

## Grammar

Sık: conjunction (72), adverbial_clause (46), tense (28), relative_clause (24), preposition (23), clause_connector (23), participle (17), passive (11), modal (10), noun_clause (8).

Seyrek (≤2): `aspect` (1), `parallelism` (1). Bunlar henüz DNA omurgası değil.

## Discourse

cause 57, contrast 53, result 33, concession 27, addition 15, sequence 12, condition 8, example 6, qualification 6, purpose 5, comparison 3.

## Çeldirici ve misconception

Çeldirici: semantic_mismatch 330, wrong_discourse_relation 210, meaning_shift 138, logical_incompatibility 123, collocation_failure 41, syntactic_mismatch 41, grammatical_mismatch 37, partial_truth 35, scope_mismatch 32, tense_mismatch 27, reference_mismatch 2.

Misconception: concession_vs_contrast 32, cause_vs_result_direction 28, tense_sequence_in_past_reference 14, collocation_by_meaning_only 12. Seyrek: false_synonym_in_context 3, despite_with_finite_clause 2, pronoun_reference_nearest_noun 1.

## YDS’ye özgü kombinasyonlar (n≥3, örnek)

- detail × reading_comprehension (51)
- inference × reading_comprehension (35)
- contextual_meaning × vocabulary (21)
- adverbial_clause × sentence_completion (20)
- contextual_meaning × cloze (15)
- main_idea × reading_comprehension (14)
- coherence × paragraph_completion (13)
- collocation × vocabulary (13)
- paraphrase × closest_meaning (13)
- argument_structure × irrelevant_sentence (12)
- cause × sentence_completion (10)
- contrast × sentence_completion (9)

Aileler primary concept etrafında; 47 aile. En kalabalıklar skill yüzeyleri (contextual_meaning 67, detail 51) — graph v2’de primary_concept’in skill vs discourse ayrımı insan incelemesi ister.

## 2015 OCR kararı: archive

2015 İlkbahar 11 ACCEPT ve 2015 Sonbahar 21 ACCEPT, corpus’ta zaten ≥8 olan tipler. Yeni question family yok. OCR yok.

## e-YDS

`sourceClass = topic_slice`, `evidenceScope = pattern_only`, `usableForDistribution = false`.

Kavram → family / çeldirici / construction için örüntü kanıtı. Sınav blueprint oranı değil.

## Proposal review — canonical insert = 0

373 unique proposal (çoğu kelime hapax):

| Karar | n |
|---|---|
| REJECT | 333 |
| PENDING | 40 |
| MERGE (tam `type:slug`) | 0 |
| RECOMMEND_ACCEPT | 0 (≥3, vocabulary dışı) |
| canonicalInserts | **0** |

PENDING kuyruğu: 10 topic (hapax alan adı), 2 connector (`even_so`, `while`), 1 grammar etiketi (`grammar_subordinating_conjunction`), 27 vocabulary (2–3 görülme; lemma node yapılmaz). `cognitive` → `domain:cognitive` çapraz-tip birleşmesi kapatıldı.

Graph v2 seed’e otomatik yazılmadı.

## Extraction freeze

Eşik: segmentation ≥ 0,95, option completeness ≥ 0,95, reconstruction ≥ 0,90 (failed olmayan rebuild).

| Belge | PDF tipi | seg | opt | recon | ACCEPT/80 | freeze |
|---|---|---|---|---|---|---|
| 2024 Kasım | ÖSYM tarama OCR | 1,00 | 1,00 | 1,00 | 0,85 | evet |
| 2018 | native text | 1,00 | 0,99 | 0,99 | 0,90 | evet |
| 2018-2 | native text | 1,00 | 1,00 | 1,00 | 0,89 | evet |
| 2023 Ekim | native text | 0,98 | 1,00 | 1,00 | 0,81 | evet |
| 2024 Mart | üçüncü taraf dizgi tarama + `Soru No` | **0,95** | **0,78** | **0,70** | 0,13 | **hayır** |

Mart 2024 OCR 89 sütun, ~10k kelime, ortalama güven 91,8. Native text katmanı yok sayıldı (3 sayfa, kullanılamaz). `Soru No: N` etiketleri eklendi: 34 → 76 blok (eksik 2, 3, 4, 9). Şıklar iki sütunda sık sık karşıya düşüyor (17 soruda boş A–E).

**Global freeze yok.** Kitapçık native/ÖSYM OCR bu eşikte; üçüncü taraf dizgi taraması değil. Extraction’ı burada dondurmak bu PDF tipini “çalışıyor” ilan etmek olurdu. Yeni PDF avı durdu; bu tip için extractor’a bir tur daha girmiyoruz.

## Canlı `analysis` şeması

Belgeler zaten kayıtlı: Kasım 64 soru canlı. 2018 / 2018-2 / 2023-10 DNA’sı yerelde 254 satır; metinsiz `import.sql` `.data/analysis/_live-import/` altında. Bu turda MCP 47 KB `question_nodes` yükünü tek seferde basmadı; yarım soru satırı bırakılmadı. Canlıya basmak `DATABASE_URL` veya parça parça MCP ile bir sonraki iş.

## QuestionSpec

`getQuestionSpec()` DNA boşluğundan deterministik spec üretir. LLM yok. Generator (Flash-Lite) ancak spec’ten sonra.

## Sonraki

Question Factory (spec → orijinal bağlam → soru → validator → judge → human). Adaptive engine sonra. Graph v2 yalnızca PENDING/MERGE insan kararından sonra.
