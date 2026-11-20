import type { DraftItem } from "./exam-draft";
import type { Lesson } from "@/modules/content/lesson";

/** Inspector-approved band items. Difficulty is the measured band: 2 easy, 3 medium, 4 hard language. */
export const bandItems: DraftItem[] = [
  {
    "slot": 331,
    "section": "sentence",
    "layout": "blank",
    "stem": "The volunteers stayed calm throughout the simulated emergency and completed every task on time ----.",
    "explanation": "Normalde az eğitimli insanların zorlu bir tatbikatta görevlerini zamanında tamamlamasını beklemezsin. Ana cümle bu beklentinin tersini anlattığı için beklenmedik sonuç (-e rağmen) ilişkisi vardır; doğru cevap even though'dur. A) provided that koşul kurar, ama ana cümleyi sınırlamaz. B) as soon as ardışıklık kurar, fakat güç kesintisi tatbikattan önce olamaz. D) whereas zıtlık kurar, ancak iki durum arasında gerçek bir karşıtlık ve beklenmedik sonuç yoktur. E) because neden bildirir, fakat prosedürleri bilmemek sakin kalmayı açıklamaz, tersini düşündürür.",
    "difficulty": 2,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "provided that they had been kept awake for nearly thirty hours before the exercise began",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the power supply failed during the first practice drill",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "even though they had received only ten minutes of training before the exercise began",
        "correct": true
      },
      {
        "text": "whereas they had practiced the procedures for weeks before the exercise began",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had never been told what the emergency procedures involved",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 332,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the town kept its wooden bridge in daily use for nearly three centuries.",
    "explanation": "Normalde sel gibi sürekli hasar gören bir köprünün kullanımdan kaldırılmasını beklersin. Ana cümle ise köprünün üç yüzyıl boyunca günlük kullanımda kaldığını söylüyor; bu beklenmedik sonuçtur, bu yüzden 'Although' (-e rağmen) doğru bağlaçtır. A) 'As soon as' zaman sırası kurar; mühendislerin kapatma kararından sonra kullanım sürmez. B) 'Whereas' zıtlık kurar ama iki yan arasında gerçek bir karşıtlık yoktur. C) 'Because' neden bildirir; çürüme yüzünden kullanımın sürmesi mantıksızdır. E) 'As long as' koşul kurar; kapatmanın kullanımı kısıtlaması anlamsızdır.",
    "difficulty": 2,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the council's engineers condemned the bridge as unsafe",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the town maintained its wooden bridge carefully and repaired it regularly for generations",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the wooden planks had been rotting for decades and engineers repeatedly declared the structure unsafe",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the wooden supports had been damaged by floods almost every decade",
        "correct": true
      },
      {
        "text": "As long as the council closed the wooden bridge to all carts every winter",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 333,
    "section": "sentence",
    "layout": "blank",
    "stem": "The small bakery expanded its seating area and hired two extra staff members last spring ----.",
    "explanation": "Satışı üç aydır düşen bir fırının oturma yerini büyütüp eleman alması beklenmez. E, even though ile bu düşüşe rağmen yapılan genişlemeyi kurar. A, whereas ile kalabalığı karşıtlık diye bağlar; oysa bu, genişlemeyi açıklar ve bağlaç neden değildir. B, because ile saatin kısılmasını genişlemenin nedeni yapar. C, provided that ile kira artışını koşul yapar. D, as soon as ile denetim cezasını genişlemeye bağlar.",
    "difficulty": 2,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the bakery had already been drawing larger crowds every weekend throughout the winter",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the city had just ordered the bakery to reduce its operating hours and cut its workforce",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that its landlord had already announced a steep rent increase for the coming year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as a health inspector had cited the kitchen for two minor violations",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "even though its monthly sales had fallen sharply for three consecutive months",
        "correct": true
      }
    ]
  },
  {
    "slot": 334,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the river recovered its clear water within two years.",
    "explanation": "Sen A seçeneğini seç. Normalde kirlenmiş bir nehrin uzun süre temiz kalamayacağını bekleriz; oysa ana cümle nehrin iki yıl içinde berraklığını geri kazandığını söyler. Bu beklenmedik sonuç (-e rağmen) yapısıdır: Although ... dumped chemical waste for decades, the river recovered. B, nehir yatağının kalıcı olarak zehirli olduğunu söyleyerek toparlanmayı mantıken imkansız kılar, yani neden değil. C, 'as long as' bir koşul kurar ve kirlilik sürerken toparlanmanın koşulunu değil engelini anlatır. D, 'as soon as' bir zaman sırası kurar ama silt tekrar kirlilik yaptığında nehrin berraklık kazanması ana cümleyle çelişir. E, 'whereas' zıtlık kurar, ama nehrin içme suyu kaynağı olması kirlilikle gerçek bir karşıtlık oluşturmaz; zıtlık ile beklenmedik sonucu karıştırmak yanlıştır.",
    "difficulty": 2,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the factory had dumped chemical waste into the river for several decades",
        "correct": true
      },
      {
        "text": "Because the riverbed was coated with toxic sludge that would never break down",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as the mining company kept releasing sulfuric runoff upstream",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as silt from the spring floods clouded the valley's streams again",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the river had always been a trusted source of drinking supplies for nearby towns",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 335,
    "section": "sentence",
    "layout": "blank",
    "stem": "The new dictionary of regional slang was published quickly and sold out within a week ----.",
    "explanation": "Az bilinen ve fon almamış bir sözlüğün hızlı tükenmesi beklenmez. Cümle ise hızlı yayımlanıp tükendiğini söyler; bu beklenmedik bir sonuçtur. Bu yüzden beklenmedik sonuç (-e rağmen) anlamını taşıyan even though doğru seçenektir. A: provided that koşul kurar; fiyat artışı tükenmeyi açıklamaz. C: as soon as sıralama kurar; reddedilen baskı ile hızlı satış zaman açısından çelişir. D: whereas zıtlık kurar; ama dikkatli kontrol ile satış arasında gerçek bir karşıtlık yoktur. E: because neden kurar; ama az kitapçı ve eleştirmen, tükenmenin tersini beklettiği için mantık ters işler.",
    "difficulty": 2,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "provided that its price had been raised well above what most readers were willing to pay",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though its editors had received no funding from any university",
        "correct": true
      },
      {
        "text": "as soon as three major distributors had rejected the first print run",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas its editors had carefully checked every entry with local speakers",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because hardly any bookshops had agreed to stock it and no reviewers had mentioned it",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 336,
    "section": "sentence",
    "layout": "blank",
    "stem": "Most of the students in the history seminar finished the final exam with excellent results ----.",
    "explanation": "Derslerin yarısından azına gelen öğrencilerin sınavdan yüksek not alması beklenmez. D, although ile bu eksik katılıma rağmen gelen başarıyı kurar. A, whereas ile haftalarca çalışmayı karşıtlık diye sunar; oysa bu, başarıyı açıklar. B, because ile okumaları kaçırmayı yüksek notun nedeni yapar. C, if ile bütün tekrarları atlamayı koşul yapar. E, as soon as ile ikinci kez kalmayı başarıya bağlar.",
    "difficulty": 2,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas most of them prepared for weeks beforehand with daily study sessions",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had missed most of the seminar readings and barely reviewed the material before the exam",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "if they had skipped every review session that term",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although they had attended fewer than half of the lectures that term",
        "correct": true
      },
      {
        "text": "as soon as they had failed the midterm for the second time",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 337,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the district's emergency response times improved steadily over the following year.",
    "explanation": "Doktor kaybı normalde acil müdahale sürelerinin kötüleşmesini beklettirir. Ana cümle ise sürelerin düzenli biçimde iyileştiğini söyler; bu beklenmedik bir sonuçtur. Even though, olumsuz durumu ana cümlenin beklenmedik sonucuyla bağlayan beklenmedik sonuç (-e rağmen) ilişkisi kurar. A) Because, eksik personeli iyileşmenin nedeni gibi gösterir; bu mantığa ters düşer. C) Provided that, bir kısıtlama koşulu kurar; iyileşme bir koşula bağlı değildir. D) As soon as, bir zaman sırası kurar; ancak cümle bir karşıtlık değil, zamanlama anlatır. E) Whereas zıtlık kurar; ancak hazırlık iyileşmeyi zaten beklettiği için gerçek bir karşıtlık yoktur.",
    "difficulty": 2,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the district had cut its ambulance staff by half during the previous budget year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Even though the rural clinic had lost two of its three physicians during the previous winter",
        "correct": true
      },
      {
        "text": "Provided that the district had frozen all hiring for paramedics during the previous year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the district lost two senior dispatchers in a budget dispute",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the district had already been training its paramedics and upgrading its dispatch software before that spring",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 338,
    "section": "sentence",
    "layout": "blank",
    "stem": "The volunteers reported feeling calmer and more focused after the meditation session ----.",
    "explanation": "Dört saatten az uyuyan birinin meditasyondan sonra daha sakin ve odaklı hissetmesi beklenmez. C, even though ile bu uykusuzluğa rağmen gelen sonucu kurar. A, unless ile gürültüyü koşul yapar. B, as soon as ile baş ağrısını sakinliğe bağlar. D, whereas ile evde nefes çalışmasını karşıtlık diye sunar; oysa bu, sakinliği destekler. E, because ile seansın zor olacağının söylenmesini sakinliğin nedeni yapar.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "unless they had been kept awake by loud noise during the session",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as several participants complained of headaches during the breathing exercise",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "even though they had slept fewer than four hours the night before",
        "correct": true
      },
      {
        "text": "whereas they had also practiced breathing exercises at home that week to help them relax",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had been told in advance that the session would be unusually long and demanding",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 339,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the mining town of Redmoor grew into a prosperous regional trading centre within a single decade.",
    "explanation": "Normalde altyapısız, işgücü ve ulaşımı yetersiz bir bölgenin hızla zenginleşmesini beklemezsin. D'de 'Although' ile bu olumsuz koşullar sıralanır; ana cümle, bunlara rağmen gerçekleşen beklenmedik sonuçtur (-e rağmen), bu yüzden doğrudur. A zaman sırası kurar, ama maden tükendikten sonra gelişme mantıksal olarak olanaksızdır. B zıtlık kurar, fakat olumlu özellikler ile gelişme arasında gerçek bir karşıtlık yoktur. C neden-sonuç kurar; tükenen rezerv gelişmeye yol açamaz. E koşul kurar; atıl fabrika ve ayrılan mühendisler gelişmeyi kısıtlayamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the main copper seam was exhausted and most of the miners had left",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas it had already attracted rich investors, a steady stream of migrant workers, and abundant coal reserves",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the nearby mine's ore reserves were exhausted within two years of opening",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the region had no railway link, no reliable road network, and almost no skilled labour",
        "correct": true
      },
      {
        "text": "As long as the mining company kept its smelters idle and its engineers left the district",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 340,
    "section": "sentence",
    "layout": "blank",
    "stem": "The regional bank raised its lending rates sharply during the recession, and the number of small business loans fell to a record low ----.",
    "explanation": "Normalde merkez bankasının faiz indirimi kredi verilmesini artırır; burada ise kredi sayısı rekor düşüğe iner. Bu beklenmedik sonuçtur, bu yüzden 'even though' ile beklenmedik sonuç (-e rağmen) kuran E doğrudur. A) 'whereas' zıtlık kurar ama gerçek bir karşıtlık yoktur; sıkılaştırma krediyi azaltır, yani uyumludur. B) 'because' neden bildirir; yüksek talep düşüşü açıklamaz, çelişir. C) 'provided that' koşul kurar; teminat düşüşü kısıtlamaz, cümle anlamsız kalır. D) 'as soon as' sıralama kurar; düşüş resesyon sırasında olduğu için toparlanmadan sonra gelemez.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the regional bank had also tightened its credit standards earlier in the same year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because demand for credit was surging across every sector of the local economy during that period",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that borrowers had been able to pledge property as collateral throughout the downturn",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the recession had officially ended and the regional economy began to recover",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "even though the central bank had cut its benchmark interest rate three times in the same period",
        "correct": true
      }
    ]
  },
  {
    "slot": 341,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the excavators recovered an unusually complete assemblage of pottery from the lowest strata of the site.",
    "explanation": "İki bin yıl boyunca sel altında kalmış bir katmandan eksiksiz çanak çömlek çıkması beklenmez. E, Although ile bu engele rağmen gelen buluntuyu kurar. A, Because ile yağmayı sağlam buluntunun nedeni yapar. B, As long as ile katmanların karışmasını koşul yapar. C, As soon as ile selin tahribatını buluntuya bağlar. D, Whereas ile kazının yavaş ilerlemesini karşıtlık diye sunar; oysa bu, özeni anlatır.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the lowest strata had been thoroughly looted and churned by earlier digs",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as the lowest strata had been repeatedly churned by rising groundwater and burrowing animals",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as seasonal floodwaters had ruined most of the lowest strata",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the excavators worked slowly and methodically through every stratum of the site",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the site had been submerged by seasonal floodwater for most of the last two thousand years",
        "correct": true
      }
    ]
  },
  {
    "slot": 342,
    "section": "sentence",
    "layout": "blank",
    "stem": "The neighbourhood association recorded a sharp rise in volunteer participation over the past year, ----.",
    "explanation": "Yeniden kurulan üç ilçeye dağılmış üyelerden gönüllülüğün artması beklenmez. A, although ile bu dağılmaya rağmen gelen artışı kurar. B, provided that ile toplantı katılımının düşmesini koşul yapar. C, as soon as ile taşınmayı artışa bağlar. D, whereas ile kapı kapı üyeliği karşıtlık diye sunar; oysa bu, artışı açıklar. E, because ile bütçe kesintisini artışın nedeni yapar.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "although its members had been dispersed across three districts that were being rebuilt during the same period",
        "correct": true
      },
      {
        "text": "provided that fewer residents attended the monthly planning meetings that year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the rebuilding work forced several long-standing members to move out of the neighbourhood",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas its members had been actively recruited through a door-to-door campaign that encouraged neighbours to join",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the association had cut its outreach budget and stopped holding the monthly open meetings that once recruited most of its new helpers",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 343,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the review board approved the new wind turbine design for commercial production last spring.",
    "explanation": "Doğru cevap B. Normalde iki yatak arızası veren bir prototipin onaylanmamasını beklersin. Ana cümlede kurul yine de onay verdiği için sonuç beklenmedik; bu da beklenmedik sonuç (-e rağmen) ilişkisidir. A zaman ilişkisi kurar, ama uyarıdan hemen sonra onay mantıksızdır. C zıtlık kurar, fakat övgü ile onay arasında gerçek bir karşıtlık yoktur. D neden bildirir, ancak geri çekilen başvuru onayı açıklamaz. E koşul kurar, fakat iki testin başarısızlığı onayı kısıtlamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as engineers flagged gearbox overheating during the field tests last winter",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the prototype had suffered two bearing failures during its endurance trials",
        "correct": true
      },
      {
        "text": "Whereas the review board had already praised the design's efficiency in earlier simulations",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the manufacturer had withdrawn its application for safety certification the previous winter",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the prototype had failed both of its endurance trials",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 344,
    "section": "sentence",
    "layout": "blank",
    "stem": "The snail population in the marsh expanded steadily across the three-year survey ----.",
    "explanation": "Beklenen sonuç, yeni getirilen yırtıcının salyangoz sayısını azaltmasıdır; oysa sayı sürekli arttı, bu yüzden ana cümle beklenmedik sonuçtur. Doğru cevap although ile beklenmedik sonuç (-e rağmen) ilişkisi kurar. A whereas zıtlık kurar ama iki durum gerçek bir karşıtlık oluşturmaz. B because neden bildirir; su seviyesinin düşmesi azalmayı açıklar, çoğalmayı değil. D as long as koşul kurar; drenaj çoğalmayı kısıtlayamaz. E as soon as sıra ilişkisi kurar; sayımın durması üç yıllık büyümeyle zamansal olarak örtüşemez.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas its food supply of algae and decaying reeds also kept growing alongside it",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the marsh's water level dropped sharply in the second year, exposing most of the snails' feeding beds to drying air",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although the wetland's dominant predator, a native heron, had been reintroduced in its first year",
        "correct": true
      },
      {
        "text": "as long as the marsh had been drained of its standing water during the first year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the survey team stopped counting snails in the marsh's northern channels",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 345,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the surgical team discharged the patient on the morning after her operation.",
    "explanation": "Doğru cevap D. Büyük kan kaybı yaşayan bir hastanın gözlem altında tutulmasını beklersin; oysa ana cümlede erken taburcu edilme vardır. Although beklenmedik sonuç (-e rağmen) kurar, bu yüzden D doğrudur. A neden kurar, ama kötü bir durum erken taburcuya neden olamaz. B koşul kurar; ateş bir taburcu koşulu olamaz. C zaman sırası kurar; ateş çıkar çıkmaz taburcu etmek mantığa aykırıdır. E zıtlık kurar, ama iki yan cümle gerçek bir karşıtlık oluşturmaz; ikisi de iyi iyileşmeyi anlatır.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because her surgeon wanted her to remain under observation for several days",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that her temperature kept rising throughout the night after the operation",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as she developed a fever following the procedure",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although she had lost nearly a litre of blood during the procedure",
        "correct": true
      },
      {
        "text": "Whereas her recovery had been smooth and her vital signs remained stable throughout the night",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 346,
    "section": "sentence",
    "layout": "blank",
    "stem": "The volunteers in the memory experiment recalled the word list more accurately than the control group ----.",
    "explanation": "Uykusuz kalan insanların hafıza testinde daha kötü olmasını beklersin. Ana cümle ise tersini söyler: deney grubu daha doğru hatırladı. Bu beklenmedik sonuç (-e rağmen) ilişkisi 'although' ile kurulur, yani doğru cevap E. A) 'if' koşul kurar; dikkat dağınıklığı ana cümleyi kısıtlamaz, yalnızca bir koşul ekler. B) 'as soon as' zaman sırası kurar, ama klimanın açılışı ile hatırlamanın sıralaması mantıksız kalır. C) 'whereas' zıtlık kurar; ancak dinlenmiş ve motivasyonlu olmak gerçek bir karşıtlık değil, iyi performansı destekleyen bir nedendir. D) 'because' neden kurar; ekstra pratik kontrol grubunu güçlendirir, deney grubunun üstünlüğünü açıklamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "if they had been distracted by background noise during the presentation",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the lab's noisy air conditioner had switched on during the first recall session",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas they had rested well and were highly motivated to perform the task",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the control group had received several extra practice sessions beforehand",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although they had slept fewer than four hours the night before",
        "correct": true
      }
    ]
  },
  {
    "slot": 347,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the council approved the new harbour charter within a single session.",
    "explanation": "Doğru cevap A. Hazinesi yangında boşalmış bir kasabada, normalde meclisin yeni limanı tüzüğünü hemen onaylaması beklenmez. Asıl cümle bu engele rağmen gerçekleşen beklenmedik sonucu verir, bu yüzden Although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisi vardır. B bir sıralama kurar, ama zaman dizisi mantıksızdır. C bir zıtlık kurar, fakat iki cümle gerçek bir karşıtlık oluşturmaz. D bir neden bildirir, ama kınama onayı destekleyemez, aksine tersini düşündürür. E bir koşul bildirir, fakat bölünmüşlük onayı kısıtlayamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the town's treasury had been emptied by a fire the previous winter",
        "correct": true
      },
      {
        "text": "As soon as the harbour master's proposal had been rejected twice by the finance committee",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the council was eager to settle the matter before the summer recess",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the harbour master had publicly denounced the charter's fishing restrictions only weeks earlier",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "If the members were still bitterly divided over every clause of the draft",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 348,
    "section": "sentence",
    "layout": "blank",
    "stem": "The regional fishing cooperative doubled its fleet size last year, and its members' average annual income rose sharply ----.",
    "explanation": "Doğru cevap B. Filo büyüyünce ve stoklar yarıya inince gelirin düşmesi beklenir; ama ana cümle artışı söyler. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir ve even though bunu kurar. A whereas ile zıtlık kurar, ama gerçek bir karşıtlık yoktur. C because ile neden bildirir, fakat ortak avın bölünmesi gelirin düşmesini gerektirir. D provided that ile koşul kurar; limanın kapatılması gelir artışının koşulu olamaz. E as soon as ile zaman sırası kurar; küçük avlar gelir artışından sonra başlayamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the cooperative's members also gained access to better equipment and higher-priced markets",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though the local fish stocks had declined by nearly half over the same period",
        "correct": true
      },
      {
        "text": "because each added boat drew on the same shrinking catch, so every member's share of the haul and earnings was divided more thinly",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that regulators closed the harbor to its newly purchased boats",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the cooperative's boats began reporting smaller catches each season",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 349,
    "section": "sentence",
    "layout": "blank",
    "stem": "The volunteers in the memory study recalled the word lists with remarkable accuracy ----.",
    "explanation": "Beklenti, uykusuz kalan insanların kelimeleri zayıf hatırlamasıdır; ana cümle ise olağanüstü doğruluğu anlatır. Bu durum beklenmedik sonuç (-e rağmen) ilişkisini gerektirir ve although bunu kurar. A, provided that ile koşul bildirir; sonuç bir koşulla kısıtlanamaz. C, as soon as ile sıra kurar; önce unutmak, sonra doğru hatırlamayı imkânsız kılar. D, whereas zıtlık kurar ama gerçek bir karşıtlık yoktur; dinlenmiş olmak beklenen sonuçtur. E, because ile neden bildirir; kısa ve dikkatsiz sunum doğruluğu açıklamaz, tersini destekler.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "provided that they had been kept awake through the entire previous evening",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although they had been deprived of sleep for nearly two consecutive nights before the test",
        "correct": true
      },
      {
        "text": "as soon as they had forgotten most of the words during the practice session",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas they had been well rested and had slept soundly for eight hours the night before the test",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had been shown each list only once, for less than a second per word, under constant distraction",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 350,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the isolated garrison held the hilltop fortress for nearly three years without any relief force reaching it.",
    "explanation": "İkmal gelmeden üç yıl dayanan bir garnizonun, tahılı bir avuçta kalmışken teslim olması beklenir. C, Although ile bu yokluğa rağmen kaleyi tutmayı kurar. A, As soon as ile surların yıkılmasını direnişe bağlar. B, Whereas ile yolun kesilmesini karşıtlık diye sunar; oysa bu, kuşatmayı anlatır. D, Because ile kuşatmayı direnişin nedeni yapar. E, Provided that ile erzakın teslimini koşul yapar.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the enemy batteries had levelled the outer walls and cut the spring supply",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the garrison had been cut off from the valley road since the first winter",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the garrison had been reduced to slaughtering its pack animals and rationing grain to a handful per day",
        "correct": true
      },
      {
        "text": "Because the enemy had encircled the hill with a siege line and the garrison possessed barely any stored grain",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the garrison had surrendered its grain stores to the besiegers in the first winter",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 351,
    "section": "sentence",
    "layout": "blank",
    "stem": "The regional transport authority kept fares frozen for six consecutive years ----.",
    "explanation": "Sen şöyle düşünebilirsin: maliyetler artınca ücretlerin de artması beklenir. Ana cümledeki ücret dondurma bu beklentinin tersidir; bu yüzden D doğrudur, çünkü 'even though' beklenmedik sonuç (-e rağmen) ilişkisi kurar. A 'whereas' ile zıtlık kurar, ama ücret dondurma ile düşük giderler hedefi arasında gerçek bir karşıtlık yoktur. B 'because' ile neden kurar; bütçe açığı artınca ücret dondurmak mantıksızdır. C 'provided that' ile koşul kurar; geçmişteki bir ücret dondurma koşula bağlanamaz. E 'as soon as' ile ardıllık kurar; son yıldaki düşüş altı yıllık dondurmayı tetikleyemez.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas it had consistently sought to keep its own operating expenses as low as possible",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because its operating deficit had doubled each year and its cash reserves were nearly exhausted",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that passenger numbers were growing rapidly and drivers were demanding wage increases each year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though its fuel and labour costs had escalated steadily throughout that period",
        "correct": true
      },
      {
        "text": "as soon as its ridership had plummeted in the final year of that period",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 352,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the restored estuary supported a dense population of migratory waders within two seasons.",
    "explanation": "Normalde kadmiyum ve kurşun içeren bir tortunun kuşları uzaklaştıracağını beklersin. Ana cümle ise tersini, yoğun bir kuş popülasyonunu bildirir; bu beklenmedik sonuç (-e rağmen) ilişkisi E'deki Although ile kurulur. A'daki Because yanlış neden verir: kapalı kapılar deniz suyunu keser, sonucu açıklayamaz. B'deki If koşulu ana cümleyi kısıtlayamaz. C'deki As soon as zaman sırası kurar, ama duyuru ile iki sezonluk sonuç arasında mantıksal bağ yoktur. D'deki Whereas zıtlık kurar, fakat gerçek bir karşıtlık yoktur.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the tidal gates were kept permanently closed, so that seawater never reached the reclaimed flats",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "If the tidal channels were blocked by silt every spring",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the local council publicly announced the cadmium levels in the dredged sediment",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the reconstructed tidal channels had been deliberately engineered to draw in feeding waders",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the dredged sediment used to rebuild the mudflats had been laced with cadmium and lead",
        "correct": true
      }
    ]
  },
  {
    "slot": 353,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the transplanted kidney began producing urine within minutes of reperfusion.",
    "explanation": "Uzun süre soğukta bekleyip hipoksik hale gelmiş bir organın hemen çalışmasını beklemeyiz. Hızlı idrar üretimi bu beklentinin tersi olduğundan beklenmedik sonuçtur; Although beklenmedik sonuç (-e rağmen) ilişkisi kurar. A: Because, kan akışının yokluğunu neden gösterir; oysa bu durum idrar üretimini engeller. B: As long as, koşul kurar; saklama biçimi sonucu kısıtlayamaz. C: As soon as, zaman sırası kurar; ureter tıkanıklığı üretimden önce keşfedilemez. D: Whereas, zıtlık kurar; ama cümleler arasında gerçek bir karşıtlık yok.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the recipient's blood pressure had stayed dangerously low for the entire anastomosis and no blood had flowed through the graft",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as the surgeons had kept the donor kidney submerged in warm saline throughout transport",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the surgeons discovered that the ureter had kinked during closure",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the recipient had spent almost six years on a waiting list before receiving this organ from a living donor",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the donor organ had spent nearly eleven hours in a cold-storage solution that had turned hypoxic",
        "correct": true
      }
    ]
  },
  {
    "slot": 354,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the regional water authority approved a reservoir on the valley floor.",
    "explanation": "Sen şunu beklersin: geçirgen alüvyon zeminde su tutma yapısı onaylanmaz, çünkü su sızar. Ana cümledeki onay ise beklenmedik sonuçtur, bu yüzden beklenmedik sonuç (-e rağmen) ilişkisi kuran Although doğru cevaptır. Because sebep bildirir ve beklentiyi destekler. As long as koşul kurar ama koşul onayı kısıtlayamaz. As soon as zaman sırası kurar ama rapor ile onay arasındaki sıra mantıksızdır. Whereas zıtlık kurar ama onay sonucuna karşıt bir durum sunmaz.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the valley floor had flooded twice that decade and residents had filed formal objections",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as the valley floor had been recorded as prone to seasonal flooding",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as engineers reported serious seepage losses through the valley floor's porous bedrock",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the proposed site sits on alluvial gravel, which a survey had found highly permeable",
        "correct": true
      },
      {
        "text": "Whereas the valley's farmers have long relied on wells drawn from the same aquifer for irrigation",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 355,
    "section": "sentence",
    "layout": "blank",
    "stem": "The lizards on the eastern ridge remained unusually large for their species ----.",
    "explanation": "Normalde kuraklık ve yiyecek azlığı kertenkeleleri küçültmesi beklenir. Ana cümle ise olağandışı büyük kalmalarını söyler, bu yüzden beklenmedik sonuç vardır. A seçeneği 'although' ile bu karşıtlığı kurar: kuraklık bitki örtüsünü ve böcekleri yok etmiştir, yine de büyüklükleri sürmüştür. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir. B zıtlık kurar ama gerçek bir karşıtlık yoktur. C neden bildirir, ama azalan yiyecek küçülmeyi açıklar. D koşul kurar, rekabet büyüklüğü kısıtlamaz. E zaman bildirir, ama rakibin gelişi büyüklüğü açıklayamaz.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "although a two-year drought had stripped the scrubland, whose arthropods formed nearly all of their diet, leaving the ridge almost barren",
        "correct": true
      },
      {
        "text": "whereas their scrubland habitat was mapped by researchers in the early nineties with its lizards catalogued in detail by field teams",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because food grew scarcer each dry season, forcing the lizards to range much farther and burn energy they could not replace",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "unless the lizards had competed with goats and sheep for every scrap of forage on the slope during the dry years",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as a rival species of monitor lizard colonized the ridge and began competing for every insect in their range",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 356,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the council of the small river town approved the canal project unanimously.",
    "explanation": "Doğru cevap D. Normalde, eskimiş bir tarama planı yüzünden rezervi tükenmiş bir konseyin kanal projesini oybirliğiyle onaylaması beklenmez. Sen bu yüzden ana cümlenin beklenen tepkinin tersini bildirdiğini fark etmelisin. Although, engelin bu beklentiye rağmen beklenmeyen sonucu verdiği beklenmedik sonuç (-e rağmen) ilişkisi kurar. A As soon as zaman sırasını imkânsız kılar. B Whereas gerçek bir karşıtlık kurmaz, sadece rutin bilgi verir. C Because, sebep olarak ana cümlenin tersini destekler. E Unless, onayı kısıtlayan bir koşul kuramaz.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the canal fund ran dry after the spring floods had washed out the new river levee",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the council had met each Tuesday in the old customs house for decades before the railway line arrived in town",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because every council member had declared the canal a hopeless waste of public money after the flood destroyed the lock system",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the treasury had already earmarked most of its reserve for a dredging scheme that had silted up the previous spring",
        "correct": true
      },
      {
        "text": "Unless residents at the public hearing first learned that the proposed canal would drain the shallow aquifer feeding the town's wells",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 357,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the site engineers poured the foundation slab for the new water-treatment plant on schedule.",
    "explanation": "Doğru cevap B'dir. \"Although\" beklenmedik sonuç (-e rağmen) ilişkisi kurar. Nemli çimentonun dökümü geciktireceği beklenir; ancak ana cümle dökümün zamanında yapıldığını söyler, yani sonuç beklentinin tersidir. A \"As soon as\" ile zaman sırası kurar, fakat bu sıralama imkânsızdır. C \"Whereas\" ile zıtlık kurar, ama iki olay arasında gerçek bir karşıtlık yoktur. D \"Because\" ile neden kurar; yağmur tahmini zamanında dökümü açıklamaz. E \"As long as\" ile koşul kurar; hava tahmini dökümü kısıtlayamaz.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the heavy rain had flooded the excavation pit and delayed every subcontractor's crew on site",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the cement had come from a silo that had absorbed enough moisture to begin hydrating before mixing",
        "correct": true
      },
      {
        "text": "Whereas the crane operators had been reassigned to the adjacent bridge project during that same two-week period",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the concrete crew had been reassigned to the pumping station and forecasters predicted steady rain all week",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as the regional weather service had predicted heavy rain and lightning throughout the entire morning shift",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 358,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the council approved the reconstruction of the granary on its original site.",
    "explanation": "Sen şunu görmelisin: sıvılaşma riski olan bir zemine yeniden inşaya onay verilmesi beklenmez; ana yargı bu beklentinin tersidir. Although, bu beklenmedik sonuç (-e rağmen) ilişkisini kurar: zemin riski olsa ve üç kez etüt edilmiş olsa bile onay verilir. A sequence kurar, ancak zaman sırası mantıklı bir sonuç vermez. B zıtlık kurar, fakat ortada gerçek bir karşıtlık yoktur. C neden-sonuç kurar, ama riskli zemin onayı değil reddi destekler. D koşul kurar, fakat çatlaklar onayı kısıtlamaz, reddi gerektirir.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as engineers flagged liquefaction risk under the waterlogged granary plot last March",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the granary had been built in the seventeenth century by a wealthy merchant guild based nearby",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the plot sat on waterlogged alluvium the council had already condemned as unsafe for any building",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the consulting engineers reported the north wall's foundations were already cracking and sinking",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the plot, which sat on waterlogged alluvium vulnerable to liquefaction, had been surveyed three times before",
        "correct": true
      }
    ]
  },
  {
    "slot": 359,
    "section": "sentence",
    "layout": "blank",
    "stem": "The council renewed the regional bus contract with the same operator ----.",
    "explanation": "Doğru cevap A. Bakımsız araçlar olan bir işletmecinin sözleşmesinin yenilenmesi beklenmez; bu nedenle asıl cümledeki yenileme beklenmedik sonuçtur ve although bu ilişkiyi beklenmedik sonuç (-e rağmen) olarak kurar. B, whereas ile zıtlık kurar ama iki durum arasında gerçek bir karşıtlık yoktur. C, because ile neden kurar fakat güvenlik nedeniyle kaybedilen sözleşmeler yenilemeyi açıklayamaz. D, unless ile koşul kurar; soruşturma yenilemeyi kısıtlayan bir koşul değildir. E, as soon as ile zaman sıralaması kurar, ancak ceza sonrası hemen yenileme mantıklı bir sonuç ifade etmez.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "although the operator had run a fleet of vehicles that an inspector had found dilapidated",
        "correct": true
      },
      {
        "text": "whereas the operator had never before run any scheduled bus routes in the regional network",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the company had recently lost two contracts for failing to meet basic safety standards",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "unless the operator was already under investigation for missed timetables by the regional transport authority",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the operator had been fined for repeatedly missing scheduled routes across the city",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 360,
    "section": "sentence",
    "layout": "blank",
    "stem": "The team published a confident phonological analysis of the dialect ----.",
    "explanation": "Normalde eksik ve güvenilmez verilere dayanan bir analizin temkinli olmasını beklersin. Cümlede ise ana yargı tam tersine kendinden emin bir analizdir; bu, beklenmedik sonuçtur. Bu yüzden although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisi doğrudur. Şık A koşul kurar; kayıtlara erişimin yokluğu analizi koşullandıramaz. Şık B ardışıklık kurar; boşlukların keşfinden sonra kendinden emin bir analizin yayımlanması zaman sırası açısından tutarsızdır. Şık D zıtlık kurar; ancak lehçenin yüzyıllardır konuşulması analizle gerçek bir karşıtlık oluşturmaz. Şık E neden-sonuç kurar; eksik kayıtlar kendinden emin analizi açıklamaz, tersine güvensizlik doğurur.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "if the team lacked any access to recordings made by native speakers themselves",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the fieldwork notes revealed serious gaps in the vowel data",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "although the transcripts, which were lacunary, had been prepared by a single fieldworker",
        "correct": true
      },
      {
        "text": "whereas the dialect has been spoken in this valley for several centuries now",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the recordings were riddled with gaps and no native speaker had reviewed them",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 361,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the pumping station was returned to full service by the same afternoon.",
    "explanation": "Normalde ağır hasarlı bir pompa istasyonu uzun süre devre dışı kalır. Ana cümle ise aynı öğleden sonra tam hizmete dönüldüğünü söyler; bu beklenmedik bir sonuçtur. Although, hasarlı impeller ile bu sonucu bağlayarak beklenmedik sonuç (-e rağmen) ilişkisi kurar. A) As soon as sıralama kurar, fakat yeni arıza geri dönüşü tetikleyemez, mantıksızdır. B) Whereas zıtlık kurar, ama rutin bakım ile tam dönüş arasında karşıtlık yoktur. D) Because neden kurar, fakat ekibin dağıtılması geri dönüşü engellerdi, yani tersini destekler. E) Provided that koşul kurar, ama koşul geçmiş bir gerçeği kısıtlayamaz.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the contractor's log recorded a fresh pump failure that morning",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the contractor's log listed a pump scheduled for routine seasonal maintenance only",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the contractor's log listed an impeller that was riddled with cavitation damage",
        "correct": true
      },
      {
        "text": "Because the repair crew had been entirely reassigned to another district that morning",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the spare impeller was still waiting on a freight dock in Rotterdam",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 362,
    "section": "sentence",
    "layout": "blank",
    "stem": "The district reported that its reading program had raised average test scores at every grade level ----.",
    "explanation": "Eğitimsiz tutorların yürüttüğü bir programın iyi sonuç vermesini normalde beklemezsin. Oysa tüm düzeylerde puanların yükseldiği ana cümlede anlatılır; bu beklenmedik sonuçtur. although beklenmedik sonuç (-e rağmen) ilişkisini kurar, bu yüzden doğrudur. A whereas ile iki ilgisiz bilgiyi karşılaştırır; gerçek bir zıtlık yoktur. B because nedeni verir ama neden sonucu destekleyemez. C unless bir koşul kurar; bu koşul puan artışını sınırlayamaz. E as soon as zaman sırası kurar; kovulmanın puan artışından hemen önce olması mantıksızdır.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the program's printed materials were available in both English and Spanish for every family at home",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because most students attended fewer than three sessions and the tutors had no classroom time at all",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "unless the teachers had skipped most of the daily reading drills that the program required each week",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although the sessions were run by tutors who had never been trained in the approved phonics method",
        "correct": true
      },
      {
        "text": "as soon as the district had dismissed its reading coaches for poor performance and cut their budgets",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 363,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the samples yielded a reliable sequence of dates.",
    "explanation": "Normalde yanlış kalibre edilmiş bir sistem güvenilmez tarihler verir, dolayısıyla beklenen sonuç güvenilmezliktir. Ana cümledeki güvenilir tarih dizisi bu beklentinin tersidir, yani beklenmedik sonuçtur; bu, \"Although\" ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir. A neden-sonuç kurar ve sebebin tersi sonucu doğurur. C koşul kurar ama kötü saklama güvenilirliği kısıtlayamaz. D zaman sırası kurar, fakat makine arızalandıktan sonra güvenilir sonuç imkânsızdır. E zıtlık kurar ama iki yargı arasında gerçek bir karşıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the samples had absorbed modern carbon from open air storage over several decades before testing",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the team dated the samples with a system that an earlier laboratory had calibrated incorrectly",
        "correct": true
      },
      {
        "text": "If the samples sat in damp soil for decades before the field crew finally collected them",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the dating machine failed during its third calibration run in the lab",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the laboratory later published its full calibration methods for other researchers to review in detail",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 364,
    "section": "sentence",
    "layout": "blank",
    "stem": "The dialect survey was built on transcriptions that its editors checked against the original recordings, and the final lexicon was published without any revisions ----.",
    "explanation": "Normalde doğrulanmış metinler revizyon gerektirir. Ana cümle ise revizyonsuz yayımı anlatır; bu beklenmedik sonuçtur. C, konuşurun afazik olmasını güvenilirlik kaygısı olarak verir ve 'although' ile bu kaygının aşıldığını gösterir. A koşul kurar, ama koşul ana cümleyi kısıtlayamaz. B zaman sırası kurar; revizyonsuz yayımdan sonra işaretleme olamaz. D zıtlık kurar, ama karşıt bir anlam yoktur. E neden-sonuç kurar; hata bulunsaydı revizyon gerekirdi, cümle çelişir.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "if several transcribers had flagged the same entries as doubtful beforehand",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the external reviewers flagged several entries as unreliable",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "although several entries were drawn from a speaker who was aphasic",
        "correct": true
      },
      {
        "text": "whereas the lexicon's headword list was compiled in alphabetical order by region",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the editors found errors in nearly every transcript they checked",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 365,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the team recorded a usable spectrum of the faint companion star throughout the night.",
    "explanation": "Normalde kaplanmış bir fiberle sönük bir yıldızın kullanılabilir spektrumunu almak beklenmez. Ana cümle ise gece boyunca kaydın alındığını söyler; bu beklenmedik bir sonuçtur. Although bu karşıtlığı beklenmedik sonuç (-e rağmen) ilişkisiyle kurar, dolayısıyla D doğrudur. A zaman sırasını kurar, ama dedektör kapalıyken kayıt başlayamaz. B zıtlık kurar, fakat kataloglanmış yıldız ile kayıt arasında gerçek bir karşıtlık yoktur. C neden bildirir, oysa bulut kaydı engeller. E koşul bildirir, ama kapalı kubbe kaydı imkânsız kılar.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as a sudden fault in the cooling system forced the detector offline before the observing window opened",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the companion star has been catalogued in several earlier surveys of the binary system and its orbit is well known",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because thick cloud cover blanketed the observatory for most of the night and the faint star stayed below the detector threshold",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the spectrograph drew its light through a fiber that had been coated with a hygroscopic film before the run",
        "correct": true
      },
      {
        "text": "If the sky remained thick with cirrus from dusk until well after midnight, and the dome stayed closed for the whole evening",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 366,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the excavation team confidently assigned the hearth to the early Bronze Age.",
    "explanation": "A doğru. Bioturbasyona uğramış bir tabakadaki kömürün tarihlendirmesi güvenilmez olduğundan, normalde kesin bir atama beklenmezdi. Although bu engeli kabul eder, ana cümle yine de kesin bir atama yapıldığını söyler; bu yüzden beklenmedik sonuç (-e rağmen) ilişkisi vardır. B: Because kirlenme kesinliğe neden olamaz; kirlenme şüphe doğurur. C: If sonraki çukurlar kesin hükmü koşullayamaz. D: As soon as güvensiz sonuçların ardından hemen kesin atama zaman sırası açısından mantıksızdır. E: Whereas zıtlık kurar, ama geçmiş araştırmalarla tarihlendirme güveni arasında gerçek bir karşıtlık yoktur.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the charcoal came from a deposit that had been extensively bioturbated before excavation",
        "correct": true
      },
      {
        "text": "Because the radiocarbon sample had been contaminated by modern rootlets that the team overlooked",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "If later Iron Age pits cut through the hearth at some point before excavation",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the lab reported that the dates from the hearth were unreliable",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the site had been surveyed in several earlier seasons by other teams",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 367,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the team published a confident date for the settlement's abandonment in its preliminary report.",
    "explanation": "Normalde güvenilir tarih için sağlam kanıt beklenir; karışmış bir tabakadan alınan tek kömür örneği bu kanıtı zayıflatır. Ana yargı, bu zayıf kanıta rağmen kesin bir tarih ilan edilmesi olduğundan, Although beklenmedik sonuç (-e rağmen) ilişkisi kurar. A, kanıt eksikliğini gerekçe gösterip kesin tarihi destekler; mantıksız. C, ana yargı zaten yayımlandığı için koşul onu kısıtlayamaz. D, kazının bütün sezon durmasıyla yayından önce bir ardışıklık kurulamaz. E, Whereas iki durum arasında gerçek bir zıtlık kurmaz; bağlantısız bir ayrıntı verir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the excavation had barely begun and no datable material had yet been recovered from any layer at the site",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the only charcoal sample had been collected from a layer that had clearly been disturbed by a later flood",
        "correct": true
      },
      {
        "text": "Provided that the team consulted the stratigraphic notes marking the upper layers as heavily mixed by later burials during the survey",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as heavy rain had washed out the trench walls and halted excavation for the entire field season last year",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the settlement's inhabitants had left an array of tools and household refuse in each excavated house on the western quarter",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 368,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the city council kept the old suspension bridge open to heavy trucks through the winter.",
    "explanation": "Normalde yaşlı ve korozyonlu bir köprünün ağır araçlara açık tutulmamasını beklersin. Ana cümle ise beklenmedik sonucu verir: meclis köprüyü yine de açık tuttu. D, bu beklenmedik sonuç (-e rağmen) ilişkisini kurar, çünkü ciddi korozyon raporu varken açık bırakma gerçekleşmiştir. A zaman sırası kurar, ama tam kapanma ana cümledeki açık tutmayla çelişir. B zıtlık kurar, ama kablo boyası ile açık tutma arasında gerçek bir karşıtlık yoktur. C neden bildirir, ama güvensizlik açıklaması açık tutmanın tersini gerektirir. E koşul kurar, ama kapanma koşulu ana cümleyi kısıtlayamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "After the bridge was closed to all vehicles for emergency repairs in early January",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the bridge's steel cables were repainted during the spring of last year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because engineers had already declared the aging structure unsafe for all vehicles and pedestrians alike",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the inspection report had listed severe corrosion in three of its main cables",
        "correct": true
      },
      {
        "text": "If contractors closed the old suspension bridge for repairs in late October that year",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 369,
    "section": "sentence",
    "layout": "blank",
    "stem": "The freshwater snail population in the small pond grew quickly over the summer ----.",
    "explanation": "Cevap E. Soğuk, besin yoksunu suyun yılda iki kez boşaltılıp yeniden doldurulmasının olağan olarak salyangoz sayısını düşürmesini beklersin. Buna rağmen nüfusun hızla artması beklenmedik sonuçtur. although, beklenmedik sonuç (-e rağmen) bağlacıdır; engel cümlesiyle ana cümledeki beklenmedik sonucu bağlar. A) whereas zıtlık kurar, ama cümleler arasında gerçek bir karşıtlık yoktur. B) because nedensellik kurar, fakat kuşun avlaması nüfusu azaltır, artışı açıklamaz. C) unless koşul bildirir; kısıtlama büyümeyi engelleyemez, cümle mantıksızlaşır. D) as soon as ardıllık kurar, fakat yırtıcı balık stoklaması ile hızlı artış zaman ve mantık açısından çelişir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the pond was first surveyed by volunteers in early June before the summer began",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because a heron had been wading through the shallows and picking off most snails each day",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "unless the owners stocked the pond with predatory fish in the early spring months",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the local fishery stocked the pond with predatory perch in early June",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "although the pond had been drained twice that year and refilled with cold, nutrient-poor water",
        "correct": true
      }
    ]
  },
  {
    "slot": 370,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the surgical ward discharged more patients than usual during March.",
    "explanation": "Normalde dört kıdemli hekimden ikisini kaybeden bir servisin daha az hasta taburcu etmesi beklenir. Ana cümle ise tersini söyler: Mart ayında daha fazla hasta taburcu edildi. Bu yüzden sen beklenmedik sonuç (-e rağmen) ilişkisini kurmalısın; doğru cevap Although'dur. B: Because neden-sonuç kurar, ancak ameliyathane kapanmaları taburcu sayısını azaltır, cümle ters düşer. C: Unless koşul bildirir; seans azaltmak taburculuğu sınırlamaz, anlam bozulur. D: As soon as ardışık zaman ister; Şubat sonundaki bir arıza Mart'taki taburculuğun hemen ardından gelen sonuç olamaz. E: Whereas zıtlık kurar, ama kafeterya tadilatıyla servisin taburculuğu arasında gerçek bir karşıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the ward had lost two of its four senior physicians that month",
        "correct": true
      },
      {
        "text": "Because most of its operating theatres had been closed for repairs throughout March",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Unless the ward cut its theatre sessions by half during the month of March",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the hospital's bed-management software crashed in late February and jammed admissions",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the hospital's cafeteria was fully renovated over the previous summer and reopened",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 371,
    "section": "sentence",
    "layout": "blank",
    "stem": "The volunteers in the memory experiment recalled the full list of twenty words ----.",
    "explanation": "Doğru cevap B. Uyku eksikliği zayıf hatırlamayı bekletir; oysa ana cümlede tüm yirmi kelimenin hatırlandığı beklenmedik bir sonuç verilmiş. Bu, even though ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir. A if koşul kurar, ama hayali bir durum gerçek hatırlamayı kısıtlayamaz. C as soon as sıralama kurar, ama pratik turunda yaşananlar test hatırlamasıyla zaman olarak mantıksız bağlanır. D whereas zıtlık kurar, ama liste ile hatırlama arasında gerçek bir karşıtlık yoktur. E because neden kurar, ama tekrar yapılmaması tam hatırlamayı değil başarısızlığı destekler.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "if they had been distracted by loud noise throughout the entire long study session",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though they had slept less than four hours the night before the test",
        "correct": true
      },
      {
        "text": "as soon as they had forgotten the first five words in the practice round",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas the list itself contained only common household nouns that were easy to picture",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had been told the test was postponed and had not reviewed the list",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 372,
    "section": "sentence",
    "layout": "blank",
    "stem": "The regional government's new tram line recorded unusually high ridership in its first year, ----.",
    "explanation": "Normalde ücret artışları yolcu sayısını düşürür, bu yüzden beklenen sonuç düşük yolcu sayısıdır. Ana cümledeki yüksek yolcu sayısı bu beklentinin tersidir; sen bu karşıtlığı beklenmedik sonuç (-e rağmen) ilişkisi olarak görmelisin. D seçeneğinde although, ücret artışlarına rağmen gerçekleşen sonucu bağlar. A whereas yalnızca zıtlık kurar, ama depo açılışı yolcu sayısıyla karşıtlık oluşturmaz. B because hizmet aksamasını yüksek yolcu sayısına neden gösterir, bu mantığa aykırıdır. C provided that bir koşul bildirir; ücret artışı yolcu sayısını kısıtlayamaz. E as soon as zaman ilişkisi kurar, ama kapalı bir hatta yolcu kaydı yapılamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the tram depot was completed two months after opening",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because service was suspended for weeks and trams rarely ran on time",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that fares rose sharply throughout the first year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although fares had been raised twice since the line opened",
        "correct": true
      },
      {
        "text": "as soon as the line had closed for two weeks",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 373,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the regional authority approved a new housing development on the drained wetland.",
    "explanation": "Korunan bir sulak alanda yapılaşma beklenmez, bu yüzden onay beklenmedik sonuçtur. E doğrudur: Even though, koruma statüsüne rağmen onay verildiğini söyleyerek beklenmedik sonuç (-e rağmen) kurar. A, Because ile neden ilişkisi kurar; koruma statüsü onayı gerekçelendirmez, tersine açıklamaya ters düşer. B, Provided that koşul bildirir; koşul onayı kısıtlar, oysa cümle onayı kesin bildirir. C, As soon as zaman sırası kurar; sel sonrası onay ile sulak alanın kurutulması arasındaki sıra imkânsızdır. D, Whereas zıtlık kurar, ama cümleler arasında gerçek bir karşıtlık ve beklenmedik sonuç yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the regional council had recently pledged to expand public parkland",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the wetland had remained under strict environmental review for decades",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the wetland flooded again after the heavy storms",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the drainage scheme had been funded by the regional treasury",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Even though the wetland had been designated a protected nature reserve",
        "correct": true
      }
    ]
  },
  {
    "slot": 374,
    "section": "sentence",
    "layout": "blank",
    "stem": "The fieldworkers recorded the local dialect in remarkable detail, ----.",
    "explanation": "Normalde üç haftalık kısa bir ziyaret ayrıntılı kaydı zor kılar; ana cümle ise tersine ayrıntılı kaydı söyler. Bu yüzden A) although doğrudur: beklenmedik sonuç (-e rağmen) ilişkisi kurar. B) unless bir koşul kurar, oysa ana cümle koşulsuz bir gerçektir. C) as soon as zaman sırası kurar; ekipman bozulduktan sonra ayrıntılı kayıt imkânsızdır. D) whereas zıtlık kurar, ama ortada gerçek bir karşıtlık yoktur. E) because neden kurar; hiç ziyaret etmemiş olmak ayrıntılı kaydı açıklamaz, çelişir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "although they had been allowed only three weeks in the village",
        "correct": true
      },
      {
        "text": "unless the village elders refused to speak with them at all",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the recording equipment broke down in the village",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas they had also recorded the neighbouring villages' dialects in equal detail",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had never before visited any village in the region",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 375,
    "section": "sentence",
    "layout": "blank",
    "stem": "The regional central bank kept its benchmark interest rate unchanged for eighteen months ----.",
    "explanation": "Normalde işsizlik artarken faiz indirmek beklenir; faizi sabit tutmak beklenmedik bir sonuçtur. 'Even though' bu beklenmedik sonuç (-e rağmen) ilişkisini kurar; ana cümle, işsizliğe rağmen gerçekleşen sonuçtur. B 'whereas' ile zıtlık kurar, ama yönetici kurulu görev süresiyle faiz kararı arasında karşıtlık yoktur. C 'because' ile neden bildirir; enflasyonun düşüşü faizi sabit tutmanın değil indirmenin gerekçesidir. D koşul kurar, ama geçmiş on sekiz ay gerçeği bir koşula bağlanamaz. E zaman sırası kurar, ama piyasa beklentilerinin yükselişi bu dönemden önce olamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "even though unemployment in the region had risen for three consecutive quarters",
        "correct": true
      },
      {
        "text": "whereas the bank's governor had already served on its policy board since 2010",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because inflation had been falling sharply below target for three consecutive quarters",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "if inflation had been running well above its target for most of that time",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as inflation expectations in the market had started rising sharply",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 376,
    "section": "sentence",
    "layout": "blank",
    "stem": "The district's reading intervention produced measurable gains in comprehension across all three cohorts ----.",
    "explanation": "Normalde yoğun personel kaybı (attrition) yaşayan okullardan gelen gruplarda kazanımların düşük olması beklenir. Ana cümle ise ölçülebilir kazanımları bildirdiği için beklenmedik sonuçtur; bu yüzden doğru bağlaç although, yani beklenmedik sonuç (-e rağmen) bağlacıdır. A: whereas zıtlık kurar, ama test revizyonu kazanımlarla karşıt değildir, cümle anlamsızlaşır. B: because neden kurar, ama iki haftalık uygulama kazanımın nedeni olamaz. C: unless koşul bildirir, fakat okulların uzman kaybı kazanımları ortadan kaldıramaz. E: as soon as zaman sırası kurar, fakat personel kaybı ile kazanım arasında imkânsız bir sıra vardır.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the tests used to measure comprehension were revised in 2021",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the cohorts were given the intervention for only two weeks",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "unless the schools had already lost most of their reading specialists",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although the cohorts came from schools that had seen heavy attrition",
        "correct": true
      },
      {
        "text": "as soon as the cohorts' schools had lost most of their teaching staff",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 377,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the restored wetland now supports more breeding pairs of marsh harriers than any other site in the region.",
    "explanation": "Normalde kirli bir havzanın üreme çiftlerini azaltmasını bekleriz. Ana cümle ise tersini, bölgedeki en fazla bataklık harrier çiftini barındırdığını söyler; bu beklenmedik sonuçtur. Although, beklenmedik sonuç (-e rağmen) ilişkisini kurar ve doğru seçenek budur. B, cause kurar; temizlenmiş, kısa süre su basmış bir alanın bu sonucu açıklaması mantıksızdır. C, condition kurar; koşul geçmiş bir durumu kısıtlayamaz. D, sequence kurar; kirli su baskını bu başarıyı mantıksal olarak doğurmaz. E, zıtlık (whereas) kurar; ziyaretçi merkezi ile kuşlar arasında gerçek bir karşıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the reeds were planted in a basin that had been filled with leachate for years",
        "correct": true
      },
      {
        "text": "Because the reed beds were cleared of all vegetation and flooded only briefly during last spring",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "If the reed beds are cut back every March and the shallow water is drained before nesting begins",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "After the reed beds were repeatedly flooded with contaminated runoff from the neighbouring farms last spring",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the visitor centre at the reserve opened its doors to school groups for the first time",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 378,
    "section": "sentence",
    "layout": "blank",
    "stem": "The assessors recorded a pass for every candidate on the timed reading paper ----.",
    "explanation": "Normalde disleksisi olan adayların süreli okuma sınavında geçmesi beklenmez; beklenen sonuç başarısızlıktır. Cümlede ise herkesin geçtiği kaydedilmiştir, yani asıl yargı beklenmedik bir sonuçtur. 'even though' bu nedenle beklenmedik sonuç (-e rağmen) ilişkisini kurar. A: 'whereas' zıtlık kurar, ama cümlede karşıtlık yoktur. B: 'because' neden bildirir; az okumuş adayların geçmesi ters bir sonuçtur. C: 'if' koşul bildirir; hayali bir süre, kaydedilmiş gerçek bir geçişi kısıtlayamaz. E: 'as soon as' ardışıklık bildirir; kayıt zamanı imkansız bir sırayla çelişir.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the timed paper was marked by two different examiners",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because few candidates had read any of the set texts before the exam",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "if the candidates had been given only ten minutes to finish",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though it was taken by students who had dyslexia",
        "correct": true
      },
      {
        "text": "as soon as the extra reading time allowance was withdrawn",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 379,
    "section": "sentence",
    "layout": "blank",
    "stem": "A regional development bank expanded its lending to small manufacturers, ----.",
    "explanation": "Sen B'yi seçmelisin: although beklenmedik sonuç (-e rağmen) kurar. Dalgalı ihracat fiyatları normalde kredi genişletmemeyi bekletir, ama banka genişletmiştir. Bu, beklentinin tersi olan asıl sonuçtur. A whereas zıtlık kurar, fakat iki durum arasında gerçek bir karşıtlık yoktur. C because neden bildirir, ama kredi değerlendirmesi yapmamış olmak genişlemeyi açıklamaz. D if koşul kurar; geçmişte gerçekleşmiş bir genişlemeyi koşul kısıtlayamaz. E as soon as zaman sıralaması kurar; temerrütlerin ardından genişleme mantıksızdır.",
    "difficulty": 4,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas most of its borrowers had already been exporting finished goods to European and Asian markets",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although the export prices on which most of its borrowers depended had shown considerable volatility",
        "correct": true
      },
      {
        "text": "because its loan officers had never before evaluated any small manufacturing firms for credit risk",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "if its loan losses rose sharply that year and its capital reserves were shrinking steadily",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as several of its existing borrowers had defaulted on their loans during the downturn",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 380,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the dialysis unit completed every scheduled session without a single cancellation.",
    "explanation": "Doğru cevap D'dir. Su basıncı ve saflığındaki büyük dalgalanma normalde seansların aksamasını beklettirir; ana cümle ise hiç iptal olmadan tamamlandığını söyler. Bu, beklenen olumsuz sonucun tersi olan beklenmedik sonuçtur, dolayısıyla Although (-e rağmen) uygundur. A: Because, eksik personelin seansları tamamlamayı sağladığını söyler; mantıksız. B: Unless, bir koşulun dışlayıcı anlamı ana cümleyi sağlamaz. C: As soon as, zaman sırası kurar; basınç düşüşünden hemen sonra tamamlanma anlamsız. E: Whereas, zıtlık kurar ama makine üreticisi ile seans tamamlanması arasında gerçek karşıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the unit had been short of nurses and technicians for nearly two years running",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Unless the backup pumps kept failing throughout every week of that long treatment period",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the water supply suffered a sudden pressure drop in the city",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the water supply feeding the unit had shown considerable volatility in pressure and purity",
        "correct": true
      },
      {
        "text": "Whereas the dialysis machines in the unit were made by a firm that also supplies filters",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 381,
    "section": "sentence",
    "layout": "blank",
    "stem": "The district kept its after-school tutoring programme fully staffed for the entire academic cycle ----.",
    "explanation": "Doğru cevap A. Sen de oynak bir finansmanın kadro kesintisine yol açmasını beklersin; bu yüzden tam kadro ana cümlede beklenmedik sonuçtur. although (-e rağmen) bu beklenmedik sonucu bağlar: finansman istikrarsızdı, yine de program tam kadroluydu. B whereas ile zıtlık kurar, ama cümleler arasında gerçek bir karşıtlık yoktur. C because neden kurar; yarıya inen bütçe kadro doluluğunu açıklamaz, tersini gerektirir. D unless koşul kurar; tamamlanmış bir durumu kısıtlayamaz. E as soon as sıralama kurar; Mart'taki kapanış duyurusu tüm dönem boyunca dolu kadroyla zamansal olarak uyuşmaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "although the funding formula that paid for it had proved volatile from one budget round to the next",
        "correct": true
      },
      {
        "text": "whereas the district's tutoring office publishes a quarterly newsletter listing volunteer schedules and student attendance figures each spring and autumn",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the staffing budget had been cut in half before the academic year began, with no replacement hires approved",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "unless several tutors quit midway through the autumn term and vacancies went unfilled for weeks at a time",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the principal announced in March that the evening wing would be closed for good",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  }
];

export const bandLessons: Record<number, Lesson> = {
  "331": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde az eğitimli insanların zorlu bir tatbikatta görevlerini zamanında tamamlamasını beklemezsin. Ana cümle bu beklentinin tersini anlattığı için beklenmedik sonuç (-e rağmen) ilişkisi vardır; doğru cevap even though'dur. A) provided that koşul kurar, ama ana cümleyi sınırlamaz. B) as soon as ardışıklık kurar, fakat güç kesintisi tatbikattan önce olamaz. D) whereas zıtlık kurar, ancak iki durum arasında gerçek bir karşıtlık ve beklenmedik sonuç yoktur. E) because neden bildirir, fakat prosedürleri bilmemek sakin kalmayı açıklamaz, tersini düşündürür."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition; sleep deprivation cannot restrict whether tasks were completed on time."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "As soon as orders events in time, but a power failure during the first drill cannot precede the exercise described."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Whereas marks plain opposition; more practice does not contradict calm completion, so the contrast is not unexpected."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause; ignorance of procedures would predict failure, so the reason supports the opposite outcome."
      }
    ]
  },
  "332": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde sel gibi sürekli hasar gören bir köprünün kullanımdan kaldırılmasını beklersin. Ana cümle ise köprünün üç yüzyıl boyunca günlük kullanımda kaldığını söylüyor; bu beklenmedik sonuçtur, bu yüzden 'Although' (-e rağmen) doğru bağlaçtır. A) 'As soon as' zaman sırası kurar; mühendislerin kapatma kararından sonra kullanım sürmez. B) 'Whereas' zıtlık kurar ama iki yan arasında gerçek bir karşıtlık yoktur. C) 'Because' neden bildirir; çürüme yüzünden kullanımın sürmesi mantıksızdır. E) 'As long as' koşul kurar; kapatmanın kullanımı kısıtlaması anlamsızdır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "'As soon as' builds a time sequence, and closing the bridge contradicts its continued daily use."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Both clauses describe care and upkeep, so there is no real opposition; this is not a concession."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "These problems would explain closure, not continued daily use; the reason supports the opposite outcome."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict use here, since the bridge stayed in daily use; the closure claim is illogical."
      }
    ]
  },
  "333": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Satışı üç aydır düşen bir fırının oturma yerini büyütüp eleman alması beklenmez. E, even though ile bu düşüşe rağmen yapılan genişlemeyi kurar. A, whereas ile kalabalığı karşıtlık diye bağlar; oysa bu, genişlemeyi açıklar ve bağlaç neden değildir. B, because ile saatin kısılmasını genişlemenin nedeni yapar. C, provided that ile kira artışını koşul yapar. D, as soon as ile denetim cezasını genişlemeye bağlar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Contrast needs real opposition; crowds do not oppose expansion, so the clause adds information rather than an unexpected outcome."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Ordered cuts in hours and workforce would give a reason for shrinking, not expanding, so the reason supports the opposite."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A landlord's rent increase cannot restrict or license the expansion; the condition relation does not fit."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "An inspection citing violations would have to come before the expansion, making the time order impossible as written."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "334": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen A seçeneğini seç. Normalde kirlenmiş bir nehrin uzun süre temiz kalamayacağını bekleriz; oysa ana cümle nehrin iki yıl içinde berraklığını geri kazandığını söyler. Bu beklenmedik sonuç (-e rağmen) yapısıdır: Although ... dumped chemical waste for decades, the river recovered. B, nehir yatağının kalıcı olarak zehirli olduğunu söyleyerek toparlanmayı mantıken imkansız kılar, yani neden değil. C, 'as long as' bir koşul kurar ve kirlilik sürerken toparlanmanın koşulunu değil engelini anlatır. D, 'as soon as' bir zaman sırası kurar ama silt tekrar kirlilik yaptığında nehrin berraklık kazanması ana cümleyle çelişir. E, 'whereas' zıtlık kurar, ama nehrin içme suyu kaynağı olması kirlilikle gerçek bir karşıtlık oluşturmaz; zıtlık ile beklenmedik sonucu karıştırmak yanlıştır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Because neden bildirir; zehirli çamurun kalıcılığı ana cümledeki toparlanmayla çelişir, dolayısıyla açıklama değil zıt bir sonuç ima eder."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As long as bir koşul kurar; kirlilik sürerken toparlanmanın gerçekleşmesi mantıksal olarak mümkün değildir, koşul bu durumu sağlamaz."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "As soon as ile sıra kurulur; ama sel silti kirliliği yeniden getirirken iki yılda temizlenme sonucu bu sıralamayla uyuşmaz."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Zıtlık iki gerçek durumu karşılaştırır; burada karşıtlık yoktur. Bu, beklenmedik sonuç (concession) ile zıtlığın karıştırılmasıdır."
      }
    ]
  },
  "335": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Az bilinen ve fon almamış bir sözlüğün hızlı tükenmesi beklenmez. Cümle ise hızlı yayımlanıp tükendiğini söyler; bu beklenmedik bir sonuçtur. Bu yüzden beklenmedik sonuç (-e rağmen) anlamını taşıyan even though doğru seçenektir. A: provided that koşul kurar; fiyat artışı tükenmeyi açıklamaz. C: as soon as sıralama kurar; reddedilen baskı ile hızlı satış zaman açısından çelişir. D: whereas zıtlık kurar; ama dikkatli kontrol ile satış arasında gerçek bir karşıtlık yoktur. E: because neden kurar; ama az kitapçı ve eleştirmen, tükenmenin tersini beklettiği için mantık ters işler."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition for the outcome, but a higher price does not explain selling out; the logic fails."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Rejection of the first print run before a fast sellout creates an impossible time order with the quick publication."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists; both clauses are positive, so whereas builds contrast where none is present."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Those conditions predict poor sales, so they support the opposite of selling out within a week."
      }
    ]
  },
  "336": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Derslerin yarısından azına gelen öğrencilerin sınavdan yüksek not alması beklenmez. D, although ile bu eksik katılıma rağmen gelen başarıyı kurar. A, whereas ile haftalarca çalışmayı karşıtlık diye sunar; oysa bu, başarıyı açıklar. B, because ile okumaları kaçırmayı yüksek notun nedeni yapar. C, if ile bütün tekrarları atlamayı koşul yapar. E, as soon as ile ikinci kez kalmayı başarıya bağlar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists: weeks of preparation simply explains excellent results, so the relation is contrast, not concession."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "The reason supports the opposite result; missing readings would cause poor results, so the sentence is illogical."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Condition cannot restrict an outcome that already happened; skipping reviews does not limit excellent results."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "The time order is impossible: failing a midterm cannot be the immediate trigger for excellent final results."
      }
    ]
  },
  "337": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doktor kaybı normalde acil müdahale sürelerinin kötüleşmesini beklettirir. Ana cümle ise sürelerin düzenli biçimde iyileştiğini söyler; bu beklenmedik bir sonuçtur. Even though, olumsuz durumu ana cümlenin beklenmedik sonucuyla bağlayan beklenmedik sonuç (-e rağmen) ilişkisi kurar. A) Because, eksik personeli iyileşmenin nedeni gibi gösterir; bu mantığa ters düşer. C) Provided that, bir kısıtlama koşulu kurar; iyileşme bir koşula bağlı değildir. D) As soon as, bir zaman sırası kurar; ancak cümle bir karşıtlık değil, zamanlama anlatır. E) Whereas zıtlık kurar; ancak hazırlık iyileşmeyi zaten beklettiği için gerçek bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because neden bildirir; eksik personel iyileşmeyi açıklayamaz, mantıksal olarak ters düşer."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Provided that koşul kurar; iyileşme bir kısıtlamaya bağlı değildir, cümle anlamsızlaşır."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "As soon as zaman sırası kurar; cümle bir zıtlık ya da beklenmedik sonuç değil, zamanlama bildirir."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Hazırlık iyileşmeyi zaten beklettiği için iki durum arasında gerçek bir karşıtlık yoktur; bu bir zıtlıktır, beklenmedik sonuç değil."
      }
    ]
  },
  "338": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Dört saatten az uyuyan birinin meditasyondan sonra daha sakin ve odaklı hissetmesi beklenmez. C, even though ile bu uykusuzluğa rağmen gelen sonucu kurar. A, unless ile gürültüyü koşul yapar. B, as soon as ile baş ağrısını sakinliğe bağlar. D, whereas ile evde nefes çalışmasını karşıtlık diye sunar; oysa bu, sakinliği destekler. E, because ile seansın zor olacağının söylenmesini sakinliğin nedeni yapar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "'Unless' creates a condition, and a condition cannot restrict an outcome that has already been reported as true."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "'As soon as' requires the headaches to occur before the calm feeling, but they happened during the session, so the order is impossible."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Practicing at home adds no real opposition to the results, so this is a contrast (zıtlık) rather than a concession (beklenmedik sonuç)."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Being warned about a long, demanding session would not cause calmness, so the reason supports the opposite of the outcome."
      }
    ]
  },
  "339": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde altyapısız, işgücü ve ulaşımı yetersiz bir bölgenin hızla zenginleşmesini beklemezsin. D'de 'Although' ile bu olumsuz koşullar sıralanır; ana cümle, bunlara rağmen gerçekleşen beklenmedik sonuçtur (-e rağmen), bu yüzden doğrudur. A zaman sırası kurar, ama maden tükendikten sonra gelişme mantıksal olarak olanaksızdır. B zıtlık kurar, fakat olumlu özellikler ile gelişme arasında gerçek bir karşıtlık yoktur. C neden-sonuç kurar; tükenen rezerv gelişmeye yol açamaz. E koşul kurar; atıl fabrika ve ayrılan mühendisler gelişmeyi kısıtlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Exhaustion and emigration would hinder growth, so the timing relation makes the main clause illogical."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "The listed advantages explain growth, so no real opposition exists; this is not concession."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Exhausted ore reserves cannot cause prosperity; the reason supports the opposite outcome."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Idle smelters and departing engineers cannot restrict growth; the condition does not fit the outcome."
      }
    ]
  },
  "340": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde merkez bankasının faiz indirimi kredi verilmesini artırır; burada ise kredi sayısı rekor düşüğe iner. Bu beklenmedik sonuçtur, bu yüzden 'even though' ile beklenmedik sonuç (-e rağmen) kuran E doğrudur. A) 'whereas' zıtlık kurar ama gerçek bir karşıtlık yoktur; sıkılaştırma krediyi azaltır, yani uyumludur. B) 'because' neden bildirir; yüksek talep düşüşü açıklamaz, çelişir. C) 'provided that' koşul kurar; teminat düşüşü kısıtlamaz, cümle anlamsız kalır. D) 'as soon as' sıralama kurar; düşüş resesyon sırasında olduğu için toparlanmadan sonra gelemez."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists; tightening standards also reduces lending, so the sentence is consistent, not contrasting."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Higher demand would increase loans, so it contradicts the record drop and cannot explain it."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Having collateral cannot restrict a fall in loans; the condition makes the completed sentence illogical."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "The fall happened during the recession, so it cannot follow the recovery; the time order is impossible."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "341": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "İki bin yıl boyunca sel altında kalmış bir katmandan eksiksiz çanak çömlek çıkması beklenmez. E, Although ile bu engele rağmen gelen buluntuyu kurar. A, Because ile yağmayı sağlam buluntunun nedeni yapar. B, As long as ile katmanların karışmasını koşul yapar. C, As soon as ile selin tahribatını buluntuya bağlar. D, Whereas ile kazının yavaş ilerlemesini karşıtlık diye sunar; oysa bu, özeni anlatır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because makes damage the reason for complete recovery, which is illogical; damage would predict poor finds."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "As long as cannot restrict a completed recovery; disturbance does not condition an unusually complete result."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires the ruin to precede the recovery in time, and it contradicts the complete assemblage found."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "The sentence has no real opposition; Whereas is zıtlık, not the unexpected outcome relation needed here."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "342": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Yeniden kurulan üç ilçeye dağılmış üyelerden gönüllülüğün artması beklenmez. A, although ile bu dağılmaya rağmen gelen artışı kurar. B, provided that ile toplantı katılımının düşmesini koşul yapar. C, as soon as ile taşınmayı artışa bağlar. D, whereas ile kapı kapı üyeliği karşıtlık diye sunar; oysa bu, artışı açıklar. E, because ile bütçe kesintisini artışın nedeni yapar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition; fewer attendees cannot restrict or enable a rise in volunteers."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires a time sequence that makes the rise follow the move illogically; the clause is not a fitting temporal link."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Whereas builds a zıtlık with no real opposition; the sentence needs a concession, not a plain contrast."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Cutting outreach and stopping meetings would explain a fall, not a sharp rise, so the cause contradicts the main clause."
      }
    ]
  },
  "343": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap B. Normalde iki yatak arızası veren bir prototipin onaylanmamasını beklersin. Ana cümlede kurul yine de onay verdiği için sonuç beklenmedik; bu da beklenmedik sonuç (-e rağmen) ilişkisidir. A zaman ilişkisi kurar, ama uyarıdan hemen sonra onay mantıksızdır. C zıtlık kurar, fakat övgü ile onay arasında gerçek bir karşıtlık yoktur. D neden bildirir, ancak geri çekilen başvuru onayı açıklamaz. E koşul kurar, fakat iki testin başarısızlığı onayı kısıtlamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Immediate approval after flagged overheating is illogical; it builds a time relation, not concession."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Praise and approval are not opposed; Whereas wrongly builds contrast where no real opposition exists."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "A withdrawn certification application would block approval, so it cannot give the reason for it."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Failing both trials would not restrict approval; Provided that wrongly makes it a condition."
      }
    ]
  },
  "344": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Beklenen sonuç, yeni getirilen yırtıcının salyangoz sayısını azaltmasıdır; oysa sayı sürekli arttı, bu yüzden ana cümle beklenmedik sonuçtur. Doğru cevap although ile beklenmedik sonuç (-e rağmen) ilişkisi kurar. A whereas zıtlık kurar ama iki durum gerçek bir karşıtlık oluşturmaz. B because neden bildirir; su seviyesinin düşmesi azalmayı açıklar, çoğalmayı değil. D as long as koşul kurar; drenaj çoğalmayı kısıtlayamaz. E as soon as sıra ilişkisi kurar; sayımın durması üç yıllık büyümeyle zamansal olarak örtüşemez."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Gerçek bir karşıtlık yok; iki artış aynı yönde ilerler, zıtlık uymaz."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Su düşüşü salyangozları azaltır; bu neden çoğalmayı açıklamaz, tersini destekler."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Drenaj çoğalmayı kısıtlayamaz; koşul ilişkisi burada mantıksal olarak işlemez."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Sayımın durması üç yıllık büyümeyle sıra içinde yer alamaz; zaman sırası imkânsızdır."
      }
    ]
  },
  "345": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap D. Büyük kan kaybı yaşayan bir hastanın gözlem altında tutulmasını beklersin; oysa ana cümlede erken taburcu edilme vardır. Although beklenmedik sonuç (-e rağmen) kurar, bu yüzden D doğrudur. A neden kurar, ama kötü bir durum erken taburcuya neden olamaz. B koşul kurar; ateş bir taburcu koşulu olamaz. C zaman sırası kurar; ateş çıkar çıkmaz taburcu etmek mantığa aykırıdır. E zıtlık kurar, ama iki yan cümle gerçek bir karşıtlık oluşturmaz; ikisi de iyi iyileşmeyi anlatır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because neden kurar; gözlem kararı erken taburculukla zıt yönde olduğu için ana cümleyi desteklemez, mantıksız kalır."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Provided that koşul kurar; yükselen ateş taburcu olmanın şartı olamaz, çünkü ateş yükselmesi taburculuğa engeldir."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as zaman sırası kurar; ateş çıkınca hemen taburcu edilmek, sağlıklı taburculuk cümlesiyle çelişen bir sıra oluşturur."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Whereas zıtlık kurar, ama iki yan cümle de iyi iyileşmeyi anlatır; gerçek bir karşıtlık yoktur, beklenmedik sonuç da oluşmaz."
      }
    ]
  },
  "346": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Uykusuz kalan insanların hafıza testinde daha kötü olmasını beklersin. Ana cümle ise tersini söyler: deney grubu daha doğru hatırladı. Bu beklenmedik sonuç (-e rağmen) ilişkisi 'although' ile kurulur, yani doğru cevap E. A) 'if' koşul kurar; dikkat dağınıklığı ana cümleyi kısıtlamaz, yalnızca bir koşul ekler. B) 'as soon as' zaman sırası kurar, ama klimanın açılışı ile hatırlamanın sıralaması mantıksız kalır. C) 'whereas' zıtlık kurar; ancak dinlenmiş ve motivasyonlu olmak gerçek bir karşıtlık değil, iyi performansı destekleyen bir nedendir. D) 'because' neden kurar; ekstra pratik kontrol grubunu güçlendirir, deney grubunun üstünlüğünü açıklamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "'If' bir koşul kurar ve ana cümleyi kısıtlar; burada beklenmedik bir sonuç değil, hipotetik bir durum anlatılır."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "'As soon as' zaman sırası kurar; klimanın açılması ile hatırlamanın sırası ana cümleyle tutarlı bir mantık oluşturmaz."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Dinlenmiş ve motivasyonlu olmak iyi performansla çelişmez; gerçek bir karşıtlık yoktur, bu yüzden zıtlık değil uyumlu bir açıklamadır."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Ekstra pratik kontrol grubunu daha iyi yapardı; bu neden deney grubunun daha doğru hatırlamasını açıklamaz, tersini destekler."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "347": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap A. Hazinesi yangında boşalmış bir kasabada, normalde meclisin yeni limanı tüzüğünü hemen onaylaması beklenmez. Asıl cümle bu engele rağmen gerçekleşen beklenmedik sonucu verir, bu yüzden Although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisi vardır. B bir sıralama kurar, ama zaman dizisi mantıksızdır. C bir zıtlık kurar, fakat iki cümle gerçek bir karşıtlık oluşturmaz. D bir neden bildirir, ama kınama onayı destekleyemez, aksine tersini düşündürür. E bir koşul bildirir, fakat bölünmüşlük onayı kısıtlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Approval cannot logically follow immediately after the rejections in the way 'as soon as' requires; the time relation is illogical."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "There is no real opposition between the two clauses; this is a zıtlık, not the beklenmedik sonuç the sentence needs."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Public denunciation of the restrictions would make approval less likely, so the reason supports the opposite outcome."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict approval here; divided members do not logically prevent a single-session vote as a condition."
      }
    ]
  },
  "348": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap B. Filo büyüyünce ve stoklar yarıya inince gelirin düşmesi beklenir; ama ana cümle artışı söyler. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir ve even though bunu kurar. A whereas ile zıtlık kurar, ama gerçek bir karşıtlık yoktur. C because ile neden bildirir, fakat ortak avın bölünmesi gelirin düşmesini gerektirir. D provided that ile koşul kurar; limanın kapatılması gelir artışının koşulu olamaz. E as soon as ile zaman sırası kurar; küçük avlar gelir artışından sonra başlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Ek kazanımlar yalnızca ekleme yapar; ana cümleyle gerçek bir karşıtlık ya da beklenmedik sonuç oluşturmaz."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Av paylaşımının incelmesi gelirin düşmesine yol açar; bu, ana cümledeki artışla çelişen bir nedendir."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Limanın kapatılması gelir artışını koşullandıramaz; bu koşul ana cümlenin anlamıyla mantıksal bağ kurmaz."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Küçük avların bildirilmesi gelir artışından sonra başlayamaz; bu zaman sırası ana cümleyle uyuşmaz."
      }
    ]
  },
  "349": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Beklenti, uykusuz kalan insanların kelimeleri zayıf hatırlamasıdır; ana cümle ise olağanüstü doğruluğu anlatır. Bu durum beklenmedik sonuç (-e rağmen) ilişkisini gerektirir ve although bunu kurar. A, provided that ile koşul bildirir; sonuç bir koşulla kısıtlanamaz. C, as soon as ile sıra kurar; önce unutmak, sonra doğru hatırlamayı imkânsız kılar. D, whereas zıtlık kurar ama gerçek bir karşıtlık yoktur; dinlenmiş olmak beklenen sonuçtur. E, because ile neden bildirir; kısa ve dikkatsiz sunum doğruluğu açıklamaz, tersini destekler."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Koşul cümlesi sonucu kısıtlar; ama doğruluk bir koşula bağlı olarak değil, uykusuzluğa rağmen gerçekleşir."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Önce unutmak, sonra doğru hatırlamak mantıksal olarak çelişir; zaman sırası bu bağlamda imkânsızdır."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Dinlenmiş olmak beklenen sonuçtur; ana cümleyle gerçek bir karşıtlık oluşturmaz, bu yüzden beklenmedik sonuç yoktur."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Az süre ve dikkat dağınıklığı doğruluğu açıklamaz; aksine düşük performansı destekler, bu yüzden anlamsızdır."
      }
    ]
  },
  "350": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "İkmal gelmeden üç yıl dayanan bir garnizonun, tahılı bir avuçta kalmışken teslim olması beklenir. C, Although ile bu yokluğa rağmen kaleyi tutmayı kurar. A, As soon as ile surların yıkılmasını direnişe bağlar. B, Whereas ile yolun kesilmesini karşıtlık diye sunar; oysa bu, kuşatmayı anlatır. D, Because ile kuşatmayı direnişin nedeni yapar. E, Provided that ile erzakın teslimini koşul yapar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires the destruction to precede the event, yet the garrison holds for three years; the time relation is impossible."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Whereas only compares two states without real opposition; it describes isolation, not an outcome that defies expectation."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause that supports surrender, which opposes the held fortress; the reason cannot explain the unexpected endurance."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition for the outcome; surrender would make holding out for three years illogical, so the sentence is false."
      }
    ]
  },
  "351": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen şöyle düşünebilirsin: maliyetler artınca ücretlerin de artması beklenir. Ana cümledeki ücret dondurma bu beklentinin tersidir; bu yüzden D doğrudur, çünkü 'even though' beklenmedik sonuç (-e rağmen) ilişkisi kurar. A 'whereas' ile zıtlık kurar, ama ücret dondurma ile düşük giderler hedefi arasında gerçek bir karşıtlık yoktur. B 'because' ile neden kurar; bütçe açığı artınca ücret dondurmak mantıksızdır. C 'provided that' ile koşul kurar; geçmişteki bir ücret dondurma koşula bağlanamaz. E 'as soon as' ile ardıllık kurar; son yıldaki düşüş altı yıllık dondurmayı tetikleyemez."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Frozen fares and low operating expenses are not opposed, so no real contrast exists."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "A growing deficit would push fares up, so freezing them as a result is illogical."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A past fare freeze is a completed fact and cannot be restricted by a condition."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A six-year freeze cannot begin immediately after a drop occurring only in the final year."
      }
    ]
  },
  "352": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde kadmiyum ve kurşun içeren bir tortunun kuşları uzaklaştıracağını beklersin. Ana cümle ise tersini, yoğun bir kuş popülasyonunu bildirir; bu beklenmedik sonuç (-e rağmen) ilişkisi E'deki Although ile kurulur. A'daki Because yanlış neden verir: kapalı kapılar deniz suyunu keser, sonucu açıklayamaz. B'deki If koşulu ana cümleyi kısıtlayamaz. C'deki As soon as zaman sırası kurar, ama duyuru ile iki sezonluk sonuç arasında mantıksal bağ yoktur. D'deki Whereas zıtlık kurar, fakat gerçek bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Closed gates would keep seawater from the flats, so they cannot explain a thriving waders population."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "A hypothetical condition cannot restrict or explain the completed outcome stated in the main clause."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A council announcement cannot cause a population to form within two seasons; the time order is impossible."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists; the engineered channels give a reason for the outcome, not a concession."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "353": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Uzun süre soğukta bekleyip hipoksik hale gelmiş bir organın hemen çalışmasını beklemeyiz. Hızlı idrar üretimi bu beklentinin tersi olduğundan beklenmedik sonuçtur; Although beklenmedik sonuç (-e rağmen) ilişkisi kurar. A: Because, kan akışının yokluğunu neden gösterir; oysa bu durum idrar üretimini engeller. B: As long as, koşul kurar; saklama biçimi sonucu kısıtlayamaz. C: As soon as, zaman sırası kurar; ureter tıkanıklığı üretimden önce keşfedilemez. D: Whereas, zıtlık kurar; ama cümleler arasında gerçek bir karşıtlık yok."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Absence of blood flow would prevent urine production; the reason opposes the main clause rather than supporting it."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "As long as sets a condition; storage method cannot restrict when urine begins, so the sentence is illogical."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A kinked ureter discovered during closure cannot precede reperfusion output within minutes; the time order is impossible."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "The waiting period does not oppose the outcome; no real contrast exists, and the relation is not concessive."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "354": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen şunu beklersin: geçirgen alüvyon zeminde su tutma yapısı onaylanmaz, çünkü su sızar. Ana cümledeki onay ise beklenmedik sonuçtur, bu yüzden beklenmedik sonuç (-e rağmen) ilişkisi kuran Although doğru cevaptır. Because sebep bildirir ve beklentiyi destekler. As long as koşul kurar ama koşul onayı kısıtlayamaz. As soon as zaman sırası kurar ama rapor ile onay arasındaki sıra mantıksızdır. Whereas zıtlık kurar ama onay sonucuna karşıt bir durum sunmaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because makes the rejection expected, so approval would contradict its own reason. It gives a cause, not an unexpected outcome."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "As long as makes approval depend on flood-prone status, which cannot restrict approval logically. The condition relation is illogical here."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "The seepage report would argue against approval, so the sequence makes the decision illogical. The timing does not express a concession."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "The farmers' wells do not oppose the approval outcome, so there is no real concession. It is only a contrast of facts."
      }
    ]
  },
  "355": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde kuraklık ve yiyecek azlığı kertenkeleleri küçültmesi beklenir. Ana cümle ise olağandışı büyük kalmalarını söyler, bu yüzden beklenmedik sonuç vardır. A seçeneği 'although' ile bu karşıtlığı kurar: kuraklık bitki örtüsünü ve böcekleri yok etmiştir, yine de büyüklükleri sürmüştür. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir. B zıtlık kurar ama gerçek bir karşıtlık yoktur. C neden bildirir, ama azalan yiyecek küçülmeyi açıklar. D koşul kurar, rekabet büyüklüğü kısıtlamaz. E zaman bildirir, ama rakibin gelişi büyüklüğü açıklayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Mapping and cataloguing the habitat creates no opposition to large lizards; the contrast is meaningless."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Scarcer food would make lizards smaller, so it supports the opposite of the main clause."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Competition with livestock cannot restrict or explain unusual size; the condition makes no logical sense."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A rival's arrival cannot make lizards stay large; the time relation is illogical and the outcome is unsupported."
      }
    ]
  },
  "356": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap D. Normalde, eskimiş bir tarama planı yüzünden rezervi tükenmiş bir konseyin kanal projesini oybirliğiyle onaylaması beklenmez. Sen bu yüzden ana cümlenin beklenen tepkinin tersini bildirdiğini fark etmelisin. Although, engelin bu beklentiye rağmen beklenmeyen sonucu verdiği beklenmedik sonuç (-e rağmen) ilişkisi kurar. A As soon as zaman sırasını imkânsız kılar. B Whereas gerçek bir karşıtlık kurmaz, sadece rutin bilgi verir. C Because, sebep olarak ana cümlenin tersini destekler. E Unless, onayı kısıtlayan bir koşul kuramaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "A dry fund cannot precede an approval in a way that makes this sequence logical; the relation is time, not concession."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "The meeting routine and railway arrival create no real opposition to the approval; this is contrast without conflict."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Declaring the canal a waste is a reason to reject it, so it supports the opposite of unanimous approval."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A condition about residents learning of aquifer damage cannot restrict or enable the approval as stated; it is a condition, not a concession."
      }
    ]
  },
  "357": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap B'dir. \"Although\" beklenmedik sonuç (-e rağmen) ilişkisi kurar. Nemli çimentonun dökümü geciktireceği beklenir; ancak ana cümle dökümün zamanında yapıldığını söyler, yani sonuç beklentinin tersidir. A \"As soon as\" ile zaman sırası kurar, fakat bu sıralama imkânsızdır. C \"Whereas\" ile zıtlık kurar, ama iki olay arasında gerçek bir karşıtlık yoktur. D \"Because\" ile neden kurar; yağmur tahmini zamanında dökümü açıklamaz. E \"As long as\" ile koşul kurar; hava tahmini dökümü kısıtlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires a possible time order, but flooding before an on-schedule pour creates an illogical sequence."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Whereas signals contrast, but reassigned cranes do not oppose the on-schedule pour, so no real opposition exists."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause, but these facts would support delay, not the on-schedule completion stated."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "As long as sets a condition, but a forecast cannot restrict whether the pour happened as stated."
      }
    ]
  },
  "358":   {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the plot, which sat on waterlogged alluvium vulnerable to liquefaction, had been surveyed three times before, the council approved the reconstruction of the granary on its original site.",
          "role": "core",
          "start": 0,
          "end": 195
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the council approved the reconstruction of the granary on its original site",
          "kind": "core",
          "start": 119,
          "end": 194
        }
      ],
      "syntax": [
        {
          "text": "the council approved the reconstruction of the granary on its original site",
          "tone": "idea",
          "start": 119,
          "end": 194
        },
        {
          "text": "Although the plot, which sat on waterlogged alluvium vulnerable to liquefaction, had been surveyed three times before",
          "tone": "contrast",
          "start": 0,
          "end": 117
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Sen şunu görmelisin: sıvılaşma riski olan bir zemine yeniden inşaya onay verilmesi beklenmez; ana yargı bu beklentinin tersidir. Although, bu beklenmedik sonuç (-e rağmen) ilişkisini kurar: zemin riski olsa ve üç kez etüt edilmiş olsa bile onay verilir. A sequence kurar, ancak zaman sırası mantıklı bir sonuç vermez. B zıtlık kurar, fakat ortada gerçek bir karşıtlık yoktur. C neden-sonuç kurar, ama riskli zemin onayı değil reddi destekler. D koşul kurar, fakat çatlaklar onayı kısıtlamaz, reddi gerektirir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "As soon as creates time order only; it cannot logically produce approval of a risky site.",
        "whyAttractive": "Engineers flagging risk and a later council decision sound like a natural chronological sequence.",
        "evidence": [
          {
            "text": "As soon as engineers flagged liquefaction risk under the waterlogged granary plot last March",
            "start": 0,
            "end": 92
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Whereas signals contrast, but no real opposition exists between the building's history and the approval.",
        "whyAttractive": "Two contrasting facts about the granary's history and present decision look like opposing ideas.",
        "evidence": [
          {
            "text": "Whereas the granary had been built in the seventeenth century by a wealthy merchant guild based nearby",
            "start": 0,
            "end": 102
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "The stated reason, that the plot is unsafe, supports rejection, the opposite of the approval.",
        "whyAttractive": "Waterlogged alluvium is a clear reason, so Because looks like it explains the decision.",
        "evidence": [
          {
            "text": "Because the plot sat on waterlogged alluvium the council had already condemned as unsafe for any building",
            "start": 0,
            "end": 105
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition, but cracking foundations argue against approval rather than limiting it.",
        "whyAttractive": "Engineers' reports of cracking and sinking can seem like conditions that shape a decision.",
        "evidence": [
          {
            "text": "Provided that the consulting engineers reported the north wall's foundations were already cracking and sinking",
            "start": 0,
            "end": 110
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the plot, which sat on waterlogged alluvium vulnerable to liquefaction, had been surveyed three times before",
            "start": 0,
            "end": 117
          }
        ]
      }
    ]
  },
  "359":   {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The council renewed the regional bus contract with the same operator although the operator had run a fleet of vehicles that an inspector had found dilapidated.",
          "role": "core",
          "start": 0,
          "end": 159
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 69,
          "end": 77
        },
        {
          "text": "The council renewed the regional bus contract with the same operator",
          "kind": "core",
          "start": 0,
          "end": 68
        }
      ],
      "syntax": [
        {
          "text": "The council renewed the regional bus contract with the same operator",
          "tone": "idea",
          "start": 0,
          "end": 68
        },
        {
          "text": "although the operator had run a fleet of vehicles that an inspector had found dilapidated",
          "tone": "contrast",
          "start": 69,
          "end": 158
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Doğru cevap A. Bakımsız araçlar olan bir işletmecinin sözleşmesinin yenilenmesi beklenmez; bu nedenle asıl cümledeki yenileme beklenmedik sonuçtur ve although bu ilişkiyi beklenmedik sonuç (-e rağmen) olarak kurar. B, whereas ile zıtlık kurar ama iki durum arasında gerçek bir karşıtlık yoktur. C, because ile neden kurar fakat güvenlik nedeniyle kaybedilen sözleşmeler yenilemeyi açıklayamaz. D, unless ile koşul kurar; soruşturma yenilemeyi kısıtlayan bir koşul değildir. E, as soon as ile zaman sıralaması kurar, ancak ceza sonrası hemen yenileme mantıklı bir sonuç ifade etmez."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although the operator had run a fleet of vehicles that an inspector had found dilapidated",
            "start": 69,
            "end": 158
          }
        ]
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Lack of earlier routes does not make renewal unexpected, so no real opposition exists between the two clauses.",
        "whyAttractive": "Whereas signals contrast, and the clause contrasts two different kinds of operator experience, so it looks like a valid opposition.",
        "evidence": [
          {
            "text": "whereas the operator had never before run any scheduled bus routes in the regional network",
            "start": 69,
            "end": 159
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Losing contracts for safety failures would support refusing renewal, so this reason contradicts the outcome rather than explaining it.",
        "whyAttractive": "The clause describes a negative fact about the operator, so learners may treat it as a reason for the renewal.",
        "evidence": [
          {
            "text": "because the company had recently lost two contracts for failing to meet basic safety standards",
            "start": 69,
            "end": 163
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Unless sets a condition; an investigation cannot logically restrict a renewal, so the condition makes no sense here.",
        "whyAttractive": "The mention of investigation sounds like a condition that could govern whether a contract is renewed.",
        "evidence": [
          {
            "text": "unless the operator was already under investigation for missed timetables by the regional transport authority",
            "start": 69,
            "end": 178
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "As soon as implies immediate timing; a fine does not logically lead to renewal, so the sequence is illogical.",
        "whyAttractive": "Being fined followed by renewal sounds like a chain of events, so as soon as may appear to fit a sequence.",
        "evidence": [
          {
            "text": "as soon as the operator had been fined for repeatedly missing scheduled routes across the city",
            "start": 69,
            "end": 163
          }
        ],
        "confidence": 0.6
      }
    ]
  }
,
  "360":   {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The team published a confident phonological analysis of the dialect although the transcripts, which were lacunary, had been prepared by a single fieldworker.",
          "role": "core",
          "start": 0,
          "end": 157
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 68,
          "end": 76
        },
        {
          "text": "The team published a confident phonological analysis of the dialect",
          "kind": "core",
          "start": 0,
          "end": 67
        }
      ],
      "syntax": [
        {
          "text": "The team published a confident phonological analysis of the dialect",
          "tone": "idea",
          "start": 0,
          "end": 67
        },
        {
          "text": "although the transcripts, which were lacunary, had been prepared by a single fieldworker",
          "tone": "contrast",
          "start": 68,
          "end": 156
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde eksik ve güvenilmez verilere dayanan bir analizin temkinli olmasını beklersin. Cümlede ise ana yargı tam tersine kendinden emin bir analizdir; bu, beklenmedik sonuçtur. Bu yüzden although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisi doğrudur. Şık A koşul kurar; kayıtlara erişimin yokluğu analizi koşullandıramaz. Şık B ardışıklık kurar; boşlukların keşfinden sonra kendinden emin bir analizin yayımlanması zaman sırası açısından tutarsızdır. Şık D zıtlık kurar; ancak lehçenin yüzyıllardır konuşulması analizle gerçek bir karşıtlık oluşturmaz. Şık E neden-sonuç kurar; eksik kayıtlar kendinden emin analizi açıklamaz, tersine güvensizlik doğurur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "If koşulu, analizin yapılıp yapılamayacağını kurar; burada analiz zaten yayımlanmıştır.",
        "whyAttractive": "Kayıtlara erişim sorunu analizin yapılabilirliğini etkileyebileceği için koşul gibi görünebilir.",
        "evidence": [
          {
            "text": "if the team lacked any access to recordings made by native speakers themselves",
            "start": 68,
            "end": 146
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Eksikleri keşfeden ekip kendinden emin analiz yayımlamazdı; zaman sırası ve mantık tutarsızdır.",
        "whyAttractive": "Boşlukların bulunmasından sonra bir analizin yapıldığı düşünülerek ardışıklık cazip gelebilir.",
        "evidence": [
          {
            "text": "as soon as the fieldwork notes revealed serious gaps in the vowel data",
            "start": 68,
            "end": 138
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although the transcripts, which were lacunary, had been prepared by a single fieldworker",
            "start": 68,
            "end": 156
          }
        ]
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Lehçenin yüzyıllardır konuşulması analizle gerçek bir zıtlık oluşturmaz; ilişki konuyla ilgisizdir.",
        "whyAttractive": "Eksik veri ile analiz arasında bir karşıtlık kurmak sezgisel olarak cazip gelebilir.",
        "evidence": [
          {
            "text": "whereas the dialect has been spoken in this valley for several centuries now",
            "start": 68,
            "end": 144
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Eksik kayıtlar güveni azaltır; kendinden emin analizin nedeni olamaz, ters yönde bir neden kurar.",
        "whyAttractive": "Kayıtların eksik olması analizin nedeni gibi algılanabilir ve neden-sonuç cazip gelebilir.",
        "evidence": [
          {
            "text": "because the recordings were riddled with gaps and no native speaker had reviewed them",
            "start": 68,
            "end": 153
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "361":   {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the contractor's log listed an impeller that was riddled with cavitation damage, the pumping station was returned to full service by the same afternoon.",
          "role": "core",
          "start": 0,
          "end": 161
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the pumping station was returned to full service by the same afternoon",
          "kind": "core",
          "start": 90,
          "end": 160
        }
      ],
      "syntax": [
        {
          "text": "the pumping station was returned to full service by the same afternoon",
          "tone": "idea",
          "start": 90,
          "end": 160
        },
        {
          "text": "Although the contractor's log listed an impeller that was riddled with cavitation damage",
          "tone": "contrast",
          "start": 0,
          "end": 88
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde ağır hasarlı bir pompa istasyonu uzun süre devre dışı kalır. Ana cümle ise aynı öğleden sonra tam hizmete dönüldüğünü söyler; bu beklenmedik bir sonuçtur. Although, hasarlı impeller ile bu sonucu bağlayarak beklenmedik sonuç (-e rağmen) ilişkisi kurar. A) As soon as sıralama kurar, fakat yeni arıza geri dönüşü tetikleyemez, mantıksızdır. B) Whereas zıtlık kurar, ama rutin bakım ile tam dönüş arasında karşıtlık yoktur. D) Because neden kurar, fakat ekibin dağıtılması geri dönüşü engellerdi, yani tersini destekler. E) Provided that koşul kurar, ama koşul geçmiş bir gerçeği kısıtlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "A fresh failure cannot trigger a return to service, so the timing relation makes the sentence illogical.",
        "whyAttractive": "Repair and return to service do follow each other in time, so a sequence link looks natural.",
        "evidence": [
          {
            "text": "As soon as the contractor's log recorded a fresh pump failure that morning",
            "start": 0,
            "end": 74
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Both clauses describe pump work without real opposition, so the contrast does not clash with the main outcome.",
        "whyAttractive": "Whereas signals a contrast, and maintenance versus repair looks like a pair of differing items.",
        "evidence": [
          {
            "text": "Whereas the contractor's log listed a pump scheduled for routine seasonal maintenance only",
            "start": 0,
            "end": 90
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the contractor's log listed an impeller that was riddled with cavitation damage",
            "start": 0,
            "end": 88
          }
        ]
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "The reason would explain non-repair, which opposes the main clause, so the cause link is false.",
        "whyAttractive": "Crew reassignment sounds like a reason the station stayed down, so Because feels like a causal fit.",
        "evidence": [
          {
            "text": "Because the repair crew had been entirely reassigned to another district that morning",
            "start": 0,
            "end": 85
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A condition restricts future or hypothetical events, but the restoration is a past fact it cannot limit.",
        "whyAttractive": "A spare part waiting on a dock sounds like a condition for restoring service, so Provided that looks plausible.",
        "evidence": [
          {
            "text": "Provided that the spare impeller was still waiting on a freight dock in Rotterdam",
            "start": 0,
            "end": 81
          }
        ],
        "confidence": 0.6
      }
    ]
  }
,
  "362": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The district reported that its reading program had raised average test scores at every grade level although the sessions were run by tutors who had never been trained in the approved phonics method.",
          "role": "core",
          "start": 0,
          "end": 198
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 99,
          "end": 107
        },
        {
          "text": "The district reported that its reading program had raised average test scores at every grade level",
          "kind": "core",
          "start": 0,
          "end": 98
        }
      ],
      "syntax": [
        {
          "text": "The district reported that its reading program had raised average test scores at every grade level",
          "tone": "idea",
          "start": 0,
          "end": 98
        },
        {
          "text": "although the sessions were run by tutors who had never been trained in the approved phonics method",
          "tone": "contrast",
          "start": 99,
          "end": 197
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Eğitimsiz tutorların yürüttüğü bir programın iyi sonuç vermesini normalde beklemezsin. Oysa tüm düzeylerde puanların yükseldiği ana cümlede anlatılır; bu beklenmedik sonuçtur. although beklenmedik sonuç (-e rağmen) ilişkisini kurar, bu yüzden doğrudur. A whereas ile iki ilgisiz bilgiyi karşılaştırır; gerçek bir zıtlık yoktur. B because nedeni verir ama neden sonucu destekleyemez. C unless bir koşul kurar; bu koşul puan artışını sınırlayamaz. E as soon as zaman sırası kurar; kovulmanın puan artışından hemen önce olması mantıksızdır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Materyallerin dil seçenekleri ile puan artışı arasında gerçek bir karşıtlık yoktur; cümle anlamsızlaşır.",
        "whyAttractive": "Iki farklı bilgiyi yan yana koyması, zıtlık okumasına kapı açar.",
        "evidence": [
          {
            "text": "whereas the program's printed materials were available in both English and Spanish for every family at home",
            "start": 99,
            "end": 206
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Az katılım ve sınıf zamanının olmaması, puanların yükselmesini açıklamaz; nedeni sonucun tersine işaret eder.",
        "whyAttractive": "Az oturuma katılım ve tutorlara ayrılan sınıf süresi neden-sonuç kalıbı gibi görünür.",
        "evidence": [
          {
            "text": "because most students attended fewer than three sessions and the tutors had no classroom time at all",
            "start": 99,
            "end": 199
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Unless bir koşul kurar; alıştırmaların atlanması puan artışını sınırlayamaz, bu yüzden mantık tutmaz.",
        "whyAttractive": "Okuma alıştırmalarının atlanması, programın etkisiyle ilgili bir koşul gibi düşünülebilir.",
        "evidence": [
          {
            "text": "unless the teachers had skipped most of the daily reading drills that the program required each week",
            "start": 99,
            "end": 199
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although the sessions were run by tutors who had never been trained in the approved phonics method",
            "start": 99,
            "end": 197
          }
        ]
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Koçların puan artışından hemen önce kovulması, yüksek puanların sebebi olamayacağı için zaman sırası imkânsızdır.",
        "whyAttractive": "Zaman bağlacı ve koçların kovulması, olayların sıralı anlatımı gibi okunabilir.",
        "evidence": [
          {
            "text": "as soon as the district had dismissed its reading coaches for poor performance and cut their budgets",
            "start": 99,
            "end": 199
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "363": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the team dated the samples with a system that an earlier laboratory had calibrated incorrectly, the samples yielded a reliable sequence of dates.",
          "role": "core",
          "start": 0,
          "end": 154
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the samples yielded a reliable sequence of dates",
          "kind": "core",
          "start": 105,
          "end": 153
        }
      ],
      "syntax": [
        {
          "text": "the samples yielded a reliable sequence of dates",
          "tone": "idea",
          "start": 105,
          "end": 153
        },
        {
          "text": "Although the team dated the samples with a system that an earlier laboratory had calibrated incorrectly",
          "tone": "contrast",
          "start": 0,
          "end": 103
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde yanlış kalibre edilmiş bir sistem güvenilmez tarihler verir, dolayısıyla beklenen sonuç güvenilmezliktir. Ana cümledeki güvenilir tarih dizisi bu beklentinin tersidir, yani beklenmedik sonuçtur; bu, \"Although\" ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir. A neden-sonuç kurar ve sebebin tersi sonucu doğurur. C koşul kurar ama kötü saklama güvenilirliği kısıtlayamaz. D zaman sırası kurar, fakat makine arızalandıktan sonra güvenilir sonuç imkânsızdır. E zıtlık kurar ama iki yargı arasında gerçek bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because neden-sonuç kurar; bulaşma güvenilirliği azaltacağından güvenilir tarihler mantıksal olarak sonuçlanamaz.",
        "whyAttractive": "Modern karbon bulaşması tarihleri bozar, bu yüzden güvenilirlik sorununa dikkat çekerek sebep gibi görünür.",
        "evidence": [
          {
            "text": "Because the samples had absorbed modern carbon from open air storage over several decades before testing",
            "start": 0,
            "end": 104
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the team dated the samples with a system that an earlier laboratory had calibrated incorrectly",
            "start": 0,
            "end": 103
          }
        ]
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Koşul, sonucu sınırlamalıdır; ama kötü koşul güvenilir tarihlere bağlanırsa cümle mantıksız olur.",
        "whyAttractive": "Nemli toprak ve uzun bekleme gibi olumsuz ayrıntılar, If ile bir koşul kurulduğu izlenimini verebilir.",
        "evidence": [
          {
            "text": "If the samples sat in damp soil for decades before the field crew finally collected them",
            "start": 0,
            "end": 88
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Makine arızalanmışsa sonrasında güvenilir tarih dizisi elde edilemez; zaman sırası mantıksal olarak imkânsızdır.",
        "whyAttractive": "As soon as zaman bağlacı olduğundan ve makine arızası dikkat çektiğinden, olay sırası gibi algılanabilir.",
        "evidence": [
          {
            "text": "As soon as the dating machine failed during its third calibration run in the lab",
            "start": 0,
            "end": 80
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Yayımlanan kalibrasyon yöntemleri ile tarih dizisi arasında karşıtlık yoktur; iki ayrı olgu, zıtlık kurmadan yan yana durur.",
        "whyAttractive": "Whereas iki yargıyı karşılaştırdığı için, güvenilir tarihler ile yayımlanan yöntemler arasında zıtlık varmış gibi görünebilir.",
        "evidence": [
          {
            "text": "Whereas the laboratory later published its full calibration methods for other researchers to review in detail",
            "start": 0,
            "end": 109
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "364": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The dialect survey was built on transcriptions that its editors checked against the original recordings, and the final lexicon was published without any revisions although several entries were drawn from a speaker who was aphasic.",
          "role": "core",
          "start": 0,
          "end": 230
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 163,
          "end": 171
        },
        {
          "text": "The dialect survey was built on transcriptions that its editors checked against the original recordings, and the final lexicon was published without any revisions",
          "kind": "core",
          "start": 0,
          "end": 162
        }
      ],
      "syntax": [
        {
          "text": "The dialect survey was built on transcriptions that its editors checked against the original recordings, and the final lexicon was published without any revisions",
          "tone": "idea",
          "start": 0,
          "end": 162
        },
        {
          "text": "although several entries were drawn from a speaker who was aphasic",
          "tone": "contrast",
          "start": 163,
          "end": 229
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde doğrulanmış metinler revizyon gerektirir. Ana cümle ise revizyonsuz yayımı anlatır; bu beklenmedik sonuçtur. C, konuşurun afazik olmasını güvenilirlik kaygısı olarak verir ve 'although' ile bu kaygının aşıldığını gösterir. A koşul kurar, ama koşul ana cümleyi kısıtlayamaz. B zaman sırası kurar; revizyonsuz yayımdan sonra işaretleme olamaz. D zıtlık kurar, ama karşıt bir anlam yoktur. E neden-sonuç kurar; hata bulunsaydı revizyon gerekirdi, cümle çelişir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "The condition cannot restrict the main clause; 'if' builds a condition, not an unexpected outcome.",
        "whyAttractive": "Checking and flagging entries sounds like a reasonable precondition for a reliable, unrevised publication.",
        "evidence": [
          {
            "text": "if several transcribers had flagged the same entries as doubtful beforehand",
            "start": 163,
            "end": 238
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Publication without revisions rules out later flagging as the trigger; the time order is impossible.",
        "whyAttractive": "Flagging entries as unreliable seems to relate to the lack of revisions, so the time link looks natural.",
        "evidence": [
          {
            "text": "as soon as the external reviewers flagged several entries as unreliable",
            "start": 163,
            "end": 234
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although several entries were drawn from a speaker who was aphasic",
            "start": 163,
            "end": 229
          }
        ]
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists between checking transcripts and headword order; it is a contrast without meaning.",
        "whyAttractive": "'Whereas' signals a contrast, and the two clauses both describe the lexicon, so it looks like a fitting opposition.",
        "evidence": [
          {
            "text": "whereas the lexicon's headword list was compiled in alphabetical order by region",
            "start": 163,
            "end": 243
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Found errors would require revisions, which contradicts the main clause; the reason supports the opposite outcome.",
        "whyAttractive": "Finding errors is a plausible reason for a lexicon, so the causal link looks like a logical explanation.",
        "evidence": [
          {
            "text": "because the editors found errors in nearly every transcript they checked",
            "start": 163,
            "end": 235
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "365": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the spectrograph drew its light through a fiber that had been coated with a hygroscopic film before the run, the team recorded a usable spectrum of the faint companion star throughout the night.",
          "role": "core",
          "start": 0,
          "end": 203
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the team recorded a usable spectrum of the faint companion star throughout the night",
          "kind": "core",
          "start": 118,
          "end": 202
        }
      ],
      "syntax": [
        {
          "text": "the team recorded a usable spectrum of the faint companion star throughout the night",
          "tone": "idea",
          "start": 118,
          "end": 202
        },
        {
          "text": "Although the spectrograph drew its light through a fiber that had been coated with a hygroscopic film before the run",
          "tone": "contrast",
          "start": 0,
          "end": 116
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde kaplanmış bir fiberle sönük bir yıldızın kullanılabilir spektrumunu almak beklenmez. Ana cümle ise gece boyunca kaydın alındığını söyler; bu beklenmedik bir sonuçtur. Although bu karşıtlığı beklenmedik sonuç (-e rağmen) ilişkisiyle kurar, dolayısıyla D doğrudur. A zaman sırasını kurar, ama dedektör kapalıyken kayıt başlayamaz. B zıtlık kurar, fakat kataloglanmış yıldız ile kayıt arasında gerçek bir karşıtlık yoktur. C neden bildirir, oysa bulut kaydı engeller. E koşul bildirir, ama kapalı kubbe kaydı imkânsız kılar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "The detector was offline before the window opened, so a recording could not follow the fault.",
        "whyAttractive": "Its time clause sounds like a sequence, and a fault might seem to explain a missing record.",
        "evidence": [
          {
            "text": "As soon as a sudden fault in the cooling system forced the detector offline before the observing window opened",
            "start": 0,
            "end": 110
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Being catalogued does not oppose recording the star; the relation is contrast, not concession.",
        "whyAttractive": "The contrast-style Whereas and the well-known orbit tempt learners toward a contrast reading.",
        "evidence": [
          {
            "text": "Whereas the companion star has been catalogued in several earlier surveys of the binary system and its orbit is well known",
            "start": 0,
            "end": 122
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause that supports failure, the opposite of the recorded spectrum.",
        "whyAttractive": "Cloud cover and a star below threshold clearly relate to the recording outcome.",
        "evidence": [
          {
            "text": "Because thick cloud cover blanketed the observatory for most of the night and the faint star stayed below the detector threshold",
            "start": 0,
            "end": 128
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the spectrograph drew its light through a fiber that had been coated with a hygroscopic film before the run",
            "start": 0,
            "end": 116
          }
        ]
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict a completed outcome; the sentence describes an impossible recording.",
        "whyAttractive": "Cirrus and a closed dome sound like real obstacles, so If may seem to fit.",
        "evidence": [
          {
            "text": "If the sky remained thick with cirrus from dusk until well after midnight, and the dome stayed closed for the whole evening",
            "start": 0,
            "end": 123
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "366": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the charcoal came from a deposit that had been extensively bioturbated before excavation, the excavation team confidently assigned the hearth to the early Bronze Age.",
          "role": "core",
          "start": 0,
          "end": 175
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the excavation team confidently assigned the hearth to the early Bronze Age",
          "kind": "core",
          "start": 99,
          "end": 174
        }
      ],
      "syntax": [
        {
          "text": "the excavation team confidently assigned the hearth to the early Bronze Age",
          "tone": "idea",
          "start": 99,
          "end": 174
        },
        {
          "text": "Although the charcoal came from a deposit that had been extensively bioturbated before excavation",
          "tone": "contrast",
          "start": 0,
          "end": 97
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "A doğru. Bioturbasyona uğramış bir tabakadaki kömürün tarihlendirmesi güvenilmez olduğundan, normalde kesin bir atama beklenmezdi. Although bu engeli kabul eder, ana cümle yine de kesin bir atama yapıldığını söyler; bu yüzden beklenmedik sonuç (-e rağmen) ilişkisi vardır. B: Because kirlenme kesinliğe neden olamaz; kirlenme şüphe doğurur. C: If sonraki çukurlar kesin hükmü koşullayamaz. D: As soon as güvensiz sonuçların ardından hemen kesin atama zaman sırası açısından mantıksızdır. E: Whereas zıtlık kurar, ama geçmiş araştırmalarla tarihlendirme güveni arasında gerçek bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the charcoal came from a deposit that had been extensively bioturbated before excavation",
            "start": 0,
            "end": 97
          }
        ]
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Contamination causes doubt, not confidence, so the causal link contradicts the main clause.",
        "whyAttractive": "It gives a tidy cause for a confident claim, so learners may accept the link quickly.",
        "evidence": [
          {
            "text": "Because the radiocarbon sample had been contaminated by modern rootlets that the team overlooked",
            "start": 0,
            "end": 96
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict the team's confident assignment; the pits do not govern the conclusion.",
        "whyAttractive": "Pits cutting a hearth suggest a chronology, so learners may read a conditional restriction.",
        "evidence": [
          {
            "text": "If later Iron Age pits cut through the hearth at some point before excavation",
            "start": 0,
            "end": 77
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Unreliable dates reported first would not lead to a confident assignment right after; the sequence is illogical.",
        "whyAttractive": "Reports and dates mention timing, so learners may read a time-order relation.",
        "evidence": [
          {
            "text": "As soon as the lab reported that the dates from the hearth were unreliable",
            "start": 0,
            "end": 74
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists; Whereas marks zıtlık, not beklenmedik sonuç, so it fails the concession target.",
        "whyAttractive": "Earlier surveys and the dating claim look like contrasting facts, tempting a zıtlık reading.",
        "evidence": [
          {
            "text": "Whereas the site had been surveyed in several earlier seasons by other teams",
            "start": 0,
            "end": 76
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "367": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the only charcoal sample had been collected from a layer that had clearly been disturbed by a later flood, the team published a confident date for the settlement's abandonment in its preliminary report.",
          "role": "core",
          "start": 0,
          "end": 211
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the team published a confident date for the settlement's abandonment in its preliminary report",
          "kind": "core",
          "start": 116,
          "end": 210
        }
      ],
      "syntax": [
        {
          "text": "the team published a confident date for the settlement's abandonment in its preliminary report",
          "tone": "idea",
          "start": 116,
          "end": 210
        },
        {
          "text": "Although the only charcoal sample had been collected from a layer that had clearly been disturbed by a later flood",
          "tone": "contrast",
          "start": 0,
          "end": 114
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde güvenilir tarih için sağlam kanıt beklenir; karışmış bir tabakadan alınan tek kömür örneği bu kanıtı zayıflatır. Ana yargı, bu zayıf kanıta rağmen kesin bir tarih ilan edilmesi olduğundan, Although beklenmedik sonuç (-e rağmen) ilişkisi kurar. A, kanıt eksikliğini gerekçe gösterip kesin tarihi destekler; mantıksız. C, ana yargı zaten yayımlandığı için koşul onu kısıtlayamaz. D, kazının bütün sezon durmasıyla yayından önce bir ardışıklık kurulamaz. E, Whereas iki durum arasında gerçek bir zıtlık kurmaz; bağlantısız bir ayrıntı verir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Lack of datable material undermines a confident date; the clause supports the opposite of the claim.",
        "whyAttractive": "Because sounds like a clear, logical reason for a confident conclusion.",
        "evidence": [
          {
            "text": "Because the excavation had barely begun and no datable material had yet been recovered from any layer at the site",
            "start": 0,
            "end": 113
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the only charcoal sample had been collected from a layer that had clearly been disturbed by a later flood",
            "start": 0,
            "end": 114
          }
        ]
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition, but the report is already published, so a condition cannot restrict it.",
        "whyAttractive": "The clause mentions stratigraphic notes and a team consulting records, which seems related to dating.",
        "evidence": [
          {
            "text": "Provided that the team consulted the stratigraphic notes marking the upper layers as heavily mixed by later burials during the survey",
            "start": 0,
            "end": 133
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Excavation halted for the whole season, so it could not immediately precede a publication in the time order given.",
        "whyAttractive": "As soon as suggests a quick, immediate link between two events in the sentence.",
        "evidence": [
          {
            "text": "As soon as heavy rain had washed out the trench walls and halted excavation for the entire field season last year",
            "start": 0,
            "end": 113
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Tools and refuse in houses do not oppose a dating claim; the clause adds an unrelated detail, not a contrast.",
        "whyAttractive": "Whereas signals a contrast, which learners may confuse with concession.",
        "evidence": [
          {
            "text": "Whereas the settlement's inhabitants had left an array of tools and household refuse in each excavated house on the western quarter",
            "start": 0,
            "end": 131
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "368": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the inspection report had listed severe corrosion in three of its main cables, the city council kept the old suspension bridge open to heavy trucks through the winter.",
          "role": "core",
          "start": 0,
          "end": 176
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the city council kept the old suspension bridge open to heavy trucks through the winter",
          "kind": "core",
          "start": 88,
          "end": 175
        }
      ],
      "syntax": [
        {
          "text": "the city council kept the old suspension bridge open to heavy trucks through the winter",
          "tone": "idea",
          "start": 88,
          "end": 175
        },
        {
          "text": "Although the inspection report had listed severe corrosion in three of its main cables",
          "tone": "contrast",
          "start": 0,
          "end": 86
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde yaşlı ve korozyonlu bir köprünün ağır araçlara açık tutulmamasını beklersin. Ana cümle ise beklenmedik sonucu verir: meclis köprüyü yine de açık tuttu. D, bu beklenmedik sonuç (-e rağmen) ilişkisini kurar, çünkü ciddi korozyon raporu varken açık bırakma gerçekleşmiştir. A zaman sırası kurar, ama tam kapanma ana cümledeki açık tutmayla çelişir. B zıtlık kurar, ama kablo boyası ile açık tutma arasında gerçek bir karşıtlık yoktur. C neden bildirir, ama güvensizlik açıklaması açık tutmanın tersini gerektirir. E koşul kurar, ama kapanma koşulu ana cümleyi kısıtlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "After zaman sırası kurar, ama tüm araçlara kapanma ana cümledeki ağır araçlara açık tutmayla çelişir.",
        "whyAttractive": "Kapanma ve açık tutma aynı kış dönemine ait olduğu için zaman bağlantısı kurulabilir gibi görünür.",
        "evidence": [
          {
            "text": "After the bridge was closed to all vehicles for emergency repairs in early January",
            "start": 0,
            "end": 82
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Kablo boyası ile açık tutma arasında gerçek bir karşıtlık yoktur; bu bir beklenmedik sonuç değil, zıtlık ilişkisidir.",
        "whyAttractive": "Whereas zıtlık bağlacı olduğu için iki farklı durumu karşılaştırır gibi görünür.",
        "evidence": [
          {
            "text": "Whereas the bridge's steel cables were repainted during the spring of last year",
            "start": 0,
            "end": 79
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Because güvensizliğin sebep olduğunu söyler; bu durumda köprünün kapatılması beklenir, açık tutma mantıksız olur.",
        "whyAttractive": "Güvensizlik ve açık tutma arasındaki gerilim, neden-sonuç ilişkisi sanılabilir.",
        "evidence": [
          {
            "text": "Because engineers had already declared the aging structure unsafe for all vehicles and pedestrians alike",
            "start": 0,
            "end": 104
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the inspection report had listed severe corrosion in three of its main cables",
            "start": 0,
            "end": 86
          }
        ]
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "If koşulu ana cümleyi kısıtlar; ama kapanma ile açık tutma birlikte doğru olamaz, bu yüzden koşul anlamsızdır.",
        "whyAttractive": "Koşul cümlesi ile ana cümle arasında bağlantı kurulabileceği için seçilebilir.",
        "evidence": [
          {
            "text": "If contractors closed the old suspension bridge for repairs in late October that year",
            "start": 0,
            "end": 85
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "369": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The freshwater snail population in the small pond grew quickly over the summer although the pond had been drained twice that year and refilled with cold, nutrient-poor water.",
          "role": "core",
          "start": 0,
          "end": 174
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 79,
          "end": 87
        },
        {
          "text": "The freshwater snail population in the small pond grew quickly over the summer",
          "kind": "core",
          "start": 0,
          "end": 78
        }
      ],
      "syntax": [
        {
          "text": "The freshwater snail population in the small pond grew quickly over the summer",
          "tone": "idea",
          "start": 0,
          "end": 78
        },
        {
          "text": "although the pond had been drained twice that year and refilled with cold, nutrient-poor water",
          "tone": "contrast",
          "start": 79,
          "end": 173
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Cevap E. Soğuk, besin yoksunu suyun yılda iki kez boşaltılıp yeniden doldurulmasının olağan olarak salyangoz sayısını düşürmesini beklersin. Buna rağmen nüfusun hızla artması beklenmedik sonuçtur. although, beklenmedik sonuç (-e rağmen) bağlacıdır; engel cümlesiyle ana cümledeki beklenmedik sonucu bağlar. A) whereas zıtlık kurar, ama cümleler arasında gerçek bir karşıtlık yoktur. B) because nedensellik kurar, fakat kuşun avlaması nüfusu azaltır, artışı açıklamaz. C) unless koşul bildirir; kısıtlama büyümeyi engelleyemez, cümle mantıksızlaşır. D) as soon as ardıllık kurar, fakat yırtıcı balık stoklaması ile hızlı artış zaman ve mantık açısından çelişir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Whereas builds contrast, but the two clauses have no real opposition between survey timing and snail growth.",
        "whyAttractive": "Whereas looks like a contrast, so learners may match it to the unexpected growth.",
        "evidence": [
          {
            "text": "whereas the pond was first surveyed by volunteers in early June before the summer began",
            "start": 79,
            "end": 166
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause, but eating snails would reduce the population, not make it grow quickly.",
        "whyAttractive": "A heron eating snails sounds like a plausible reason for a change in population.",
        "evidence": [
          {
            "text": "because a heron had been wading through the shallows and picking off most snails each day",
            "start": 79,
            "end": 168
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Unless sets a condition, but a restriction cannot make the population grow quickly; the sentence becomes illogical.",
        "whyAttractive": "Unless with predatory fish seems to set a restriction on the snails' growth.",
        "evidence": [
          {
            "text": "unless the owners stocked the pond with predatory fish in the early spring months",
            "start": 79,
            "end": 160
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Predatory perch stocking followed by quick growth creates an impossible or contradictory time order.",
        "whyAttractive": "As soon as suggests a sequence linking stocking with the growth that followed.",
        "evidence": [
          {
            "text": "as soon as the local fishery stocked the pond with predatory perch in early June",
            "start": 79,
            "end": 159
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although the pond had been drained twice that year and refilled with cold, nutrient-poor water",
            "start": 79,
            "end": 173
          }
        ]
      }
    ]
  },
  "370": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the ward had lost two of its four senior physicians that month, the surgical ward discharged more patients than usual during March.",
          "role": "core",
          "start": 0,
          "end": 140
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the surgical ward discharged more patients than usual during March",
          "kind": "core",
          "start": 73,
          "end": 139
        }
      ],
      "syntax": [
        {
          "text": "the surgical ward discharged more patients than usual during March",
          "tone": "idea",
          "start": 73,
          "end": 139
        },
        {
          "text": "Although the ward had lost two of its four senior physicians that month",
          "tone": "contrast",
          "start": 0,
          "end": 71
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde dört kıdemli hekimden ikisini kaybeden bir servisin daha az hasta taburcu etmesi beklenir. Ana cümle ise tersini söyler: Mart ayında daha fazla hasta taburcu edildi. Bu yüzden sen beklenmedik sonuç (-e rağmen) ilişkisini kurmalısın; doğru cevap Although'dur. B: Because neden-sonuç kurar, ancak ameliyathane kapanmaları taburcu sayısını azaltır, cümle ters düşer. C: Unless koşul bildirir; seans azaltmak taburculuğu sınırlamaz, anlam bozulur. D: As soon as ardışık zaman ister; Şubat sonundaki bir arıza Mart'taki taburculuğun hemen ardından gelen sonuç olamaz. E: Whereas zıtlık kurar, ama kafeterya tadilatıyla servisin taburculuğu arasında gerçek bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the ward had lost two of its four senior physicians that month",
            "start": 0,
            "end": 71
          }
        ]
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Because neden-sonuç kurar; kapanmalar daha az taburculuk doğurur, dolayısıyla ana cümlenin tersini destekler.",
        "whyAttractive": "Kapanan ameliyathaneler ilk bakışta taburcu sayısını azaltacağı için sebep-sonuç gibi görünebilir.",
        "evidence": [
          {
            "text": "Because most of its operating theatres had been closed for repairs throughout March",
            "start": 0,
            "end": 83
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Unless koşul kurar; seans azaltmak taburculuğu sınırlamaz, bu yüzden cümle mantıksız kalır.",
        "whyAttractive": "Unless'ı koşul yapısı sanıp eğer değilse anlamıyla karıştırabilirsin.",
        "evidence": [
          {
            "text": "Unless the ward cut its theatre sessions by half during the month of March",
            "start": 0,
            "end": 74
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Şubat sonundaki arıza Mart taburculuğunu hemen izleyen bir sonuç olamaz; zaman sırası ve anlam tutarsızdır.",
        "whyAttractive": "As soon as zaman bağlacı olduğu için bir olayın hemen ardından gelen sonucu sanabilirsin.",
        "evidence": [
          {
            "text": "As soon as the hospital's bed-management software crashed in late February and jammed admissions",
            "start": 0,
            "end": 96
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Kafeterya tadilatı servisin taburculuklarıyla gerçek bir karşıtlık oluşturmaz; ilişki yoktur, sadece zıtlık ima edilir.",
        "whyAttractive": "Whereas iki farklı olguyu karşılaştırdığı için zıtlık gösterdiğini sanabilirsin.",
        "evidence": [
          {
            "text": "Whereas the hospital's cafeteria was fully renovated over the previous summer and reopened",
            "start": 0,
            "end": 90
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "371": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The volunteers in the memory experiment recalled the full list of twenty words even though they had slept less than four hours the night before the test.",
          "role": "core",
          "start": 0,
          "end": 153
        }
      ],
      "skeleton": [
        {
          "text": "even though",
          "kind": "lock",
          "start": 79,
          "end": 90
        },
        {
          "text": "The volunteers in the memory experiment recalled the full list of twenty words",
          "kind": "core",
          "start": 0,
          "end": 78
        }
      ],
      "syntax": [
        {
          "text": "The volunteers in the memory experiment recalled the full list of twenty words",
          "tone": "idea",
          "start": 0,
          "end": 78
        },
        {
          "text": "even though they had slept less than four hours the night before the test",
          "tone": "contrast",
          "start": 79,
          "end": 152
        }
      ],
      "diagnosis": {
        "raw": "even though bağlacı taviz ilişkisini kurar.",
        "skeleton": "even though bağlacı taviz ilişkisini kurar.",
        "syntax": "even though bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Doğru cevap B. Uyku eksikliği zayıf hatırlamayı bekletir; oysa ana cümlede tüm yirmi kelimenin hatırlandığı beklenmedik bir sonuç verilmiş. Bu, even though ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir. A if koşul kurar, ama hayali bir durum gerçek hatırlamayı kısıtlayamaz. C as soon as sıralama kurar, ama pratik turunda yaşananlar test hatırlamasıyla zaman olarak mantıksız bağlanır. D whereas zıtlık kurar, ama liste ile hatırlama arasında gerçek bir karşıtlık yoktur. E because neden kurar, ama tekrar yapılmaması tam hatırlamayı değil başarısızlığı destekler."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Hayali bir koşul kurar; gerçekleşen tam hatırlamayı kısıtlayamaz, ana cümleyle mantıksal bağı yoktur.",
        "whyAttractive": "Sürekli dikkat dağınıklığı normalde hatırlamayı düşürür, bu yüzden akla yatkın görünür.",
        "evidence": [
          {
            "text": "if they had been distracted by loud noise throughout the entire long study session",
            "start": 79,
            "end": 161
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "even though they had slept less than four hours the night before the test",
            "start": 79,
            "end": 152
          }
        ]
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Pratik turundaki unutma ile tam hatırlama arasında zamansal bir sıra kurulamaz; ilişki mantıksızdır.",
        "whyAttractive": "Pratik turunda kelime unutulması gerçek bir olay gibi göründüğü için zaman bağı kurulabilir gibi görünür.",
        "evidence": [
          {
            "text": "as soon as they had forgotten the first five words in the practice round",
            "start": 79,
            "end": 151
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Listenin kolaylığı ile hatırlama arasında gerçek bir karşıtlık yok; beklenmedik sonuç da kurulmuyor.",
        "whyAttractive": "Listenin kolay kelimelerden oluşması ile whereas arasında zıtlık kurulabilir gibi görünür.",
        "evidence": [
          {
            "text": "whereas the list itself contained only common household nouns that were easy to picture",
            "start": 79,
            "end": 166
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Because tam hatırlamayı değil başarısızlığı destekler; cümle mantıksal olarak yanlış kalır.",
        "whyAttractive": "Testin ertelendiği ve listenin tekrar edilmediği bilgisi unutmayı açıklıyor gibi görünür.",
        "evidence": [
          {
            "text": "because they had been told the test was postponed and had not reviewed the list",
            "start": 79,
            "end": 158
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "372": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The regional government's new tram line recorded unusually high ridership in its first year, although fares had been raised twice since the line opened.",
          "role": "core",
          "start": 0,
          "end": 152
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 93,
          "end": 101
        },
        {
          "text": "The regional government's new tram line recorded unusually high ridership in its first year,",
          "kind": "core",
          "start": 0,
          "end": 92
        }
      ],
      "syntax": [
        {
          "text": "The regional government's new tram line recorded unusually high ridership in its first year,",
          "tone": "idea",
          "start": 0,
          "end": 92
        },
        {
          "text": "although fares had been raised twice since the line opened",
          "tone": "contrast",
          "start": 93,
          "end": 151
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde ücret artışları yolcu sayısını düşürür, bu yüzden beklenen sonuç düşük yolcu sayısıdır. Ana cümledeki yüksek yolcu sayısı bu beklentinin tersidir; sen bu karşıtlığı beklenmedik sonuç (-e rağmen) ilişkisi olarak görmelisin. D seçeneğinde although, ücret artışlarına rağmen gerçekleşen sonucu bağlar. A whereas yalnızca zıtlık kurar, ama depo açılışı yolcu sayısıyla karşıtlık oluşturmaz. B because hizmet aksamasını yüksek yolcu sayısına neden gösterir, bu mantığa aykırıdır. C provided that bir koşul bildirir; ücret artışı yolcu sayısını kısıtlayamaz. E as soon as zaman ilişkisi kurar, ama kapalı bir hatta yolcu kaydı yapılamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Depo tamamlanması yolcu sayısıyla zıt bir durum oluşturmaz; cümle karşıtlık yerine anlamsız bir yan yana geliş kurar.",
        "whyAttractive": "Whereas, iki farklı olguyu yan yana koyduğu için karşıtlık bağlacı gibi görünebilir.",
        "evidence": [
          {
            "text": "whereas the tram depot was completed two months after opening",
            "start": 93,
            "end": 154
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Hizmet aksaması yüksek yolcu sayısını açıklayamaz; neden verilen durum sonucun tersini doğurur.",
        "whyAttractive": "Aksama ve geç kalma, akla yatkın bir neden gibi görünebilir.",
        "evidence": [
          {
            "text": "because service was suspended for weeks and trams rarely ran on time",
            "start": 93,
            "end": 161
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Ücret artışı yolcu sayısını koşullayamaz; provided that ile kurulan cümle mantıksal olarak anlamsızlaşır.",
        "whyAttractive": "Ücret koşulu, yolcu sayısı üzerinde etkili bir şart gibi görünebilir.",
        "evidence": [
          {
            "text": "provided that fares rose sharply throughout the first year",
            "start": 93,
            "end": 151
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although fares had been raised twice since the line opened",
            "start": 93,
            "end": 151
          }
        ]
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Hat kapalıyken yolcu kaydı yapılamaz; bu zaman sırası ana cümleyle imkânsız bir çelişki oluşturur.",
        "whyAttractive": "Zaman bağlacı ardışık bir olay anlatıyor gibi görünebilir.",
        "evidence": [
          {
            "text": "as soon as the line had closed for two weeks",
            "start": 93,
            "end": 137
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "373": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Even though the wetland had been designated a protected nature reserve, the regional authority approved a new housing development on the drained wetland.",
          "role": "core",
          "start": 0,
          "end": 153
        }
      ],
      "skeleton": [
        {
          "text": "Even though",
          "kind": "lock",
          "start": 0,
          "end": 11
        },
        {
          "text": "the regional authority approved a new housing development on the drained wetland",
          "kind": "core",
          "start": 72,
          "end": 152
        }
      ],
      "syntax": [
        {
          "text": "the regional authority approved a new housing development on the drained wetland",
          "tone": "idea",
          "start": 72,
          "end": 152
        },
        {
          "text": "Even though the wetland had been designated a protected nature reserve",
          "tone": "contrast",
          "start": 0,
          "end": 70
        }
      ],
      "diagnosis": {
        "raw": "even though bağlacı taviz ilişkisini kurar.",
        "skeleton": "even though bağlacı taviz ilişkisini kurar.",
        "syntax": "even though bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Korunan bir sulak alanda yapılaşma beklenmez, bu yüzden onay beklenmedik sonuçtur. E doğrudur: Even though, koruma statüsüne rağmen onay verildiğini söyleyerek beklenmedik sonuç (-e rağmen) kurar. A, Because ile neden ilişkisi kurar; koruma statüsü onayı gerekçelendirmez, tersine açıklamaya ters düşer. B, Provided that koşul bildirir; koşul onayı kısıtlar, oysa cümle onayı kesin bildirir. C, As soon as zaman sırası kurar; sel sonrası onay ile sulak alanın kurutulması arasındaki sıra imkânsızdır. D, Whereas zıtlık kurar, ama cümleler arasında gerçek bir karşıtlık ve beklenmedik sonuç yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Park vaadi, korunan sulak alanda yapılaşma onayını gerekçelendirmez; mantık ters işler.",
        "whyAttractive": "Park genişletme vaadi bir neden gibi göründüğü için bağlantı kurulabilir.",
        "evidence": [
          {
            "text": "Because the regional council had recently pledged to expand public parkland",
            "start": 0,
            "end": 75
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Geçmiş inceleme koşulu onayı kısıtlayamaz; ana cümle onayın yine de verildiğini bildirir.",
        "whyAttractive": "Provided that koşul gibi görünür ve sıkı inceleme kısıt çağrıştırır.",
        "evidence": [
          {
            "text": "Provided that the wetland had remained under strict environmental review for decades",
            "start": 0,
            "end": 84
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Sel, kurutulmuş alan üzerindeki onaydan önce gelemez; bu zaman sırası imkânsızdır.",
        "whyAttractive": "Sel ve kurutma aynı sulak alanla ilgili olduğu için zaman bağlantısı doğal görünür.",
        "evidence": [
          {
            "text": "As soon as the wetland flooded again after the heavy storms",
            "start": 0,
            "end": 59
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Finansman ile onay arasında gerçek karşıtlık yok; beklenmedik sonuç da oluşmaz.",
        "whyAttractive": "Whereas iki durumu karşılaştırdığı için zıtlık kurar gibi görünür.",
        "evidence": [
          {
            "text": "Whereas the drainage scheme had been funded by the regional treasury",
            "start": 0,
            "end": 68
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Even though the wetland had been designated a protected nature reserve",
            "start": 0,
            "end": 70
          }
        ]
      }
    ]
  },
  "374": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The fieldworkers recorded the local dialect in remarkable detail, although they had been allowed only three weeks in the village.",
          "role": "core",
          "start": 0,
          "end": 129
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 66,
          "end": 74
        },
        {
          "text": "The fieldworkers recorded the local dialect in remarkable detail,",
          "kind": "core",
          "start": 0,
          "end": 65
        }
      ],
      "syntax": [
        {
          "text": "The fieldworkers recorded the local dialect in remarkable detail,",
          "tone": "idea",
          "start": 0,
          "end": 65
        },
        {
          "text": "although they had been allowed only three weeks in the village",
          "tone": "contrast",
          "start": 66,
          "end": 128
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde üç haftalık kısa bir ziyaret ayrıntılı kaydı zor kılar; ana cümle ise tersine ayrıntılı kaydı söyler. Bu yüzden A) although doğrudur: beklenmedik sonuç (-e rağmen) ilişkisi kurar. B) unless bir koşul kurar, oysa ana cümle koşulsuz bir gerçektir. C) as soon as zaman sırası kurar; ekipman bozulduktan sonra ayrıntılı kayıt imkânsızdır. D) whereas zıtlık kurar, ama ortada gerçek bir karşıtlık yoktur. E) because neden kurar; hiç ziyaret etmemiş olmak ayrıntılı kaydı açıklamaz, çelişir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although they had been allowed only three weeks in the village",
            "start": 66,
            "end": 128
          }
        ]
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Unless sets a condition, but the main clause states a fact, not a restricted outcome.",
        "whyAttractive": "Village access may seem like a condition that limits how detailed the recording could be.",
        "evidence": [
          {
            "text": "unless the village elders refused to speak with them at all",
            "start": 66,
            "end": 125
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Equipment breaking down cannot precede detailed recording; the time order is impossible.",
        "whyAttractive": "Equipment and timing words suggest a sequence that could explain the detail.",
        "evidence": [
          {
            "text": "as soon as the recording equipment broke down in the village",
            "start": 66,
            "end": 126
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists; the comparison is irrelevant, so whereas makes the sentence illogical.",
        "whyAttractive": "Whereas signals contrast, and neighbouring villages suggest a comparison.",
        "evidence": [
          {
            "text": "whereas they had also recorded the neighbouring villages' dialects in equal detail",
            "start": 66,
            "end": 148
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Never visiting would explain poor recording, so because gives the opposite of detailed recording.",
        "whyAttractive": "Never visiting villages seems like a cause of recording problems.",
        "evidence": [
          {
            "text": "because they had never before visited any village in the region",
            "start": 66,
            "end": 129
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "375": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The regional central bank kept its benchmark interest rate unchanged for eighteen months even though unemployment in the region had risen for three consecutive quarters.",
          "role": "core",
          "start": 0,
          "end": 169
        }
      ],
      "skeleton": [
        {
          "text": "even though",
          "kind": "lock",
          "start": 89,
          "end": 100
        },
        {
          "text": "The regional central bank kept its benchmark interest rate unchanged for eighteen months",
          "kind": "core",
          "start": 0,
          "end": 88
        }
      ],
      "syntax": [
        {
          "text": "The regional central bank kept its benchmark interest rate unchanged for eighteen months",
          "tone": "idea",
          "start": 0,
          "end": 88
        },
        {
          "text": "even though unemployment in the region had risen for three consecutive quarters",
          "tone": "contrast",
          "start": 89,
          "end": 168
        }
      ],
      "diagnosis": {
        "raw": "even though bağlacı taviz ilişkisini kurar.",
        "skeleton": "even though bağlacı taviz ilişkisini kurar.",
        "syntax": "even though bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde işsizlik artarken faiz indirmek beklenir; faizi sabit tutmak beklenmedik bir sonuçtur. 'Even though' bu beklenmedik sonuç (-e rağmen) ilişkisini kurar; ana cümle, işsizliğe rağmen gerçekleşen sonuçtur. B 'whereas' ile zıtlık kurar, ama yönetici kurulu görev süresiyle faiz kararı arasında karşıtlık yoktur. C 'because' ile neden bildirir; enflasyonun düşüşü faizi sabit tutmanın değil indirmenin gerekçesidir. D koşul kurar, ama geçmiş on sekiz ay gerçeği bir koşula bağlanamaz. E zaman sırası kurar, ama piyasa beklentilerinin yükselişi bu dönemden önce olamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "even though unemployment in the region had risen for three consecutive quarters",
            "start": 89,
            "end": 168
          }
        ]
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Tenure on the policy board has no real opposition to the rate decision; the clauses are unrelated, not contrasting.",
        "whyAttractive": "Whereas signals contrast, and the two clauses feel different in kind, so it can look like a balanced comparison.",
        "evidence": [
          {
            "text": "whereas the bank's governor had already served on its policy board since 2010",
            "start": 89,
            "end": 166
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Inflation falling below target would normally prompt rate cuts, so it cannot explain keeping rates unchanged.",
        "whyAttractive": "Falling inflation seems like a reason for policy choices, so because looks like a natural cause.",
        "evidence": [
          {
            "text": "because inflation had been falling sharply below target for three consecutive quarters",
            "start": 89,
            "end": 175
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "If makes the completed eighteen-month fact hypothetical; a condition cannot restrict what already happened.",
        "whyAttractive": "High inflation above target is a real reason to hold rates, so the conditional sounds sensible.",
        "evidence": [
          {
            "text": "if inflation had been running well above its target for most of that time",
            "start": 89,
            "end": 162
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Rates held for eighteen months cannot begin at the moment expectations rose; the time order is impossible.",
        "whyAttractive": "As soon as links policy timing with market movements, so it seems to describe a reaction.",
        "evidence": [
          {
            "text": "as soon as inflation expectations in the market had started rising sharply",
            "start": 89,
            "end": 163
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "376": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The district's reading intervention produced measurable gains in comprehension across all three cohorts although the cohorts came from schools that had seen heavy attrition.",
          "role": "core",
          "start": 0,
          "end": 173
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 104,
          "end": 112
        },
        {
          "text": "The district's reading intervention produced measurable gains in comprehension across all three cohorts",
          "kind": "core",
          "start": 0,
          "end": 103
        }
      ],
      "syntax": [
        {
          "text": "The district's reading intervention produced measurable gains in comprehension across all three cohorts",
          "tone": "idea",
          "start": 0,
          "end": 103
        },
        {
          "text": "although the cohorts came from schools that had seen heavy attrition",
          "tone": "contrast",
          "start": 104,
          "end": 172
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde yoğun personel kaybı (attrition) yaşayan okullardan gelen gruplarda kazanımların düşük olması beklenir. Ana cümle ise ölçülebilir kazanımları bildirdiği için beklenmedik sonuçtur; bu yüzden doğru bağlaç although, yani beklenmedik sonuç (-e rağmen) bağlacıdır. A: whereas zıtlık kurar, ama test revizyonu kazanımlarla karşıt değildir, cümle anlamsızlaşır. B: because neden kurar, ama iki haftalık uygulama kazanımın nedeni olamaz. C: unless koşul bildirir, fakat okulların uzman kaybı kazanımları ortadan kaldıramaz. E: as soon as zaman sırası kurar, fakat personel kaybı ile kazanım arasında imkânsız bir sıra vardır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Test revision has no real opposition to the gains; the link is not contrastive, so the sentence is illogical.",
        "whyAttractive": "Whereas introduces a two-part contrast, so it looks like a comparison fitting the sentence.",
        "evidence": [
          {
            "text": "whereas the tests used to measure comprehension were revised in 2021",
            "start": 104,
            "end": 172
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "A two-week intervention would not cause gains; the reason supports the opposite conclusion.",
        "whyAttractive": "Gains and an intervention seem connected, so a cause link looks natural.",
        "evidence": [
          {
            "text": "because the cohorts were given the intervention for only two weeks",
            "start": 104,
            "end": 170
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Losing specialists cannot restrict whether gains occur; a condition makes the completed sentence illogical.",
        "whyAttractive": "Unless creates a conditional frame that looks like it fits a discussion of staffing problems.",
        "evidence": [
          {
            "text": "unless the schools had already lost most of their reading specialists",
            "start": 104,
            "end": 173
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although the cohorts came from schools that had seen heavy attrition",
            "start": 104,
            "end": 172
          }
        ]
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Staff loss cannot immediately precede the gains in a meaningful sequence; the time order is impossible.",
        "whyAttractive": "As soon as suggests timing, and staff loss sounds like an event that could be linked to results.",
        "evidence": [
          {
            "text": "as soon as the cohorts' schools had lost most of their teaching staff",
            "start": 104,
            "end": 173
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "377": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the reeds were planted in a basin that had been filled with leachate for years, the restored wetland now supports more breeding pairs of marsh harriers than any other site in the region.",
          "role": "core",
          "start": 0,
          "end": 195
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the restored wetland now supports more breeding pairs of marsh harriers than any other site in the region",
          "kind": "core",
          "start": 89,
          "end": 194
        }
      ],
      "syntax": [
        {
          "text": "the restored wetland now supports more breeding pairs of marsh harriers than any other site in the region",
          "tone": "idea",
          "start": 89,
          "end": 194
        },
        {
          "text": "Although the reeds were planted in a basin that had been filled with leachate for years",
          "tone": "contrast",
          "start": 0,
          "end": 87
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde kirli bir havzanın üreme çiftlerini azaltmasını bekleriz. Ana cümle ise tersini, bölgedeki en fazla bataklık harrier çiftini barındırdığını söyler; bu beklenmedik sonuçtur. Although, beklenmedik sonuç (-e rağmen) ilişkisini kurar ve doğru seçenek budur. B, cause kurar; temizlenmiş, kısa süre su basmış bir alanın bu sonucu açıklaması mantıksızdır. C, condition kurar; koşul geçmiş bir durumu kısıtlayamaz. D, sequence kurar; kirli su baskını bu başarıyı mantıksal olarak doğurmaz. E, zıtlık (whereas) kurar; ziyaretçi merkezi ile kuşlar arasında gerçek bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the reeds were planted in a basin that had been filled with leachate for years",
            "start": 0,
            "end": 87
          }
        ]
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Clearing and brief flooding would not yield the most breeding pairs; the reason contradicts the outcome.",
        "whyAttractive": "Cause connector suggests a reason-outcome link, so learners may connect clearing and flooding with harriers.",
        "evidence": [
          {
            "text": "Because the reed beds were cleared of all vegetation and flooded only briefly during last spring",
            "start": 0,
            "end": 96
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict a completed present outcome; the clause describes future management, not what happened.",
        "whyAttractive": "The conditional with cutting and draining resembles a management recipe for good habitat.",
        "evidence": [
          {
            "text": "If the reed beds are cut back every March and the shallow water is drained before nesting begins",
            "start": 0,
            "end": 96
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Contaminated flooding does not logically produce the best harrier breeding; the time link lacks a sound cause.",
        "whyAttractive": "Sequence with a past flood looks chronologically tidy beside a present-tense outcome.",
        "evidence": [
          {
            "text": "After the reed beds were repeatedly flooded with contaminated runoff from the neighbouring farms last spring",
            "start": 0,
            "end": 108
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists between a visitor centre and breeding birds; whereas signals zıtlık, not concession.",
        "whyAttractive": "Whereas suggests a contrast between two places, so learners may accept any pairing as opposition.",
        "evidence": [
          {
            "text": "Whereas the visitor centre at the reserve opened its doors to school groups for the first time",
            "start": 0,
            "end": 94
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "378": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The assessors recorded a pass for every candidate on the timed reading paper even though it was taken by students who had dyslexia.",
          "role": "core",
          "start": 0,
          "end": 131
        }
      ],
      "skeleton": [
        {
          "text": "even though",
          "kind": "lock",
          "start": 77,
          "end": 88
        },
        {
          "text": "The assessors recorded a pass for every candidate on the timed reading paper",
          "kind": "core",
          "start": 0,
          "end": 76
        }
      ],
      "syntax": [
        {
          "text": "The assessors recorded a pass for every candidate on the timed reading paper",
          "tone": "idea",
          "start": 0,
          "end": 76
        },
        {
          "text": "even though it was taken by students who had dyslexia",
          "tone": "contrast",
          "start": 77,
          "end": 130
        }
      ],
      "diagnosis": {
        "raw": "even though bağlacı taviz ilişkisini kurar.",
        "skeleton": "even though bağlacı taviz ilişkisini kurar.",
        "syntax": "even though bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Normalde disleksisi olan adayların süreli okuma sınavında geçmesi beklenmez; beklenen sonuç başarısızlıktır. Cümlede ise herkesin geçtiği kaydedilmiştir, yani asıl yargı beklenmedik bir sonuçtur. 'even though' bu nedenle beklenmedik sonuç (-e rağmen) ilişkisini kurar. A: 'whereas' zıtlık kurar, ama cümlede karşıtlık yoktur. B: 'because' neden bildirir; az okumuş adayların geçmesi ters bir sonuçtur. C: 'if' koşul bildirir; hayali bir süre, kaydedilmiş gerçek bir geçişi kısıtlayamaz. E: 'as soon as' ardışıklık bildirir; kayıt zamanı imkansız bir sırayla çelişir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Examiner details create no real opposition to a pass result, so the sentence has no contrast and stays illogical as a concession.",
        "whyAttractive": "'whereas' often signals a contrast, and the sentence mentions two different examiners, which looks like a comparison.",
        "evidence": [
          {
            "text": "whereas the timed paper was marked by two different examiners",
            "start": 77,
            "end": 138
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Few candidates reading set texts would not explain passing; the reason gives the opposite of the recorded outcome.",
        "whyAttractive": "Learners may treat the clause as a reason, since the pass record seems to need an explanation.",
        "evidence": [
          {
            "text": "because few candidates had read any of the set texts before the exam",
            "start": 77,
            "end": 145
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A hypothetical time limit cannot restrict a recorded fact, so the 'if' clause makes the completed sentence illogical.",
        "whyAttractive": "The timed-paper context and the 'ten minutes' detail make a conditional clause look topically relevant.",
        "evidence": [
          {
            "text": "if the candidates had been given only ten minutes to finish",
            "start": 77,
            "end": 136
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "even though it was taken by students who had dyslexia",
            "start": 77,
            "end": 130
          }
        ]
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "The recorded pass cannot follow an allowance withdrawal in that order, so the time sequence is impossible here.",
        "whyAttractive": "'as soon as' links two events in time, and the withdrawal of an allowance sounds like a plausible event.",
        "evidence": [
          {
            "text": "as soon as the extra reading time allowance was withdrawn",
            "start": 77,
            "end": 134
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "379": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "A regional development bank expanded its lending to small manufacturers, although the export prices on which most of its borrowers depended had shown considerable volatility.",
          "role": "core",
          "start": 0,
          "end": 174
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 73,
          "end": 81
        },
        {
          "text": "A regional development bank expanded its lending to small manufacturers,",
          "kind": "core",
          "start": 0,
          "end": 72
        }
      ],
      "syntax": [
        {
          "text": "A regional development bank expanded its lending to small manufacturers,",
          "tone": "idea",
          "start": 0,
          "end": 72
        },
        {
          "text": "although the export prices on which most of its borrowers depended had shown considerable volatility",
          "tone": "contrast",
          "start": 73,
          "end": 173
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Sen B'yi seçmelisin: although beklenmedik sonuç (-e rağmen) kurar. Dalgalı ihracat fiyatları normalde kredi genişletmemeyi bekletir, ama banka genişletmiştir. Bu, beklentinin tersi olan asıl sonuçtur. A whereas zıtlık kurar, fakat iki durum arasında gerçek bir karşıtlık yoktur. C because neden bildirir, ama kredi değerlendirmesi yapmamış olmak genişlemeyi açıklamaz. D if koşul kurar; geçmişte gerçekleşmiş bir genişlemeyi koşul kısıtlayamaz. E as soon as zaman sıralaması kurar; temerrütlerin ardından genişleme mantıksızdır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Whereas yalnızca karşılaştırma yapar; expansion ile ihracat arasında beklenmedik sonuç ilişkisi kurmaz.",
        "whyAttractive": "Iki cümle yan yana karşılaştırıldığı için whereas zıtlık gibi görünebilir.",
        "evidence": [
          {
            "text": "whereas most of its borrowers had already been exporting finished goods to European and Asian markets",
            "start": 73,
            "end": 174
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although the export prices on which most of its borrowers depended had shown considerable volatility",
            "start": 73,
            "end": 173
          }
        ]
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Değerlendirme deneyimsizliği kredi genişlemesinin nedeni olamaz; mantık ters yönde işler.",
        "whyAttractive": "Bankanın kredi değerlendirmesi yapmamış olması, bir neden-sonuç bağı gibi düşünülebilir.",
        "evidence": [
          {
            "text": "because its loan officers had never before evaluated any small manufacturing firms for credit risk",
            "start": 73,
            "end": 171
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Olay zaten gerçekleşmiş; if koşulu bu gerçekleşmiş genişlemeyi kısıtlayamaz.",
        "whyAttractive": "Kredi kayıplarının artması ile kısıtlayıcı bir koşul kurulabilir gibi görünür.",
        "evidence": [
          {
            "text": "if its loan losses rose sharply that year and its capital reserves were shrinking steadily",
            "start": 73,
            "end": 163
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Temerrütlerin ardından lehte genişleme mantıksızdır; zaman sıralaması cümleyi anlamsız kılar.",
        "whyAttractive": "Temerrüt ve genişleme arasında zamansal bir ilişki kurulduğu için sequence sanılabilir.",
        "evidence": [
          {
            "text": "as soon as several of its existing borrowers had defaulted on their loans during the downturn",
            "start": 73,
            "end": 166
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "380": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "Although the water supply feeding the unit had shown considerable volatility in pressure and purity, the dialysis unit completed every scheduled session without a single cancellation.",
          "role": "core",
          "start": 0,
          "end": 183
        }
      ],
      "skeleton": [
        {
          "text": "Although",
          "kind": "lock",
          "start": 0,
          "end": 8
        },
        {
          "text": "the dialysis unit completed every scheduled session without a single cancellation",
          "kind": "core",
          "start": 101,
          "end": 182
        }
      ],
      "syntax": [
        {
          "text": "the dialysis unit completed every scheduled session without a single cancellation",
          "tone": "idea",
          "start": 101,
          "end": 182
        },
        {
          "text": "Although the water supply feeding the unit had shown considerable volatility in pressure and purity",
          "tone": "contrast",
          "start": 0,
          "end": 99
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Doğru cevap D'dir. Su basıncı ve saflığındaki büyük dalgalanma normalde seansların aksamasını beklettirir; ana cümle ise hiç iptal olmadan tamamlandığını söyler. Bu, beklenen olumsuz sonucun tersi olan beklenmedik sonuçtur, dolayısıyla Although (-e rağmen) uygundur. A: Because, eksik personelin seansları tamamlamayı sağladığını söyler; mantıksız. B: Unless, bir koşulun dışlayıcı anlamı ana cümleyi sağlamaz. C: As soon as, zaman sırası kurar; basınç düşüşünden hemen sonra tamamlanma anlamsız. E: Whereas, zıtlık kurar ama makine üreticisi ile seans tamamlanması arasında gerçek karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Personel eksikliği iptalleri beklettirir; Because ise tamamlanmayı bu eksikliğe bağlar, bu da mantıksızdır.",
        "whyAttractive": "Personel eksikliği olumsuz bir durum gibi göründüğü için sorunlu bir nedenle başlayan cümle gibi okunabilir.",
        "evidence": [
          {
            "text": "Because the unit had been short of nurses and technicians for nearly two years running",
            "start": 0,
            "end": 86
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Unless bir koşul kurar; pompaların arızalanmaya devam etmesi tamamlanma iddiasını kısıtlayamaz.",
        "whyAttractive": "Arıza yapan pompalar ve uzun tedavi dönemi dramatik bir engel izlenimi verir.",
        "evidence": [
          {
            "text": "Unless the backup pumps kept failing throughout every week of that long treatment period",
            "start": 0,
            "end": 88
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as zaman sırası kurar; tamamlanmanın basınç düşüşünden hemen sonra olması anlamsız bir sıradır.",
        "whyAttractive": "Basınç düşüşü bir aksama olduğu için zamanı belirten bağlaç ona bağlanabilir gibi görünür.",
        "evidence": [
          {
            "text": "As soon as the water supply suffered a sudden pressure drop in the city",
            "start": 0,
            "end": 71
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "Although the water supply feeding the unit had shown considerable volatility in pressure and purity",
            "start": 0,
            "end": 99
          }
        ]
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Gerçek bir karşıtlık yoktur; bu zıtlıktır, beklenmedik sonuç değildir ve bağlantı anlamsızdır.",
        "whyAttractive": "Whereas zıtlık gibi göründüğü ve cümlede iki ilgisiz bilgi bulunduğu için cazip gelebilir.",
        "evidence": [
          {
            "text": "Whereas the dialysis machines in the unit were made by a firm that also supplies filters",
            "start": 0,
            "end": 88
          }
        ],
        "confidence": 0.6
      }
    ]
  },
  "381": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": {
      "raw": [
        {
          "text": "The district kept its after-school tutoring programme fully staffed for the entire academic cycle although the funding formula that paid for it had proved volatile from one budget round to the next.",
          "role": "core",
          "start": 0,
          "end": 198
        }
      ],
      "skeleton": [
        {
          "text": "although",
          "kind": "lock",
          "start": 98,
          "end": 106
        },
        {
          "text": "The district kept its after-school tutoring programme fully staffed for the entire academic cycle",
          "kind": "core",
          "start": 0,
          "end": 97
        }
      ],
      "syntax": [
        {
          "text": "The district kept its after-school tutoring programme fully staffed for the entire academic cycle",
          "tone": "idea",
          "start": 0,
          "end": 97
        },
        {
          "text": "although the funding formula that paid for it had proved volatile from one budget round to the next",
          "tone": "contrast",
          "start": 98,
          "end": 197
        }
      ],
      "diagnosis": {
        "raw": "although bağlacı taviz ilişkisini kurar.",
        "skeleton": "although bağlacı taviz ilişkisini kurar.",
        "syntax": "although bağlacı taviz ilişkisini kurar."
      }
    },
    "moves": [
      {
        "title": "İlişki",
        "body": "Doğru cevap A. Sen de oynak bir finansmanın kadro kesintisine yol açmasını beklersin; bu yüzden tam kadro ana cümlede beklenmedik sonuçtur. although (-e rağmen) bu beklenmedik sonucu bağlar: finansman istikrarsızdı, yine de program tam kadroluydu. B whereas ile zıtlık kurar, ama cümleler arasında gerçek bir karşıtlık yoktur. C because neden kurar; yarıya inen bütçe kadro doluluğunu açıklamaz, tersini gerektirir. D unless koşul kurar; tamamlanmış bir durumu kısıtlayamaz. E as soon as sıralama kurar; Mart'taki kapanış duyurusu tüm dönem boyunca dolu kadroyla zamansal olarak uyuşmaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": null,
        "whyWrong": "",
        "evidence": [
          {
            "text": "although the funding formula that paid for it had proved volatile from one budget round to the next",
            "start": 98,
            "end": 197
          }
        ]
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "The newsletter fact has no real opposition to staffing, so no contrast is logically needed.",
        "whyAttractive": "Whereas links two facts, so it can look like a contrast between programme staffing and other district activity.",
        "evidence": [
          {
            "text": "whereas the district's tutoring office publishes a quarterly newsletter listing volunteer schedules and student attendance figures each spring and autumn",
            "start": 98,
            "end": 251
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A halved budget with no hires would explain understaffing, the opposite of the stated full staffing.",
        "whyAttractive": "A budget cut is a clear, concrete event, so because seems to explain the staffing outcome.",
        "evidence": [
          {
            "text": "because the staffing budget had been cut in half before the academic year began, with no replacement hires approved",
            "start": 98,
            "end": 213
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Unless sets a condition for the outcome, but the completed fact about full staffing cannot be restricted this way.",
        "whyAttractive": "Unless with tutors quitting sounds like a realistic staffing risk, so it may seem to fit.",
        "evidence": [
          {
            "text": "unless several tutors quit midway through the autumn term and vacancies went unfilled for weeks at a time",
            "start": 98,
            "end": 203
          }
        ],
        "confidence": 0.6
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A March closure announcement does not fit as the starting point of a claim covering the entire academic cycle.",
        "whyAttractive": "As soon as introduces a specific March announcement, which looks like a precise timeline.",
        "evidence": [
          {
            "text": "as soon as the principal announced in March that the evening wing would be closed for good",
            "start": 98,
            "end": 188
          }
        ],
        "confidence": 0.6
      }
    ]
  }
};
