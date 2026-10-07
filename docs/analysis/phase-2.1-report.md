# Faz 2.1 raporu — soru düzeyi kabul, denetçi, 2018 onarımı

Tarih: 8 Ekim 2026 · Önceki: [`phase-2b-report.md`](phase-2b-report.md) · Karar: [`0003-question-level-acceptance.md`](../decisions/0003-question-level-acceptance.md)

Bu rapor soru, şık veya pasaj metni içermez. Faz 1 graph parmak izi değişmedi: 155 düğüm / 280 kenar / 113 eşleme.

## Karar

80/80 kapısı kalktı. Metrik **kaç güvenilir soru**. Kısmi kitapçık analize açık. e-YDS konu dilimleri yalnızca örüntü kanıtı; YDS genel dağılımına girmez. Çıkarım AI’sız. Gemini yalnızca duman testi geçtikten sonra `ok` sorulara gider.

## 1. Denetçi envanteri

Kullanıcı sayfa aralıkları yer gerçeği. Q1 sarması ve 80/80-veya-blok zihniyeti kapatıldı.

### 2013–2021 derlemesi (`yds-2013-2021`)

455 sayfa, 437 metinli, 353 iki sütun. Kullanıcının 7 tam oturumu + 2018 İlkbahar/Sonbahar kayıtlı dilimler:

| Slug | Oturum | Sayfalar (kullanıcı) | Denetçi sınıfı | Unique no. | Çıkarım ACCEPT / REVIEW / FAIL |
|---|---|---|---|---|---|
| yds-2013-spring | 2013 İlkbahar (7 Nisan) | 2–27 | complete_exam | 80 | **38 / 36 / 6** |
| yds-2013-fall | 2013 Sonbahar (1 Eylül) | 28–50 | partial_exam | 79 | **34 / 35 / 10** |
| yds-2014-spring | 2014 İlkbahar (6 Nisan) | 51–74 | partial_exam | 79 | **33 / 34 / 12** |
| yds-2014-fall | 2014 Sonbahar (7 Eylül) | 75–98 | partial_exam | 68 | **30 / 18 / 20** |
| yds-2015-spring | 2015 İlkbahar (5 Nisan) | 99–122 | partial_exam | 52 | **11 / 27 / 14** |
| yds-2015-fall | 2015 Sonbahar (13 Eylül) | 123–147 | partial_exam | 58 | **21 / 21 / 16** |
| yds-2016-spring | 2016 İlkbahar (27 Mart) | 148–171 | partial_exam | 57 | **28 / 19 / 10** |
| yds-2018 | 2018 İlkbahar | 259–286 | complete_exam | 80 | **72 / 7 / 1** |
| yds-2018-2 | 2018 Sonbahar | 287–311 | complete_exam | 80 | **71 / 9 / 0** |

2015 İlkbahar hâlâ zayıf (sütun + numara adayları seyrek); metin uydurulmadı.

### 2018 Sonbahar — önce / sonra

Faz 2b: 80 segment, **39** çıkarılabilir, ölçek kapısı kırmızı. Faz 2.1: 80 segment, **71 ACCEPT / 9 REVIEW / 0 FAIL**, ortalama çıkarım güveni 0,916. Kalan 9 `junk_token` (inceleme; icat yok).

### Diğer kitapçıklar

| Kaynak | Not | ACCEPT / REVIEW / FAIL |
|---|---|---|
| yds-2023-10 (22 Ekim 2023, metin katmanı) | Anahtar s.21 (dikey `N. X`); s.22 boş. 78 blok, 2 eksik. | **65 / 13 / 0** |
| yds-2024-11 | OCR önbelleği; yeni Gemini yok. Kalite kuralları yeniden. | **68 / 12 / 0** (iskelet). Analiz önbelleği: 64 kabul |
| yds-2024-03 | 46 sayfa, 3 metinli, medyan ~24 karakter. Tarama; yerel OCR bu turda çalıştırılmadı. | unusable (native) |

### e-YDS konu dilimleri (`e-yds-compilation`)

7 dilim, hepsi `topic_slice`, `usableForDistribution=false`.

| Dilim | Sayfa | ACCEPT / REVIEW / FAIL |
|---|---|---|
| kelime | 1–6 | 16 / 2 / 1 |
| tense | 7–10 | 0 / 5 / 1 |
| bağlaç | 11–13 | 7 / 2 / 0 |
| preposition | 14–16 | 0 / 3 / 4 |
| cümle tamamlama | 17–26 | 0 / 11 / 2 |
| çeviri | 27–43 | 3 / 4 / 0 |
| diyalog | 44–101 | 0 / 22 / 3 |

## 2. Gemini duman testi (ÖSYM metni yok)

Anahtar: `.env.local`, `clientExposed: false`. `gemini-3.1-pro-preview` 429 (kota). Çalışan modeller bu oturumda: `gemini-3.1-flash-lite`, `gemini-flash-lite-latest` (önceki probe’da `gemini-flash-latest` da açıldı, sonra 429). Varsayılanlar buna çekildi. Çıkarım Gemini düşse de durmadı.

## 3. Doygunluk (3–4 kaynak)

AI yalnızca çıkarım `ok` sorularda; modeller `gemini-3.1-flash-lite` (analyzer) + `gemini-flash-lite-latest` (verifier). 2024 Kasım yeniden gönderilmedi (64 kabul, önbellek).

| Sıra | Kaynak | Çıkarım A/R/F | AI kabul / inceleme / fail | DNA satır | Yeni primary_concept | Yeni grammar | Yeni discourse | Yeni çeldirici türü |
|---|---|---|---|---|---|---|---|---|
| 1 | 2024 Kasım (taban) | 68 / 12 / 0 | 64 / 16 / 0 | 64 | — (39 unique) | — (15) | — (10) | — (11) |
| 2 | 2018 Sonbahar | 71 / 9 / 0 | 63 / 17 / 0 | 63 | **4** | **2** | **1** | 0 |
| 3 | 2018 İlkbahar | 72 / 7 / 1 | 67 / 12 / 1 | 67 | **5** | **2** | 0 | 0 |
| 4 | 2023 Ekim | 65 / 13 / 0 | 60 / 18 / 0 | 60 | **2** | 0 | 0 | 0 |

Sınav 4 neredeyse hiç yeni çeldirici / discourse / grammar eklemedi. Birleşik unique: 50 kavram, 19 grammar, 11 discourse, 11 çeldirici türü (Kasım yalnız 39 / 15 / 10 / 11).

2018-2 yeni kavramlar: `discourse_relation:addition`, `grammar:aspect`, `grammar:noun_clause`, `grammar:parallelism`. 2018 İlkbahar: `discourse_relation:comparison`, `grammar:comparison`, `grammar:gerund`, `grammar:pronoun`, `skill:reference`. 2023 Ekim: `grammar:determiner`, `skill:word_meaning`.

## 4. Canlı DB

Proje `mptxspvqkiqkkwbhbbqc`. Migration `question_level_acceptance` uygulandı. RLS açık, `analysis.*` tablolarında politika yok (bilinçli; linter INFO). Faz 1 parmak izi: **155 / 280 / 113**.

Canlı: 4 `analysis.documents` (`yds-2024-11` complete, `yds-2018` complete, `yds-2018-2` complete, `yds-2023-10` partial). Soru satırları: Kasım 64 hâlâ canlıda; 2018/2023 DNA yerelde 254 satır (PGlite). Kalan: metinsiz `questions`+düğüm SQL’inin MCP ile toptan basılması.

Yerel PGlite (dört kaynak içe aktarıldı): 4 belge, 254 soru, 3337 question_nodes, 1016 distractors. Graph değişmedi.

## 5. Kalan kararlar

1. 2015 İlkbahar / Sonbahar native metin seyrek; OCR ikizi yok — bu aralıklar REVIEW’da mı kalsın?
2. e-YDS dilimleri canlıya yazılsın mı (dağılım dışı, örüntü)?
3. Analyzer kotası: Pro preview hâlâ 429; Flash-Lite ile doygunluk.
4. Mart 2024 taraması için tam OCR bu turda atlandı.
