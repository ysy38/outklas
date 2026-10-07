# 0002 — Gemini API, sağlayıcı soyutlaması arkasında

Tarih: 7 Ekim 2026 · Durum: kabul edildi

## Bağlam

Faz 0 planı Vercel AI Gateway önermişti. Kullanıcı şimdilik Gateway istemiyor; Gemini API doğrudan kullanılacak, ama ileride OpenAI veya Claude eklenebilmeli.

## Karar

- `pipeline/ai/` içinde rol tabanlı bir `AIService` (Analyzer, Verifier, Generator, Judge, Explainer, Tutor) ve onun altında taşıma katmanı olarak `AIProvider` arayüzü.
- İlk sağlayıcı `GeminiProvider`: REST `generateContent`, `fetch` ile; SDK bağımlılığı yok. Transport enjekte edilebilir, testler ağsız çalışır.
- Model adları tek yerde (`pipeline/ai/config.ts`) varsayılanlarla tanımlanır ve env ile geçersiz kılınır: `AI_PROVIDER`, `GEMINI_API_KEY`, `ANALYZER_MODEL`, `VERIFIER_MODEL`, `GENERATOR_MODEL`, `JUDGE_MODEL`.
- Varsayılan model adları tahminle değil, `ListModels` çağrısıyla seçildi (7 Ekim 2026): `gemini-3.5-flash` (Analyzer, Verifier, Generator), `gemini-3.1-flash-lite` (Judge). Anahtar ücretsiz katmanda olduğu için Pro modeller kullanılamıyor.
- Anahtar yalnızca sunucu tarafında, yerel `.env.local` içinde. İstemciye, tarayıcıya, repo'ya veya Vercel'e girmez. `GeminiProvider` tarayıcı ortamında çalışmayı reddeder.
- Her yanıt sağlayıcı + model + prompt versiyonu + istek gövdesinin hash'iyle önbelleklenir; tekrar çalıştırma yeniden faturalanmaz.

## Sonuçlar

- Yeni sağlayıcı eklemek: `AIProvider` gerçeklemesi + config'te bir satır. Roller ve prompt'lar değişmez.
- Gateway'e geçmek istenirse aynı arayüzün başka bir gerçeklemesi olur.
