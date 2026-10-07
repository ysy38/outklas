# 0003 — Soru düzeyinde kabul; kısmi sınav ve konu dilimi

Tarih: 8 Ekim 2026 · Durum: kabul edildi

## Bağlam

Faz 2b, bir kitapçığı ancak 80/80 segment + yüksek çıkarım oranı varsa analize açıyordu. Bu, kullanıcının doğruladığı yedi tam 2013–2016 oturumunu “eksik” saydı ve 2018 Sonbahar’da 80 segmentten 39’unu analiz dışı bıraktı. İhtiyaç tam PDF değil, güvenilir soru sayısıdır.

## Karar

- Kaynak sınıfları: `complete_exam` (80/80), `partial_exam` (ör. 39/80, 64/80 — analize açık), `topic_slice` (e-YDS kelime/tense/bağlaç/preposition/cümle tamamlama/çeviri/diyalog — yalnızca örüntü kanıtı), `unusable`.
- Kabul soru düzeyindedir: `ok` / `needs_review` / `failed`. Eksik numara uydurulmaz.
- `topic_slice` YDS genel dağılımına (`usable_for_distribution`) girmez.
- Güven tek sayı değildir: `extraction_confidence`, `analysis_confidence`, `validation_status`, `human_review_status`.
- Çıkarım AI’sızdır. Gemini yalnızca `ok` sorularda, duman testi geçtikten sonra çalışır.
- `analysisScaleThresholds` içinden complete-exam / %85 çıkarım kapısı kaldırıldı.

## Sonuçlar

- 2013–2021 derlemesinde kullanıcı sayfa aralıkları yer gerçeğidir; sarmalayan Q1 veya 80/80 kapısı bir oturumu bölmez.
- Kısmi kitapçık DNA’ya girebilir; konu dilimi giremez (dağılım).
- Canlı `analysis` şemasına yalnızca metinsiz, kabul edilmiş satırlar yazılır. RLS açık kalır.
