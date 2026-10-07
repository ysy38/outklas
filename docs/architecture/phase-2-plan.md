# Faz 2 — Geçmiş sınav analizi → YDS DNA (plan)

Tarih: 7 Ekim 2026 · Önceki belgeler: [`docs/phase-0-audit-and-migration-plan.md`](../phase-0-audit-and-migration-plan.md) (Faz 2 bölümü), Faz 1 commit'leri `dc8cd2f` ve `8d4bf5d`. Spec'ler: [`docs/specs/knowledge-graph-db-spec.md`](../specs/knowledge-graph-db-spec.md) (kanonik DB spec'i), [`docs/specs/product-intelligence-spec.md`](../specs/product-intelligence-spec.md) (vizyon). Kaynak kuralları: [`docs/source-policy.md`](../source-policy.md). Kararlar: [`docs/decisions/`](../decisions/).

## 1. Özet

Faz 2, geçmiş ÖSYM sınavlarını **yalnızca analiz için** yerelde işler ve metin içermeyen "YDS DNA"ya çevirir. Uygulama (öğrenci tarafı) değişmez; AI uygulamaya girmez.

- **Pilot:** tek kitapçık, **2024 Kasım YDS** (80 soru, 16 soru sayfası + 1 cevap anahtarı sayfası). Taranmış (metin katmanı yok), iki sütunlu ÖSYM düzeni ve metnin üstüne binen turuncu ÖSYM filigranı var. OCR yolunu gerçekten zorlayan örnek bu. Mart 2024 dosyası üçüncü taraf tarafından yeniden dizilmiş (soru başına bir blok, ABD Letter boyutu), özgün düzeni temsil etmiyor. Kasım 2024'ün son sayfasında cevap anahtarı var; bu, doğruluk ölçümü için bağımsız bir kaynak sağlıyor.
- **Pipeline:** PDF → sayfa render → ham OCR → (Gemini görsel doğrulama, ayrı aşama) → OCR temizliği → soru segmentasyonu → soru yeniden kurma → deterministik doğrulama → yapılandırılmış analiz (Analyzer) → YDS DNA → knowledge graph eşlemesi → DB'ye metinsiz içe aktarma → desen raporu.
- **Depolama:** Ham metin, OCR çıktısı ve yeniden kurulmuş sorular yalnızca `.data/analysis/` altında (gitignore'lu). DB'ye yalnızca metinsiz özellikler gider; ayrı `analysis` Postgres şeması, RLS açık, politika yok, Data API'ye açık değil.
- **AI:** Gemini API, sağlayıcıdan bağımsız `AIService` arkasında. Faz 2'de yalnızca **Analyzer** ve **Verifier** (OCR onarımı + kör çözüm) çalışır. Generator, Judge, Explainer, Tutor yalnızca arayüz (stub).

## 2. Denetim bulguları (Faz 2'yi etkileyenler)

| Konu | Bulgu | Sonuç |
|---|---|---|
| Sistem araçları | `tesseract`, `pdftoppm`, `pdfinfo`, `mutool`, `gs`, ImageMagick yok; `sudo` parola istiyor. Python 3.8 + pip --user var. | Kullanıcı alanında Node yığını: `pdfjs-dist` (render + metin katmanı), `@napi-rs/canvas` (pdfjs'in kendi sürümüyle aynı 0.1.x), `tesseract.js` (WASM, `eng+tur`). Sistem paketi gerekmez. |
| Kaynak PDF'ler | Kasım 2024: 18 sayfa, metin katmanı yok (sayfa başı ~80 karakter, yalnızca tarayıcı izi). Mart 2024: 46 sayfa, yeniden dizilmiş tarama. Ekim 2023 ve 2025 Mart: metin katmanı var. | Pilot Kasım 2024. OCR doğruluğu için "metin katmanlı ikiz" yok; ölçüm yöntemi §9'da. |
| Gemini anahtarı | `.env.example` içine gerçek bir anahtar yazılmıştı (commit edilmemişti). | Anahtar gitignore'lu `.env.local` dosyasına taşındı (izin 600), `.env.example` boş bırakıldı. Değer hiçbir yerde yazdırılmadı. |
| Gemini modelleri | 8 Ekim duman testi (ÖSYM metni yok): `gemini-3.1-pro-preview` 429; çalışan modeller oturuma göre değişiyor (`gemini-flash-latest` / `gemini-3.1-flash-lite` / `gemini-flash-lite-latest`). Çıkarım Gemini’ye bağlı değil. | Varsayılanlar canlı probe’a göre güncellenir (`pipeline/ai/config.ts`). Analyzer ve Verifier ayrı modeller. Anahtar yalnızca `.env.local`. |
| Ücretsiz katman | Anahtar ücretsiz katmanda. Google'ın şartlarına göre ücretsiz katmanda gönderilen içerik ürün geliştirme için kullanılabilir. | Pilot kitapçık zaten kamuya açık bir sınav; yine de **kullanıcı kararı gerekiyor** (§12). Maliyet ve kota için tüm AI yanıtları girdi hash'iyle önbelleklenir. |
| Faz 1 graph'ı | 155 düğüm, 280 kenar, 113 eşleme. Misconception, distractor_type, connector, discourse_relation, question_type düğümleri var. `vocabulary` ve `topic` türünde düğüm yok. | Analiz yalnızca mevcut düğümlere bağlanır. Bilinmeyen kavram ve kelimeler **öneri** olur (`analysis.node_proposals`), kanonik düğüm oluşturulmaz. |
| Katmanlama | UI → `src/server/*` → `src/modules/*` → `src/db/*`. Next uygulaması `src/` dışını import etmiyor. | Saf analiz mantığı `src/modules/analysis/`, Drizzle şeması `src/db/analysis-schema.ts`, IO ve AI içeren offline kod `pipeline/` altında. `src/` hiçbir zaman `pipeline/`'ı import etmez (test ile zorlanır). |

## 3. Kapsam dışı (bilerek)

- Üretim soru bankası tabloları (`questions`, `question_options`, `question_concepts`…), `items` / `choices` / `skills` değişiklikleri, adaptive engine, learner tabloları.
- Runtime AI, öğrenci tarafında üretim, AI'ın soru seçmesi.
- Generator / Judge / Explainer / Tutor gerçeklemesi (yalnızca arayüz).
- Akademik korpus indirme (CORE, Semantic Scholar, DOAJ). Yalnızca şema ve lisans modeli.
- pgvector, embedding, n-gram tabanlı özgünlük motoru (Faz 3). Faz 2'de yalnızca metin hash'i ve "analiz metni soruyu alıntılıyor mu" kontrolü var.

## 4. Mimari

```text
pipeline/                       OFFLINE. Next uygulaması import etmez.
  ai/
    types.ts                    AIProvider (taşıma), roller: Analyzer, Verifier, Generator, Judge, Explainer, Tutor
    config.ts                   env → model adları; varsayılanlar tek yerde
    gemini.ts                   GeminiProvider (fetch, enjekte edilebilir transport, retry, timeout)
    service.ts                  createAIService(): Analyzer + Verifier gerçek, diğerleri NotImplemented
    cache.ts                    istek hash'i → yanıt önbelleği (.data/analysis/cache/ai)
    prompts/                    analyzer.v2.ts, verifier.v1.ts (verifier-ocr.v1 + verifier-solve.v1), schema.ts (versiyonlu)
  lib/
    artifacts.ts                aşama dizinleri, sha256, değişmez yazım, manifest, girdi hash'iyle önbellek
    pdf.ts                      pdfjs yükleme, sayfa render
  extract/                      saf: görüntü ön işleme, sütun bölme, OCR temizliği, segmentasyon, yeniden kurma, doğrulama
  stages/                       her aşama bir dosya; girdi artefaktı → çıktı artefaktı
  cli.ts                        npm run analysis -- <aşama> giriş noktası (npm run analysis:pilot = hepsi)
src/modules/analysis/           SAF domain: Zod analiz sözleşmesi (contract), doğrulama (validate), yüzey özellikleri (surface),
                                DNA + soru aileleri + desen madenciliği (dna), kaynak kayıtları ve lisans kuralları (sources), QuestionSpec tipi (spec)
src/db/analysis-schema.ts       Drizzle: pgSchema("analysis")
src/db/analysis-import.ts       doğrulanmış analiz → metinsiz satırlar → SQL (knowledge-sync ile aynı desen)
supabase/migrations/<ts>_analysis_schema.sql
```

Kurallar:

- `src/**` → `pipeline/**` importu yasak; AI kodu yalnızca `pipeline/ai/` içinde. `GeminiProvider` tarayıcıda (`window` tanımlıysa) çalışmayı reddeder.
- Domain mantığı tek yerde: analiz doğrulaması, aile türetme ve DNA toplama `src/modules/analysis/` içinde; pipeline ve DB katmanı bunları kullanır, kopyalamaz. Taksonomi doğrulaması için Faz 1'in `src/modules/knowledge/seed.ts` + `graph.ts` dosyaları yeniden kullanılır.
- `pipeline/**` kök `tsconfig` kapsamında kalır (`npx tsc --noEmit` onu da denetler); testleri `vitest` ile çalışır.

### 4.1 AI katmanı

```ts
type AIRole = "analyzer" | "verifier" | "generator" | "judge" | "explainer" | "tutor";
interface AIProvider { name: string; generate(request: ModelRequest): Promise<ModelResponse> }  // metin + görsel parçalar, JSON şeması, kullanım sayaçları
interface Analyzer { analyze(item: ReconstructedItem, context: AnalyzerContext): Promise<AIResult<QuestionAnalysisDraft>> }
interface Verifier { repairOcr(page: PageImage, ocrText: string): Promise<AIResult<Transcription>>; solve(item): Promise<AIResult<BlindSolution>> }
interface Generator { generate(spec: QuestionSpec): Promise<never> }   // Faz 3; şimdi NotImplemented
interface Judge { evaluate(candidate, spec): Promise<never> }            // Generator'dan ayrı prompt ve ayrı model ayarı
interface Explainer { … } interface Tutor { … }                          // stub
```

- Sağlayıcı seçimi `AI_PROVIDER` (varsayılan `gemini`). OpenAI/Claude eklemek = yeni `AIProvider` + config satırı; roller değişmez.
- Her rolün prompt'u ayrı dosya ve ayrı versiyon kimliği taşır (`analyzer.v2`). Analyzer'ın yanıt şemasında her referans alanı, o alanın izin verdiği düğümlerin `enum`'u (kısıtlı çözümleme); v1'de model bu alanlara serbest metin yazıyordu (30 yanıtın 27'si Zod'dan geçmedi). Generator ile Judge aynı modeli kullanamaz: config yükleyicisi `GENERATOR_MODEL === JUDGE_MODEL` olursa uyarı verir (Faz 3'te hata olacak).
- Çıktılar her zaman Zod ile doğrulanır; ham LLM çıktısına güvenilmez.
- Önbellek anahtarı: sağlayıcı + model + prompt versiyonu + istek gövdesinin sha256'sı. Aynı girdi ikinci kez faturalanmaz.

### 4.2 QuestionSpec (yalnızca taslak, Faz 3)

```ts
type QuestionSpec = {
  questionType: NodeRef;                 // question_type:sentence_completion
  primaryConcepts: NodeRef[];            // discourse_relation:concession
  secondaryConcepts: NodeRef[];
  targetSkill: NodeRef; cognitiveSkill: NodeRef;
  targetMisconception?: NodeRef;
  distractorPlan: NodeRef[];             // distractor_type:*
  difficulty: { band: "easy" | "medium" | "hard"; factors: Partial<DifficultyProfile> };
  dnaBasis: { documentIds: string[]; statistic: string };   // toplu istatistik referansı, metin değil
  groundingSourceDocumentIds?: string[]; // lisansı doğrulanmış belgeler; metin kopyalanmaz
  constraints: { singleCorrectAnswer: true; avoidUnintendedClues: true };
};
```

Faz 2'de yalnızca tip olarak `src/modules/analysis/spec.ts` içinde durur; kullanan kod yok.

## 5. Pipeline aşamaları ve artefaktlar

Her aşama `.data/analysis/<belge>/<aşama>/` altına yazar ve bir `manifest.json` bırakır: `stage`, `stageVersion`, `inputHash` (girdi artefaktlarının + parametrelerin sha256'sı), `outputHash`, dosya listesi ve hash'leri, süre, uyarılar. Aşama yeniden çalıştırıldığında `inputHash` aynıysa iş yapılmaz. Değişmez aşamalarda (ham OCR) aynı girdi farklı çıktı üretirse aşama hata verir; üzerine yazmaz.

| # | Aşama (`npm run analysis:<x>`) | Girdi | Çıktı (yerel) | Not |
|---|---|---|---|---|
| 0 | (ayrı aşama yok) | `sources/*.pdf` | — | Kayıtlar `src/modules/analysis/sources.ts` içinde; `render` PDF'i salt okunur açar ve sha256 kayıtla uyuşmazsa durur. Kaynak satırları `import` ile DB'ye gider. |
| 1 | `render` | PDF | `render/page-NN.png` (300 dpi) | |
| 2 | `ocr` | sayfa PNG | `ocr/page-NN-{left,right}.json` (kelime, güven, kutu) + `.txt` | Kırmızı kanal → filigran bastırma; orta çizgiden sütun bölme; `eng+tur`. **Değişmez, hash'li.** |
| 3 | `ocr-verify` | sayfa PNG + ham OCR | `ocr-verify/page-NN-{left,right}.json` | Gemini Verifier görüntüden yeniden okur; ham OCR'a dokunmaz. Model, prompt versiyonu ve kullanım kaydedilir. |
| 4 | `cleanup` | ham OCR + doğrulanmış metin | `cleanup/stream.json` (okuma sırasında satırlar, kaynak etiketi) | Tırnak, kesme, tire, satır sonu birleştirme, filigran kalıntısı, nokta dolgu satırları |
| 5 | `segment` | temiz akış | `segment/blocks.json` | Kullanılmış 1–N numaraları (sıra dışı kabul; eksik uydurulmaz), paylaşılan pasajlar, cevap anahtarı |
| 6 | `reconstruct` | bloklar | `reconstruct/questions.json` | kök, pasaj, şıklar A–E, bölüm (blueprint), çeviri yönü |
| 7 | `validate` | sorular + anahtar | `validate/report.json` | deterministik kontroller (§6); `ok` / `needs_review` / `failed` |
| 8 | `analyze` | doğrulanmış sorular | `analyze/q-NN.json` | Analyzer + Verifier kör çözüm; Zod; KG referans kontrolü |
| 9 | `dna` | analizler | `dna/rows.json` (metinsiz), `dna/proposals.json` | KG eşlemesi, soru aileleri, öneriler; yalnızca kabul edilen analizler |
| 10 | `import` | metinsiz satırlar | yerel PGlite veya `--sql` | Supabase'e MCP `execute_sql` / `DATABASE_URL` ile |
| 11 | `report` | DB (+ yerel inceleme kuyruğu sayıları) | `docs/analysis/<belge>-dna.md` (metinsiz, commit edilir) | deterministik |
| — | `review` | tüm artefaktlar | `.data/analysis/<belge>/review.md` | 80 sorunun okunabilir tam incelemesi (soru metni içerir, yerel) |
| — | `metrics` | tüm artefaktlar + `manual/*.json` | `metrics/metrics.json` | 20 pilot metriğinin ölçülebilen kısmı |
| — | `pilot` | — | — | 1→11 + review + metrics sırayla; `extract` = 1–2 ve 4–7 (AI'sız) |

## 6. Doğrulama kuralları

**Yeniden kurma (OCR'a güvenme):**

- Numaralar uydurulmaz. 80/80 şart değildir; `partial_exam` analize açıktır. Konu dilimi (`topic_slice`) genel YDS dağılımına girmez. Ayrıntı: [`docs/decisions/0003-question-level-acceptance.md`](../decisions/0003-question-level-acceptance.md).
- 1–80 numaraları tam bir kez beklenir ama sıra dışı (iki sütun) numaralar tutulur; eksik / birleşmiş / bölünmüş soru işaretlenir, icat edilmez.
- Her soruda A–E şıkları, bu sırada ve boş değil (anlam bütünlüğü sorularında `A) I … E) V`).
- Boşluk gerektiren tiplerde `----` işareti var; cloze ve paragraf tamamlamada pasaj bağlı; okuma sorusu bir pasaja bağlı; anlam bütünlüğünde (I)–(V) cümleleri tam.
- Tırnak ve parantez dengesi, kesme işareti (`'`), tire, satır sonu tirelemesi, rakam-harf karışık kelimeler, yapışmış kelimeler (çok uzun token), tek harfli çöp tokenlar.
- Ham OCR ile Gemini okuması arasında soru bazlı karakter hata oranı (CER). Eşik üstü → `needs_review`.
- Tesseract kelime güveni: ortalama < 80 veya düşük güvenli kelime oranı > %5 → `needs_review`.

**Analiz:**

- Zod şeması (aşağıda) geçerli. Tüm referanslar mevcut `knowledge_nodes` (Faz 1 seed'i) ve doğru türde: `grammar` alanında yalnızca `grammar` / `grammar_pattern`, `discourse_relations` alanında yalnızca `discourse_relation` vb.
- Soru tipi blueprint'teki banda uyuyor (`src/modules/exam/blueprint.ts` + Faz 1 `sectionSlug` eşlemesi); çeviri yönü yeniden kurmadan.
- Analyzer'ın doğru şıkkı = cevap anahtarı. Verifier'ın **kör** çözümü (anahtarı görmeden) = cevap anahtarı; değilse `blind_solve_mismatch` (OCR hatası, belirsizlik veya model hatası işareti).
- Çeldiriciler: doğru şık dışındaki her etiket tam bir kez.
- Serbest metin alanları (neden çekici, neden yanlış, öğrenme hedefi) sorudan ≥ 6 kelimelik dizi alıntılamamalı; alıntılıyorsa işaretlenir. Bu alanlar zaten yalnızca yerelde kalır.
- `confidence < 0.7` veya `needs_review` veya herhangi bir işaret → `needs_review`. Yalnızca `accepted` (tüm kontroller temiz) analizler DB'ye gider.

**Analiz sözleşmesi** (`src/modules/analysis/contract.ts`, özet):

```ts
{
  question_number, question_type,                         // question_type:*
  correct_option,                                         // "A".."E"
  knowledge: { primary_concepts, secondary_concepts, grammar, vocabulary: [{ lemma, pos, role, ref? }], discourse_relations },
  skills: { primary, secondary, cognitive },
  difficulty: { overall, lexical, syntactic, semantic, inference, distractor_similarity, context_dependency },  // 0..1
  answer_expresses: NodeRef[],                            // doğru şıkkın ifade ettiği bağlaç / ilişki / yapı
  distractors: [{ label, type, expresses, targeted_concept, misconception, why_plausible, why_wrong }],
  misconceptions, prerequisites, learning_objective,
  pedagogy: { cognitive_demand: "remember" | "understand" | "apply" | "analyze" | "evaluate", transfer_requirement: "low" | "medium" | "high" },
  proposals: [{ type, slug, name, reason }],
  ambiguities: string[], confidence, needs_review
}
```

Surface özellikleri (sınav, yıl, oturum, numara, tip, şık sayısı, pasaj ve cümle uzunlukları, yapısal biçim) AI'dan değil, yeniden kurmadan deterministik olarak hesaplanır.

## 6.1 Soru aileleri

Aile = birincil kavram düğümü (ör. `discourse_relation:concession`). Bir sorunun her birincil kavramı onu o ailenin üyesi yapar. Aile raporu, aynı kavramın hangi soru tiplerinde (cümle tamamlama, cloze, okuma, anlamca yakın, çeviri, paragraf tamamlama) ve hangi çeldirici türleriyle sınandığını gösterir. Faz 4'te mastery'nin "aynı kavram farklı yüzeyde" (transfer) ölçümüne temel olur. Türetme saf fonksiyondur (`dna.ts` içinde `deriveFamilies`) ve tekrar çalıştırılabilir.

## 7. Veritabanı

Yeni migration: `supabase/migrations/20261007174824_analysis_schema.sql`. Yeni Postgres şeması `analysis`. Tüm tablolarda RLS açık, politika yok; `anon` ve `authenticated` rollerinden şema yetkisi geri alınır; şema Data API'nin açık şemaları listesinde değil. Mevcut `public` tablolarına dokunulmaz. Knowledge graph'a FK'ler `ON DELETE RESTRICT`.

| Tablo | Amaç | Önemli kolonlar |
|---|---|---|
| `analysis.sources` | Sağlayıcı (ÖSYM, CORE, Semantic Scholar, DOAJ, yayınevi, üçüncü taraf yükleme) | slug, name, kind, url, terms_url |
| `analysis.source_documents` | Tek belge (PDF, makale) ve **lisansı** | title, authors[], publication_year, url, doi, language, content_hash (sha256, unique), storage_path (yerel), page_count, source_type (`owned`/`licensed`/`open`/`reference_only`), license_status (`unknown`/`pending_review`/`verified`/`analysis_only`/`rejected`), license_name, license_url, commercial_use, derivative_use, redistribution_allowed, text_mining_allowed, attribution_required, verified, verified_at, verified_by. CHECK: `reference_only` ⇒ ticari kullanım, türev ve yeniden dağıtım `false`. |
| `analysis.documents` | Analiz edilen sınav formu | source_document_id (unique), exam, year, session, blueprint, question_count |
| `analysis.runs` | Aşama çalıştırma kaydı | stage, provider, model, prompt_version, schema_version, knowledge_version, input_hash, output_hash, status, item/error sayıları, token kullanımı, zamanlar |
| `analysis.questions` | Metinsiz soru kaydı | document_id, question_number (unique çift), section, question_type_node_id, option_count, answer_position, structural_format, stimulus_key, kelime / cümle sayıları, text_sha256 (normalize metnin hash'i; tekrar ve kontaminasyon kontrolü için, geri döndürülemez), confidence, validated_by (`rules`/`human`), run_id |
| `analysis.question_features` | Zorluk ve pedagoji (1:1) | 7 zorluk boyutu (0..1), cognitive_demand, transfer_requirement |
| `analysis.question_nodes` | Soru ↔ düğüm | facet (`primary_concept`, `secondary_concept`, `grammar`, `vocabulary`, `discourse`, `skill_primary`, `skill_secondary`, `cognitive`, `misconception`, `prerequisite`, `answer_expresses`) |
| `analysis.distractors` | Çeldirici başına | position, distractor_type_node_id, expresses_node_id, targeted_node_id, misconception_node_id |
| `analysis.families`, `analysis.family_members` | Soru aileleri | primary_node_id (unique) |
| `analysis.node_proposals`, `analysis.question_proposals` | Bilinmeyen kavram / kelime önerileri (inceleme kuyruğu) | node_type, slug, status (`pending`/`accepted`/`rejected`/`merged`), node_id |

**Metin yok garantisi:** Kod/etiket kolonlarında `char_length ≤ 64` CHECK'i; soru tablolarında `jsonb` ve serbest metin kolonu yok. Test: (1) `analysis` şemasındaki her `text` kolonu ya uzunluk CHECK'li ya da kaynak metadata izin listesinde (başlık, yazar, URL); (2) içe aktarma SQL'i fixture sorusunun metninden hiçbir 5 kelimelik dizi içermiyor.

**Drizzle:** `src/db/analysis-schema.ts` (`pgSchema("analysis")`). Mevcut drift testi şema farkındalıklı hale getirilip ortak yardımcıya (`src/db/drift.ts`) taşınır; knowledge ve analysis tabloları aynı kontrolden geçer.

**Canlıya uygulama:** Yerel testler geçtikten sonra MCP `apply_migration`; `list_tables`, `execute_sql`, `get_advisors` (security + performance) ile doğrulama. Pilotun metinsiz satırları yalnızca kabul edilen analizler için yazılır.

## 8. Değişecek ve eklenecek dosyalar

**Değişecek:** `.gitignore` (`/sources/`, `.data/` zaten var), `.env.example` (yeni değişkenler, boş), `package.json` (+ scripts, devDependencies), `vitest.config.ts` (`pipeline/**/*.test.ts`), `docs/phase-0-audit-and-migration-plan.md` (spec yolları), `src/db/knowledge-db.test.ts` (drift kontrolü ortak yardımcıya), `src/db/migrations.ts` gerekirse (PGlite'ta `analysis` şeması için ek bir şey gerekmez).

**Taşınacak:** `sources/YDS-INTELLIGENCE-SPECIFICATION-v1.0.md` → `docs/specs/product-intelligence-spec.md`; `sources/YDS Intelligence — Knowledge Graph, Taxonomy & Database Architecture Specification.md` → `docs/specs/knowledge-graph-db-spec.md` (Faz 0 §8 Karar 7'deki adlar).

**Yeni:** `docs/source-policy.md`, `docs/decisions/0001-llm-is-content-intelligence-not-adaptive-engine.md`, `docs/decisions/0002-gemini-behind-provider-abstraction.md`, `docs/analysis/yds-2024-11-dna.md` (üretilen), `docs/analysis/phase-2-pilot-report.md`, `supabase/migrations/20261007174824_analysis_schema.sql`, `src/db/analysis-schema.ts`, `src/db/analysis-import.ts`, `src/db/drift.ts`, `src/db/analysis-db.test.ts`, `src/modules/analysis/{contract,validate,families,dna,surface,spec}.ts` + testleri, `pipeline/**`.

**Yeniden kullanılanlar:** `knowledgeNodes` / `knowledgeEdges` / `parseRef` / `ref` (Faz 1), `ydsBlueprint` + `bandForSlot`, `migratePglite` (test ve yerel DB), `knowledge-sync.ts`'teki SQL üretme deseni (`lit`, `values`), `scripts/knowledge-sync.ts`'teki PGlite / postgres-js seçimi.

## 9. Ölçüm yöntemi (pilot raporu için)

| Metrik | Nasıl ölçülür | Sınır |
|---|---|---|
| OCR doğruluğu | (a) Elle örneklem: sayfa görüntüsüyle son metnin karşılaştırılması, kelime hatası sayımı (`manual/ocr-check.json`). (b) Ham Tesseract ile model okuması arasındaki soru bazlı CER (bağımsız iki okuma; uyum bir alt sınır göstergesi). ~~(c) Ekim 2023 metin katmanına karşı kalibrasyon~~ — denendi ve bırakıldı: o PDF'in gövde fontu (Arial) gömülü değil, pdf.js render'ında harf aralıkları bozuk; ölçüm OCR'ı değil render hatasını ölçüyordu. | Kasım 2024'ün metin katmanlı ikizi yok; (a) örneklem, (b) dolaylı. |
| Segmentasyon | 1–80 tam, her soruda 5 şık, pasaj bağlantıları beklenen bantlarla aynı (17–26 cloze, 43–62 okuma, 72–75 paragraf, 76–80 anlam bütünlüğü). | Kesin. |
| Soru tipi | Analyzer tipi vs blueprint bandı. | Kesin (blueprint resmi düzen). |
| Cevap | Analyzer doğru şıkkı ve Verifier kör çözümü vs cevap anahtarı (sayfa 18). | Kesin (anahtar OCR'ı elle doğrulanır). |
| Kavram, beceri, gramer, kelime, discourse, çeldirici, zorluk, misconception | Geçerli referans oranı, boş alan oranı, öneri sayısı; ayrıca rastgele örneklemde elle (bu oturumdaki insan-yerine-ajan) etiket uyumu. | Elle uyum, bağımsız bir uzman değil; rapor bunu açıkça yazar. |
| Güven, inceleme, tekrar, öneriler, kenarlar, belirsizlikler, hatalar | Artefakt ve DB sayımları. | Kesin. |

## 10. Yeni env değişkenleri

`AI_PROVIDER` (varsayılan `gemini`), `GEMINI_API_KEY`, `ANALYZER_MODEL`, `VERIFIER_MODEL`, `GENERATOR_MODEL`, `JUDGE_MODEL`, `AI_MAX_RETRIES` (varsayılan 6). Hepsi yalnızca yerel `.env.local`; Vercel ortamına **eklenmez** (uygulama AI kullanmaz). Varsayılanlar `pipeline/ai/config.ts` içinde.

## 11. Testler

- `pipeline/ai/*.test.ts`: Gemini istek biçimi, JSON şeması, retry/timeout, önbellek isabeti (sahte transport; ağ yok); stub roller hata verir; tarayıcı koruması; config varsayılanları ve env geçersiz kılma.
- `pipeline/extract/*.test.ts`: sütun bölme, filigran bastırma, temizlik kuralları (tırnak, tire, satır birleştirme), segmentasyon (eksik / birleşik numara, pasaj grupları, anahtar sayfası), yeniden kurma ve doğrulama sentetik fixture'larla (gerçek ÖSYM metni değil).
- `pipeline/lib/artifacts.test.ts`: girdi hash'iyle önbellek, değişmez aşamanın üzerine yazmaması.
- `src/modules/analysis/*.test.ts`: Zod sözleşmesi, referans türü kontrolü, demotion, alıntı tespiti, aile türetme, DNA toplama.
- `src/db/analysis-db.test.ts`: migration + içe aktarma idempotent, kısıtlar (`reference_only` lisans kuralı, uzunluk CHECK'leri, FK RESTRICT), RLS her tabloda açık, metin yok testleri, drift testi.
- Mimari test: `src/**` dosyaları `pipeline/` import etmiyor; `pipeline/ai` `src/app` / `src/components` import etmiyor.
- Regresyon: mevcut testler, `npx tsc --noEmit`, `npx next build`.

## 12. Açık kararlar

1. **Ücretsiz katman:** Gemini anahtarı ücretsiz katmanda; Pro modellere erişim yok ve gönderilen içerik Google tarafından ürün geliştirmede kullanılabilir. Ölçeklemeden önce faturalandırma açılmalı mı?
2. **DB'ye soru bazlı DNA:** Faz 0 Karar 1 seçenek A uygulanıyor (metinsiz soru bazlı özellikler Supabase `analysis` şemasında). Hukuki görüş önerisi geçerli.
3. **Öneri kuyruğu:** Kabul edilen önerileri seed'e kim ve hangi sıklıkla taşıyacak (Faz 1 kuralı: insan eliyle `seed.ts` → `knowledge:sync`)?
4. **`pdfcoffee` kaynaklı dosyalar:** Kaynağı belirsiz; `license_status = unknown`. ÖSYM'nin resmi yayınıyla değiştirilmesi öneriliyor.
5. **Model "recitation" reddi:** Verifier, telifli metni kelimesi kelimesine yazdırmayı sağlayıcı filtresiyle (`finishReason = RECITATION`) sütunların bir kısmında reddediyor; özellikle uzun okuma pasajlarında. Bu filtre aşılmaya çalışılmıyor; o sütunlar tek okumaya (Tesseract) düşüyor ve `single_reading` ile işaretleniyor. Bağımsız ikinci okuma için yerel bir ikinci OCR motoru (ör. farklı Tesseract modeli / PaddleOCR) mı eklensin, yoksa bu sorular insan incelemesine mi bırakılsın?

## 13. Uygulama sırasında plandan sapmalar (7 Ekim, uzlaştırma)

- **Kaynak kayıtları** `pipeline/sources.ts` yerine `src/modules/analysis/sources.ts` içinde (DB içe aktarması ve testler de kullanıyor; IO içermiyor). Ayrı `sources` aşaması yok; hash doğrulaması `render` içinde.
- **Aileler** ayrı `families.ts` değil, `dna.ts` içinde (`deriveFamilies`, `mineDna`).
- **Sütun bölme:** ÖSYM sayfalarındaki orta çizgi açık gri; koyuluk eşiğiyle bulunamadı ve sağ sütunun ilk harfleri kesiliyordu. Çizgi artık en uzun kesintisiz dikey koşuyla bulunuyor (`findGutter`); OCR v2 olarak yeniden çalıştırıldı, eski çıktı arşivlendi (değişmez aşama kuralı).
- **Kitapçıkta bölüm talimatı yok:** Kasım 2024 taramasında bölüm başlıkları/talimatları basılı değil; soru numaraları tek başına satırda. Segmentasyon numara dizisine, bölümler blueprint'e dayanıyor. Tesseract "11"i "1" okuyabiliyor; segmentasyon ve anahtar ayrıştırma bunu konumla düzeltiyor.
- **İkinci okuma (`ocr-verify`):** Sağlayıcı sütunu reddederse (`declined`), geçersiz JSON dönerse (`invalid`) veya harf/rakam sayısı Tesseract'tan %15'ten fazla saparsa (`incomplete`) o sütun için Tesseract satırları kullanılır, satırlar kaynakla etiketlenir ve soru `single_reading` ile işaretlenir. Bu işaret tek başına **engelleyici değil, uyarıdır** (`warningFlags`): 80 sorunun 45'i en az bir tek-okumalı satır içeriyor; hepsini engellemek pilotu okuma bölümü dışında bırakırdı. Tek okumalı metin yine yapısal kontrollerden, Tesseract güven eşiklerinden ve cevap anahtarına karşı kör çözümden geçer.
- **Tesseract güveni** yalnızca metni bağımsız bir okumanın doğrulamadığı yerde (`tesseractOnly`) işaret üretir; iki okuma uyuşuyorsa düşük kelime güveni tek başına incelemeye göndermez.
- **Dolgu satırları:** Model, sütun sonundaki noktalı dolguyu art arda `----` satırları olarak yazıyor; üç ve daha uzun koşular atılır (tek bir `----` korunur).
- **Aşama önbelleği** artık aşamanın kod dosyalarının hash'ini de içeriyor (kod değişince aşama yeniden çalışır).
- **Kalibrasyon** (§9 c) bırakıldı; gerekçe §9'da.
- **Komutlar:** `npm run analysis -- <aşama> [--doc <slug>] [--force]`, `npm run analysis:pilot`.
- **Pipeline'ın kendi PGlite dizini** (`.data/analysis/pglite`, `PGLITE_DIR` ile değiştirilebilir). Uygulamanın `.data/pglite` dizini iki sürecin aynı anda açması sonucu bozuldu; silinmedi, `.data/pglite.broken-2026-10-07` olarak kenara alındı. Uygulama bir sonraki `npm run dev`'de dizini yeniden oluşturur.
- **Migration adı** canlının atadığı sürümle eşitlendi: `20261007110000_analysis_schema.sql` → `20261007174824_analysis_schema.sql` (yerel migrator dosya adını izliyor).
- **İçe aktarma SQL'i sıkıştırıldı:** `DATABASE_URL`/psql olmadan canlıya MCP üzerinden gönderilebilmesi için düğüm referansları soru ve facet başına tek dizi (`unnest … WITH ORDINALITY`) olarak yazılıyor (98,8 KB). Üretilen satırlar eski üreticiyle parmak izi düzeyinde aynı; canlı ile yerel arasında 10 tablonun 10'unda md5 eşleşmesi doğrulandı (sıralama `collate "C"`).
- **Metrik düzeltmeleri:** kelime metriği nesneyi değil referans/lemmayı sayıyor; yakın-tekrar karşılaştırması pasajı paylaşan sorularda yalnız soru kökü + şıkları, diğerlerinde pasaj dahil tüm metni kullanıyor (76–80'deki yanlış "tekrar" alarmları bunun sonucuydu).
- **Sonuç (pilot, Kasım 2024):** 80 sorudan 53'ü kabul edildi ve canlıya yazıldı, 25 inceleme kuyruğunda, 2 analiz şemadan geçmedi. Ayrıntı `docs/analysis/phase-2-pilot-report.md`.
