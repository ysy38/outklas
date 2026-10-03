
# YDS LAB
## Adaptive YDS / e-YDS Preparation Platform

**Ürün tipi:** EdTech / Adaptive Learning SaaS  
**Marka:** YDS Lab  
**İlk pazar:** Türkiye  
**İlk sınav:** YDS / e-YDS İngilizce  
**Ana kullanıcı:** YDS/e-YDS'ye hazırlanan bireysel aday  
**Ana vaat:** Adaya daha fazla içerik vermek değil, **kendi eksiklerine göre ne çalışması gerektiğini otomatik olarak belirlemek.**

---

# 1. ÜRÜNÜN TEK CÜMLELİK TANIMI

> **YDS Lab, YDS adayının seviyesini teşhis eder, hatalarının nedenini analiz eder ve her gün kişisel eksiklerine göre soru, kelime ve tekrar programı oluşturur.**

Kullanıcı sisteme girdiğinde:

**“Bugün ne çalışacağım?”**

sorusunun cevabını sistem verir.

---

# 2. TEMEL PROBLEM

Bugünkü YDS hazırlığının büyük problemi kaynak eksikliği değil.

Adayın elinde:

- kitap
- PDF
- YouTube
- kelime listeleri
- denemeler
- Telegram grupları
- kurslar
- soru bankaları

var.

Problem:

> **Aday hangisini, ne zaman ve neden çalışacağını bilmiyor.**

Örneğin bir aday:

- vocabulary'de %62
- grammar'da %78
- cloze test'te %45
- sentence completion'da %55
- reading'de %71

yapıyor olabilir.

Ama klasik ürün:

> “İşte 1000 kelimelik liste.”

veriyor.

YDS Lab:

> “Senin asıl problemin genel İngilizce değil. Cloze test ve akademik bağlaçlarda hata yapıyorsun. Bugün 12 soru çözeceksin. Yanlış yaptığın 3 kelimeyi tekrar edeceksin. Yarın bunları yeniden göreceksin.”

demeli.

---

# 3. ÜRÜN FELSEFESİ

## YDS Lab bir "course platform" değildir.

YDS Lab:

### Diagnostic Engine
+
### Question Engine
+
### Personalization Engine
+
### Review Engine
+
### Exam Simulator

oluşturur.

İçerik bunların hammaddesidir.

---

# 4. HEDEF KULLANICI

## Persona A — İlk kez YDS'ye girecek

Hedef:

> 60–70

Problemi:

- nereden başlayacağını bilmiyor
- seviyesini bilmiyor
- çok fazla kaynak var

YDS Lab'ın mesajı:

> “Önce seviyeni ve eksiklerini bul.”

---

## Persona B — Daha önce girmiş ama istediği puanı alamamış

En değerli kullanıcı segmentlerinden biri.

Örneğin:

> 68 aldı → 80 gerekiyor.

Problemi:

“İngilizcem kötü değil ama puanım yükselmiyor.”

YDS Lab'ın mesajı:

> “Nerede puan kaybettiğini bul.”

---

## Persona C — 80+ hedefleyen

Daha az kullanıcı olabilir ama ARPU'su yüksek.

İhtiyacı:

- zor sorular
- süre yönetimi
- hata analizi
- deneme
- tekrar

---

# 5. ANA VALUE PROPOSITION

Ana slogan:

> **YDS çalışmak yerine, YDS Lab ile ne çalışacağını bil.**

Alternatif:

> **YDS'nin kişisel antrenörü.**

Landing page hero:

> ### YDS'de ne çalışacağını tahmin etme.
> **YDS Lab eksiklerini bulsun, çalışma planını oluştursun.**

CTA:

**Ücretsiz YDS Analizimi Başlat**

---

# 6. ÜRÜNÜN ANA DÖNGÜSÜ

Ürünün core loop'u:

```text
TEST
 ↓
DIAGNOSIS
 ↓
PERSONAL PLAN
 ↓
QUESTION
 ↓
ANSWER
 ↓
ERROR ANALYSIS
 ↓
REVIEW
 ↓
NEW QUESTION
 ↓
PROGRESS
 ↓
NEW DIAGNOSIS
```

Bu loop ürünün tamamından daha önemli.

---

# 7. ANA MODÜLLER

MVP:

1. Landing
2. Authentication
3. Onboarding
4. Diagnostic Test
5. Diagnostic Report
6. Daily Plan
7. Question Practice
8. Question Explanation
9. Vocabulary
10. Spaced Repetition
11. Progress Dashboard
12. e-YDS Simulator
13. Subscription
14. Notifications

Admin:

15. Question CMS
16. Question Analytics
17. User Analytics
18. Content Management
19. Subscription Management

---

# 8. ONBOARDING

Kullanıcı kayıt olduktan sonra:

### Step 1

**Hedef puanın?**

- 50
- 60
- 70
- 80
- 90+

### Step 2

**Sınava ne zaman gireceksin?**

- Tarih seç

### Step 3

**Daha önce YDS'ye girdin mi?**

- Hayır
- Evet

### Step 4

**Son puanın?**

Opsiyonel.

### Step 5

**Günlük ne kadar çalışabilirsin?**

- 10 dk
- 20 dk
- 30 dk
- 45 dk
- 60+ dk

### Step 6

Diagnostic başlat.

---

# 9. FREE DIAGNOSTIC

Bu ürünün en önemli acquisition mechanism'lerinden biri olacak.

Kullanıcıya ilk anda üyelik satmayacağız.

Önce:

> **“YDS seviyeni 15 dakikada analiz et.”**

diyeceğiz.

Örneğin:

### 25 soru

Dağılım:

- Vocabulary: 5
- Grammar: 5
- Cloze: 3
- Sentence completion: 3
- Translation: 2
- Paragraph: 4
- Reading: 3

Ancak uzun vadede adaptive diagnostic yapılmalı.

---

# 10. ADAPTIVE DIAGNOSTIC

İlk versiyon:

Sabit 25 soru.

V2:

Computer Adaptive Testing mantığı.

Örneğin:

```text
Q1 difficulty = medium

correct
→ difficulty ↑

correct
→ difficulty ↑

wrong
→ difficulty ↓
```

Böylece sistem 25 soruda daha doğru seviye tahmini yapabilir.

---

# 11. DIAGNOSTIC REPORT

Test bittiğinde:

## Tahmini YDS Seviyen

**67–72**

### Güçlü olduğun alanlar

Vocabulary  
78%

Grammar  
74%

### Geliştirmen gereken alanlar

Cloze Test  
42%

Academic Vocabulary  
51%

Sentence Completion  
55%

---

### Sistem sana şunu öneriyor:

**Önümüzdeki 7 gün:**

1. Academic vocabulary
2. Cloze connectors
3. Sentence completion
4. Reading speed

---

# 12. SCORE MODEL

Burada sadece:

`correct / total`

kullanılmayacak.

Her kullanıcının:

```text
skill mastery
question type mastery
vocabulary mastery
difficulty performance
speed performance
error pattern
retention
```

profili olacak.

---

# 13. QUESTION DATA MODEL

Her soru aşağıdaki metadata'ya sahip olmalı.

```typescript
Question {
  id
  examType
  language
  questionType

  difficulty

  stem
  options[]
  correctOption

  explanation
  translation

  skills[]
  vocabularyIds[]
  grammarConceptIds[]

  distractorType

  estimatedTime

  source
  sourceYear

  status

  createdAt
  updatedAt
}
```

---

# 14. QUESTION TYPE ENUM

```text
VOCABULARY
GRAMMAR
CLOZE
SENTENCE_COMPLETION
TRANSLATION_EN_TR
TRANSLATION_TR_EN
PARAGRAPH_COMPLETION
DIALOGUE
RESTATEMENT
READING
```

Sistemi baştan bu şekilde normalize etmek önemli.

Yeni bir soru tipi geldiğinde mimariyi bozmayacağız.

---

# 15. SKILL MODEL

Örneğin:

```text
Vocabulary
 ├── Academic vocabulary
 ├── Synonyms
 ├── Antonyms
 ├── Collocations
 └── Context vocabulary

Grammar
 ├── Tenses
 ├── Modals
 ├── Conditionals
 ├── Relative clauses
 ├── Passive
 └── Connectors

Reading
 ├── Main idea
 ├── Inference
 ├── Reference
 ├── Detail
 └── Vocabulary in context
```

---

# 16. QUESTION DIFFICULTY

Başlangıçta:

```text
1 = Very Easy
2 = Easy
3 = Medium
4 = Hard
5 = Very Hard
```

Ama zamanla statik difficulty yerine:

```text
predicted_difficulty
observed_difficulty
```

kullanılmalı.

Örneğin:

100 kullanıcıdan:

```text
%92 correct
```

alan soru sistem tarafından kolay olarak yeniden sınıflandırılabilir.

---

# 17. DISTRACTOR ANALYSIS

Bu YDS Lab'ın önemli farklılaştırıcılarından biri olabilir.

Her yanlış seçenek için:

```text
distractor_type
```

tutacağız.

Örneğin:

```text
VOCAB_SIMILAR_MEANING
GRAMMAR_TRAP
COLLOCATION_ERROR
TENSE_ERROR
CONNECTOR_ERROR
LOGICAL_ERROR
REFERENCE_ERROR
CONTEXT_MISMATCH
```

Böylece kullanıcıya:

> “Yanlış yaptın.”

demek yerine:

> **“Bu soruda kelimeyi biliyordun. Seni yanıltan şey collocation oldu.”**

diyebiliriz.

---

# 18. USER ANSWER EVENT

Her cevap ayrı event olarak kaydedilecek.

```typescript
AnswerEvent {
  id
  userId
  questionId

  selectedOption
  correct

  responseTimeMs

  confidence
  sessionId

  createdAt
}
```

Opsiyonel:

> “Cevabından ne kadar emindin?”

- Eminim
- Kararsızım
- Tahmin ettim

Bu veri ileride çok değerli olabilir.

---

# 19. MASTERY ALGORITHM

Her skill için 0–100 arası mastery.

Örneğin:

```text
initial = 50
```

Doğru:

```text
mastery += difficulty_weight
```

Yanlış:

```text
mastery -= difficulty_weight * error_weight
```

Ama son cevaplara daha fazla ağırlık verilecek.

Örnek:

```text
new_mastery =
0.7 * recent_performance
+
0.3 * historical_mastery
```

---

# 20. DAHA İYİ MODEL

Her skill için:

```text
mastery
confidence
stability
lastReviewedAt
nextReviewAt
```

tutulmalı.

Örneğin:

```text
Academic Vocabulary

Mastery: 61
Confidence: 54
Stability: 3.2 days
Last Review: yesterday
Next Review: tomorrow
```

Bu sayede sistem sadece başarıya değil, unutmaya da göre karar verir.

---

# 21. SPACED REPETITION

Kelime veya kavram yanlış yapıldığında:

```text
1st mistake
→ review in 10 min

2nd mistake
→ review tomorrow

correct
→ review in 3 days

correct
→ review in 7 days

correct
→ review in 21 days

correct
→ review in 45 days
```

İlk MVP'de basit algoritma yeterli.

Daha sonra FSRS benzeri bir retention modeli uygulanabilir.

---

# 22. DAILY PLAN ENGINE

Her sabah sistem kullanıcının planını üretir.

Örneğin:

# Bugünkü YDS Planın

### 1 — 5 dk
12 kelime tekrar

### 2 — 10 dk
8 Cloze sorusu

### 3 — 10 dk
5 Sentence Completion

### 4 — 10 dk
1 Reading passage

### 5 — 5 dk
Dünkü hatalar

**Toplam: 40 dk**

---

# 23. RECOMMENDATION ENGINE

Soru seçimi:

```text
score =
0.30 * weakness
+
0.20 * retention_need
+
0.15 * recent_error
+
0.15 * target_skill
+
0.10 * difficulty_fit
+
0.05 * question_diversity
+
0.05 * novelty
```

Örnek:

User:

```text
Cloze mastery = 42
Vocabulary = 71
Reading = 76
```

Sistem 20 sorunun 10'unu Cloze yapmaz.

Çünkü kullanıcıyı sıkmamak gerekir.

Örneğin:

```text
40% weak skills
20% review
20% target exam skills
10% strengths
10% exploration
```

---

# 24. ADAPTIVE DIFFICULTY

Kullanıcı:

```text
3 medium questions
→ 100% correct
```

sistem:

```text
difficulty += 1
```

Kullanıcı:

```text
3 hard
→ 33%
```

sistem:

```text
difficulty -= 1
```

Ama ani değişim yapılmayacak.

---

# 25. QUESTION EXPLANATION

Kullanıcı yanlış yaptığında ekran:

## Neden yanlış?

### Doğru cevap
**although**

### Neden?

Cümlede iki zıt fikir kuruluyor.

### Seni yanıltan seçenek

**because**

Çünkü neden-sonuç ilişkisi kuruyor fakat cümlenin ikinci bölümü zıtlık gerektiriyor.

### Kural

> although + clause

### Benzer soru

[Şimdi benzerini çöz]

Bu son buton çok önemli.

---

# 26. AI'IN ROLÜ

AI ürünün kendisi değil.

AI:

- açıklama üretme
- Türkçe açıklama
- alternatif örnek
- kelime bağlamı
- kişisel feedback
- yanlışın nedenini açıklama
- soru üretimine yardımcı olma

için kullanılacak.

Ama:

> **Soru seçme algoritması LLM'e bırakılmayacak.**

Soru recommendation deterministic engine tarafından seçilecek.

AI sadece gerekli yerlerde kullanılacak.

Bu hem maliyeti hem de tutarsızlığı azaltır.

---

# 27. AI QUESTION GENERATION

AI ile doğrudan production'a soru atılmayacak.

Pipeline:

```text
AI Generate
 ↓
Schema Validation
 ↓
Grammar Validation
 ↓
Answer Consistency Check
 ↓
Human Review
 ↓
Pilot Users
 ↓
Question Statistics
 ↓
Production
```

Admin panelinde:

**AI Generated → Review Required**

status'u olacak.

---

# 28. ANA DASHBOARD

Dashboard ilk bakışta çok basit olmalı.

```text
Merhaba Ahmet 👋

Hedef: 80
Tahmini mevcut puan: 67

████████░░ 67%

Bugünkü çalışma
━━━━━━━━━━━━━━━━

[ 12 Kelime ]
[ 10 Soru ]
[ 1 Reading ]

Tahmini süre: 32 dk

[ Çalışmaya Başla ]
```

Altında:

### Bu hafta

```text
7 gün
156 soru
81% accuracy
43 kelime öğrenildi
12 hata tekrarlandı
```

---

# 29. PROGRESS SCREEN

Grafikler:

### Tahmini skor

60 → 64 → 67 → 69 → 72

### Skill map

Vocabulary 78
Grammar 72
Cloze 51
Reading 74

### Weakest areas

1. Cloze
2. Academic vocabulary
3. Sentence completion

---

# 30. VOCABULARY SCREEN

Kart:

```text
SUBSTANTIAL

önemli / kayda değer

The study found substantial evidence...

[ Biliyorum ]
[ Tekrar Et ]
[ Zorlandım ]
```

Altında:

Synonym:
significant

Collocation:

substantial evidence  
substantial increase  
substantial amount

Bu, dokümandaki collocation/synonym/antonym/context yaklaşımını ürünleştirir.

---

# 31. e-YDS SIMULATOR

Bu acquisition için çok güçlü bir ürün olacak.

Landing:

> **Gerçek e-YDS deneyimini ücretsiz dene.**

Özellikler:

- timer
- soru navigation
- flag
- answer grid
- remaining time
- keyboard shortcuts
- section navigation
- final submission
- score estimate
- time analysis

Sonuç:

```text
Score: 71

Average/question: 2m 10s

En fazla zaman:
Reading

En fazla hata:
Cloze

```

Ve CTA:

> **Bu hataları düzeltmek için kişisel çalışma planını oluştur.**

---

# 32. SIMULATOR → ACQUISITION LOOP

Bu çok önemli.

Google'dan:

> “e-YDS deneme”

arayan kişi gelir.

Ücretsiz deneme yapar.

Sonuç ekranında:

> “71 aldın.”

Sonra:

> “Ama puanını 80'e çıkarmanın önündeki 3 problem…”

gösterilir.

Sonra:

**Kişisel planımı oluştur**

→ signup

→ activation

→ subscription.

Bu, PDF vermekten çok daha güçlü bir funnel.

---

# 33. UI SCREEN MAP

```text
/
├── Landing
├── /free-test
├── /simulator
├── /pricing
├── /login
├── /register
│
└── /app
    ├── dashboard
    ├── today
    ├── practice
    ├── vocabulary
    ├── review
    ├── simulator
    ├── progress
    ├── mistakes
    ├── profile
    └── billing
```

Admin:

```text
/admin
├── dashboard
├── questions
├── questions/new
├── questions/review
├── skills
├── vocabulary
├── users
├── analytics
├── subscriptions
└── settings
```

---

# 34. DATABASE ARCHITECTURE

PostgreSQL / Supabase.

Ana tablolar:

```text
users
profiles

exam_types
exam_sessions

questions
question_options
question_skills
question_vocabulary

skills
skill_categories

vocabulary
vocabulary_relations

answer_events
practice_sessions

user_skill_mastery
user_vocabulary_mastery

review_items

daily_plans
daily_plan_items

diagnostic_tests
diagnostic_questions
diagnostic_results

simulator_sessions
simulator_answers

subscriptions
payments

notifications

content
```

---

# 35. CORE TABLES

## users

```sql
id
email
created_at
```

## profiles

```sql
user_id
target_score
exam_date
daily_minutes
current_estimated_score
onboarding_completed
```

## skills

```sql
id
parent_id
name
type
description
```

## vocabulary

```sql
id
word
meaning_tr
part_of_speech
level
synonyms
antonyms
collocations
example_sentence
```

## questions

```sql
id
question_type
difficulty
stem
explanation
translation
correct_option_id
estimated_time_seconds
status
created_at
```

## answer_events

```sql
id
user_id
question_id
selected_option_id
is_correct
response_time_ms
confidence
created_at
```

## user_skill_mastery

```sql
user_id
skill_id
mastery
confidence
stability
attempts
correct_attempts
last_seen_at
next_review_at
updated_at
```

---

# 36. EVENT-BASED ANALYTICS

Her kritik davranış event olarak tutulmalı.

```text
user_registered
onboarding_completed
diagnostic_started
diagnostic_completed
question_viewed
question_answered
question_skipped
explanation_opened
similar_question_clicked
review_completed
daily_plan_started
daily_plan_completed
simulator_started
simulator_completed
paywall_viewed
checkout_started
subscription_started
subscription_cancelled
```

Analytics sonradan eklenmemeli.

İlk günden yapılmalı.

---

# 37. RETENTION METRICS

North Star Metric:

> **Weekly Personalized Learning Sessions**

Örneğin:

Bir kullanıcı haftada:

- 4+ gün
- kişisel plan
- 10+ soru
- review

yapıyorsa aktif öğreniyor demektir.

---

# 38. KPI'LAR

### Acquisition

Visitor → signup

### Activation

Signup → diagnostic completion

### Engagement

Diagnostic → first practice

### Retention

Day 1  
Day 7  
Day 30

### Monetization

Free → Paid

### Learning

Accuracy improvement

### Outcome

Estimated score improvement

---

# 39. NORTH STAR

Basit MAU sayısını North Star yapmayacağız.

Asıl hedef:

> **Kullanıcının düzenli olarak kişiselleştirilmiş çalışma yapması.**

Çünkü ürünün gerçek değeri burada.

---

# 40. PRICING

İlk aşamada dokümandaki 1.500–3.500 TL başlangıç bundle yaklaşımından daha düşük friction ile başlamak daha mantıklı. Dokümanda bu aralık başlangıç bundle'ı için önerilmişti.

Benim launch fiyatlandırmam:

## FREE

0 TL

- Diagnostic
- sınırlı günlük soru
- mini vocabulary
- 1 simulator
- temel rapor

Amaç:

**Acquisition.**

---

## PRO

### 399 TL / ay

- sınırsız kişisel practice
- adaptive questions
- vocabulary engine
- spaced repetition
- mistake notebook
- progress
- AI explanations
- weekly mini mock
- e-YDS simulator

---

## EXAM PASS

### 899 TL

3 aylık access.

Özellikle sınav öncesi kullanıcı için.

---

## PREMIUM

İlk aşamada yapmayacağız.

B2B / advanced coaching için sonra.

---

# 41. NEDEN 399 TL?

Pazardaki dijital YDS ürünlerinde 300–500 TL/ay bandının zaten kullanıldığı görülüyor.

Bu nedenle ilk etapta:

> “Pazarın çok üzerinde premium SaaS”

pozisyonuna girmek gereksiz.

Farkı fiyat değil:

> **kişiselleştirme**

yaratmalı.

---

# 42. FREE → PAID PAYWALL

Kullanıcı ilk 10–20 sorudan sonra:

> Bugünlük ücretsiz çalışmanı tamamladın.

Ama:

### Senin için 17 soru daha seçtik.

Bunlar:

- en zayıf olduğun skill
- dün yanlış yaptığın soru
- unutmak üzere olduğun kelime

üzerinden.

**Pro ile devam et.**

Bu generic paywall'dan daha güçlü.

---

# 43. LANDING PAGE

## Hero

> ### YDS'de ne çalışacağını tahmin etme.
> **YDS Lab eksiklerini bulsun ve sana her gün ne yapacağını söylesin.**

CTA:

**Ücretsiz YDS Analizini Başlat**

---

### Section 2

> **Önce seni tanıyoruz.**

15–25 soruluk diagnostic.

---

### Section 3

> **Sonra hatalarını haritalıyoruz.**

Vocabulary  
Grammar  
Cloze  
Reading  
Sentence Completion

---

### Section 4

> **Her gün sana özel çalışma.**

---

### Section 5

> **Yanlış yaptığın soruyu unutturmuyoruz.**

---

### Section 6

> **Gerçek e-YDS deneyimini simüle et.**

---

# 44. SEO STRATEGY

Dokümandaki arama niyetleri burada kullanılabilir.

Ama yalnızca blog yazmayacağız.

Örneğin:

```text
/yds-en-cok-cikan-kelimeler
/yds-kelime-testi
/yds-baglaclar
/yds-baglac-testi
/yds-paragraf-sorulari
/yds-paragraf-testi
/yds-simulator
/eyds-simulator
/yds-deneme
/yds-puan-hesaplama
/yds-calisma-programi
```

Her landing page:

```text
SEO content
+
interactive test
+
CTA
```

olacak.

---

# 45. ORGANIC CONTENT ENGINE

TikTok / Instagram / YouTube Shorts.

Format:

### Video

“Bu soruda insanların %80'i neden yanlış yapıyor?”

→ soru

→ 5 saniye

→ cevap

→ açıklama

→ CTA

> “Senin hangi soru tiplerinde hata yaptığını öğrenmek için bio'dan ücretsiz YDS analizini yap.”

---

# 46. COMMENT → PRODUCT FUNNEL

Video sonunda:

> “YDS yaz, ücretsiz testi göndereyim.”

Kullanıcı:

**YDS**

DM automation:

> “YDS seviyeni ölçmek ister misin?”

→ link

→ diagnostic

Bu PDF download'dan daha iyi.

Çünkü kullanıcıyı doğrudan ürün içine sokuyor.

---

# 47. CONTENT PILLARS

Her gün:

### 1. YDS Question

“Bu sorunun cevabı neden B?”

### 2. Vocabulary

“Bu kelimeyi biliyor musun?”

### 3. Trap

“YDS'nin sevdiği tuzak”

### 4. Strategy

“Reading'de bunu yapma.”

### 5. Score

“60'tan 70'e çıkmak için…”

### 6. Simulator

“60 saniyede bu soruyu çöz.”

---

# 48. 30 GÜNLÜK LAUNCH PLAN

## Gün 1–3

Brand:

**YDS Lab**

Domain:

**ydslab.com** uygunsa ana domain.

Alternatifler dokümanda ayrıca değerlendirilmişti.

Kur:

- Next.js
- TypeScript
- Tailwind
- Supabase
- Vercel
- PostHog/analytics
- payment

---

# 49. GÜN 4–7

Question infrastructure.

Minimum:

**300 kaliteli soru.**

Dağılım:

```text
100 Vocabulary
50 Grammar
40 Cloze
30 Sentence Completion
20 Translation
20 Paragraph
40 Reading
```

Her soru metadata ile girilecek.

---

# 50. GÜN 8–10

Diagnostic.

Tamamla:

- onboarding
- test engine
- result calculation
- report
- skill profile

---

# 51. GÜN 11–15

Practice engine.

```text
question selection
answer
feedback
explanation
next question
```

Çalışır hale getir.

---

# 52. GÜN 16–18

Vocabulary engine.

```text
learn
review
forgot
mastered
spaced repetition
```

---

# 53. GÜN 19–21

Dashboard.

- score
- weak areas
- daily plan
- progress
- mistake history

---

# 54. GÜN 22–24

Simulator.

İlk versiyon:

- timer
- navigation
- answer grid
- result
- basic analytics

---

# 55. GÜN 25–27

Payments.

Free:

```text
diagnostic
limited practice
```

Pro:

```text
unlimited
```

Checkout → webhook → subscription → entitlement.

---

# 56. GÜN 28

Analytics.

Track:

```text
signup
diagnostic completion
activation
D1
D7
paywall
purchase
```

---

# 57. GÜN 29

Closed beta.

İlk:

**30–50 kullanıcı.**

Onlardan özellikle:

- nerede sıkıldın?
- neyi anlamadın?
- ne işe yaradı?
- para verir misin?
- kaç TL?
- hangi özellik eksik?

sor.

---

# 58. GÜN 30

Public launch.

Ama:

> “Yeni YDS sitesi açıldı.”

diye launch etmeyeceğiz.

Launch mesajı:

> **YDS Lab: YDS'de hangi konularda puan kaybettiğini bulup sana kişisel çalışma planı çıkaran yeni bir platform.**

CTA:

> **Ücretsiz YDS Analizini Yap**

---

# 59. İLK 1000 KULLANICI STRATEJİSİ

İlk 1000 kullanıcıyı paid ads ile satın almaya çalışmazdım.

Öncelik:

```text
Organic
+
SEO
+
Communities
+
Referral
+
Simulator
```

---

# 60. 1000 USER FUNNEL

Hedef funnel:

```text
50,000 content views
        ↓
10,000 landing visitors
        ↓
4,000 diagnostic starts
        ↓
2,500 completions
        ↓
1,500 activated users
        ↓
1,000 retained/registered users
        ↓
100–200 paid
```

Bunlar hedef metriklerdir, garanti değildir.

---

# 61. CHANNEL 1 — SHORT FORM

İlk 30 gün:

**günde 3 video**

30 gün:

**90 video**

Her video:

```text
Hook
↓
Question
↓
Answer
↓
Explanation
↓
CTA
```

---

# 62. HOOK ÖRNEKLERİ

> “YDS'de bu şıkkı seçiyorsan muhtemelen burada hata yapıyorsun.”

> “Bu kelimeyi biliyor musun? YDS'de nasıl kullanıldığını biliyor musun?”

> “80 almak istiyorsan bu soru tipini çözebilmen gerekiyor.”

> “Bu YDS sorusunda doğru cevabı kelimeyi bilmeden bulabilir misin?”

> “e-YDS'ye gireceksen bunu mutlaka dene.”

---

# 63. CHANNEL 2 — FREE SIMULATOR

Google SEO:

> e-YDS deneme

> YDS deneme

> YDS simulator

> YDS puan hesaplama

Bu sayfaların tamamı simulator'a bağlanacak.

---

# 64. CHANNEL 3 — SEO

İlk 30 günde:

**20 high-intent page**

Yaz:

```text
10 interactive
10 informational
```

Interactive sayfalar öncelikli.

Örneğin:

> YDS Bağlaç Testi

Kullanıcı 10 soru çözer.

Sonuç:

> “Bağlaçlarda %40 başarı.”

CTA:

> “Tüm YDS profilini çıkar.”

---

# 65. CHANNEL 4 — COMMUNITY

Organik olarak:

- YDS Facebook grupları
- Telegram grupları
- Reddit
- üniversite toplulukları
- akademik topluluklar
- öğretmen toplulukları

Ama spam yapılmayacak.

Değer:

> “Ücretsiz e-YDS simulator yaptık.”

şeklinde.

---

# 66. CHANNEL 5 — REFERRAL

Kullanıcıya:

> Arkadaşını davet et.

Karşılığında:

**7 gün Pro**

Arkadaş da:

**7 gün Pro**

alsın.

Bu özellikle sınav yaklaşırken çalışabilir.

---

# 67. CHANNEL 6 — SCORE SHARE

Diagnostic sonrası:

> “Sonucunu paylaş.”

Örneğin:

> “YDS Lab'da 72 aldım. Hedefim 80.”

Share card.

Üzerinde:

**YDS Lab**

Bu doğal viral loop oluşturabilir.

---

# 68. CHANNEL 7 — CREATOR PARTNERSHIPS

20 küçük YDS creator bul.

Her birine:

- affiliate link
- ücretsiz Pro
- dashboard
- commission

ver.

Örneğin:

> Her ücretli kullanıcıdan %20.

İlk aşamada büyük influencer değil:

**5k–50k takipçili niche creator.**

---

# 69. 1000 KULLANICI İÇİN ASIL GROWTH LOOP

En önemli mekanizma:

```text
CONTENT
 ↓
FREE TEST
 ↓
PERSONAL SCORE
 ↓
WEAKNESS DISCOVERY
 ↓
DAILY PLAN
 ↓
PROGRESS
 ↓
SHARE
 ↓
NEW USER
```

Bu loop çalışırsa acquisition maliyeti düşer.

---

# 70. İLK 1000 KULLANICIDA ODAK

İlk kullanıcıları:

```text
0–100
```

manuel/organik bul.

Sonra:

```text
100–300
```

hangi content'in signup getirdiğini bul.

Sonra:

```text
300–1000
```

kazanan kanalı büyüt.

---

# 71. PAID ADS

İlk gün reklam vermem.

Önce:

**100–200 kullanıcı davranışını görürüm.**

Sonra:

```text
Creative A
→ diagnostic

Creative B
→ simulator

Creative C
→ score improvement
```

test edilir.

Kazanan funnel'a para basılır.

---

# 72. ÜRÜNÜN EN BÜYÜK MOAT'I

UI değil.

AI değil.

Video değil.

Moat:

### Question Graph

Zamanla elimizde:

```text
Question
↓
Skill
↓
Vocabulary
↓
Distractor
↓
User Error
↓
Difficulty
↓
Response Time
↓
Retention
```

bağlantıları oluşacak.

Bu veri seti ürünün gerçek asset'i.

---

# 73. QUESTION GRAPH

Örneğin:

```text
Question #1938

Cloze
Difficulty 4

Skill:
Connector

Vocabulary:
although
whereas
despite

Users:
1,842

Correct:
54%

Most common wrong:
whereas

Average time:
42 sec

Primary error:
logical relation
```

Bu veri sayesinde sistem zamanla daha iyi soru seçebilir.

---

# 74. AI + DATA MOAT

AI tek başına moat değil.

Ama:

```text
Proprietary question data
+
User answer data
+
Skill graph
+
Learning history
+
Personalization engine
```

birleşince güçlü bir sistem ortaya çıkar.

---

# 75. SONRAKİ ÜRÜNLER

YDS Lab başarılı olursa:

### YÖKDİL Lab

aynı engine.

### YKS-DİL Lab

aynı engine.

### IELTS Lab

aynı altyapı.

### TOEFL Lab

aynı altyapı.

Yani:

> **YDS Lab = ilk vertical.**

Uzun vadede:

> **Adaptive Exam Preparation Platform**

olabilir.

---

# 76. B2B

İkinci aşama:

Dil kurslarına:

> “Kendi öğrencileriniz için adaptive practice engine.”

satılabilir.

Kurs:

- kendi öğrencisini getirir
- YDS Lab altyapısını kullanır
- kendi branding'i olabilir

Bu, dokümanda öngörülen B2B licensing modeline de oturuyor.

---

# 77. İLK VERSİYONDA YAPMAYACAĞIMIZ ŞEYLER

MVP'yi öldürebilecek şeyler:

❌ 100 saat video

❌ dev LMS

❌ canlı ders

❌ native mobile app

❌ sosyal network

❌ community forum

❌ AI chatbot

❌ 10.000 soru

❌ gamification overload

❌ B2B

❌ YÖKDİL

❌ IELTS

İlk ürün:

> **Diagnostic + Daily Practice + Review + Simulator**

---

# 78. MVP'NİN TANIMI

Bir kullanıcı:

1. Siteye gelir.
2. Ücretsiz test çözer.
3. Tahmini seviyesini görür.
4. Eksiklerini görür.
5. Hesap açar.
6. Günlük plan alır.
7. Soru çözer.
8. Hatasının nedenini görür.
9. Yanlış kelimeyi tekrar eder.
10. Ertesi gün sisteme geri gelir.
11. İsterse Pro'ya geçer.

Bunu kusursuz yapabiliyorsak MVP tamamdır.

---

# 79. TEKNİK MİMARİ

```text
                 YDS LAB
                    │
        ┌───────────┴───────────┐
        │                       │
     Frontend                Backend
        │                       │
   Next.js                  Supabase
        │                       │
        │              ┌────────┴────────┐
        │              │                 │
        │           PostgreSQL         Auth
        │
        └──────────────┐
                       │
                 Learning Engine
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Diagnostic      Recommend      Spaced Rep.
        │              │              │
        └──────────────┼──────────────┘
                       │
                    AI Layer
                       │
               OpenAI / LLM
```

---

# 80. CLEAN ARCHITECTURE

Kod tabanında aynı iş farklı yerlerde yapılmayacak.

Örneğin question selection:

```text
/lib/questions
/services/question-recommendation
```

tek merkez.

Diagnostic:

```text
/services/diagnostic
```

Mastery:

```text
/services/mastery
```

Review:

```text
/services/review
```

Payment:

```text
/services/billing
```

Her domain'in tek sorumluluğu olacak.

---

# 81. REPOSITORY STRUCTURE

```text
src/
  app/
    (marketing)/
    (auth)/
    app/
    admin/

  components/
    ui/
    question/
    dashboard/
    simulator/

  domain/
    questions/
    users/
    diagnostic/
    mastery/
    vocabulary/
    review/
    billing/

  services/
    question-engine/
    recommendation-engine/
    diagnostic-engine/
    mastery-engine/
    review-engine/
    notification-engine/

  lib/
    supabase/
    analytics/
    ai/
    payments/

  types/
```

---

# 82. API/DATA PRINCIPLE

Frontend business logic içermemeli.

Örneğin:

```text
GET /api/daily-plan
```

backend:

```text
load user
→ load mastery
→ load reviews
→ calculate priorities
→ select questions
→ create plan
→ return plan
```

Frontend sadece render eder.

---

# 83. SECURITY

Supabase RLS:

Kullanıcı yalnızca:

```text
own profile
own answers
own mastery
own plans
own subscriptions
```

verisine erişebilmeli.

Question content için public read yalnızca published questions.

Admin:

role-based access.

---

# 84. CONTENT QUALITY

En kritik operasyonlardan biri.

Her production question için:

```text
grammar check
answer check
explanation check
difficulty
skill
vocabulary
distractor
```

zorunlu.

Eksik metadata'lı soru production'a çıkmayacak.

---

# 85. PRODUCT PRINCIPLE

Her özellik şu soruya cevap vermeli:

> **“Bu kullanıcının hedef puanına ulaşmasına yardımcı oluyor mu?”**

Cevap hayırsa MVP'ye girmeyecek.

---

# 86. YDS LAB'IN ASIL FARKI

Rakip:

> “Bizde 3.000 soru var.”

YDS Lab:

> **“Sana bugün çözmen gereken 12 soruyu seçiyoruz.”**

Rakip:

> “1.000 kelime öğren.”

YDS Lab:

> **“Senin bilmediğin 7 kelimeyi bulduk.”**

Rakip:

> “Deneme çöz.”

YDS Lab:

> **“Denemende neden 68 aldığını analiz ettik.”**

Rakip:

> “Ders videosu izle.”

YDS Lab:

> **“Senin ihtiyacın varsa bu konuyu açıyoruz.”**

Bu positioning çok daha güçlü.

---

# 87. EN ÖNEMLİ PRODUCT DECISION

**AI-first olmayacağız.**

**Personalization-first olacağız.**

AI bunun altında çalışan bir servis olacak.

Ürünün ana vaadi:

> “AI ile YDS.”

değil.

Şu:

> **“Sana özel YDS çalışma sistemi.”**

---

# 88. İLK 30 GÜNÜN TEK HEDEFİ

30 gün sonunda:

```text
Landing
+
Diagnostic
+
Personalization
+
Daily Practice
+
Vocabulary Review
+
Simulator
+
Payment
```

çalışmalı.

Ve:

**en az 100 gerçek kullanıcı**

ürünü kullanmış olmalı.

---

# 89. İLK 1000 KULLANICININ BAŞARI KRİTERİ

1000 signup tek başına başarı değil.

Hedef:

```text
1000 registered
600 diagnostic completed
400 activated
200 weekly active
100+ paying
```

gibi bir yapı oluşturmak.

Asıl sinyal:

> **Kullanıcı ertesi gün geri geliyor mu?**

---

# 90. ULTIMATE PRODUCT VISION

Kullanıcı YDS Lab'a girdiğinde:

> “Bugün ne çalışayım?”

diye düşünmeyecek.

Sistem söyleyecek:

> **Bugün 28 dakikan var.**

> 8 kelime tekrar et.

> 6 Cloze sorusu çöz.

> Dün yanlış yaptığın 3 soruyu yeniden çöz.

> 1 reading passage tamamla.

> Sonra 5 dakikalık mini test yap.

Ve sistem ertesi gün kullanıcının cevaplarına göre yeniden plan yapacak.

Bu noktada YDS Lab artık:

**soru bankası değil.**

**kurs değil.**

**AI chatbot değil.**

### Kişisel YDS öğrenme motoru.

Ve bence bütün şirketin üzerine kurulması gereken fikir tam olarak bu.