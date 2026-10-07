# Kaynak politikası

Bu belge YDS Lab'in dış kaynakları (geçmiş sınavlar, yayınevi materyali, akademik metinler) nasıl kullandığını tanımlar. Kod ve DB bu kurallara göre tasarlandı; kuralların bir kısmı veritabanı kısıtlarıyla zorlanır (`analysis.source_documents`).

## 1. Temel kural

**Hiçbir kaynak metni soruya kopyalanmaz veya yeniden ifade edilmez.** Üretim soruları her zaman özgündür. Kaynaklar yalnızca şunlar için kullanılır:

```text
araştırma bağlamı → kavram / konu / kelime / discourse çıkarımı (grounding) → QuestionSpec → ÖZGÜN soru
```

"Aynı cümleyi biraz değiştirerek yazmak" da kopyalamadır. Faz 3'te her üretilen soru, yerel ham korpusa ve mevcut bankaya karşı cümle düzeyinde benzerlik / kontaminasyon kontrolünden geçer (n-gram örtüşmesi, ardından gerekiyorsa embedding). Eşiği aşan soru bankaya girmez.

## 2. ÖSYM sınavları: yalnızca analiz

ÖSYM soruları FSEK kapsamında eserdir; telif ÖSYM'ye aittir ve yazılı izin olmadan çoğaltılamaz, dağıtılamaz, yayımlanamaz.

- Geçmiş ÖSYM sınavları yalnızca **analiz** içindir: soru tipi dağılımı, kavram ve beceri etiketleri, çeldirici türleri, zorluk faktörleri, desenler ("YDS DNA").
- **Asla:** soru metni, pasaj, kök veya şık üretim bankasına, repo'ya veya üretim veritabanına girmez. Öğrenciye gösterilmez. Üretim için örnek (few-shot) olarak verilmez.
- Ham PDF'ler `sources/` altında kalır (gitignore'lu, değiştirilmez). Çıkarılmış metin, OCR çıktısı ve yeniden kurulmuş sorular yalnızca yerelde, `.data/analysis/` altında durur (gitignore'lu).
- Veritabanına yalnızca **metin içermeyen ve metni yeniden kurmaya yetmeyen** özellikler gider: knowledge graph düğüm referansları, çeldirici türleri, zorluk puanları, sayımlar ve uzunluklar, normalize metnin geri döndürülemez sha256 hash'i, bağlaç / lemma gibi tek kelimelik taksonomi tanımlayıcıları. Cümle, kök, şık yok.
- Analiz sırasında üretilen serbest metin açıklamalar ("bu çeldirici neden çekici") kendi sözlerimizle yazılır ve yine de yalnızca yerel artefaktta kalır.
- AI sağlayıcısına analiz için gönderilen soru metni bu politikanın bilinçli bir istisnasıdır (yalnızca analiz amacıyla, kalıcı depolama olmadan). Ücretsiz katmanlarda sağlayıcı içeriği ürün geliştirmede kullanabilir; ölçeklemeden önce ücretli katman gerekir.
- `source_documents` kaydı: `source_type = 'reference_only'`, `license_status = 'analysis_only'`, `commercial_use = derivative_use = redistribution_allowed = false`. DB, `reference_only` bir belgede bu üç alanın `true` olmasını CHECK ile reddeder.

Yayınevi soru bankaları ve kelime listeleri de aynı sınıftadır (`reference_only`). Kaynağı belirsiz üçüncü taraf yüklemeleri (`pdfcoffee`) `license_status = 'unknown'` ile kaydedilir; mümkünse ÖSYM'nin resmi yayınıyla değiştirilir.

## 3. Akademik kaynaklar (CORE, Semantic Scholar, DOAJ, kurumsal arşivler)

"CORE'da var" veya "internette okunabiliyor" **ticari olarak yeniden kullanılabilir demek değildir.** Lisans her belge için ayrı kaydedilir ve doğrulanır; sağlayıcı (CORE gibi bir toplayıcı) düzeyinde varsayım yapılmaz.

Her `analysis.source_documents` satırı şunları taşır:

| Alan | Anlam |
|---|---|
| `source_type` | `owned` (kendi içeriğimiz), `licensed` (sözleşmeyle), `open` (açık lisans), `reference_only` (yalnızca analiz) |
| `license_status` | `unknown` → `pending_review` → `verified` veya `rejected`; ÖSYM ve yayınevi için `analysis_only` |
| `license_name`, `license_url` | ör. `CC-BY-4.0` ve lisans metninin adresi |
| `commercial_use` | Ticari üründe kullanılabilir mi |
| `derivative_use` | Türev eser (özet, uyarlama) üretilebilir mi |
| `redistribution_allowed` | Metin yeniden dağıtılabilir mi |
| `text_mining_allowed` | Otomatik metin madenciliği / AI ile analiz izinli mi |
| `attribution_required` | Atıf zorunlu mu |
| `verified`, `verified_at`, `verified_by` | İnsan doğrulaması; `verified = true` için tarih zorunlu |

Kurallar:

1. `license_status = 'verified'` ve `text_mining_allowed = true` olmadan belge hiçbir AI aşamasına girmez.
2. Grounding'de bile kaynak cümleleri soruya taşınmaz; yalnızca konu, kavram, terim listesi ve discourse yapısı kullanılır.
3. `attribution_required = true` belgeler, onlardan türeyen QuestionSpec'lerde `groundingSourceDocumentIds` ile izlenir (Faz 3).
4. `CC-BY-NC` gibi ticari kullanımı yasaklayan lisanslar `commercial_use = false` ile kaydedilir ve ürün içeriğine kaynak olamaz.
5. Faz 2'de korpus indirilmez; yalnızca şema ve bu kurallar vardır.

## 4. Kontaminasyon kontrolleri (Faz 3)

- Üretilen her soru için: yerel ÖSYM korpusuna ve banka maddelerine karşı 5-gram örtüşmesi; ardından cümle embedding benzerliği.
- Analiz tarafında bugün: `analysis.questions.text_sha256` ile tekrar tespiti; analiz açıklamalarının soruyu ≥ 6 kelimelik dizilerle alıntılayıp alıntılamadığı kontrol edilir.
- Eşik aşımı kritik hatadır; ağırlıklı kalite puanından bağımsız olarak reddedilir.

## 5. Nerede ne durur

| Veri | Yer | Git | Üretim DB |
|---|---|---|---|
| Kaynak PDF'ler | `sources/` | Hayır | Hayır |
| OCR, temiz metin, yeniden kurulmuş sorular, AI ham yanıtları, inceleme dosyası | `.data/analysis/` | Hayır | Hayır |
| Kaynak kayıtları (başlık, hash, lisans) | `pipeline/sources.ts` | Evet | `analysis.sources`, `analysis.source_documents` |
| Metinsiz DNA (etiketler, sayılar, hash) | — | Hayır (DB'de) | `analysis.*` |
| Toplu desen raporu (metinsiz) | `docs/analysis/` | Evet | — |
