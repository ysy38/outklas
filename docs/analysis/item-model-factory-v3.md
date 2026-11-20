# Item Model Factory v3

Soru üretimi artık tek bir beş seçenek çağrısı değildir. Mevcut fabrikanın içine bir item-model katmanı eklendi. Bu katman kaynak, anahtar ve çeldirici havuzunu ayrı kapılardan geçirir. İlk API turu başlatılmadı.

## 1. Mevcut kodla entegrasyon

Yeni kod `src/modules/factory/item-model/` altındadır ve `pipeline/cli.ts` içindeki iki komutla çalışır. İkinci bir veritabanı, sağlayıcı veya soru servisi yoktur.

`judgeDecision` artık yalnızca okuduğu iki alanı ister: doğru harf ve hedef bant. Cümle tamamlama spec'i bu alanları zaten taşır. Restatement, çeviri ve okuma için sahte bir cümle-tamamlama spec'i üretilmez.

Yazar ile yargıç ayrımı mevcut `generatorJudgeIndependent` ile yapılır. Biçim bozukluğu `integrityProblems`, yüzey örtüşmesi `shingles`, harcama sınırı `SpendBudget` üzerinden gider. DNA satırları `DnaQuestion` olarak okunur; metinleri bu katmana kopyalanmaz.

## 2. Item Model Registry

On soru türünün ortak alanları `ItemModelDefinition` içindedir: `questionType`, `itemModelId`, `measuredConstruct`, `targetDifficulty`, `sourcePolicy`, `stemStructure`, `answerStructure`, `distractorStrategy`, `verificationStrategy`, `reviewStatus`.

Üretici yazılan türler:

| Model | Graf düğümü | Prompt sürümü |
| --- | --- | --- |
| `restatement.meaning_equivalence` | `question_type:closest_meaning` | `item-model.restatement.v1` |
| `translation.meaning_preservation` | `question_type:translation` ve iki yön | `item-model.translation.v1` |
| `reading.evidence_based` | `question_type:reading_comprehension` | `item-model.reading.v1` |

Diğer yedi tür aynı arayüzdedir ve `implemented: false` döner. `requireModelId` bu türlerde üretime geçmez. Mevcut cümle tamamlama hattı duruyor; bu registry onu kapatmaz.

## 3. Üç türün üretim ve kontrol sözleşmesi

Ortak sıra tektir ve yeniden deneme yoktur.

1. Kaynak yetersizse gövde ve çeldirici aşamasına geçilmez.
2. Anahtar yapısal olarak zayıfsa çeldirici havuzu kullanılmaz. `meaningDelta: "shifted"` olan bir anahtar reddedilir. Bu kapı anlamsal doğruluk belgesi değildir.
3. Havuzdan dört çeldirici, dört ayrı hata mekanizmasıyla seçilir. İkinci cevap riski, kopya, bozuk biçim ve tanımsız mekanizma elenir. Dört aday kalmazsa beşli tamamlanmaz.
4. Deterministik kontrol şemayı, beş seçeneği, tekrarları, biçimi, cevap harfini, kaynak atfını ve resmî yüzey örtüşmesini bakar. Örtüşme anlamsal kanıt sayılmaz.
5. Anlamsal karar mevcut `judgeDecision` ile verilir. Yazarın kendi puanı rapora yazılır ve `treatedAsProof: false` kalır. Yargıç anahtarı onaylamış sayılmaz (`keyCertifiedByJudge: false`). Onay, editör durumuna ancak insan incelemesiyle geçer.

Kaynak sözleşmeleri:

- Restatement: özgün önerme; kapsam, kiplik, kutup, zaman ve argüman yapısı. Anahtar önermenin kopyası olamaz.
- Çeviri: kaynak cümle, yön, roller ve kapsam. Kaynak ve hedef dil ayrıdır. Hedef metin, mevcut `looksTurkish` taramasından geçer. Bu tarama dil kimliğinin kanıtı değildir.
- Okuma: en az iki cümlelik pasaj, adlandırılmış okuma işlemi ve pasajda birebir bulunan kanıt alıntısı. Alıntının pasajda durması, doğru cevabın metinden çıktığını kanıtlamaz.

## 4. Gold benchmark ayrımı

`splitGold` DNA satırlarını üç yere ayırır: üretim kartı, değerlendirme kimliği, tam metni olmadığı için bekletilen aile.

Aile anahtarı, pasajlı sorularda `belge + stimulus`, diğerlerinde `soru türü + birincil kavramlar`dır. Ailenin tamamı tek taraftadır. Bir üyede tam metin yoksa aile iki kümeye de girmez.

Üretim kartı soyuttur: kavram, söylem ve sözdizimi düğümleri, çeldirici mekanizmaları, yüzey sayıları. Kapsam alanı boş bırakılır çünkü DNA doğrulanmış bir kapsam yargısı taşımaz. Soru metni, `cognitiveDemand` dahil, karta yazılmaz. `humanReviewStatus: approved` olsa bile etiket `dna_labels_are_not_human_judgment` olarak işaretlenir.

Değerlendirme kümesi belge, numara ve `textSha256` tutar. Bu kimlikler öğrenci bankasına yazılmaz.

## 5. Mock test sonuçları

`npx vitest run src/modules/factory/item-model/item-model.test.ts pipeline/item-factory.test.ts src/modules/factory/factory.test.ts pipeline/factory.test.ts`

253 test geçti. Yeni dosyalar 16 testi kapsar. Kilitlenen davranışlar:

- Zayıf kaynak ve kaymış anahtar çeldiriciye varmadan reddedilir.
- Dört ayrı mekanizma yoksa seçenekler `null` kalır.
- Aynı model hem yazıp hem yargılayamaz. Rakip seçenek, yazarın "APPROVE" iddiasını geçersiz kılar.
- Yargıç paketi yokken kayıt `structurally_valid` kalır ve editör onayı kabul edilmez.
- Resmî yüzey örtüşmesi, prompt sürümü değişikliği ve ikinci deneme durdurulur.
- Editör kimliği, zamanı, sürümü ve gerekçesi yazılır. Öğrenci yanıtı yokken kalibrasyon olmaz. `verifiedDifficulty` her zaman `null` döner.
- Hedef bant `hard` kalsa da gözlenen zorluk `unobserved` başlar.

## 6. TypeScript ve build

`npx tsc --noEmit` hatasız bitti.

`npm run build` başarılı. Next.js 15.5.27 derledi, tip kontrolünü geçti ve 38 sayfayı üretti.

## 7. API benchmark komutu ve bütçe

`factory-item-benchmark` bilinçli bir güvenlik kilididir. Yetki ve bütçe tutsa bile 90 adaylık profile yürütücü bağlanmaz; `lock: "safety"` ve `started: false` döner. Bu, eksik fonksiyon değil, o profilin kapalı tutulmasıdır.

Dokuz adaylık ön değerlendirme ayrı profildedir. Yürütücü mevcut önbellek, sayaç ve ayrıştırıcıyı kullanır. Her aşama tek çağrıdır; başarısız madde yeniden üretilmez. Komut yetkisizken sağlayıcı kurulmaz:

```bash
npm run analysis -- factory-item-plan
npm run analysis -- factory-item-benchmark --authorize item-model-benchmark-v1
npm run analysis -- factory-item-precheck --authorize item-model-precheck-v1
```

Ön değerlendirme tavanı 36 çağrı, 0 yeniden üretim ve 1,80 USD'dir. Daha yüksek bir ortam bütçesi bu tavanı yükseltemez. Modeller ve üç üretim promptu 90'lık planla aynıdır. Yargıç promptu `item-model.judge.v1` dir ve anahtar harfini görmez. Türe özgü anlam kanıtı bu çağrıda `not_run` kalır; yargıç kararı onun yerine PASS yazılmaz. Bu hazırlık sırasında komut çalıştırılmadı.

Dondurulan plan:

- Türler: restatement, translation, reading_comprehension
- 30 + 30 + 30 = 90 aday
- Üretici ve yargıç: mevcut `modelDefaults` (ayrı modeller)
- Promptlar: yukarıdaki üç sürüm ve `judge-contract.v3`
- Çağrı tavanı: 360. Aday başına 4 çağrı. `maxRegenerations` ancak 0 olabilir.
- Maliyet tavanı: aday başına 0,20 USD, toplam 18 USD. Daha yüksek bir sınır reddedilir.
- Prompt, model veya eşik override'ı reddedilir.
- `autoStart: false`. Öğrenci bankasına yazma yok.

Harcama, yeni bir bütçe sınıfıyla değil, mevcut `SpendBudget` ile kurulur. Fiyat tablosu yoksa maliyet sınırı zaten kurulamaz.

## 8. Editoryal rubrik

İlk tur için mühendislik eşiği, akademik standart olarak sunulmaz:

| Ölçüt | Eşik |
| --- | --- |
| Yapısal tamamlanma | en az %90 |
| Editör kabulü | en az %70 |
| Kabul edilen maddede tek anahtar | hepsi |
| Kabul edilen maddede en az iki işlevsel çeldirici | en az %80 |

`scoreRubric` bu çubuğu gevşetmez. Mevcut yargıç eşikleri aynı kaldı: ret için `correctness` 0,6, onay için 0,85.

Durumlar yayın durumu değildir: `generated`, `structurally_valid`, `needs_editorial_review`, `editor_approved`, `rejected`, `pretest_ready`, `calibrated`. `publishState` yalnızca `unpublished` olabilir. `calibrated`, yanıt sayılarıdır; `psychometrically_validated` veya `hard_verified` üretilmez.

## 9. İçerik hakları ve özgünlük

- Üretim kartında resmî soru metni yoktur.
- Beş kelimelik ortak dizi veya kısa metnin aynısı `official_surface_overlap` ile reddedilir.
- `refuseStudentBankWrite` `bank-import`, `student-bank`, `items` ve `db:items` hedeflerini keser.
- `publishToStudentBank` her çağrıda hata verir.
- Eski fabrika kayıtları silinmedi.

## 10. Korunan ve bu turda kullanılmayan parçalar

Kullanılanlar: `judgeDecision`, `generatorJudgeIndependent`, `shingles`, `integrityProblems`, `SpendBudget`, `loadSpendLimits`, `DnaQuestion`, `modelDefaults`.

Bu turda çağrılmayanlar, yerlerinde durur: `validateCandidate` (yalnız cümle tamamlama), `familyBlueprints`, iskelet üretimi, contrastive, complete-first, direct-sonnet ve restatement smoke. Bunlar tek çağrıda beşli üreten önceki deneylerdir. Yeni katman onları tekrar çalıştırmaz.

## Bilinçli sınır

Doksan soruluk batch çalıştırılmadı. Yedi türün üreticisi yok. Öğrenci ön testi olmadan zorluk doğrulanmış sayılmıyor. DNA etiketleri insan yargısı yerine geçmiyor.
