import type { Lesson } from "@/modules/content/lesson";

/** Teaching documents for the approved factory items. X-ray layers are null until a span pass fills them. */
export const factoryLessons: Record<number, Lesson> = {
  "301": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen önce ana yargıya bak: kitap övülmüş ve hızla ikinci baskıya sipariş verilmiştir. Dizin eksikliği satışı düşürmesi beklenen bir engeldir, ama ana cümle yine de olumlu sonucu verir. Bu yüzden even though ile verilen olumsuz bilgiye rağmen gelen sonuç beklenmedik sonuçtur (-e rağmen). A: provided that yeniden basımı satılmayan stoka bağlar; oysa talep olmadan baskı sipariş edilmez. B: as soon as geri çekilmeden sonra baskıyı kurar; bu zaman sırası övgüyle ve siparişle çelişir. C: whereas iki durum arasında gerçek bir zıtlık kurar; oysa eleştirmenler de başarıyı öngörmüştür. E: because geri çekme kararını sipariş nedeni yapar; bu, yayınevinin sipariş vermesiyle çelişir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Reprints follow demand, not unsold stock; the condition makes the reorder illogical and cannot restrict the main clause."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Withdrawal before reprinting contradicts the praise and the reorder; the time order is impossible here."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists; reviewers also predicted success, so this is not a contrast with the main clause."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Withdrawal would support a lack of reorder, not a reprint; the reason contradicts the praised, reordered book."
      }
    ]
  },
  "302": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde salgında üyelerinin yarısını kaybeden bir loncanın ağını daraltmasını beklersin. Ana cümle ise genişlemeyi söyler; bu beklenmeyen bir sonuçtur. A, Although ile beklenmedik sonuç (-e rağmen) ilişkisi kurar. B, As soon as ile sıralama kurar; sayım ile genişleme arasında mantıklı bir zaman bağı yoktur. C, Whereas ile zıtlık kurar, ama charter kazanmak genişlemeye karşıt değildir. D, Because ile neden bildirir; charter kaybı genişlemeyi açıklayamaz. E, If ile koşul kurar; sınır engeli genişlemeyi koşullandıramaz."
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
        "whyWrong": "As soon as zaman sırası kurar; sayımdan hemen sonra genişleme mantıklı bir sonuç olmaz."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Yeni charter almak genişlemeyle çelişmez; bu yüzden gerçek bir karşıtlık ve beklenmedik sonuç yoktur."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Because bu durumun genişlemeye neden olduğunu söyler; engeller ise genişlemeyi zorlaştırır, bu da cümleyi mantıksız kılar."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "If koşulu genişlemeyi kısıtlamaz; ajanların geri çevrilmesi, yapılmış bir genişlemenin koşulu olamaz."
      }
    ]
  },
  "303": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normally a cooperative with record profits is expected to have had good conditions, so rising fuel costs squeezing margins is the unexpected element. Option B, with although, presents the costs as a hindrance yet profits still rose, which is the beklenmedik sonuç (-e rağmen) relation. A uses whereas, a zıtlık that lacks real opposition: falling costs simply support the profits. C, with because, makes members abandoning fishing a cause of record profits, which contradicts the reported outcome. D, with provided that, sets a condition that cannot restrict a past achievement already reported. E, with as soon as, implies a storm in autumn after the profits were already reported, an impossible time order for the third consecutive year."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Whereas builds a zıtlık with real opposition; falling costs merely support record profits, so the sentence is not contrastive."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Because marks a cause; members leaving before the season would not logically produce record profits, making the sentence illogical."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict an already reported result; staying in port does not condition a past record."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "As soon as sets an impossible sequence: an autumn storm occurring after the reported profits of the completed years."
      }
    ]
  },
  "304": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen, kirlilik gibi olumsuz bir durumun kuş sayısını düşüreceğini beklersin. Ana cümle ise tersini bildirir: kuşlar hızla arttı. Bu beklenmedik sonuç (-e rağmen) ilişkisidir; doğru cevap A'dır, çünkü Even though kirliliğe rağmen gerçekleşen artışı bağlar. B neden bildirir ama pestisit artışı açıklamaz. C koşul kurar, koşul artışı sınırlayamaz. D zaman sırası kurar, oksijen çöküşü artıştan önce olamaz. E zıtlık kurar, ama iki cümlede gerçek bir karşıtlık yoktur."
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
        "whyWrong": "Pestisit kullanımı kuş artışını açıklamaz; neden bildirmek yerine ana cümlenin tersini destekler."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Koşul bildirir, ama kirliliğin sürmesi artışı sınırlamaz; cümle koşulla değil beklenmedik sonuçla kurulur."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "As soon as, çöküşün artıştan hemen önce olduğunu söyler; bu zaman sırası restorasyon sonrası artışla çelişir."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Zıtlık için iki cümle karşıt olmalıdır; burada ikisi de kuş artışını anlatır, bu yüzden ilişki yanlıştır."
      }
    ]
  },
  "305": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde iki gemisini kaybeden seferin boş dönmesi beklenir. Ancak ana cümle ayrıntılı kıyı haritasıyla dönüşü anlatır; bu beklenmedik sonuçtur. Bu yüzden Although beklenmedik sonuç (-e rağmen) ilişkisi kurar; doğru seçenek D'dir. A: As soon as zaman sırası kurar; fırtınadan hemen sonra tüm kıyının haritalanması imkânsızdır. B: Whereas zıtlık kurar; ama haritalama ile gemi kaybı arasında gerçek karşıtlık yoktur. C: Because neden bildirir; grafikleri terk eden ekibin harita çıkarması mantıksızdır. E: Unless koşul bildirir; reddetme tamamlanmış dönüşü kısıtlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "As soon as implies a sequence; a complete coastal map right after the storm is impossible."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists; this is contrast, not concession, and the storm is unrelated to charting."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Abandoning charts makes a detailed map illogical; the reason contradicts the outcome."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict a completed past return; refusing to chart cannot undo the map."
      }
    ]
  },
  "306": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Beklenen sonuç, sermaye rezervleri azalırken kredi büyümesinin yavaşlamasıdır. Ana cümledeki yüzde on iki büyüme ise beklenmedik bir sonuçtur; bu yüzden 'although' ile kurulan E, beklenmedik sonuç (-e rağmen) ilişkisini doğru verir. A: 'whereas' zıtlık kurar ama cümlede gerçek bir karşıtlık yoktur. B: 'because' neden kurar; kredi onaylarının donması büyümeyle çelişir. C: 'unless' koşul kurar; geçmiş bir büyümeyi kısıtlayamaz. D: 'as soon as' sıralama kurar; kredileri askıya almak büyümeyle bağdaşmaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Similar lending drawdown supports rather than opposes expansion, so there is no real contrast; it is a parallel detail."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Frozen credit approvals would reduce lending, so this reason contradicts the twelve percent portfolio expansion."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "The clause describes a halt that did not happen; a condition cannot restrict a completed past expansion."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Suspending all lending in that period contradicts expanding the portfolio the same year, so the time order is impossible."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "307": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde iki hemşiresini kaybetmiş bir kliniğin rekor kayıt yapması beklenmez; beklenti zayıf bir performanstır. Ana cümledeki rekor kayıt bu beklentinin tersi olduğu için Even though beklenmedik sonuç (-e rağmen) ilişkisi kurar. A, Because ile neden bağı kurar; yeni hasta kabul etmeyen bir klinikte rekor kayıt mantıksızdır. B, Provided that ile koşul kurar; cerrahi ziyaretlerin iptali rekor kaydı kısıtlayamaz. C, As soon as ile ardışıklık kurar; fon kesintisi rekor kaydı anında doğuramaz. E, Whereas ile zıtlık kurar; ama ailelerin zaten kapsanmış olması gerçek bir karşıtlık oluşturmaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause; refusing new patients would make record enrolment illogical, not explain it."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Cancelled outreach visits cannot be a condition limiting record enrolment; the sentence becomes illogical."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as implies an immediate result; a funding cut does not produce record enrolment right away."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Early coverage of families gives no real opposition to record enrolment, so contrast fails to fit."
      }
    ]
  },
  "308": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen şunu fark etmelisin: tarihsel lehçe verisinde deneyimsiz annotatörler işi bir dönemde bitirmeyi zorlaştırır, yani normalde beklenen sonuç bu olur. Ana cümle ise işin tamamlandığını söyler, bu da beklenmedik sonuç (-e rağmen) ilişkisidir ve even though bunu kurar. A unless koşul kurar, ama cümle bir koşulun yokluğuna bağlı değildir. C as soon as zaman ardıllığı kurar; fon kesildikten hemen sonra bitirmek mantıksızdır. D whereas zıtlık kurar, ama iki durum arasında gerçek bir karşıtlık yoktur. E because neden kurar; yazılımın kullanılamaması tamamlanmayı açıklamaz, tersine engellerdi."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Unless sets a condition; the main clause is not conditional, and the meaning becomes illogical."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as builds time order; finishing right after funding was cut is illogical."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Whereas shows contrast, not concession; there is no real opposition between the two clauses."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause; unavailable software would hinder completion, so the reason contradicts the outcome."
      }
    ]
  },
  "309": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap E. Normalde sular altındaki çamur ve moloz altında kalan bir alanın kazıyı yavaşlatmasını beklersin. Ana cümle ise işin planlanandan önce bitmesi olduğu için beklenmedik sonuçtur; Although bu nedenle beklenmedik sonuç (-e rağmen) ilişkisini kurar. A cause kurar, ama küçük ekip erken bitirmeyi açıklamaz. B condition kurar, ama gömülü olmak bitirmeyi koşullandıramaz. C sequence kurar, ama sel kazıyı durdururken haritalama bitemez. D contrast kurar, ama ekstra personel ve ekipman arasında gerçek bir zıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Azaltılmış ekip erken bitirmeyi açıklamaz; sebep, ana cümlenin tersi sonucu destekler."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Gömülü olmak bitirmeyi kısıtlayamaz; provided that koşulu ana cümlenin gerçekleşmesini sınırlandırmaz, mantık bozulur."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Sellerin kazıyı durdurduğu bir dönemde haritalama tamamlanamaz; zaman sırası imkânsızdır."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Ekstra personel ve ekipman birbiriyle çelişmez; iki olumlu durum arasında gerçek bir zıtlık yoktur, bu bir beklenmedik sonuç değildir."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "310": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde sağlam bir zemin, güzergâhın kabulünü bekletir. Doğru seçenek B, zeminin olağanüstü sağlam olduğunu söyler; bu olumlu bilgiye rağmen komite reddetmiştir, yani ret beklenmedik sonuçtur. Bu yüzden Although beklenmedik sonuç (-e rağmen) kurar. A zaman sırası kurar; ret, onaydan önce gerçekleşemez. C zıtlık kurar, fakat komitenin güvenlik ısrarı reddi destekler, karşıtlık yoktur. D neden kurar; ancak yerleşim bölgelerinden kaçınmak ve maliyet düşürmek reddi değil kabulü gerektirir. E koşul kurar; yükleniciler maliyeti üstlenmeyi kabul etse bile ret koşula bağlanamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "The rejection would come before the engineers' confirmation, so the time order is impossible."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "The committee's safety insistence supports rejection, so there is no real opposition; this is not concession."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Avoiding districts and cutting costs are reasons to approve, so they support the opposite of rejection."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict a completed rejection; contractors' agreement does not govern the committee's decision."
      }
    ]
  },
  "311": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen de uykusuz gönüllülerin kötü performans göstermesini beklersin. Ana yargı ise beklenmedik sonucu verir: gönüllüler çok daha iyi performans gösterdi. Bu, although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir, yani C doğrudur. A koşul bildirir ve ana yargıyı kısıtlar. B zaman sırasını bozar. D zıtlık kurar ama gerçek bir karşıtlık yoktur. E neden bildirir fakat sebep beklenen sonucu destekler, cümle mantıksız olur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Unless introduces a condition, which cannot restrict a completed performance result."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Explaining instructions is not a logical timing for the performance outcome, so the sentence is illogical."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Being rested supports good performance rather than opposing expectations, so no real opposition exists."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Lack of practice would predict poorer recall, so the stated reason contradicts the better-than-expected result."
      }
    ]
  },
  "312": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde maliyetler sert artıp ana tedarikçi iflas ettiğinde, sen ihracat genişlemesini beklemezsin; ana cümle bu yüzden beklenmedik sonuçtur. B, even though ile bu sonucu beklenmedik sonuç (-e rağmen) yoluyla doğru bağlar. A whereas ile zıtlık kurar, ama beklentiye karşı bir durum yoktur. C because gerekçe bildirir; lisans iptali genişlemenin nedeni olamaz. D as long as koşul kurar; tasarımcıların istifası genişlemeyi kısıtlamaz. E as soon as zaman sırası kurar; kış kapanışı yıl boyu süren genişlemeyle mantıksal sırada değildir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Both clauses are positive; no expectation is overturned, so it builds contrast without a concessive outcome."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Revoked licences and empty warehouses would block expansion, so because gives an illogical reason for expanded contracts."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Resigned designers and cancelled orders cannot be a condition that restricts expansion; the condition does not fit the outcome."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A winter shutdown cannot sit in an immediate time sequence with a year-long expansion; the time order is impossible."
      }
    ]
  },
  "313": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen önce beklentiyi düşün: besinden yoksun bir kumulda bitkilerin gelişmemesi beklenir. Ana cümle ise tersini söyler; popülasyon büyür ve tohumlar yayılır. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir, although tam bunu kurar. A whereas iki olumlu durumu karşılaştırır, gerçek bir zıtlık yoktur. B because neden bildirir ama çalılar tohumları engelleyeceği için yayılma mantıksız olur. D provided that koşul bildirir; rüzgârın esmesi yayılmayı kısıtlayamaz. E as soon as zaman sırası kurar; kış fırtınası on yıllık kademeli büyümeyle uyuşmaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Both clauses are positive; no real opposition exists, so whereas does not fit."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Dense shrubs blocking seeds contradicts the spreading and growth in the main clause."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Winds blowing away from dunes cannot restrict growth; the condition is illogical here."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A single storm burial cannot be timed as-soon-as the decade-long steady growth."
      }
    ]
  },
  "314": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde fonun yarıya inmesi popülasyonun düşmesini beklettirir; oysa ana cümlede popülasyon sert biçimde artmıştır. Bu beklenmedik sonuç (-e rağmen) ilişkisidir, bu yüzden doğru cevap A'dır. B: Because, yırtıcıların serbestliğini neden olarak verir; bu artışla değil düşüşle uyuşur, yanlıştır. C: As long as, koşul kurar; kaçak avcıya erişim artışın koşulu olamaz, mantıksızdır. D: As soon as, zaman sırası kurar; işten çıkarmalar üç sezon boyunca tekrarlanamaz, zaman akışı imkânsızdır. E: Whereas, zıtlık kurar ama gerçek bir karşıtlık yoktur; devriye artışı popülasyonu destekler, beklenmedik sonuç değildir."
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
        "whyWrong": "Because gives a cause that would lower the population, contradicting the sharp growth in the main clause."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Poacher access cannot be the condition for growth; the condition relation makes the completed sentence illogical."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires a single moment before growth, but layoffs cannot repeat across all three seasons."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Doubled patrols support growth rather than contradict it, so this is no real zıtlık and no concession."
      }
    ]
  },
  "315": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde ağır kirlilik, bir sulak alanın kuşlarını kısa sürede geri getirmez; beklenti olumsuzdur. Ana cümle bu beklenmedik sonucu verdiği için doğru bağlaç 'Although' (-e rağmen) olur ve beklenmedik sonuç (-e rağmen) ilişkisi kurar. A: 'Because' sebep kurar, ama yollar ve tarama kuşların dönüşünü açıklamaz. B: 'As long as' koşul kurar; kurutma ve tarama bir koşul olamaz. D: 'As soon as' zaman ilişkisi kurar; donma, iyileşmeden önce gerçekleşemez. E: 'Whereas' zıtlık kurar, ama geçmiş kuş kolonileri iyileşmeyle gerçek bir karşıtlık oluşturmaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because makes the damage the reason for recovery, which is illogical and contradicts the expected outcome."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Draining and dredging cannot be a condition that restricts a bird population recovery."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires the freezing to precede recovery, which is an impossible time order for this outcome."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "The past colonies do not oppose the recovery; the clause gives background, not a real contrast."
      }
    ]
  },
  "316": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde zemin sorunu varsa onay verilmez; bu beklenen sonuçtur. Ana cümle ise sorunlu zemine rağmen hemen inşaata onay verildiğini söyler; bu beklenmedik sonuçtur, dolayısıyla doğru cevap beklenmedik sonuç (-e rağmen) kuran Although seçeneğidir. A) As soon as zaman sırası kurar, ama zamanlama mantıksız kalır. C) Whereas zıtlık kurar, fakat iki durum da olumludur, gerçek karşıtlık yoktur. D) Because neden kurar, ama risk raporları onayın tersini destekler. E) If koşul kurar, fakat onay kesin bir olay olarak anlatıldığından koşul bu cümleyi kısıtlayamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "The timing does not work: the sentence treats instability as a fresh test result that would normally block approval, so the approval timeline is illogical."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Both clauses are positive, so there is no real opposition. Whereas does not express the unexpected outcome that concession requires."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Risk reports would lead to rejection, not immediate approval. The reason supports the opposite of the main clause."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Approval is stated as a completed fact, so a hypothetical condition cannot restrict it. The sentence becomes incoherent."
      }
    ]
  },
  "317": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap E. Hükümetin aşırı para basması enflasyonu artırmasını bekleriz; ana cümle ise enflasyonun düşmesi, yani beklenmedik sonuçtur. Bu yüzden although, beklenmedik sonuç (-e rağmen) ilişkisini kurar. A whereas ile zıtlık kurar, ama faiz artışı düşüşle çelişmez. B because neden kurar, fakat enerji fiyatı artışı enflasyonu yükseltir. C as long as koşul kurar; geçmiş bir olayı koşula bağlamak anlamsızdır. D as soon as ardıllık kurar; üç yıl süren durgunluk geçmiş yılın düşüşünden önce gelemez."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Raising rates fits falling inflation, so there is no real opposition between the clauses."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Surging prices would raise inflation, so this reason supports the opposite of the stated outcome."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict a completed past event, and rising wages would push inflation up."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "A three-year stagnation cannot occur before last year's inflation fall, so the time order is impossible."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "318": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap E. Yoğun yağmurların erişim yolunu çamura çevirmesi normalde gecikme beklemeni sağlar. Ana cümle ise beklenmedik bir sonucu bildirir: kataloglama erken bitmiştir. Bu, Although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir. A: Because neden-sonuç kurar; personel sıkıntısı gecikmeyi açıklar, erken bitişi değil. B: Provided that koşul kurar; iki kişinin çekilmesi işi kısıtlar, erken bitirmeyi engeller. C: As soon as zaman sırası kurar; elektrik kesintisi kataloglamanın erken bitişiyle mantıksal bir sıra oluşturmaz. D: Whereas zıtlık kurar; etiketleme ve sıralama bitirmeyi destekler, karşıt bir durum değildir."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because gives a reason for delay, but the main clause reports an early finish, so the sentence contradicts itself."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition for success; withdrawing staff would hinder finishing, so it cannot restrict an early finish."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as needs a logical time sequence; a power failure cannot trigger finishing cataloguing early."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Whereas marks contrast; labelling and sorting help finish early, so there is no real opposition."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "319": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde, kötü koşullarda çalışma odalarının kapatılmasını beklersin. Asıl cümle ise tam tersini, yani odaların gece yarısına kadar açık tutulmasını söylüyor. Isıtma haftalardır bozuk ve kimse tamir etmemiş; bu olumsuzluk, açık tutmanın beklenmedik sonucudur. Bu yüzden although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisi doğrudur. Diğer seçenekler farklı ilişkiler kurar ve hepsi mantıksal olarak yanlış sonuç verir."
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
        "whyWrong": "Whereas zıtlık kurar, ama ikinci cümle karşıt bir durum değil, sadece ek bir bilgi verir."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Because gerekçesi, binaların erken kapanacağını söylediği için odaları gece açık tutmayı mantıksız kılar."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Provided that koşulu bir sınır koyar; kilitlenme kuralı açık tutmayı engellediği için cümle tutarsız kalır."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "As soon as sıralama kurar; ancak sınav dönemi zaten bitmişse odaların o dönemde açık tutulması mümkün değildir."
      }
    ]
  },
  "320": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normally you would expect a library with no heating and a freezing reading room to hurt exam results, so the expected outcome is poor marks. Option D gives the concession (-e rağmen), so the main clause, earning top marks, is the unexpected outcome. Option A builds contrast (zıtlık) with whereas, but it names no real opposition, so the sentence does not signal an unexpected result. Option B gives a cause, but the reason stated supports the opposite of the main clause. Option C sets a condition, but rarely visiting the library cannot restrict the outcome of regular study. Option E gives a sequence, but the heating breakdown in January cannot come before a winter-long pattern that began earlier."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "No real opposition exists between motivated students and good marks, so the contrast is empty and does not produce an unexpected outcome."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "The reason given supports the opposite of top marks, so the completed sentence is illogical."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "A condition cannot restrict a result that depends on regular study; rarely visiting contradicts the main clause."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "The heating breakdown would have to occur before the winter-long pattern began, which makes the time order impossible."
      }
    ]
  },
  "321": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde neredeyse otuz saat uyanık kalmak hafızayı zayıflatır, bu yüzden beklenen sonuç kötü hatırlamadır. Ana cümle ise tam hatırlamayı bildirir; bu beklenmedik sonuçtur (-e rağmen), bu yüzden although doğru seçenektir. A) provided that koşul kurar; ağır alkol tam hatırlamayı koşullandırmaz, cümle anlamsızlaşır. B) after zaman sırası kurar; gece uyandırılmak tam hatırlamanın nedeni olamaz. C) whereas zıtlık kurar; ancak iyi dinlenmiş olmakla tam hatırlama arasında gerçek bir karşıtlık yoktur. D) because neden-sonuç kurar; tek ve hızlı okuma tam hatırlamayı değil zayıf hatırlamayı açıklar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition; heavy drinking cannot condition perfect recall, so the sentence becomes illogical."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "After only orders events in time; being woken during the night does not explain or contrast with perfect recall."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Whereas needs a real contrast; rested participants recalling perfectly is not opposed to anything in the sentence."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Because gives a reason that supports poor recall, the opposite of the main clause, so it is illogical here."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "322": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Doğru cevap D. Önce beklenen durumu düşün: ciddi yan etkiler bildirildiğinde ilaç rejimi genellikle değiştirilir. Ana cümle ise tersini söyler: rejim değiştirilmedi. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir ve Although bunu kurar. A seçeneği Because ile değiştirme kararını neden gösterir, bu da ana cümlenin tersidir. B seçeneği Provided that ile bir koşul kurar, ama enfeksiyon oranı rejimin korunmasını kısıtlayamaz. C seçeneği As soon as ile imkansız bir zaman sırası kurar; kayıt ilacı değiştirmez. E seçeneği Whereas ile zıtlık kurar, ama doz değişikliği ile rejimin korunması arasında gerçek bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Because gives a cause for switching. That supports the opposite of the main clause, which says the regimen stayed unchanged."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition, but a rising infection rate cannot restrict or enable keeping the regimen unchanged. The logic fails."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires the nurse's report to come before the action. A recorded drop cannot make the team keep the regimen in that time order."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Whereas builds only a contrast, not a concession. A dosage change does not truly oppose keeping the regimen, and no expected-versus-actual link exists."
      }
    ]
  },
  "323": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Beklenen, dozları kaçıran gönüllerin iyileşmemesidir; ana cümle ise tam iyileşmeyi, yani beklenmedik sonucu bildirir. Doğru cevap beklenmedik sonuç (-e rağmen) kuran Although'dur. A) Because: ilacın erken kesilmesi iyileşmenin nedeni olamaz. C) Provided that: koşul, iyileşmeyi kısıtlayamaz. D) As soon as: nüks, iyileşmeden önce gelmek zorunda; zaman sırası tutmaz. E) Whereas: zıtlık kurar, ama beklenen bir karşıtlık yoktur."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Early withdrawal cannot cause full recovery; it supports the opposite outcome, so the causal link is illogical."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Recovery cannot be conditioned on skipping doses; the condition is absurd and does not logically restrict the outcome."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "As soon as makes recovery follow an immediate relapse, which is illogical and contradicts the reported full recovery."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Full dosing would normally predict recovery, so there is no real opposition; this builds zıtlık, not the required concession."
      }
    ]
  },
  "324": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normally, a team would not produce a detailed corpus so quickly with brand-new equipment, so the expectation is that delivery just before fieldwork would delay or hinder the work. The main clause says the team did produce it quickly, which is the unexpected outcome, so D's concessive even though (-e rağmen) fits. A states a condition, which cannot restrict a completed achievement. B gives an impossible time order for a corpus already produced. C builds contrast, but training on equipment is not opposed to the outcome in a way that yields surprise, and the item's concession relation is needed. E gives a cause that supports the opposite of the quick success."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition for the outcome; the corpus was already produced, so a condition cannot restrict it."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "A software crash in week two cannot be the moment the corpus was finished quickly; the time relation is illogical."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "The clauses are not genuinely opposed in a way that makes the outcome surprising; this is contrast, not the concession the stem needs."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "A lack of trained staff would not explain rapid, detailed success, so the reason contradicts the main clause."
      }
    ]
  },
  "325": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Normalde az uyuyan birinin yorgun hissetmesi beklenir. Ana cümledeki dinç ve uyanık olma durumu bu beklentinin tersi olduğu için beklenmedik sonuç (-e rağmen) anlamı taşır; doğru seçenek although ile bunu kurar. A: provided that koşul kurar, ama dinçlik bir koşula bağlı değil, cümle mantıksız kalır. B: as soon as zaman ardıllığı kurar; kahvaltıyı atlayıp yağmurda yürümek dinçliği doğurmaz, mantık bozulur. C: whereas zıtlık kurar, ama iki dinlenme durumu arasında gerçek bir karşıtlık yoktur. D: because neden kurar; gece uyanık kalmak yorgunluk doğurur, dinçliği açıklamaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Provided that sets a condition, but feeling rested does not depend on coffee; the sentence becomes illogical."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "As soon as requires a possible time order; feeling rested cannot precede the actions that are meant to cause it."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Both afternoons are restful, so there is no real opposition; the contrast is empty."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Two days awake would cause exhaustion, so because supports the opposite of feeling rested."
      },
      {
        "letter": "E",
        "error": null,
        "whyWrong": ""
      }
    ]
  },
  "326": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen normalde kötü kış ve mahsul kaybının bir kasabanın büyümesini ve yeni yerleşimci çekmesini engelleyeceğini beklersin. Although ile kurulan D seçeneği bu beklentiye karşı çıkar; beklenmedik sonuç (-e rağmen) ilişkisi vardır: zor koşullara rağmen kasaba hızla büyür. A) As soon as zaman sırası kurar; çöküşten hemen sonra büyüme mantıksızdır. B) Whereas zıtlık kurar; ancak güvenilir ticaret yolu ile büyüme arasında karşıtlık yoktur. C) Because neden bildirir; ticaretin yasaklanması büyümeyi açıklamaz, aksine engeller. E) As long as koşul bildirir; kuzey yolunun kapalı olması büyümeyi koşullandıramaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Çöküşten hemen sonra hızlı büyüme olamaz; zaman sırası mantıksal olarak tutarsızdır."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Güvenilir ticaret yolu ile hızlı büyüme arasında karşıtlık yoktur; beklenmedik sonuç kurulmaz."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Ticaretin yasaklanması büyümeyi açıklamaz; bu neden büyümeyi destekleyen değil engelleyen bir etkidir."
      },
      {
        "letter": "D",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Kuzey yolunun kapalı olması büyümeyi koşullandıramaz; cümle mantıksal olarak bağlanmaz."
      }
    ]
  },
  "327": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Saatlerin uzatılması ve ücretsiz odalar katılımın artacağını düşündürür; sen de bu beklentiyi doğal bulursun. A seçeneğindeki although, personel kaybı gibi bir engel verir, ama ana cümle yine de artışı bildirir; bu bir beklenmedik sonuç (-e rağmen) ilişkisidir. B koşul kurar, oysa koşul katılımı kısıtlamaz. C zaman sırası kurar, ama istifa ile katılım arasında mantıklı bir zaman bağı yoktur. D zıtlık kurar, fakat sadakatli okuyucular bir karşıtlık oluşturmaz. E neden bildirir, ama çevrimiçi okumaya geçiş kütüphaneye gelişi artırmaz, azaltır."
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
        "whyWrong": "It sets a condition that would restrict the rise, but the stem states the expected increase without any such limit."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "The director's resignation cannot logically be the time frame for attendance rising, and the sequence is impossible here."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Loyal readers do not oppose the expected rise; the clause creates no real opposition, so it is a contrast mismatch."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Moving online would reduce library visits, so this reason supports the opposite of the expected rise."
      }
    ]
  },
  "328": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Anahtar A. Beklenen sonuç: kar yüzünden geçitlerin altı ay kapalı olması ticareti durdurur. Ana cümle ise bunun tersini, yolların genişlemeye devam ettiğini bildirir; bu yüzden Although beklenmedik sonuç (-e rağmen) ilişkisi kurar. B: As soon as zaman sırası kurar, ama köprünün çöküşü genişlemeyi mantıksız biçimde zamanlar. C: Whereas zıtlık kurar, fakat kervan zenginliği genişlemeyle gerçek bir karşıtlık oluşturmaz. D: Because neden bildirir; mal kaybı genişlemenin nedeni olamaz, tersini gösterir. E: As long as koşul kurar; kervanların durması genişlemeyi kısıtlayamaz, ana cümle bunu yanlışlar."
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
        "whyWrong": "As soon as ana cümleyle zaman sırası kurar; köprü çöküşü sonrası sürekli genişleme anlamsız ve mantıksızdır."
      },
      {
        "letter": "C",
        "error": "discourse_relation",
        "whyWrong": "Whereas zıtlık kurar, ama zenginlik kazanmak genişlemeyle çelişmez; gerçek bir karşıtlık yoktur."
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Because mal kaybı genişlemenin nedeni olamaz; cümle ana fikrin tersini neden gibi sunar."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "As long as koşul kurar; kervanların durması genişlemeyi kısıtlayamaz, ana cümle bu koşulu geçersiz kılar."
      }
    ]
  },
  "329": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen önce beklentiyi düşün: kirli gökyüzü ve eski dedektör kötü görüntü getirir. Ana cümle ise tam tersini, en keskin görüntüleri anlatır. Bu yüzden Although ile kurulan beklenmedik sonuç (-e rağmen) doğrudur. A: As soon as zaman sırası kurar; dedektör arızası ile keskin görüntü aynı anda mantıksız bir sıra oluşturur. B: Whereas zıtlık kurar ama iki yan cümlede gerçek karşıtlık yoktur; yazılım hazırlığı keskin görüntüyü destekler. D: Because neden bildirir; teleskop sökülüyken gözlem yapılamayacağı için sonucu çelişkili kılar. E: If koşul bildirir; her gece odak kaybı, en keskin görüntülerle bağdaşmayan bir kısıtlamadır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Arıza ve keskin görüntü aynı anda olamaz; zaman sırası cümlenin mantığını bozar."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Yazılım hazırlığı keskin görüntüyü destekler; gerçek bir karşıtlık yoktur, zıtlık kurulamaz."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Teleskop sökülüyken keskin görüntü alınamaz; bu sebep sonucun tersini destekler."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Her gece odak kaybı, en keskin görüntüler elde edilmesiyle bağdaşmaz; koşul kısıtlayamaz."
      }
    ]
  },
  "330": {
    "version": 1,
    "task": "sentence_completion",
    "relation": "concession",
    "xray": null,
    "moves": [
      {
        "title": "Çeldirici ayıklaması",
        "body": "Sen beklersin ki sahildeki yuva alanının yarısının kaybı yavru sayısını azaltsın. Doğru seçenek C, even though ile bu beklentiye karşı beklenmedik sonuç (-e rağmen) kurar: alan kaybına rağmen yavrular her bahar artmıştır. A, whereas ile zıtlık kurar ama iki durum birbirine karşıt değildir. B, because neden bağlar fakat kedi avı yavru artışını açıklamaz, tersine azaltmalıdır. D, provided that koşul kurar; yiyecek kaynağının azalması bir artışı koşullandıramaz. E, as soon as anlık bir sıra kurar; on yıla yayılan sürekli artışla uyuşmaz."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "discourse_relation",
        "whyWrong": "Yiyecek bolluğu ve sağkalım artışı yavru artışıyla uyumludur; aralarında gerçek bir karşıtlık yoktur."
      },
      {
        "letter": "B",
        "error": "discourse_relation",
        "whyWrong": "Kedilerin dişileri avlaması yavru sayısını azaltmalıdır; bu neden artışı açıklamaz, tersine çelişir."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "discourse_relation",
        "whyWrong": "Yiyecek kaynağının azalması bir artışın koşulu olamaz; koşul cümlesi mantıksal olarak çelişir."
      },
      {
        "letter": "E",
        "error": "discourse_relation",
        "whyWrong": "Anlık bir sıra, on yıla yayılan sürekli artışla bağdaşmaz; zaman ilişkisi yanlış kurulmuştur."
      }
    ]
  },
  "401": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Kaynakla aynı karşılaştırma korunur. B: Metinde olmayan neden ekler: parklar yüzünden. C: Hiçbir şehir diyerek kapsamı genişletir. D: Bütün ağaçlar ve her şehir niceleyiciyi büyütür. E: Sonucu ters çevirir: daha serin değil daha sıcak der."
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
        "error": "added_fact",
        "whyWrong": "Metinde olmayan neden ekler: parklar yüzünden."
      },
      {
        "letter": "C",
        "error": "negation",
        "whyWrong": "Hiçbir şehir diyerek kapsamı genişletir."
      },
      {
        "letter": "D",
        "error": "scope",
        "whyWrong": "Bütün ağaçlar ve her şehir niceleyiciyi büyütür."
      },
      {
        "letter": "E",
        "error": "unsupported_inference",
        "whyWrong": "Sonucu ters çevirir: daha serin değil daha sıcak der."
      }
    ]
  },
  "402": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Nedenler tartışılıyor; uzlaştılar demek ek bilgidir. B: Sık atıf ve nedenlerin açık kalması korunur. C: Daha büyük dergi nedeni ekler, tartışmayı siler. D: Paylaşmayanların az atıf aldığını kaynak söylemez. E: Often ifadesini all yapar."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "unsupported_inference",
        "whyWrong": "Nedenler tartışılıyor; uzlaştılar demek ek bilgidir."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "unsupported_inference",
        "whyWrong": "Daha büyük dergi nedeni ekler, tartışmayı siler."
      },
      {
        "letter": "D",
        "error": "negation",
        "whyWrong": "Paylaşmayanların az atıf aldığını kaynak söylemez."
      },
      {
        "letter": "E",
        "error": "scope",
        "whyWrong": "Often ifadesini all yapar."
      }
    ]
  },
  "403": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Neden ekler ve sonucu ters çevirir. B: Ödün ve birçok öğrencinin sessiz yer bulamadığı korunur. C: Her öğrenci buldu der; kaynak bunun tersini söyler. D: Uzatılan saati yer bulmanın nedeni yapar. E: Hiç kimse bulamadı der; kaynak birçoğu der."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "unsupported_inference",
        "whyWrong": "Neden ekler ve sonucu ters çevirir."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "scope",
        "whyWrong": "Her öğrenci buldu der; kaynak bunun tersini söyler."
      },
      {
        "letter": "D",
        "error": "unsupported_inference",
        "whyWrong": "Uzatılan saati yer bulmanın nedeni yapar."
      },
      {
        "letter": "E",
        "error": "negation",
        "whyWrong": "Hiç kimse bulamadı der; kaynak birçoğu der."
      }
    ]
  },
  "404": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Marttaki fon kaybı ve sonbahara kadar ara korunur. B: Zamanı ters çevirir: fon kaybı önceki sonbahar olur. C: Birkaç öğrenciyi tüm bölüme, geçici arayı kalıcı duruşa çıkarır. D: Fon kaybını ve kesintiyi yok sayar. E: Fon kaybını siler ve dış fona hiç bağlı olmadığını ekler."
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
        "error": "unsupported_inference",
        "whyWrong": "Zamanı ters çevirir: fon kaybı önceki sonbahar olur."
      },
      {
        "letter": "C",
        "error": "scope",
        "whyWrong": "Birkaç öğrenciyi tüm bölüme, geçici arayı kalıcı duruşa çıkarır."
      },
      {
        "letter": "D",
        "error": "negation",
        "whyWrong": "Fon kaybını ve kesintiyi yok sayar."
      },
      {
        "letter": "E",
        "error": "added_fact",
        "whyWrong": "Fon kaybını siler ve dış fona hiç bağlı olmadığını ekler."
      }
    ]
  },
  "405": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Kütüphane genişlemesini yurt seçiminin nedeni yapar. B: Saat uzamasını neden yapar ve yurdu gürültülü gösterir. C: Ödün, birçoğu ve yurdun daha sessiz olması korunur. D: Hiçbir öğrenci kaynakta birçok öğrenciyi yalanlar. E: Birçoğunu hepsi yapar ve nerede çalıştıklarını kaydırır."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "unsupported_inference",
        "whyWrong": "Kütüphane genişlemesini yurt seçiminin nedeni yapar."
      },
      {
        "letter": "B",
        "error": "negation",
        "whyWrong": "Saat uzamasını neden yapar ve yurdu gürültülü gösterir."
      },
      {
        "letter": "C",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "D",
        "error": "negation",
        "whyWrong": "Hiçbir öğrenci kaynakta birçok öğrenciyi yalanlar."
      },
      {
        "letter": "E",
        "error": "scope",
        "whyWrong": "Birçoğunu hepsi yapar ve nerede çalıştıklarını kaydırır."
      }
    ]
  },
  "406": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Atık boşaltımı başladıktan sonra gölün düşmesi korunur. B: Sonrayı çünkü yapar ve yıllarca ekler. C: Tek gölü fabrikaya yakın her göle genişletir. D: Düşüşü yoksayar; kaynak düşüşü söyler. E: Arıtılmamış atığı arıtılmış diye değiştirir."
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
        "error": "unsupported_inference",
        "whyWrong": "Sonrayı çünkü yapar ve yıllarca ekler."
      },
      {
        "letter": "C",
        "error": "scope",
        "whyWrong": "Tek gölü fabrikaya yakın her göle genişletir."
      },
      {
        "letter": "D",
        "error": "negation",
        "whyWrong": "Düşüşü yoksayar; kaynak düşüşü söyler."
      },
      {
        "letter": "E",
        "error": "added_fact",
        "whyWrong": "Arıtılmamış atığı arıtılmış diye değiştirir."
      }
    ]
  },
  "407": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Neden ekler ve sonucu ters çevirir. B: Sınav haftası, birçok öğrenci ve sessiz yer zorluğu korunur. C: Hiçbir öğrenci kaynakta birçok öğrenciyi yalanlar. D: Birçoğu bütün öğrenciler yapılır. E: Sonucu ters çevirir ve metinde olmayan ayrıntı ekler."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "unsupported_inference",
        "whyWrong": "Neden ekler ve sonucu ters çevirir."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "negation",
        "whyWrong": "Hiçbir öğrenci kaynakta birçok öğrenciyi yalanlar."
      },
      {
        "letter": "D",
        "error": "scope",
        "whyWrong": "Birçoğu bütün öğrenciler yapılır."
      },
      {
        "letter": "E",
        "error": "added_fact",
        "whyWrong": "Sonucu ters çevirir ve metinde olmayan ayrıntı ekler."
      }
    ]
  },
  "408": {
    "version": 1,
    "task": "closest_meaning",
    "relation": "paraphrase",
    "xray": null,
    "moves": [
      {
        "title": "Anlam kontrolü",
        "body": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Neden ekler ve sonucu ters çevirir. B: Ödün, birçok öğrenci ve sınav haftası korunur. C: Birçoğu hiçbir öğrenci yapılır ve nedensellik eklenir. D: Birçoğu herkese, sınav haftası yılın her zamanına çıkar. E: Kütüphanenin zorluğun nedeni olduğunu ekler."
      }
    ],
    "choices": [
      {
        "letter": "A",
        "error": "unsupported_inference",
        "whyWrong": "Neden ekler ve sonucu ters çevirir."
      },
      {
        "letter": "B",
        "error": null,
        "whyWrong": ""
      },
      {
        "letter": "C",
        "error": "negation",
        "whyWrong": "Birçoğu hiçbir öğrenci yapılır ve nedensellik eklenir."
      },
      {
        "letter": "D",
        "error": "scope",
        "whyWrong": "Birçoğu herkese, sınav haftası yılın her zamanına çıkar."
      },
      {
        "letter": "E",
        "error": "added_fact",
        "whyWrong": "Kütüphanenin zorluğun nedeni olduğunu ekler."
      }
    ]
  }
};
