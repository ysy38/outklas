# 0001 — LLM içerik zekâsı katmanıdır, adaptive engine değildir

Tarih: 7 Ekim 2026 · Durum: kabul edildi

## Bağlam

Spec'ler AI rollerini (Analyzer, Generator, Evaluator/Judge, Verifier, Explainer, Tutor) tanımlıyor. Bir LLM'in öğrenciye anlık soru üretmesi veya sıradaki soruyu seçmesi cazip ama kalite, tekrarlanabilirlik, maliyet ve telif açısından risklidir.

## Karar

- LLM yalnızca **offline içerik zekâsı** katmanında çalışır: geçmiş sınav analizi, ileride QuestionSpec'ten özgün soru üretimi ve bağımsız değerlendirme.
- Üretimde runtime üretim yok. Öğrenci akışı: öğrenci → deterministik adaptive engine → veritabanındaki **onaylı** sorular.
- LLM soru seçmez, puanlamaz, mastery hesaplamaz, plan yapmaz.
- Üretim her zaman spec'e dayalıdır (QuestionSpec → Generator), asla "bana bir YDS sorusu yaz" değildir.
- Generator, Judge ve Verifier kodda ve prompt'ta ayrı rollerdir; Generator kendi sorusunun tek değerlendiricisi olamaz.
- Sıra: sistem YDS'yi öğrenir (Faz 2) → üretir (Faz 3) → öğrenciyi öğrenir → sıradaki en iyi adımı seçer.

## Sonuçlar

- AI kodu `pipeline/` altında yaşar ve Next uygulaması tarafından import edilemez (test ile zorlanır).
- AI anahtarları yalnızca yerelde; Vercel ortamına girmez.
- Her AI çıktısı Zod ile doğrulanır; kanonik veriye yalnızca doğrulanmış çıktı girer.
