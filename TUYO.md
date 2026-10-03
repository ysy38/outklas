Evet. Hatta bence bu ekleme **YDS Lab'ın ana ürün farklarından biri** olmalı.

Senin verdiğin sınav yapısını ürünün temel taxonomy'si yapabiliriz. YDS Sımulator

Ama bunu klasik:

> “YDS taktikleri → 20 tane video/PDF”

şeklinde değil, **öğrencinin performansına bağlanan yaşayan bir “YDS Rehberi”** şeklinde yapardım.

## 1. Ürünün üç katmanı olsun

```text
                 YDS LAB
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
   ÖĞREN          ÇÖZ         GELİŞ
       │            │            │
   Taktikler    Sorular       Tekrar
   İpuçları     Denemeler      Hatalar
   Stratejiler  Simulator     Eksikler
```

Ve bunlar birbirinden kopuk olmayacak.

Örneğin öğrenci **paragrafta boşluk** sorularında sürekli hata yapıyorsa:

> “Sen bu soru tipinde son 20 soruda %45 başarı gösterdin.”

Ardından:

**Neden hata yaptığını gör**

→ ilgili taktik

→ örnek soru

→ mini practice

→ birkaç gün sonra tekrar

→ tekrar test

→ mastery güncellemesi.

Yani içerik **kullanıcıya göre açılıp kapanacak.**

---

# 2. YDS Lab'da "YDS Rehberi" diye ana bölüm yapalım

Ana navigation:

```text
Ana Sayfa
Bugün
Soru Çöz
YDS Rehberi
Kelime
Denemeler
İlerlemem
```

**YDS Rehberi** içinde sınavın 10 bölümünü gösterelim.

Senin verdiğin yapıya göre:

| Bölüm | Sorular | YDS Lab |
|---|---:|---|
| Kelime Bilgisi | 1–6 | Vocabulary |
| Dil Bilgisi ve Yapı | 7–16 | Grammar |
| Paragrafta Boşluk | 17–26 | Cloze |
| Cümle Tamamlama | 27–36 | Sentence Completion |
| Çeviri | 37–42 | Translation |
| Okuduğunu Anlama | 43–62 | Reading |
| Diyalog | 63–67 | Dialogue |
| Anlamca Yakın | 68–71 | Restatement |
| Paragraf Tamamlama | 72–75 | Paragraph Completion |
| Anlam Bütünlüğünü Bozan | 76–80 | Irrelevant Sentence |

Ayrıca **Reading'in 43–62 arasında 20 soru olması ve sınav puanının %25'ini oluşturması** nedeniyle ürün içinde bu bölümü özellikle ayrı takip etmek mantıklı.

---

# 3. Her bölümün kendi "nasıl çözülür?" sayfası olsun

Örneğin:

## Paragrafta Boşluk

### 🎯 Bu bölümde ne ölçülüyor?

Kısa açıklama.

### 🧠 Önce bunu yap

1. Paragrafın tamamını hızlıca oku.
2. Boşluktan önceki/sonraki ilişkiyi belirle.
3. Bağlaçlara dikkat et.
4. Zamir/referans ilişkisini kontrol et.
5. Seçenekleri bağlama göre ele.

### ⚠️ En sık yapılan hatalar

- Kelimeyi bilince direkt seçmek
- Sadece boşluğun öncesine bakmak
- Bağlaç ilişkisini kaçırmak
- Zaman uyumunu kontrol etmemek

### 💡 YDS Lab İpucu

> “Boşluğu tek başına çözmeye çalışma. Önce paragrafın mantıksal akışını bul.”

### 📝 Mini Test

5 soru.

---

# 4. Ama asıl önemli özellik: "Öğrenciye göre ipucu"

Burada ürünü sıradan bir içerik sitesinden ayırıyoruz.

Örneğin kullanıcı **Cümle Tamamlama** bölümüne giriyor.

Sistem:

> **Bu soru tipindeki başarın: %48**

> Son 30 soruda: **14 doğru / 16 yanlış**

> Ortalama çözüm süren: **2:18**

> En sık yaptığın hata: **bağlaç ilişkisini yanlış yorumlama**

Sonra:

### Sana özel öneri

> Cümle Tamamlama sorularında öncelikle seçenekleri değil, cümlenin mantıksal ilişkisini belirle.

**[Bu stratejiyi öğren]**

---

# 5. Böylece "taktik" statik içerik olmaktan çıkıyor

Normal eğitim platformu:

```text
Cümle Tamamlama
    ↓
Video izle
```

YDS Lab:

```text
Cümle Tamamlama
       ↓
Başarı %48
       ↓
En sık hata: Logical relation
       ↓
"Taktik #3" öner
       ↓
Mini ders
       ↓
5 hedefli soru
       ↓
Başarı %72
       ↓
3 gün sonra tekrar
```

Bu **çok daha güçlü**.

---

# 6. Her taktiğin kendi metadata'sı olsun

Bu da question modelimiz kadar önemli.

Örneğin:

```typescript
Strategy {
  id
  sectionId
  title
  description
  content
  difficulty
  estimatedMinutes

  relatedSkills[]
  relatedQuestionTypes[]

  prerequisites[]
  relatedQuestions[]

  status
}
```

Örneğin:

```text
Strategy #24

Section:
Sentence Completion

Skill:
Logical Relations

Title:
"Önce ilişkiyi bul"

Related errors:
LOGICAL_RELATION
CONNECTOR
CONTRAST

Related questions:
Q102
Q183
Q492
Q817
```

Böylece taktik de sistemin parçası oluyor.

---

# 7. Daha da ileri götürelim: "Taktik Mastery"

Bence bunu mutlaka yapalım.

Sadece:

> “Bu taktiği okudu.”

tutmayalım.

Onun yerine:

### Taktik öğrenme durumu

```text
Görmedi
↓
Öğrendi
↓
Uyguladı
↓
Başardı
↓
Kalıcı
```

Örneğin:

### Contrast Connectors

**Mastery: 63%**

- Öğrendi: ✓
- Uyguladı: ✓
- Son test: %70
- Son tekrar: 2 gün önce
- Bir sonraki tekrar: yarın

---

# 8. Öğrencinin "Zayıflık Haritası"

İlerlemem ekranında sadece:

> Vocabulary 72%

göstermek yerine ikinci bir katman ekleriz.

### YDS Profilin

```text
KELİME
████████░░ 78

GRAMMAR
███████░░░ 71

CLOZE
█████░░░░░ 52

CÜMLE TAMAMLAMA
████░░░░░░ 44

ÇEVİRİ
███████░░░ 68

READING
████████░░ 81

DİYALOG
██████░░░░ 63

RESTATEMENT
█████░░░░░ 55

PARAGRAPH COMPLETION
██████░░░░ 61

IRRELEVANT SENTENCE
███████░░░ 69
```

Ama burada önemli olan:

**Bu skorların sadece doğru/yanlış ortalaması olmaması.**

Question difficulty + recency + response time + repeated errors + retention birlikte hesaplanmalı.

---

# 9. "Bu hafta neye çalışmalıyım?"

İşte bence ürünün en güzel ekranlarından biri bu.

Öğrenci:

### Bu hafta önceliğin

**1. Cümle Tamamlama**
Mastery: 44%

**2. Anlamca Yakın Cümle**
Mastery: 55%

**3. Paragrafta Boşluk**
Mastery: 52%

### Neden?

> Son 30 soruda bu üç alanda toplam 41 hata yaptın.

### Sana önerimiz

**3 taktik öğren**

**25 hedefli soru çöz**

**18 eski hatanı tekrar et**

**2 mini test tamamla**

---

# 10. Hatta "Neden puan kaybediyorsun?" ekranı yapalım

Bu pazarlama açısından bile çok güçlü.

Örneğin:

# YDS Puan Kaybı Analizin

Tahmini skor:

**68**

Hedef:

**80**

Aradaki fark:

**12 puan**

Sistem şöyle gösterir:

### Puan kaybının kaynakları

**Cümle Tamamlama**

→ tahmini -3.75 puan

**Cloze**

→ tahmini -3.75 puan

**Restatement**

→ tahmini -2.50 puan

**Kelime**

→ tahmini -1.25 puan

**Diğer**

→ tahmini -1.25 puan

Burada verdiğin sınav formülünü kullanabiliriz:

> **Doğru × 1,25**

ve yanlışın doğruyu götürmediğini açıkça modelleyebiliriz.

Bu da öğrenciye:

> “Daha çok soru çözmeliyim.”

yerine:

> **“Önce şu 3 alandaki hatalarımı azaltmalıyım.”**

dedirtir.

---

# 11. Reading'i ayrıca ele alalım

Senin verdiğin sınav yapısında Reading:

**43–62 = 20 soru**

ve toplam puanın **%25'i**.

Dolayısıyla YDS Lab'da:

## Reading Lab

diye ayrı bir alt sistem oluştururdum.

Örneğin:

```text
Reading
├── Main Idea
├── Detail
├── Inference
├── Reference
├── Vocabulary in Context
├── Author's Purpose
└── Paragraph Structure
```

Kullanıcının:

> “Reading kötü.”

demesi yerine:

> **Inference sorularında %43, Detail sorularında %81 başarı.**

demesini sağlayacağız.

Bu çok daha actionable.

---

# 12. Sınav simülasyonu da bu taxonomy'yi kullanmalı

Gerçek sınav:

```text
1–6
Vocabulary

7–16
Grammar

17–26
Cloze

...

43–62
Reading
```

Simülatör aynı sırayı koruyacak.

Ama sonuç ekranında:

```text
80 soru
62 doğru
18 yanlış

Skor
77.5
```

sonra:

### Bölüm performansı

| Bölüm | Doğru | Başarı |
|---|---:|---:|
| Vocabulary | 5/6 | 83% |
| Grammar | 8/10 | 80% |
| Cloze | 4/10 | 40% |
| Sentence Completion | 6/10 | 60% |
| Translation | 5/6 | 83% |
| Reading | 15/20 | 75% |
| Dialogue | 4/5 | 80% |
| Restatement | 2/4 | 50% |
| Paragraph | 3/4 | 75% |
| Irrelevant | 3/5 | 60% |

Sonra:

> **Seni 80 puana götürecek en önemli gelişim alanları**

Buradan doğrudan çalışma planına geçilecek.

---

# 13. Ve en önemli şey: tekrar otomatik olacak

Öğrenciye:

> “Bu konuyu tekrar et.”

demeyeceğiz.

Sistem kendisi karar verecek.

Örneğin:

### Pazartesi

Cloze — Connectors

%40

↓

### Salı

Mini review

%60

↓

### Perşembe

Benzer soru

%80

↓

### Pazar

Karışık test

%75

↓

### 10 gün sonra

Retention check

%90

Böylece:

**öğren → uygula → unut → tekrar et → tekrar uygula**

döngüsü oluşuyor.

---

# 14. Her kullanıcının "YDS Memory"si olacak

Sistemin kullanıcı hakkında tuttuğu öğrenme profili:

```text
User YDS Memory

Vocabulary:
    academic_evidence → mastered
    substantial → review
    constitute → weak

Grammar:
    tense → strong
    relative_clause → medium
    inversion → weak

Cloze:
    connector → weak
    reference → medium

Reading:
    detail → strong
    inference → weak

Strategies:
    scanning → mastered
    contrast_relation → learning
```

Bu aslında ürünün **kişisel öğrenme hafızası**.

---

# 15. Dashboard'da "Bugün" bunun üzerine kurulacak

Öğrenci her gün geldiğinde:

# Bugün senin için

**32 dakika**

### ① 8 eski hata
5 dk

### ② 7 kelime
7 dk

### ③ Cümle Tamamlama — 8 soru
10 dk

### ④ Reading — 4 soru
7 dk

### ⑤ Mini review
3 dk

**[Çalışmaya Başla]**

Ve her şey otomatik.

---

# 16. Ben buna bir özellik daha eklerdim: "Sınav Modu"

Kullanıcı:

> **17 Ekim e-YDS**

seçtiyse sistem sınava kadar kalan süreyi bilir.

Örneğin:

> **13 gün kaldı.**

Sonra çalışma ağırlığını otomatik değiştirir.

İlk haftalar:

```text
Learn 40%
Practice 40%
Review 20%
```

Sınava yakın:

```text
Practice 50%
Review 30%
Simulation 20%
```

Son 3 gün:

```text
Review
+
Light Practice
+
Simulation
```

Bu, ürünü statik bir soru bankasından çıkarıp **sınava hazırlık operating system'ine** dönüştürür.

---

## Bence YDS Lab'ın gerçek ürününü artık şöyle tanımlayabiliriz:

> **YDS Lab, YDS'nin 10 soru bölümünü ve bunların alt becerilerini haritalayan; öğrencinin hangi bölümde, hangi beceride ve hangi hata tipinde zorlandığını tespit eden; buna göre taktik, mini ders, soru ve tekrarları otomatik olarak kişiselleştiren adaptive YDS çalışma platformudur.**

Ve çok kritik bir ayrım var:

**İçerik → kullanıcıya sunulan şey.**

**Learning Engine → asıl ürün.**

Öğrenci “Cümle Tamamlama Taktikleri” sayfasına girdiğinde herkes aynı içeriği görür. Ama **hangi taktiğin ona önerileceği, kaç soru çözeceği, ne zaman tekrar edeceği ve ne zaman mastery kazanmış sayılacağı kişiye özel olur.**

Bu yapı kurulursa elimizde sadece YDS için bir web sitesi değil, daha sonra **YÖKDİL / IELTS / TOEFL gibi sınavlara aynı engine'i taşıyabileceğimiz bir adaptive learning altyapısı** olur.