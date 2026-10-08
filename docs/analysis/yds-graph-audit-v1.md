# YDS Graph Audit v1 — DNA v1 ↔ Knowledge Graph v1.0

Tarih: 8 Ekim 2026 · DNA: v1 (254 metinsiz satır, 4 sınav: 2018 İlkbahar, 2018 Sonbahar, 2023 Ekim, 2024 Kasım) · Graph: v1.0 (155 düğüm / 280 kenar / 113 legacy eşleme) · Profil: `yds-profile.v1` (`docs/analysis/yds-profile-v1.json`)

Bu rapor soru metni içermez. Sayılar `analysis.questions` etiketlerinden ve yerel reconstruct dosyalarındaki bağlaç başlangıç sayımlarından gelir. Hiçbir canonical düğüm veya kenar eklenmedi/silinmedi (**canonical değişiklik: 0**). YÖKDİL için hiçbir şey eklenmedi.

Kanıt seviyesi (profil ile aynı kural): **frequent** ≥10 soru ve ≥3 sınav · **observed** ≥3 soru ve ≥2 sınav · **rare** daha az · **unsupported** hiç gözlenmedi.

Önemli sınır: 254 etiketin tamamı model analizinden geliyor (ortalama analiz güveni 0.799, **insan incelemesi 0**). Aşağıdaki her öneri "DNA bunu gösteriyor" demektir; "YDS böyledir" demek için insan onayı gerekir.

---

## A. Coverage

| Düğüm tipi | Graph | DNA’da kanıtlı | Unsupported |
|---|---|---|---|
| question_type | 13 | 11 | 2 (`translation` soyut ebeveyn, `situation_appropriate`) |
| skill | 24 | 18 | 6 (`antonym`, `polysemy`, `register`, `speaker_intent`, `tone`, `word_formation`) |
| grammar | 20 | 16 | 3 (`article`, `inversion`, `subject_verb_agreement`) + `determiner` hiç etiketlenmedi |
| grammar_pattern | 4 | 3 | 1 (`infinitive_connector`) |
| discourse_relation | 12 | 11 | 1 (`emphasis`) |
| connector | 45 | 40 | 5 (`by_the_time`, `in_order_that`, `in_order_to`, `so_as_to`, `so_that`) |
| cognitive_skill | 10 | 9 | 1 (`prediction`) |
| misconception | 8 | 7 | 1 (`however_as_subordinator`) |
| distractor_type | 14 | 11 | 3 (`near_synonym`, `part_of_speech_mismatch`, `register_mismatch`) |
| domain | 5 | — | yapısal |
| topic | **0** | — | tip tanımlı, düğüm yok |

Toplam 23 unsupported (domain hariç). 4 sınavlık örneklemde "gözlenmedi" ≠ "YDS’de yok"; bu düğümler silinmez, generation hedefi olmaz.

Soru tipi kapsamı: 10 tip frequent, `dialogue_completion` observed (6 soru / 2 sınav, tek doymamış tip).

## B. DNA → Graph mapping

- DNA’daki her etiket canonical bir `type:slug`; validator bilinmeyen ref’i reddettiği için **eşlenmeyen etiket yok**.
- Asıl sorun eşlemenin değil, **facet karışıklığı**:
  - Primary concept facet’i 6 düğüm tipini karıştırıyor. İlk 7 kavramın 6’sı `skill:*` (contextual_meaning 67, detail 51, inference 39, paraphrase 38, coherence 30, collocation 28). Grammar/discourse düğümleri ancak sonra geliyor (adverbial_clause 33, cause 26, contrast 24, concession 18).
  - Primary concept olarak `grammar_pattern:*` (3+3+3) ve bir kez `connector:because` görülüyor. Bunlar pattern veya bağlaç, kavram değil.
- Factory bu yüzden "family"yi tek bir primary concept alanından değil, en spesifik kanıttan türetiyor: cevap ilişkisi > discourse > pattern > grammar > skill (`familyConcept`).

## C. Unsupported nodes

| Düğüm | Öneri | Gerekçe |
|---|---|---|
| `question_type:translation` | KEEP | soyut ebeveyn; çocukları (`en_tr`, `tr_en`) frequent |
| `question_type:situation_appropriate` | KEEP, generation dışı | 4 sınavda yok; güncel YDS biçiminde olup olmadığı insan kararı |
| `skill:tone`, `skill:speaker_intent` | KEEP, `measures` kenarı MODIFY adayı | graph "ölçülür" diyor (reading→tone, dialogue→speaker_intent) ama DNA hiç göstermiyor |
| `skill:antonym`, `polysemy`, `register`, `word_formation` | KEEP | genel İngilizce; YDS’de kanıt yok |
| `grammar:article`, `inversion`, `subject_verb_agreement`, `determiner` | KEEP | kanıt yok; generation hedefi olmaz |
| `grammar_pattern:infinitive_connector` + `in_order_to`, `so_as_to`, `so_that`, `in_order_that` | KEEP | purpose ilişkisi observed (5) ama bu bağlaçlarla değil |
| `connector:by_the_time` | KEEP | yerel sayımda 1 kez seçenek başında; etiketlenmemiş |
| `discourse_relation:emphasis` | KEEP | kanıt yok |
| `cognitive_skill:prediction` | KEEP, `measures` MODIFY adayı | paragraph_completion→prediction kenarı kanıtsız |
| `misconception:however_as_subordinator` | KEEP | `exploits` kenarları var, gözlem yok |
| `distractor_type:near_synonym`, `part_of_speech_mismatch`, `register_mismatch` | KEEP | etiketleyici bunların yerine `semantic_mismatch` / `grammatical_mismatch` kullanıyor (bkz. L) |

## D. Duplicates / overlaps

| Çift | Durum | Öneri |
|---|---|---|
| `skill:inference` ↔ `cognitive_skill:inference` | aynı ad, iki facet; graph’ta `related_to` | KEEP; açıklamaları ayrıştır (skill = soru hedefi, cognitive = süreç) |
| `skill:paraphrase` ↔ `cognitive_skill:paraphrase_recognition` | aynı ilişki | KEEP; aynı ayrım |
| `skill:cause_effect` ↔ `discourse_relation:cause/result` | reading becerisi vs. cümle ilişkisi | KEEP; reading dışında `cause_effect` kullanılmasın |
| `skill:synonym` ↔ `skill:lexical_distinction` | synonym 1 soru, lexical_distinction 27 | MERGE adayı (`synonym` → `lexical_distinction` altı), **insan onayı** |
| `distractor_type:grammatical_mismatch` ↔ `syntactic_mismatch` ↔ `part_of_speech_mismatch` | sınırlar bulanık (17 / 21 / 0) | MODIFY: tanımları netleştir; `part_of_speech` → `grammatical` altına MERGE adayı |
| `distractor_type:near_synonym` ↔ `semantic_mismatch` | near_synonym 0, semantic_mismatch 123 | MODIFY (bkz. L) |
| `grammar:conjunction` ↔ `grammar:adverbial_clause` ↔ `grammar_pattern:clause_connector` | aynı soruya üçü birlikte etiketleniyor | MODIFY (bkz. G) |

## E. Missing nodes

Seçenek başında görülen ama graph’ta bağlaç düğümü olmayan ifadeler. Sayım, yerel 4 sınavın reconstruct dosyalarında seçenek ilk kelimesidir. Bütün tipleri kapsar ve kaba bir göstergedir.

| İfade | Seçenek | Sınav | Not |
|---|---|---|---|
| while | 14 | 4 | **çok anlamlı**: contrast / concession / zaman |
| since | 11 | 4 | **çok anlamlı**: cause / zaman |
| even if | 11 | 3 | concession + condition |
| when | 11 | 4 | zaman (sequence) |
| as (yalın) | ~13 | 4 | cause / zaman / tarz; çok anlamlı |
| whether | 8 | 3 | noun clause / condition |
| given that | 8 | 4 | cause |
| so | 7 | 3 | result (veya `so ... that`) |
| once | 6 | 4 | zaman / condition |
| as far as · as if · regardless of · as opposed to · yet · rather than · instead of | 3–5 | 2–4 | — |
| though · even so · now that | 1 | 1 | rare |

**Model kısıtı:** Graph’ta her bağlacın tam olarak bir `expressed_by` ilişkisi var (çok ilişkili bağlaç: 0). `while`, `since`, `as`, `once` gibi ifadeler bu modelde doğru temsil edilemez. Bunları "ilk anlamıyla" eklemek yanlış canonical veri üretir. Önce şema kararı gerekir (bkz. N).

Diğer eksikler:
- `discourse_relation:qualification` observed (6) ama hiçbir bağlaca bağlı değil.
- `topic` tipi tanımlı ama boş. Factory `contextDomains` (12 alan) yerelde tutuluyor, graph’a yazılmadı.

## F. Edge consistency

- **Kenarsız düğümler (6):** `distractor_type:logical_incompatibility` (63 soru), `meaning_shift` (60), `partial_truth` (21), `scope_mismatch` (19), `part_of_speech_mismatch`, `register_mismatch`. İlk dördü frequent ama graph’ta hiçbir misconception’a veya soru tipine bağlı değil.
- **Çift kenarlar:** `concession—contrast` ve `cause—result` hem `related_to` hem `often_confused_with`. Öneri MERGE: yalnız `often_confused_with` kalsın.
- **`measures` boşlukları (31):** DNA’da güçlü ama graph’ta yok. En büyükleri:
  - sentence_completion→context_integration 34/34
  - reading→paraphrase_recognition 34
  - grammar→logical_relationship 27
  - vocabulary→semantic_discrimination 21/21
  - vocabulary→context_integration 21/21
  - irrelevant_sentence→argument_structure 12/12
  - Öneri: yalnız frequent olanlar için ADD, **insan onayı**.
- **Kanıtsız `measures` (8):** reading→reference, reading→tone, grammar→relative_clause, sentence_completion→tense, vocabulary→word_meaning, paragraph_completion→prediction, irrelevant_sentence→main_idea, dialogue→speaker_intent. Öneri KEEP. Bu kenarlar 4 sınavda gözlenmedi; DNA genişleyince yeniden bakılır.
- **`exploits` boşlukları (3):** meaning_shift→cause_vs_result, logical_incompatibility→cause_vs_result, meaning_shift→concession_vs_contrast. Her biri 1 çeldiricide görüldü (rare) → ADD yok.
- `prerequisite` 12 kenar, döngü yok. Yön semantiği "from, to’yu gerektirir" (concession→contrast). Tutarlı.

## G. Grammar hierarchy

- `grammar:conjunction` (72) ve `grammar:adverbial_clause` (46) aynı bağlaç sorularında birlikte kullanılıyor. `grammar_pattern:clause_connector` (27) aynı bilgiyi pattern düzeyinde tekrarlıyor.
- Öneri MODIFY: tanımları ayır. Graph yapısı değişmiyor, yalnız etiketleme kuralı değişiyor.
  - `conjunction` = bağlaç seçimi (hangi bağlaç)
  - `adverbial_clause` = yan cümle yapısı (zaman/koşul/sebep cümlesinin kuruluşu)
  - `clause_connector` / `prepositional_connector` / `sentence_adverbial` = bağlacın sözdizimsel kalıbı (fiil cümlesi mi, isim mi, cümle başı mı)
- `despite_with_finite_clause` misconception’ı tam bu kalıp ayrımına dayanıyor; graph bunu doğru modelliyor (`prepositional_connector` → `related_to`).
- `grammar:tense` 28 frequent; `aspect` ayrı düğüm ama yalnız 1 soru. KEEP.

## H. Discourse

- Frequent: cause 57, contrast 53, result 33, concession 27, addition 15, sequence 12. Observed: condition 8, example 6, qualification 6, purpose 5, comparison 3.
- `concession` bağlaçları graph’ta: although, even_though, despite, in_spite_of, nevertheless, nonetheless. DNA’da `though`, `even if`, `while` (concession anlamı), `even so` eksik. Generator, concession cevabı için yalnızca graph bağlaçlarını kullanıyor. Eksik ifadeleri ise `relationMarkers` olarak çeldiricilerde yasaklıyor. Bu, canonical veri üretmeden güvenli bir geçici çözüm.
- `sequence` bağlaçları var (until, as_soon_as, by_the_time, before, after), fakat en sık zaman bağlacı `when` graph’ta yok.

## I. Skill / cognitive

- `cognitive_skill` facet’i iki baskın değere çöküyor: context_integration 138 (%54), logical_relationship 137 (%54). Ayırt edici güçleri düşük.
- `skill:contextual_meaning` 160 soru (%63). Vocabulary, cloze, grammar ve closest_meaning’de birlikte görülüyor; tek başına bir family tanımlamaya yetmiyor.
- Öneri MODIFY (etiketleme rehberi): primary skill olarak `contextual_meaning` yalnız vocabulary/cloze kelime sorularında kullanılsın.

## J. Misconception

| Misconception | Etiket | Tutarlı | Yorum |
|---|---|---|---|
| cause_vs_result_direction | 18 | **0** | etiket var, ama çeldirici hiçbir zaman cause↔result karışıklığı ifade etmiyor |
| concession_vs_contrast | 18 | **2** | büyük kısmı ilişki karışıklığı değil, "beklenti yönü" hatası |
| tense_sequence_in_past_reference | 9 | 9 | tutarlı |
| collocation_by_meaning_only | 8 | 8 | tutarlı |
| despite_with_finite_clause · false_synonym_in_context · pronoun_reference_nearest_noun | 1–2 | hepsi | rare |

"Tutarlı" = çeldiricinin bağlacı, misconception’ın karıştırdığı ilişkilerden birini ifade ediyor ve cevap diğerini.

İki ilişki misconception’ı etiketleyici tarafından genel "yanlış mantık yönü" anlamında kullanılıyor. DNA’da tekrar eden ama graph’ta adı olmayan bir hata var: **olumlu/olumsuz beklenti yönünün tersine çevrilmesi** (polarity / expectation reversal). Öneri: ADD `misconception:expectation_polarity_reversal` → **insan onayı**. Onaylanmadan factory bu etiketi kullanmaz. Concession blueprint’i yalnız tutarlı olan `concession_vs_contrast`’ı contrast çeldiricisine bağlar.

## K. Family

- Family = `soru tipi × en spesifik kavram`. **84 family**: 6 frequent, 16 observed, 62 rare.
- Frequent: reading.detail 35, reading.inference 18, irrelevant_sentence.coherence 12, vocabulary.contextual_meaning 12, reading.main_idea 10, sentence_completion.cause 10.
- Observed (seçme): sentence_completion.contrast 9, vocabulary.collocation 8, closest_meaning.paraphrase 7, sentence_completion.concession 5, grammar.concession 5, grammar.contrast 5, cloze.concession 4.
- Generation yalnız observed+ family’ler ve elle yazılmış bir blueprint için açık. Şu an tek blueprint: `sentence_completion.concession`.
  - Neden bu: graph yapısı en eksiksiz family (ilişki → bağlaç → pattern → misconception zinciri tam). Ayrıca ilişki misconception’ları içinde tutarlı kanıtı olan tek family.
  - Alternatif: `sentence_completion.cause` (10, frequent), fakat misconception kanıtı zayıf (0/18).

## L. Distractor

- `semantic_mismatch` 123 soru (%48): çok kaba. Vocabulary’de near_synonym / false friend / register ayrımı kayboluyor (near_synonym 0, register_mismatch 0).
- `logical_incompatibility` 63 ve `meaning_shift` 60 frequent ama graph’ta kenarsız (bkz. F).
- Öneri MODIFY: etiketleme rehberinde vocabulary için `near_synonym` / `collocation_failure` / `semantic_mismatch` ayrımı. Graph’ta `meaning_shift` ve `logical_incompatibility` için `exploits` kenarları ancak bir misconception’da ≥3 tutarlı gözlem olunca eklenir.

## M. YDS-specificity

- Graph düğümleri genel İngilizce kavramlar. YDS’ye özgü olan şeyler soru tipleri, yüzey profilleri (kelime aralıkları, boşluk konumu) ve family dağılımı. Bunlar graph’ta değil, `yds-profile.v1`’de tutuluyor.
- Örnek profil: sentence_completion için stem 7–27 kelime (medyan 14), seçenek 10.4–24.6 kelime (medyan 17.1), zorluk 0.52.
- e-YDS dilimleri `pattern_only`: dağılım için kullanılmıyor.
- YÖKDİL için graph’a veya profile hiçbir şey eklenmedi.

## N. Önerilen değişiklikler

Hiçbiri uygulanmadı.

| # | Öneri | Tip | Kanıt |
|---|---|---|---|
| 1 | Tüm 23 unsupported düğüm | KEEP | gözlenmeme ≠ yokluk; generation hedefi değil |
| 2 | `measures` kenarları: sentence_completion→context_integration, vocabulary→semantic_discrimination, vocabulary→context_integration, reading→paraphrase_recognition, irrelevant_sentence→argument_structure, grammar→logical_relationship | ADD | frequent, 4 sınav |
| 3 | `related_to` ∩ `often_confused_with` çiftleri (concession—contrast, cause—result) | MERGE | çift kenar |
| 4 | `skill:synonym` → `skill:lexical_distinction` | MERGE | 1 vs 27 soru |
| 5 | `distractor_type:part_of_speech_mismatch` → `grammatical_mismatch` | MERGE | 0 vs 17 |
| 6 | conjunction / adverbial_clause / clause_connector etiketleme tanımları | MODIFY | birlikte etiketleme |
| 7 | contextual_meaning ve semantic_mismatch etiketleme rehberi | MODIFY | aşırı kaba |
| 8 | `misconception:expectation_polarity_reversal` | ADD | ilişki misconception’ları 2/36 tutarlı |
| 9 | Çok anlamlı bağlaçlar için şema (bir bağlaç → birden fazla `expressed_by`) ve sonra `while`, `since`, `as`, `once` | ADD (şema önce) | 6–14 seçenek, 3–4 sınav |
| 10 | Tek anlamlı bağlaçlar: `when` (sequence), `given that` (cause), `even if` (concession+condition → şema kararı), `so` (result), `though` (concession) | ADD | observed |
| 11 | `qualification` için bağlaç düğümleri | ADD | observed, bağlaçsız |
| 12 | `topic` düğümleri (12 bağlam alanı) | ADD | factory şu an yerel liste kullanıyor |
| 13 | DNA’yı her şeyi canonical graph’a taşımak için kullanmak | REJECT | 254 satır model etiketi, insan incelemesi 0 |
| 14 | `situation_appropriate`’i silmek | REJECT | 4 sınav yokluk kanıtı değil |

## O. İnsan onayı gerektiren değişiklikler

Canonical graph’a dokunan her şey: N’deki 2, 3, 4, 5, 8, 9, 10, 11, 12. Etiketleme rehberi değişiklikleri (6, 7) DNA’yı yeniden analiz ettirir ve maliyet kararıdır. Önerilen sıra:

1. **8 (polarity misconception)**: concession/cause blueprint kalitesini doğrudan etkiliyor.
2. **9 (çok anlamlı bağlaç şeması)**: `while` / `since` olmadan cause ve concession family’leri eksik kalıyor.
3. **2 (measures)**: spec’lerdeki cognitive skill hedeflerini graph’a dayandırır.

Onay gelene kadar factory yalnız mevcut v1.0 düğümlerini kullanıyor. Bilinmeyen ref üreten aday validator’da REJECT oluyor.

---

## Ek: Question Factory v1 durumu

- Akış: DNA v1 → `yds-profile.v1` → family blueprint → `question-spec.v2` → `generator.v2` prompt → aday → `validator.v2` (deterministik, critical = REJECT) → bağımsız judge (kör çözüm + rapor) → insan incelemesi (APPROVE / EDIT / REJECT, append-only versiyonlar).
- Vertical slice: `sentence_completion.concession`, B2/medium, 12 aday. Detaylar yereldedir (`.data/analysis/_factory/runs/`); repoya metin girmez.
- Historical soru metni prompt’a hiç girmez; yalnız 5-gram shingle indeksi olarak validator’da overlap reddi için kullanılır.
- Bulk generation kapalı (`sliceLimit = 20`). `factory` şeması migration olarak yazıldı, canlıya uygulanmadı.
