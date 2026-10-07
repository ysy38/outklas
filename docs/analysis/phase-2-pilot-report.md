# Faz 2 pilot raporu — YDS 2024 Kasım

Tarih: 7 Ekim 2026 · Plan: [`docs/architecture/phase-2-plan.md`](../architecture/phase-2-plan.md) · Desen raporu: [`yds-2024-11-dna.md`](yds-2024-11-dna.md) · Ham ölçümler: yerel `.data/analysis/yds-2024-11/metrics/metrics.json` · 80 sorunun incelenebilir analizi: yerel `.data/analysis/yds-2024-11/review/review.md` (gitignore'lu, soru metni içerir).

Bu rapor soru, şık veya pasaj metni içermez. Sorular numarayla, kavramlar knowledge graph referansıyla anılır.

## Özet

- **Kitapçık:** YDS 2024 Kasım, İngilizce, 80 soru, taranmış (metin katmanı yok), iki sütun ve turuncu filigran. Seçim gerekçesi: OCR yolunu gerçekten zorlayan özgün ÖSYM düzeni ve son sayfada bağımsız bir cevap anahtarı (plan §1).
- **Sonuç:** 80/80 soru ayrıştırıldı; 78 analiz şemadan geçti; **53 analiz kabul edildi** ve metinsiz olarak canlı `analysis` şemasına yazıldı. 25 soru inceleme kuyruğunda, 2 analiz başarısız.
- **Güvenilir olanlar:** OCR (iki bağımsız okuma arasında ortalama karakter hatası %0,2), segmentasyon (80/80), soru tipi (78/78), kör çözüm ile anahtar uyumu (73/78).
- **Tahmin olanlar:** zorluk (yanıt verisi yok, aralık sıkışık), kavram yanılgıları (fazla atanıyor), çeldirici türünün inceliği. Elle kontrol bir YDS uzmanı tarafından değil, bu oturumdaki ajan tarafından yapıldı.
- **Kanonik graph değişmedi:** 0 yeni düğüm, 0 yeni kenar; 62 kelime önerisi inceleme kuyruğunda. Faz 1 satırları (155 / 280 / 113) parmak izi düzeyinde aynı.

## Kabul edilen soruların bölümlere dağılımı

| Bölüm (blueprint) | Sorular | Kabul | Kalanın nedeni |
|---|---|---|---|
| Kelime | 1–6 | 6/6 | · |
| Dil bilgisi | 7–16 | 8/10 | 10 çıkarım incelemesi, 11 kör çözüm uyuşmazlığı |
| Paragrafta boşluk | 17–26 | 9/10 | 26 çıkarım incelemesi |
| Cümle tamamlama | 27–36 | 8/10 | 28 analiz geçersiz, 33 kör çözüm uyuşmazlığı |
| Çeviri | 37–42 | 4/6 | 38 çıkarım + kör çözüm, 40 analiz geçersiz |
| Okuma | 43–62 | 11/20 | 9 soruda analiz notu metinden alıntı yapıyor (`quotes_item`) |
| Diyalog | 63–67 | 0/5 | çıkarım incelemesi: beklenen boşluk bulunamadı (`blank_count_0`), tek okuma |
| Anlamca yakın | 68–71 | 3/4 | 69 alıntı |
| Paragraf tamamlama | 72–75 | 4/4 | · |
| Anlam bütünlüğünü bozan | 76–80 | 0/5 | çıkarım incelemesi: tek okumada (I)–(V) cümle işaretleri bozuk veya eksik |

DNA dağılımları bu yüzden okuma bölümünü az, diyalog ve anlam bütünlüğü bölümlerini hiç temsil etmiyor.

## 20 metrik

Her metrikte üç şey var: **ne ölçüldü**, **sonuç**, **ne kadar güvenilir**.

### 1. OCR doğruluğu
- **Yöntem:** (a) Tesseract (eng+tur, WASM) sütun bazında; (b) aynı sütun görüntüsünün bağımsız ikinci okuması (`gemma-4-31b-it`, görsel transkripsiyon, ayrı ve kayıtlı aşama `ocr-verify`); (c) iki okuma arasında soru bazlı karakter hata oranı (CER); (d) 7 soruda (846 kelime) sütun kırpıntısı ile son metnin elle karşılaştırılması.
- **Sonuç:** Tesseract ortalama kelime güveni 94; 10.302 kelimenin 127'si 60'ın altında. İki okuma arası CER: ortalama 0,002, medyan 0, p90 0,0066, en yüksek 0,0224; eşik (%2) üstünde 1 soru. Elle örneklem kelime hata oranı: Tesseract %1,3, son metin %0,83.
- **Güvenilirlik:** Kasım 2024'ün metin katmanlı ikizi yok; (c) dolaylı bir alt sınır, (d) küçük bir örneklem. 45 soruda en az bir satır tek okumaya (Tesseract) düştü (`single_reading`); bunun ana nedeni sağlayıcının uzun pasaj sütunlarını telif filtresiyle (`RECITATION`) yazmayı reddetmesi. Filigranın altındaki tek okumalı satırlarda harf hataları kalıyor.

### 2. Segmentasyon
- **Yöntem:** 1–80 numara dizisi, her soruda 5 şık, pasaj bağlantılarının blueprint bantlarıyla eşleşmesi; 7 sorunun sınırları elle kontrol edildi; cevap anahtarı sayfası ayrıca ayrıştırıldı.
- **Sonuç:** 80/80 blok, 80/80 soruda 5 şık, beklenen yerde pasaj 75. Çıkarım durumu: 67 ok, 13 inceleme, 0 başarısız. Cevap anahtarı 80/80, uyuşmazlık 0. Elle sınır kontrolü 7/7.
- **Güvenilirlik:** Kesin. Kitapçıkta bölüm başlığı basılı değil; bölümler blueprint'ten geliyor.

### 3. Soru tipi
- **Yöntem:** Analyzer'ın seçtiği `question_type` düğümü, resmi blueprint bandına karşı.
- **Sonuç:** 78/78 uyumlu, 0 uyuşmazlık. Elle örneklem 10/10.
- **Güvenilirlik:** Kesin (blueprint resmi düzen). Tip, analizde enum ile kısıtlı.

### 4. Kavram
- **Yöntem:** Birincil ve ikincil kavram referanslarının geçerlilik oranı, kapsama (en az bir referans olan soru payı), soru başına ortalama; 10 soruluk elle örneklem.
- **Sonuç:** Birincil: kapsama 1,0, soru başına 2,09, 33 farklı düğüm. İkincil: kapsama 0,887, 23 farklı düğüm. Elle: 7 doğru, 3 kısmen, 0 yanlış.
- **Güvenilirlik:** Referanslar geçerli (enum kısıtı + doğrulama). Doğruluk yalnızca 10 soruluk elle örneklemle ölçüldü.

### 5. Beceri
- **Yöntem:** Birincil, ikincil ve bilişsel beceri facet'lerinin kapsaması ve çeşitliliği; elle örneklem.
- **Sonuç:** Birincil beceri kapsama 0,943, 11 farklı; ikincil 11 farklı; bilişsel kapsama 1,0, soru başına 2,62, 9 farklı. Elle: 6 doğru, 4 kısmen.
- **Güvenilirlik:** Orta. Beceri ile kavram arasındaki sınır modelde bulanık (aynı `skill:*` düğümü hem kavram hem beceri olarak geliyor).

### 6. Dil bilgisi
- **Yöntem:** `grammar` facet'i kapsaması ve çeşitliliği; elle örneklem.
- **Sonuç:** Kapsama 0,623, soru başına 1,26, 15 farklı düğüm. Elle: 8 doğru, 1 kısmen, 1 yanlış.
- **Güvenilirlik:** Orta-iyi. Okuma sorularında dil bilgisi etiketi olmaması beklenen bir durum.

### 7. Kelime
- **Yöntem:** Kelime girdileri (lemma + rol), graph'a bağlananların sayısı; elle örneklem.
- **Sonuç:** Kapsama 0,868, soru başına 3,68, 181 farklı lemma; 24'ü mevcut düğüme bağlı. Roller: bağlam 68, çeldirici 55, sınanan 49, cevap 23. Elle: 8 doğru, 2 kısmen.
- **Güvenilirlik:** İyi. Faz 1 graph'ında `vocabulary` düğümü olmadığından bağlanma oranı düşük; bağlanamayanlar öneri oldu (bkz. 15).

### 8. Söylem (discourse)
- **Yöntem:** `discourse` facet'i ve doğru cevabın ifade ettiği ilişki (`answer_expresses`); elle örneklem.
- **Sonuç:** Kapsama 0,679, 10 farklı ilişki; `answer_expresses` kapsama 0,774, 29 farklı düğüm. Elle: 8 doğru, 2 kısmen.
- **Güvenilirlik:** İyi; bağlaç sorularında en güçlü sinyal bu.

### 9. Çeldirici sınıflandırması
- **Yöntem:** Her yanlış şık için `distractor_type` (zorunlu), isteğe bağlı ifade ettiği ilişki, hedeflediği kavram ve yanılgı. Ayrıca farklı model ailesiyle (`gemma-4-31b-it`) kör çözüm, cevap anahtarına karşı.
- **Sonuç:** 212/212 çeldirici sınıflandı. En sık: `semantic_mismatch` 81, `wrong_discourse_relation` 49, `logical_incompatibility` 22, `syntactic_mismatch` 20. Kör çözüm 73/78 anahtarla uyumlu; uyuşmazlık: 11, 33, 38, 64, 79. Elle: 5 doğru, 5 kısmen.
- **Güvenilirlik:** Tür düzeyi makul, incelik zayıf: elle örneklemin yarısı "kısmen". En genel tür olan `semantic_mismatch` tüm çeldiricilerin %38'i; okuma ve kelime sorularında baskın.

### 10. Zorluk
- **Yöntem:** Analyzer'ın 7 boyutlu tahmini (0–1). Dolaylı geçerlilik: metin uzunluğu ve kör çözüm güveniyle Spearman korelasyonu.
- **Sonuç:** Genel ortalama 0,49 (p10 0,40, p90 0,55, aralık 0,30–0,65). Uzunlukla ρ = 0,37; kör çözüm güveniyle ρ = −0,53 (beklenen yönde). Paragraf tamamlama ve anlamca yakın en zor, kelime en kolay tahmin edildi.
- **Güvenilirlik:** **Tahmin.** Gerçek yanıt verisi (p-değeri, IRT) yok; aralık sıkışık ve kalibre değil. Elle değerlendirilmedi. Faz 4'te öğrenci yanıtlarıyla kalibre edilmeden adaptif motorda kullanılmamalı.

### 11. Kavram yanılgısı
- **Yöntem:** Soru ve çeldirici düzeyinde `misconception` referansları; elle örneklem.
- **Sonuç:** Kapsama 0,321, 5 farklı yanılgı, 32 çeldiricide. `collocation_by_meaning_only` 32 soruda (%60), `concession_vs_contrast` 8, `cause_vs_result_direction` 5. Elle: 7 doğru, 3 kısmen.
- **Güvenilirlik:** Düşük-orta. `collocation_by_meaning_only` neredeyse her kelime sorusuna atanıyor (aşırı atama). Faz 1'deki 5 yanılgı düğümüyle sınırlı.

### 12. Güven dağılımı
- **Yöntem:** Analyzer'ın kendi güven değeri.
- **Sonuç:** 78 analizin hepsi 0,9–1 aralığında, ortalama 0,964; modelin kendi "inceleme gerekir" işareti 0.
- **Güvenilirlik:** Model güveni ayırt edici değil; kabul kararı model güvenine değil, deterministik kontrollere dayanıyor.

### 13. İnsan incelemesi gerektiren
- **Yöntem:** Engelleyici işaretlerin sayımı.
- **Sonuç:** 27 soru (25 inceleme + 2 başarısız). Engelleyiciler: çıkarım incelemesi 13, analiz notu alıntı 11, kör çözüm uyuşmazlığı 5, analiz geçersiz 2. Engellemeyen uyarılar: `single_reading` 45, `wrong_facet_type` 15 (düşürüldü), `unknown_ref` 1.
- **Güvenilirlik:** Kesin.

### 14. Tekrar
- **Yöntem:** Kitapçık içi: normalize metin hash'i (tam) ve 5 kelimelik shingle Jaccard (yakın). Canlı soru bankasına karşı: 102 canlı öğenin shingle hash'leri SQL'de hesaplandı (metin dışarı çıkmadı).
- **Sonuç:** Kitapçık içi tam 0, yakın 0. Canlıya karşı 25 çiftte tek bir ortak 5'li (hepsi pilotun 76–80'i ile canlıdaki aynı biçimli öğeler), en yüksek Jaccard 0,006.
- **Güvenilirlik:** Kesin; canlı bankada bu kitapçıktan alıntı yok.

### 15. KG düğümleri
- **Yöntem:** Kanonik `knowledge_nodes` sayısı önce/sonra; öneri kuyruğu.
- **Sonuç:** Kanonik oluşturulan **0** (155 → 155). DB'de 62 öneri (hepsi `vocabulary`), 62 soru–öneri bağlantısı. İnceleme kuyruğunda 5 kavram önerisi (4 model, 1 düşürülen referans).
- **Güvenilirlik:** Kesin.

### 16. KG kenarları
- **Yöntem:** Kanonik `knowledge_edges` önce/sonra; analiz bağlantıları.
- **Sonuç:** Kanonik oluşturulan **0** (280 → 280). Analiz bağlantıları: 790 soru–düğüm, 212 çeldirici satırı, 33 aile, 111 aile üyeliği.
- **Güvenilirlik:** Kesin.

### 17. Belirsizlikler
- **Yöntem:** Analyzer'ın belirsizlik notları + kör çözüm uyuşmazlıkları.
- **Sonuç:** Model hiçbir soruda belirsizlik notu düşmedi (0). Gerçek belirsizlik sinyali kör çözüm uyuşmazlıkları: 11, 33, 38, 64, 79 (DNA §15).
- **Güvenilirlik:** Model kendi belirsizliğini bildirmiyor; bu metrik tek başına güvenilir değil.

### 18. Başarısız sorular
- **Yöntem:** Onarım sonrası Zod doğrulamasından geçemeyen analizler.
- **Sonuç:** 2: soru 28 (öneri slug'ı desen dışı), soru 40 (büyük harfli lemma). Metinleri ve ham yanıtları yerel önbellekte; yeniden denenebilir.
- **Güvenilirlik:** Kesin.

### 19. Pipeline hataları
- **Yöntem:** Sağlayıcı yeniden denemeleri ve geçersiz çıktılar (aşama manifestleri).
- **Sonuç:** `gemma-4-31b-it` 500 ×164, 503 ×62 yeniden deneme (hepsi sonunda başarılı); geçersiz çıktı 2; eksik kör çözüm 0. Toplam 326.547 token (241.310 girdi, 85.237 çıktı). Pilot günü `*-flash` modelleri saatlerce 503 döndü.
- **Güvenilirlik:** Kesin. Tüm yanıtlar girdi hash'iyle önbellekte; tekrar çalıştırma API çağrısı yapmaz.

### 20. Öneriler
1. **Okuma bölümünü kurtarmak:** Okuma sorularında analiz notları pasajdan kısa ifadeler alıntılıyor. Prompt'a "kavramı adlandır, ifade aktarma" kuralı ve not alanlarına uzunluk sınırı eklenmeli; bu 9 soruyu yeniden analiz etmek yeterli.
2. **Diyalog ve anlam bütünlüğü bölümleri:** Diyalogda boşluk kontrolü bölüme özgü olmalı (boşluk konuşma satırının içinde); anlam bütünlüğünde (I)–(V) işaretleri için ayrı yeniden kurma kuralı ve ikinci okuma. Şu an 10 sorunun hepsi incelemede.
3. **İkinci bağımsız OCR:** `RECITATION` reddedilen sütunlar için yerel ikinci motor (farklı Tesseract modeli veya PaddleOCR). Böylece `single_reading` uyarısı gerçek bir çapraz kontrole dönüşür.
4. **Yanılgı etiketlerini sıkılaştırmak:** Yanılgıyı yalnızca belirli çeldiricide ve gerekçesiyle kabul etmek; `collocation_by_meaning_only` için soru başına üst sınır.
5. **Zorluk:** Yanıt verisi gelene kadar yalnızca göreli sıralama olarak kullanmak; mutlak değerleri öğrenciye göstermemek.
6. **Öneri kuyruğu:** 62 kelime önerisi ve 5 kavram önerisi insan incelemesinden geçip `seed.ts` → `knowledge:sync` ile kanonikleşmeli (Faz 1 kuralı).
7. **Ölçek:** İkinci kitapçık metin katmanlı bir form olmalı (Ekim 2023 veya Mart 2025); OCR yolunu atlayıp analiz katmanını ayrıca ölçmeyi sağlar.
8. **Uzman incelemesi:** Elle örneklem bir YDS uzmanı tarafından tekrarlanmalı (özellikle çeldirici türü ve yanılgı).

## Bulgu: YDS "beklenmedik sonuç" ve "zıtlık"ı nasıl sınıyor

Kaynak: kabul edilen 53 sorunun aile, çeldirici ve `answer_expresses` kayıtları (DNA §1, §5, §8, §9, §14) ve yerel incelemede okunan sorular. Tek kitapçık; genelleme değil, hipotez.

- **İki ayrı aile, beş yüzey.** `discourse_relation:concession` ailesi 5 soru (12, 23, 24, 30, 70): paragrafta boşluk 2, dil bilgisi 1, cümle tamamlama 1, anlamca yakın 1. `discourse_relation:contrast` ailesi 5 soru (16, 34, 35, 37, 75): cümle tamamlama 2, dil bilgisi 1, paragraf tamamlama 1, çeviri 1. Aynı ilişki farklı yüzeylerde sınanıyor; bu, transfer ölçümü (Faz 4) için doğal bir aile.
- **Çeldiricinin ana mekanizması yanlış ilişki.** Beklenmedik sonuç ailesindeki 20 çeldiricinin 15'i `wrong_discourse_relation`; zıtlık ailesinde 20'nin 9'u. Yanlış şıklar çoğunlukla dil bilgisi olarak yerine oturan ama mantıksal ilişkisi yanlış bağlaçlar.
- **Bağlaç ve boşluk sorularında beklenmedik sonuç, zıtlığa karşı değil başka ilişkilere karşı sınanıyor.** Anahtarı beklenmedik sonuç olan bağlaç/boşluk sorularında (12, 23, 24) çeldiricilerin ifade ettiği ilişkiler koşul (`connector:as_long_as`, `connector:provided_that`, `connector:unless`), zaman (`connector:until`), sebep (`connector:due_to`, `discourse_relation:cause`) ve ekleme (`connector:in_addition`). Zıtlık bağlacı bu üç sorunun hiçbirinde çeldirici değil. Zıtlık anahtarlı soruda (35) de çeldiriciler ekleme, sebep ve sonuç.
- **Zıtlık ile beklenmedik sonucun doğrudan karşılaştığı yer anlamca yakın cümle.** Soru 70'te doğru şık beklenmedik sonuç ve sebep ilişkisini birlikte koruyor; 4 çeldiricinin 2'si ilişkiyi düz zıtlığa, biri sonuca, biri sıralamaya kaydırıyor. `concession_vs_contrast` ayrımı bu kitapçıkta bağlaç seçiminden çok yeniden ifade etmede sınanıyor.
- **Zıtlık/beklenmedik sonuç bağlaçları çeldirici olarak da kullanılıyor.** Anahtarı örnekleme (`connector:for_instance`) olan soruda (36) çeldiriciler `connector:on_the_other_hand`, `connector:in_contrast`, `connector:nonetheless`, `connector:moreover`.
- **Cümle tamamlamada beklentinin kırılması.** Beklenmedik sonuç kuran cümle tamamlama sorusunda (30) yanlış şıklar yan cümledeki fikri sürdürüyor veya destekliyor; doğru şık beklentiyi tersine çeviriyor. Ayırt edici beceri bağlacı tanımak değil, yan cümlenin kurduğu beklentiyi okumak.
- **Yanılgı.** `misconception:concession_vs_contrast` 8 soruda atandı. Ancak etiket bazen yerinde değil: soru 36'da anahtar örnekleme olduğu halde zıtlık ve beklenmedik sonuç çeldiricilerine bu yanılgı atanmış. Soru 12'de model anahtardaki `connector:whereas`'ı beklenmedik sonuç ilişkisiyle etiketlemiş; bu bağlaç genelde zıtlık sayılır. Bu iki ilişkinin modelin kendisi için de ayırt edilmesi zor; bu etiketler uzman incelemesine öncelikli gitmeli. Faz 1'in `despite_with_finite_clause` yanılgısı (despite/although dil bilgisi tuzağı) bu kitapçıkta hiç atanmadı; soru 24'te `connector:despite` anahtar, ama çeldiriciler ilişki türüyle ayrışıyor (sebep, ekleme), dil bilgisi biçimiyle değil.

## Sınırlar ve yanlılıklar

- **Tek kitapçık, 53 kabul.** Okuma 11/20, diyalog ve anlam bütünlüğü 0/10 temsil ediliyor.
- **Elle kontrol ajan tarafından.** Uzman değil; DNA'daki "doğru" oranları üst sınır gibi okunmalı.
- **Zorluk kalibre değil;** yanıt verisi olmadan doğrulanamaz.
- **Kalibrasyon bırakıldı** (Ekim 2023 PDF'inin gömülü olmayan fontu render'ı bozuyor; plan §9).
- **Model erişimi:** Ücretsiz katman; Pro modeller kapalı, flash modelleri pilot günü 503 verdi. Analyzer `gemini-3.5-flash-lite`, Verifier `gemma-4-31b-it`. Daha güçlü bir modelle sonuçlar değişebilir.
- **Telif filtresi:** Sağlayıcı uzun pasajları yeniden yazmayı reddediyor; bu filtre aşılmaya çalışılmadı.

## Açık kararlar (kullanıcı)

1. Gemini için faturalandırma açılacak mı (ücretsiz katmanda gönderilen içerik ürün geliştirmede kullanılabilir; Pro modeller kapalı)?
2. Öneri kuyruğunu kim, hangi sıklıkla inceleyecek?
3. `pdfcoffee` kaynaklı PDF'ler ÖSYM'nin resmi yayınıyla değiştirilecek mi (`license_status = unknown`)?
4. Telif filtresinin reddettiği sütunlar için yerel ikinci OCR motoru mu, insan incelemesi mi?
5. İkinci pilot kitapçık: Ekim 2023 mü, Mart 2025 mi?
