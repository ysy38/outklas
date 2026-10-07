# Faz 2b raporu — metin katmanı, kalite kapıları, ölçek durdurma

Tarih: 7 Ekim 2026 · Önceki pilot: [`phase-2-pilot-report.md`](phase-2-pilot-report.md) · Kasım DNA: [`yds-2024-11-dna.md`](yds-2024-11-dna.md) · Ölçek eşikleri: `src/modules/analysis/thresholds.ts` (ölçümden önce kilitlendi).

Bu rapor soru, şık veya pasaj metni içermez.

## Karar

Toplu analiz **çalıştırılmadı.** YDS 2018 Sonbahar (derlemeden dilimlenen tek tam 80’li kitapçık) çıkarım eşiğinin altında kaldı; Gemini ücretli katmanı da henüz açık değil. Tüm ÖSYM metni göndermeyen adımlar bitti.

## 1. Derleme envanteri (OCR yok, pdfjs metin katmanı)

Ham çıkarım `.data/analysis/` altında, hash’li ve gitignore’lu. Lisans: `analysis_only` / FSEK, grounding yok.

### 2013–2021 YDS derlemesi (`yds-2013-2021`)

- 455 sayfa, 437’sinde metin, 233 iki sütun, 21.503 satır.
- 22 sınav sınırı. Cevap anahtarı olan 16. **Tam 80’li (complete_80) yalnızca 2:** `yds-2018` (s.259–286, anahtar 283) ve `yds-2018-2` (s.287–311, anahtar 311).
- Geri kalanlar `incomplete` (bulunan soru 5–79). 2016 Sonbahar 79, 2017 ikinci oturum 79. Tek sayfalık “kırık” sınırlar (p3, p29, p52, …) başlık/sütun kaymasından.
- İki sütun + heceleme + üstbilgi/altbilgi temizliği uygulandı; birçok kitapçıkta soru sayısı yine 80’e ulaşmadı (yeniden kurma uyarıları).

| Slug | Yıl / oturum | Sayfalar | Bulunan | Şekil | Anahtar |
|---|---|---|---|---|---|
| yds-p3 | — | 3 | 5 | incomplete | hayır |
| yds-2013-spring | 2013 İlkbahar | 4–28 | 48 | incomplete | evet |
| yds-2013-p29 | 2013 İlkbahar (kırık) | 29 | 5 | incomplete | hayır |
| yds-2013-fall | 2013 Sonbahar | 30–51 | 48 | incomplete | evet |
| yds-2013-p52 | 2013 Sonbahar (kırık) | 52 | 5 | incomplete | hayır |
| yds-2014-spring | 2014 İlkbahar | 53–75 | 50 | incomplete | evet |
| yds-2014-p76 | 2014 İlkbahar (kırık) | 76 | 5 | incomplete | hayır |
| yds-2014-fall | 2014 Sonbahar | 77–99 | 47 | incomplete | evet |
| yds-2014-p100 | 2014 Sonbahar (kırık) | 100 | 5 | incomplete | hayır |
| yds-2015-spring | 2015 İlkbahar | 101–124 | 48 | incomplete | evet |
| yds-2015-fall | 2015 Sonbahar | 125–149 | 48 | incomplete | evet |
| yds-2016-spring | 2016 İlkbahar | 150–173 | 51 | incomplete | evet |
| yds-2016-fall | 2016 Sonbahar | 174–200 | 79 | incomplete | evet |
| yds-2017 | 2017 | 201–233 | 76 | incomplete | evet |
| yds-2017-2 | 2017 | 234–258 | 79 | incomplete | evet |
| **yds-2018** | 2018 | 259–286 | **80** | **complete_80** | evet |
| **yds-2018-2** | 2018 Sonbahar | 287–311 | **80** | **complete_80** | evet |
| yds-2019 | 2019 | 312–336 | 66 | incomplete | evet |
| yds-2019-12 | 2019 Aralık | 337–358 | 57 | incomplete | evet |
| yds-2019-p359 | 2019 Aralık (kırık) | 359 | 8 | topic_sorted | hayır |
| yds-2019-09 | 2019 Eylül | 360–406 | 72 | incomplete | evet |
| yds-2019-p407 | 2019 Eylül (kırık) | 407–455 | 53 | incomplete | evet |

`sources/` içinde 2018’in taranmış ikizi yok; Tesseract–metin katmanı WER karşılaştırması yapılmadı.

### e-YDS derlemesi (`e-yds-compilation`)

- 101 sayfa, 98’inde metin, 18 iki sütun, 4.055 satır.
- 7 bölüm, hepsi **konuya göre derleme** (`topic_sorted`). Tam 80’li kitapçık **0**.
- Konu başlıkları (soru metni yok): kelime (s.1–6, 22 soru, anahtar var), tense (7–10, 9), bağlaç (11–13, 10), preposition (14–16, 8, anahtar yok), cümle tamamlama (17–26, 22), çeviri (27–43, 12), diyalog (44–101, 30).

## 2. Analiz kalitesi — Kasım 2024 yeniden uygulama

Kurallar + önbellek; yeni ÖSYM çağrısı yok (79/80 önbellekten). Q28 ve Q63–67 önceki oturumda önbellek kaçırmıştı; bu oturumda tekrar gönderilmedi.

| Sorun | Pilot (Faz 2) | Faz 2b |
|---|---|---|
| Kabul / inceleme / başarısız | 53 / 25 / 2 | **64 / 16 / 0** |
| Şema (Q28, Q40) | 2 fail | 0 (lemma/slug coerce) |
| `collocation_by_meaning_only` | 32 soru (%60) | kapsama 0,125; çeldiricide 17 kanıtlı etiket |
| Yanılgı kuralı | serbest | yalnızca çeldirici kanıtı + collocation türü |
| `quotes_item` | 11 | **3** (5-gram strip; eşik 0, hâlâ kaçak) |
| Güven | hepsi 0,9–1, ortalama 0,964 | türetilmiş, ortalama **0,731**, 0,9–1 bin = 0 |
| `whereas` | concession | Phase 1 graph: contrast (`connector_relation_aligned` ×3) |
| Diyalog | 0/5 kabul | 1 kabul (Q67); 63–66 hâlâ çıkarım incelemesi |
| Anlam bütünlüğü (76–80) | 0/5 | 0/5 (I–V işaretleri hâlâ eksik) |
| Kör çözüm | 73/78 | **75/80** (%93,75) |
| Soru–düğüm / çeldirici | 790 / 212 | 911 / 256 |

Kalite kapıları Kasım 2024’te kör çözüm ve şema fail eşiklerini geçiyor; alıntı notu eşiği (0) ve diyalog/anlam bütünlüğü hâlâ kapalı.

## 3. Adım 3 — tek kitapçık ölçümü (YDS 2018 Sonbahar)

Ölçümden önce kilitlenen eşikler (`analysisScaleThresholds`):

| Kapı | Eşik | 2018-2 | Sonuç |
|---|---|---|---|
| Segmentasyon | %100 | 80/80 blok, 80 anahtar | geçti |
| Çıkarım `ok` | ≥ %85 | **39/80 = %48,75** | **kaldı** |
| Şema fail | ≤ %2 | çıkarım fail 1/80 = %1,25 | (AI yok) |
| Kör çözüm | ≥ %93 | ölçülmedi | — |
| Alıntı notu | 0 | ölçülmedi | — |
| Yanılgı kanıtlı | %100 | ölçülmedi | — |
| Soru tipi | %100 | ölçülmedi | — |
| Bağlaç↔ilişki uyumsuzluğu | 0 | ölçülmedi | — |

Çıkarım ayrıntısı: yeniden kurma uyarısı 35/80; `reconstruct` 41, `cloze_blank_missing` 5, `junk_token` 6, boş şık ve dengesiz parantez. İki sütun okuma sırası hâlâ şıkları/gövdeyi karıştırıyor. AI katmanı bu kitapçıkta çalıştırılmadı.

Kasım 2024 kör çözüm %93,75 eşiği geçse de ölçek kapısı **metin katmanlı** kitapçık içindi; o kapı açılmadı.

## 4. Faturalandırma

`gemini-3.1-pro-preview` ücretsiz kotada 429. Ücretli katman doğrulanmadı. ÖSYM metni bu oturumda Gemini’ye gönderilmedi.

## 5. Canlı veritabanı

Proje `mptxspvqkiqkkwbhbbqc`. RLS açık; `analysis` tablolarının hiçbiri RLS’siz değil. Faz 1 graph **155 / 280 / 113** (değişmedi).

| Tablo | Sayı |
|---|---|
| sources | 6 |
| source_documents | 9 |
| documents | 1 |
| runs | 2 |
| questions | 64 |
| question_features | 64 |
| question_nodes | 911 |
| distractors | 256 |
| families | 34 |
| family_members | 132 |
| node_proposals | 81 |
| question_proposals | 81 |

Yalnızca metinsiz, doğrulanmış Kasım 2024 satırları. 2018 ve e-YDS analiz satırı yok.

## 6. Kullanıcı kararları

1. Gemini ücretli faturalandırmayı aç (Pro modelin önemsiz, ÖSYM’siz bir istemde yanıt vermesi).
2. 2018 Sonbahar iki sütun yeniden kurması eşiği geçmeden toplu analiz yok; sütun birleştirmesini onayla veya taranmış resmi 2018 PDF ver.
3. e-YDS konuya göre derleme: kitapçık gibi mi işlensin, yoksa konu dilimleri olarak mı?
4. Kalan 3 `quotes_item` için prompt mu, yoksa not alanını tamamen kapatmak mı?
5. Diyalog 63–66 ve anlam bütünlüğü 76–80 hâlâ incelemede; ikinci okuma mı, elle mi?
