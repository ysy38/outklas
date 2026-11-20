import type { DraftItem } from "./exam-draft";

/** Human-approved factory items. Slots 301+ stay outside the 1–80 mock. */
export const factoryItems: DraftItem[] = [
  {
    "slot": 301,
    "section": "sentence",
    "layout": "blank",
    "stem": "The linguist's new grammar was praised by reviewers for its clarity and its careful treatment of every major data set, and her publisher quickly ordered a second printing ----.",
    "explanation": "Sen önce ana yargıya bak: kitap övülmüş ve hızla ikinci baskıya sipariş verilmiştir. Dizin eksikliği satışı düşürmesi beklenen bir engeldir, ama ana cümle yine de olumlu sonucu verir. Bu yüzden even though ile verilen olumsuz bilgiye rağmen gelen sonuç beklenmedik sonuçtur (-e rağmen). A: provided that yeniden basımı satılmayan stoka bağlar; oysa talep olmadan baskı sipariş edilmez. B: as soon as geri çekilmeden sonra baskıyı kurar; bu zaman sırası övgüyle ve siparişle çelişir. C: whereas iki durum arasında gerçek bir zıtlık kurar; oysa eleştirmenler de başarıyı öngörmüştür. E: because geri çekme kararını sipariş nedeni yapar; bu, yayınevinin sipariş vermesiyle çelişir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "provided that the first print run had sat unsold in warehouses for most of the year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the grammar had been withdrawn from every university bookstore",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas reviewers had already predicted that the grammar's clarity would make it a strong seller in university bookshops",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though the book contained no index, so readers struggled to locate specific examples",
        "correct": true
      },
      {
        "text": "because the publisher had already decided to withdraw the grammar from its catalogue before the reviews appeared",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 302,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the trading guild expanded its network of routes across three neighbouring regions during the fourteenth century.",
    "explanation": "Normalde salgında üyelerinin yarısını kaybeden bir loncanın ağını daraltmasını beklersin. Ana cümle ise genişlemeyi söyler; bu beklenmeyen bir sonuçtur. A, Although ile beklenmedik sonuç (-e rağmen) ilişkisi kurar. B, As soon as ile sıralama kurar; sayım ile genişleme arasında mantıklı bir zaman bağı yoktur. C, Whereas ile zıtlık kurar, ama charter kazanmak genişlemeye karşıt değildir. D, Because ile neden bildirir; charter kaybı genişlemeyi açıklayamaz. E, If ile koşul kurar; sınır engeli genişlemeyi koşullandıramaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the guild had lost nearly half its members to plague that decade",
        "correct": true
      },
      {
        "text": "As soon as the guild's treasurers had counted their losses to plague",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the guild had secured several new trading charters that decade",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because its merchants had been stripped of their charters and barred from every market town in the region",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "If the guild's agents were turned back at every border checkpoint that decade",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 303,
    "section": "sentence",
    "layout": "blank",
    "stem": "The fishing cooperative in the small coastal town reported record profits for the third consecutive year ----.",
    "explanation": "Normally a cooperative with record profits is expected to have had good conditions, so rising fuel costs squeezing margins is the unexpected element. Option B, with although, presents the costs as a hindrance yet profits still rose, which is the beklenmedik sonuç (-e rağmen) relation. A uses whereas, a zıtlık that lacks real opposition: falling costs simply support the profits. C, with because, makes members abandoning fishing a cause of record profits, which contradicts the reported outcome. D, with provided that, sets a condition that cannot restrict a past achievement already reported. E, with as soon as, implies a storm in autumn after the profits were already reported, an impossible time order for the third consecutive year.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas its operating costs fell sharply during most of that period",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although rising fuel costs squeezed its margins during most of that period",
        "correct": true
      },
      {
        "text": "because most of its members abandoned fishing and sold their boats before the first season began",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that its boats stayed in port for most of each season",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as a severe storm damaged its fleet in the autumn",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 304,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the lagoon's bird population rose sharply within two seasons of the restoration project.",
    "explanation": "Sen, kirlilik gibi olumsuz bir durumun kuş sayısını düşüreceğini beklersin. Ana cümle ise tersini bildirir: kuşlar hızla arttı. Bu beklenmedik sonuç (-e rağmen) ilişkisidir; doğru cevap A'dır, çünkü Even though kirliliğe rağmen gerçekleşen artışı bağlar. B neden bildirir ama pestisit artışı açıklamaz. C koşul kurar, koşul artışı sınırlayamaz. D zaman sırası kurar, oksijen çöküşü artıştan önce olamaz. E zıtlık kurar, ama iki cümlede gerçek bir karşıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Even though the lagoon had received untreated sewage from nearby farms for over a decade",
        "correct": true
      },
      {
        "text": "Because the nearby farms had begun spraying pesticides across the shoreline reeds that same spring",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as nearby farms kept dumping toxic runoff into the water every week",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as oxygen levels in the lagoon collapsed during the summer algae bloom",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the lagoon was already drawing more waders and herons with each passing year",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 305,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the medieval expedition returned with a detailed map of the entire coastline.",
    "explanation": "Normalde iki gemisini kaybeden seferin boş dönmesi beklenir. Ancak ana cümle ayrıntılı kıyı haritasıyla dönüşü anlatır; bu beklenmedik sonuçtur. Bu yüzden Although beklenmedik sonuç (-e rağmen) ilişkisi kurar; doğru seçenek D'dir. A: As soon as zaman sırası kurar; fırtınadan hemen sonra tüm kıyının haritalanması imkânsızdır. B: Whereas zıtlık kurar; ama haritalama ile gemi kaybı arasında gerçek karşıtlık yoktur. C: Because neden bildirir; grafikleri terk eden ekibin harita çıkarması mantıksızdır. E: Unless koşul bildirir; reddetme tamamlanmış dönüşü kısıtlayamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as a sudden gale had sunk two of its three ships off the coast",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the expedition's cartographers had spent nearly three years charting every bay and inlet along the route",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the crew had abandoned their charts before reaching the coast",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the expedition had lost two of its three ships in a violent storm off the northern cape",
        "correct": true
      },
      {
        "text": "Unless the crew refused to chart the southern bays and the inland shore",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 306,
    "section": "sentence",
    "layout": "blank",
    "stem": "The regional bank expanded its loan portfolio by twelve percent last year ----.",
    "explanation": "Beklenen sonuç, sermaye rezervleri azalırken kredi büyümesinin yavaşlamasıdır. Ana cümledeki yüzde on iki büyüme ise beklenmedik bir sonuçtur; bu yüzden 'although' ile kurulan E, beklenmedik sonuç (-e rağmen) ilişkisini doğru verir. A: 'whereas' zıtlık kurar ama cümlede gerçek bir karşıtlık yoktur. B: 'because' neden kurar; kredi onaylarının donması büyümeyle çelişir. C: 'unless' koşul kurar; geçmiş bir büyümeyi kısıtlayamaz. D: 'as soon as' sıralama kurar; kredileri askıya almak büyümeyle bağdaşmaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas its capital reserves had also been drawn down steadily over the previous year by similar lending",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because its lending committee had frozen all new credit approvals during the first quarter",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "unless the bank had been forced to halt all new lending during the first quarter",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as a series of defaults on commercial property loans forced it to suspend all new lending",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "although its capital reserves had already fallen to the strict regulatory minimum",
        "correct": true
      }
    ]
  },
  {
    "slot": 307,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the rural clinic's vaccination program recorded record enrolment this spring.",
    "explanation": "Normalde iki hemşiresini kaybetmiş bir kliniğin rekor kayıt yapması beklenmez; beklenti zayıf bir performanstır. Ana cümledeki rekor kayıt bu beklentinin tersi olduğu için Even though beklenmedik sonuç (-e rağmen) ilişkisi kurar. A, Because ile neden bağı kurar; yeni hasta kabul etmeyen bir klinikte rekor kayıt mantıksızdır. B, Provided that ile koşul kurar; cerrahi ziyaretlerin iptali rekor kaydı kısıtlayamaz. C, As soon as ile ardışıklık kurar; fon kesintisi rekor kaydı anında doğuramaz. E, Whereas ile zıtlık kurar; ama ailelerin zaten kapsanmış olması gerçek bir karşıtlık oluşturmaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the clinic had stopped accepting new patients altogether that year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the clinic had cancelled all of its outreach visits during the winter",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the regional health board cut the clinic's annual funding in January",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Even though the clinic had lost two of its three nurses during the winter",
        "correct": true
      },
      {
        "text": "Whereas the clinic's vaccination program had already reached most local families by early winter",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 308,
    "section": "sentence",
    "layout": "blank",
    "stem": "The linguist's new corpus contained more than two million words, and her team completed the annotation within a single semester ----.",
    "explanation": "Sen şunu fark etmelisin: tarihsel lehçe verisinde deneyimsiz annotatörler işi bir dönemde bitirmeyi zorlaştırır, yani normalde beklenen sonuç bu olur. Ana cümle ise işin tamamlandığını söyler, bu da beklenmedik sonuç (-e rağmen) ilişkisidir ve even though bunu kurar. A unless koşul kurar, ama cümle bir koşulun yokluğuna bağlı değildir. C as soon as zaman ardıllığı kurar; fon kesildikten hemen sonra bitirmek mantıksızdır. D whereas zıtlık kurar, ama iki durum arasında gerçek bir karşıtlık yoktur. E because neden kurar; yazılımın kullanılamaması tamamlanmayı açıklamaz, tersine engellerdi.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "unless the annotation software had crashed nearly every afternoon for several weeks",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though none of the annotators had previously worked with historical dialect data",
        "correct": true
      },
      {
        "text": "as soon as the project's funding was cut in the spring",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas her team had already annotated a similar corpus the previous year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the annotation software had been unavailable for most of the term",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 309,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the excavation team finished mapping the entire site ahead of schedule.",
    "explanation": "Doğru cevap E. Normalde sular altındaki çamur ve moloz altında kalan bir alanın kazıyı yavaşlatmasını beklersin. Ana cümle ise işin planlanandan önce bitmesi olduğu için beklenmedik sonuçtur; Although bu nedenle beklenmedik sonuç (-e rağmen) ilişkisini kurar. A cause kurar, ama küçük ekip erken bitirmeyi açıklamaz. B condition kurar, ama gömülü olmak bitirmeyi koşullandıramaz. C sequence kurar, ama sel kazıyı durdururken haritalama bitemez. D contrast kurar, ama ekstra personel ve ekipman arasında gerçek bir zıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the crew had been reduced to only two surveyors after the budget cuts",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the ancient city had been buried under deep, sodden sediment and debris",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as heavy monsoon rains flooded the trenches and halted all digging",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the excavation team had brought extra staff and modern ground-scanning equipment to the site",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the ancient city lay beneath several metres of waterlogged clay and rubble",
        "correct": true
      }
    ]
  },
  {
    "slot": 310,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the review committee rejected the proposed tunnel route for the new rail line.",
    "explanation": "Normalde sağlam bir zemin, güzergâhın kabulünü bekletir. Doğru seçenek B, zeminin olağanüstü sağlam olduğunu söyler; bu olumlu bilgiye rağmen komite reddetmiştir, yani ret beklenmedik sonuçtur. Bu yüzden Although beklenmedik sonuç (-e rağmen) kurar. A zaman sırası kurar; ret, onaydan önce gerçekleşemez. C zıtlık kurar, fakat komitenin güvenlik ısrarı reddi destekler, karşıtlık yoktur. D neden kurar; ancak yerleşim bölgelerinden kaçınmak ve maliyet düşürmek reddi değil kabulü gerektirir. E koşul kurar; yükleniciler maliyeti üstlenmeyi kabul etse bile ret koşula bağlanamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the engineers confirmed that the route would require no major excavation",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the geological survey indicated that the ground along the route was unusually stable",
        "correct": true
      },
      {
        "text": "Whereas the review committee had repeatedly insisted that new rail lines avoid any risk to existing foundations",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the proposed route avoided every residential district and would cut construction costs by nearly half",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the contractors had agreed to cover all cost overruns",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 311,
    "section": "sentence",
    "layout": "blank",
    "stem": "The volunteers in the memory study performed far better than expected on the recall tasks ----.",
    "explanation": "Sen de uykusuz gönüllülerin kötü performans göstermesini beklersin. Ana yargı ise beklenmedik sonucu verir: gönüllüler çok daha iyi performans gösterdi. Bu, although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir, yani C doğrudur. A koşul bildirir ve ana yargıyı kısıtlar. B zaman sırasını bozar. D zıtlık kurar ama gerçek bir karşıtlık yoktur. E neden bildirir fakat sebep beklenen sonucu destekler, cümle mantıksız olur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "unless they had been given a full night's sleep beforehand",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "before the researchers had explained the recall instructions to them",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "although they had been awake for almost thirty hours before the session began",
        "correct": true
      },
      {
        "text": "whereas they had slept well the night before and were rested and alert for the session",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had received no practice trials and were completely unfamiliar with the recall materials beforehand",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 312,
    "section": "sentence",
    "layout": "blank",
    "stem": "The small textile cooperative expanded its export contracts to three new markets this year ----.",
    "explanation": "Normalde maliyetler sert artıp ana tedarikçi iflas ettiğinde, sen ihracat genişlemesini beklemezsin; ana cümle bu yüzden beklenmedik sonuçtur. B, even though ile bu sonucu beklenmedik sonuç (-e rağmen) yoluyla doğru bağlar. A whereas ile zıtlık kurar, ama beklentiye karşı bir durum yoktur. C because gerekçe bildirir; lisans iptali genişlemenin nedeni olamaz. D as long as koşul kurar; tasarımcıların istifası genişlemeyi kısıtlamaz. E as soon as zaman sırası kurar; kış kapanışı yıl boyu süren genişlemeyle mantıksal sırada değildir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the cooperative had also increased its export volumes and hired more weavers over the same period",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though its production costs had risen sharply and its main supplier had gone bankrupt",
        "correct": true
      },
      {
        "text": "because its export licences had been revoked and its warehouses were standing empty with no buyers left",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as long as its leading designers had already resigned and its largest domestic buyers had cancelled their orders",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as its largest weaving mill had shut down for the winter",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 313,
    "section": "sentence",
    "layout": "blank",
    "stem": "The coastal plant population grew steadily for a decade, and its seeds spread across the dunes ----.",
    "explanation": "Sen önce beklentiyi düşün: besinden yoksun bir kumulda bitkilerin gelişmemesi beklenir. Ana cümle ise tersini söyler; popülasyon büyür ve tohumlar yayılır. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir, although tam bunu kurar. A whereas iki olumlu durumu karşılaştırır, gerçek bir zıtlık yoktur. B because neden bildirir ama çalılar tohumları engelleyeceği için yayılma mantıksız olur. D provided that koşul bildirir; rüzgârın esmesi yayılmayı kısıtlayamaz. E as soon as zaman sırası kurar; kış fırtınası on yıllık kademeli büyümeyle uyuşmaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the soil there contained abundant nutrients that helped new roots establish quickly",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the dunes were already fully covered by dense shrubs that blocked every seed from reaching the ground",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although the soil there contained very little nitrogen and almost no organic matter to support new roots",
        "correct": true
      },
      {
        "text": "provided that the prevailing winds had been blowing steadily away from the dunes and inland",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as winter storms buried the young seedlings under drifting sand",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 314,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the bird population in the coastal reserve grew sharply over the past three breeding seasons.",
    "explanation": "Normalde fonun yarıya inmesi popülasyonun düşmesini beklettirir; oysa ana cümlede popülasyon sert biçimde artmıştır. Bu beklenmedik sonuç (-e rağmen) ilişkisidir, bu yüzden doğru cevap A'dır. B: Because, yırtıcıların serbestliğini neden olarak verir; bu artışla değil düşüşle uyuşur, yanlıştır. C: As long as, koşul kurar; kaçak avcıya erişim artışın koşulu olamaz, mantıksızdır. D: As soon as, zaman sırası kurar; işten çıkarmalar üç sezon boyunca tekrarlanamaz, zaman akışı imkânsızdır. E: Whereas, zıtlık kurar ama gerçek bir karşıtlık yoktur; devriye artışı popülasyonu destekler, beklenmedik sonuç değildir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the reserve lost nearly half of its annual funding during that period",
        "correct": true
      },
      {
        "text": "Because predators were allowed to roam freely across every nesting ground during those three seasons",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as poachers had free access to the nesting grounds throughout those seasons",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as rangers were laid off from the coastal reserve",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the reserve's wardens doubled their patrols against egg poachers during those seasons",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 315,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the coastal wetland recovered its bird population within only two years.",
    "explanation": "Normalde ağır kirlilik, bir sulak alanın kuşlarını kısa sürede geri getirmez; beklenti olumsuzdur. Ana cümle bu beklenmedik sonucu verdiği için doğru bağlaç 'Although' (-e rağmen) olur ve beklenmedik sonuç (-e rağmen) ilişkisi kurar. A: 'Because' sebep kurar, ama yollar ve tarama kuşların dönüşünü açıklamaz. B: 'As long as' koşul kurar; kurutma ve tarama bir koşul olamaz. D: 'As soon as' zaman ilişkisi kurar; donma, iyileşmeden önce gerçekleşemez. E: 'Whereas' zıtlık kurar, ama geçmiş kuş kolonileri iyileşmeyle gerçek bir karşıtlık oluşturmaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because its shoreline had been paved over with highways and its marsh grasses were repeatedly cleared",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as the marsh was regularly drained and dredged for shipping",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although decades of industrial runoff had poisoned its water and sediments",
        "correct": true
      },
      {
        "text": "As soon as a severe winter froze its shallow pools",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the coastal wetland had already supported large bird colonies for decades before its recovery",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 316,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the engineers approved the foundation design for immediate construction.",
    "explanation": "Normalde zemin sorunu varsa onay verilmez; bu beklenen sonuçtur. Ana cümle ise sorunlu zemine rağmen hemen inşaata onay verildiğini söyler; bu beklenmedik sonuçtur, dolayısıyla doğru cevap beklenmedik sonuç (-e rağmen) kuran Although seçeneğidir. A) As soon as zaman sırası kurar, ama zamanlama mantıksız kalır. C) Whereas zıtlık kurar, fakat iki durum da olumludur, gerçek karşıtlık yoktur. D) Because neden kurar, ama risk raporları onayın tersini destekler. E) If koşul kurar, fakat onay kesin bir olay olarak anlatıldığından koşul bu cümleyi kısıtlayamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as soil tests showed the ground was prone to shifting",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the geotechnical survey had revealed unstable clay beneath the entire building site",
        "correct": true
      },
      {
        "text": "Whereas the engineers had carefully reviewed every element of the foundation design before approving it",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the soil reports had flagged serious subsidence risks across every lot",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "If the soil samples showed heavy groundwater seepage across the lot",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 317,
    "section": "sentence",
    "layout": "blank",
    "stem": "Inflation fell sharply in the country last year ----.",
    "explanation": "Doğru cevap E. Hükümetin aşırı para basması enflasyonu artırmasını bekleriz; ana cümle ise enflasyonun düşmesi, yani beklenmedik sonuçtur. Bu yüzden although, beklenmedik sonuç (-e rağmen) ilişkisini kurar. A whereas ile zıtlık kurar, ama faiz artışı düşüşle çelişmez. B because neden kurar, fakat enerji fiyatı artışı enflasyonu yükseltir. C as long as koşul kurar; geçmiş bir olayı koşula bağlamak anlamsızdır. D as soon as ardıllık kurar; üç yıl süren durgunluk geçmiş yılın düşüşünden önce gelemez.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the central bank had been raising interest rates steadily throughout the previous twelve months",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because global energy and food prices had surged for months and supply chains remained badly disrupted",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as long as wages had been rising faster than productivity for several years",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as household incomes stagnated for a third consecutive year",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "although the government had been printing money at an unprecedented rate for months",
        "correct": true
      }
    ]
  },
  {
    "slot": 318,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the team finished cataloguing the pottery shards ahead of schedule.",
    "explanation": "Doğru cevap E. Yoğun yağmurların erişim yolunu çamura çevirmesi normalde gecikme beklemeni sağlar. Ana cümle ise beklenmedik bir sonucu bildirir: kataloglama erken bitmiştir. Bu, Although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisidir. A: Because neden-sonuç kurar; personel sıkıntısı gecikmeyi açıklar, erken bitişi değil. B: Provided that koşul kurar; iki kişinin çekilmesi işi kısıtlar, erken bitirmeyi engeller. C: As soon as zaman sırası kurar; elektrik kesintisi kataloglamanın erken bitişiyle mantıksal bir sıra oluşturmaz. D: Whereas zıtlık kurar; etiketleme ve sıralama bitirmeyi destekler, karşıt bir durum değildir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because two of the four cataloguers had been reassigned to excavation duties and the remaining staff were already overloaded",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the supervisor withdrew two of the cataloguers the week before",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as the lab lost its only freezer to a power failure",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the team had already labelled every crate and sorted the fragments by period",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the heavy seasonal rains had turned the only access road into deep mud",
        "correct": true
      }
    ]
  },
  {
    "slot": 319,
    "section": "sentence",
    "layout": "blank",
    "stem": "The university kept its study rooms open until midnight throughout the examination period ----.",
    "explanation": "Normalde, kötü koşullarda çalışma odalarının kapatılmasını beklersin. Asıl cümle ise tam tersini, yani odaların gece yarısına kadar açık tutulmasını söylüyor. Isıtma haftalardır bozuk ve kimse tamir etmemiş; bu olumsuzluk, açık tutmanın beklenmedik sonucudur. Bu yüzden although ile kurulan beklenmedik sonuç (-e rağmen) ilişkisi doğrudur. Diğer seçenekler farklı ilişkiler kurar ve hepsi mantıksal olarak yanlış sonuç verir.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "although the heating in those rooms had been broken for several weeks and nobody had repaired it",
        "correct": true
      },
      {
        "text": "whereas the university also extended library opening hours during the examination period as well",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the administration had just announced that all campus buildings would close early to cut energy costs",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that the rooms had been locked by nine o'clock every evening of the examination period",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the examination period had already ended in early May",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 320,
    "section": "sentence",
    "layout": "blank",
    "stem": "The mountain school's library stayed open every evening through the winter, and students who studied there regularly earned top marks in their exams ----.",
    "explanation": "Normally you would expect a library with no heating and a freezing reading room to hurt exam results, so the expected outcome is poor marks. Option D gives the concession (-e rağmen), so the main clause, earning top marks, is the unexpected outcome. Option A builds contrast (zıtlık) with whereas, but it names no real opposition, so the sentence does not signal an unexpected result. Option B gives a cause, but the reason stated supports the opposite of the main clause. Option C sets a condition, but rarely visiting the library cannot restrict the outcome of regular study. Option E gives a sequence, but the heating breakdown in January cannot come before a winter-long pattern that began earlier.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas the students who studied there were highly motivated and well prepared for every single exam",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the library had few reference books, and most regular visitors had no access to the exam syllabus or past papers",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "provided that they rarely visited the library during the winter months when the exams were held",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though the building had no heating and the reading room was often so cold that students wore their coats",
        "correct": true
      },
      {
        "text": "as soon as the library's heating system broke down in the second week of January",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 321,
    "section": "sentence",
    "layout": "blank",
    "stem": "Many participants in the memory experiment recalled every word on the list perfectly ----.",
    "explanation": "Normalde neredeyse otuz saat uyanık kalmak hafızayı zayıflatır, bu yüzden beklenen sonuç kötü hatırlamadır. Ana cümle ise tam hatırlamayı bildirir; bu beklenmedik sonuçtur (-e rağmen), bu yüzden although doğru seçenektir. A) provided that koşul kurar; ağır alkol tam hatırlamayı koşullandırmaz, cümle anlamsızlaşır. B) after zaman sırası kurar; gece uyandırılmak tam hatırlamanın nedeni olamaz. C) whereas zıtlık kurar; ancak iyi dinlenmiş olmakla tam hatırlama arasında gerçek bir karşıtlık yoktur. D) because neden-sonuç kurar; tek ve hızlı okuma tam hatırlamayı değil zayıf hatırlamayı açıklar.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "provided that they had consumed heavy amounts of alcohol shortly before the test",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "after they had been woken repeatedly by the experimenters during the night",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas they had rested well the night before sitting the exam",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because the list had been read to them only once and at a very high speed",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although they had been awake for almost thirty hours before the test",
        "correct": true
      }
    ]
  },
  {
    "slot": 322,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the research team kept the antibiotic regimen unchanged for all patients in the ward.",
    "explanation": "Doğru cevap D. Önce beklenen durumu düşün: ciddi yan etkiler bildirildiğinde ilaç rejimi genellikle değiştirilir. Ana cümle ise tersini söyler: rejim değiştirilmedi. Bu, beklenmedik sonuç (-e rağmen) ilişkisidir ve Although bunu kurar. A seçeneği Because ile değiştirme kararını neden gösterir, bu da ana cümlenin tersidir. B seçeneği Provided that ile bir koşul kurar, ama enfeksiyon oranı rejimin korunmasını kısıtlayamaz. C seçeneği As soon as ile imkansız bir zaman sırası kurar; kayıt ilacı değiştirmez. E seçeneği Whereas ile zıtlık kurar, ama doz değişikliği ile rejimin korunması arasında gerçek bir karşıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the team had already decided to switch every patient to a new drug by that morning",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Provided that the ward nurses had reported a steadily rising infection rate among patients",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as one nurse recorded a drop in the drug's effectiveness",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the earlier study on a small group of patients had reported severe side effects",
        "correct": true
      },
      {
        "text": "Whereas the research team had also changed the dosage for every patient in the ward",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 323,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the trial volunteers reported a full recovery from chronic fatigue within one month.",
    "explanation": "Beklenen, dozları kaçıran gönüllerin iyileşmemesidir; ana cümle ise tam iyileşmeyi, yani beklenmedik sonucu bildirir. Doğru cevap beklenmedik sonuç (-e rağmen) kuran Although'dur. A) Because: ilacın erken kesilmesi iyileşmenin nedeni olamaz. C) Provided that: koşul, iyileşmeyi kısıtlayamaz. D) As soon as: nüks, iyileşmeden önce gelmek zorunda; zaman sırası tutmaz. E) Whereas: zıtlık kurar, ama beklenen bir karşıtlık yoktur.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Because the treatment was withdrawn after only a week for most participants",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the volunteers had missed nearly a third of their scheduled doses",
        "correct": true
      },
      {
        "text": "Provided that the volunteers had skipped most of their scheduled doses",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As soon as participants had suffered a serious relapse during the second week",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the trial volunteers had taken every scheduled dose on time",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 324,
    "section": "sentence",
    "layout": "blank",
    "stem": "The new phonetics lab recorded dialects that had never been documented, and the team quickly produced a detailed corpus of their vowel systems ----.",
    "explanation": "Normally, a team would not produce a detailed corpus so quickly with brand-new equipment, so the expectation is that delivery just before fieldwork would delay or hinder the work. The main clause says the team did produce it quickly, which is the unexpected outcome, so D's concessive even though (-e rağmen) fits. A states a condition, which cannot restrict a completed achievement. B gives an impossible time order for a corpus already produced. C builds contrast, but training on equipment is not opposed to the outcome in a way that yields surprise, and the item's concession relation is needed. E gives a cause that supports the opposite of the quick success.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "provided that the speakers were too fatigued to pronounce the vowels clearly",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the recording software crashed during the second week of fieldwork",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas the team had already spent months training on the equipment before any recordings were made",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though the recording equipment had been delivered only two days before the fieldwork began",
        "correct": true
      },
      {
        "text": "because the lab had no trained phoneticians on staff and the team had never worked with these languages before",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 325,
    "section": "sentence",
    "layout": "blank",
    "stem": "The volunteers in the invented attention study reported feeling completely rested and alert at the start of each session ----.",
    "explanation": "Normalde az uyuyan birinin yorgun hissetmesi beklenir. Ana cümledeki dinç ve uyanık olma durumu bu beklentinin tersi olduğu için beklenmedik sonuç (-e rağmen) anlamı taşır; doğru seçenek although ile bunu kurar. A: provided that koşul kurar, ama dinçlik bir koşula bağlı değil, cümle mantıksız kalır. B: as soon as zaman ardıllığı kurar; kahvaltıyı atlayıp yağmurda yürümek dinçliği doğurmaz, mantık bozulur. C: whereas zıtlık kurar, ama iki dinlenme durumu arasında gerçek bir karşıtlık yoktur. D: because neden kurar; gece uyanık kalmak yorgunluk doğurur, dinçliği açıklamaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "provided that they had drunk three cups of coffee shortly before going to bed",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as they had skipped breakfast and walked across campus in the rain",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas they had spent the previous afternoon resting quietly in the same calm laboratory room",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because they had been awake for nearly two full days without any rest",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "although they had slept fewer than four hours the night before",
        "correct": true
      }
    ]
  },
  {
    "slot": 326,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the small river town grew rapidly and attracted hundreds of new settlers in the fifteenth century.",
    "explanation": "Sen normalde kötü kış ve mahsul kaybının bir kasabanın büyümesini ve yeni yerleşimci çekmesini engelleyeceğini beklersin. Although ile kurulan D seçeneği bu beklentiye karşı çıkar; beklenmedik sonuç (-e rağmen) ilişkisi vardır: zor koşullara rağmen kasaba hızla büyür. A) As soon as zaman sırası kurar; çöküşten hemen sonra büyüme mantıksızdır. B) Whereas zıtlık kurar; ancak güvenilir ticaret yolu ile büyüme arasında karşıtlık yoktur. C) Because neden bildirir; ticaretin yasaklanması büyümeyi açıklamaz, aksine engeller. E) As long as koşul bildirir; kuzey yolunun kapalı olması büyümeyi koşullandıramaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the regional trade route had collapsed and merchants fled the valley",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the small river town had already gained a reputation for reliable trade routes",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the regional lords had barred all local merchants from trading in every nearby market",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the harsh winters had destroyed most of the crops in the surrounding valley",
        "correct": true
      },
      {
        "text": "As long as the north road had been blocked to merchants and farmers alike",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 327,
    "section": "sentence",
    "layout": "blank",
    "stem": "The town council expanded the public library's opening hours and added free study rooms, so attendance was expected to rise sharply ----.",
    "explanation": "Saatlerin uzatılması ve ücretsiz odalar katılımın artacağını düşündürür; sen de bu beklentiyi doğal bulursun. A seçeneğindeki although, personel kaybı gibi bir engel verir, ama ana cümle yine de artışı bildirir; bu bir beklenmedik sonuç (-e rağmen) ilişkisidir. B koşul kurar, oysa koşul katılımı kısıtlamaz. C zaman sırası kurar, ama istifa ile katılım arasında mantıklı bir zaman bağı yoktur. D zıtlık kurar, fakat sadakatli okuyucular bir karşıtlık oluşturmaz. E neden bildirir, ama çevrimiçi okumaya geçiş kütüphaneye gelişi artırmaz, azaltır.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "although the library had lost nearly half of its staff over the previous year",
        "correct": true
      },
      {
        "text": "provided that most nearby households had already moved their reading habits to streaming and audiobook apps",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as the library's longtime director resigned amid a bitter budget dispute with the council",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "whereas the library already had a loyal base of regular readers who visited every week",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because most local residents had already switched to reading entirely online and stopped visiting libraries",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 328,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the medieval town of Varnel continued to expand its trade routes across the highlands.",
    "explanation": "Anahtar A. Beklenen sonuç: kar yüzünden geçitlerin altı ay kapalı olması ticareti durdurur. Ana cümle ise bunun tersini, yolların genişlemeye devam ettiğini bildirir; bu yüzden Although beklenmedik sonuç (-e rağmen) ilişkisi kurar. B: As soon as zaman sırası kurar, ama köprünün çöküşü genişlemeyi mantıksız biçimde zamanlar. C: Whereas zıtlık kurar, fakat kervan zenginliği genişlemeyle gerçek bir karşıtlık oluşturmaz. D: Because neden bildirir; mal kaybı genişlemenin nedeni olamaz, tersini gösterir. E: As long as koşul kurar; kervanların durması genişlemeyi kısıtlayamaz, ana cümle bunu yanlışlar.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "Although the mountain passes were blocked by snow for six months every year",
        "correct": true
      },
      {
        "text": "As soon as the bridge over the river Tarn collapsed in the spring flood",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas Varnel gained wealth with every caravan that crossed its gates",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Because the town's merchants had lost all their goods to bandits in the previous decade",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "As long as merchant caravans were stalled at lowland depots for most of each year",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 329,
    "section": "sentence",
    "layout": "blank",
    "stem": "----, the research team produced the sharpest images the observatory had ever recorded of its faintest nebula.",
    "explanation": "Sen önce beklentiyi düşün: kirli gökyüzü ve eski dedektör kötü görüntü getirir. Ana cümle ise tam tersini, en keskin görüntüleri anlatır. Bu yüzden Although ile kurulan beklenmedik sonuç (-e rağmen) doğrudur. A: As soon as zaman sırası kurar; dedektör arızası ile keskin görüntü aynı anda mantıksız bir sıra oluşturur. B: Whereas zıtlık kurar ama iki yan cümlede gerçek karşıtlık yoktur; yazılım hazırlığı keskin görüntüyü destekler. D: Because neden bildirir; teleskop sökülüyken gözlem yapılamayacağı için sonucu çelişkili kılar. E: If koşul bildirir; her gece odak kaybı, en keskin görüntülerle bağdaşmayan bir kısıtlamadır.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "As soon as the aging detector failed during the final exposure",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Whereas the research team had spent years refining its image-processing software before the observation campaign began",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "Although the observatory sat beneath heavy city light pollution and its aging detector had not been recalibrated for years",
        "correct": true
      },
      {
        "text": "Because the observatory's telescope mirror had been dismantled for repairs that spring and no observations were scheduled",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "If the detector drifted out of focus every night that season",
        "distractor": "CONNECTOR_ERROR"
      }
    ]
  },
  {
    "slot": 330,
    "section": "sentence",
    "layout": "blank",
    "stem": "The island's lizard population grew rapidly over the decade, and researchers recorded a steady rise in the number of hatchlings each spring ----.",
    "explanation": "Sen beklersin ki sahildeki yuva alanının yarısının kaybı yavru sayısını azaltsın. Doğru seçenek C, even though ile bu beklentiye karşı beklenmedik sonuç (-e rağmen) kurar: alan kaybına rağmen yavrular her bahar artmıştır. A, whereas ile zıtlık kurar ama iki durum birbirine karşıt değildir. B, because neden bağlar fakat kedi avı yavru artışını açıklamaz, tersine azaltmalıdır. D, provided that koşul kurar; yiyecek kaynağının azalması bir artışı koşullandıramaz. E, as soon as anlık bir sıra kurar; on yıla yayılan sürekli artışla uyuşmaz.",
    "difficulty": 3,
    "skills": [
      "sentence-link"
    ],
    "choices": [
      {
        "text": "whereas breeding adults found plenty of insects to feed on and more eggs survived to term",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "because feral cats were introduced to the island that same year and began hunting nesting females near their nests",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "even though the island had lost nearly half of its nesting ground to coastal flooding",
        "correct": true
      },
      {
        "text": "provided that the island's food supply had been steadily shrinking each year",
        "distractor": "CONNECTOR_ERROR"
      },
      {
        "text": "as soon as coastal storms washed away the dense vegetation where the lizards nested",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 401,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Researchers found that cities with more tree cover recorded lower summer temperatures than neighboring areas with little vegetation.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Kaynakla aynı karşılaştırma: daha sık ağaç, yazın daha serin. B: Metinde olmayan neden ekler: parklar yüzünden. C: ‘Hiçbir şehir’ kaynakta yok; kapsam genişler. D: ‘Bütün ağaçlar, her şehir’ niceleyiciyi büyütür. E: Sonucu ters çevirir: daha serin değil, daha sıcak der.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Cities with dense tree cover were found by researchers to be cooler in summer than nearby areas that had little vegetation.",
        "correct": true
      },
      {
        "text": "Researchers found that cities with more tree cover were cooler in summer mainly because they had more public parks than their neighbors.",
        "distractor": "CONTEXT_MISMATCH"
      },
      {
        "text": "Researchers found that no city with little vegetation was cooler in summer than a neighboring area with tree cover.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Researchers found that all trees in every city reduced summer temperatures far more than any other environmental factor.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Researchers found that cities with more tree cover were warmer in summer than neighboring areas with little vegetation.",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 402,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Researchers who share their raw data early often receive more citations, although the reasons for this pattern are still debated.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Nedenler hâlâ tartışılıyor; ‘uzlaştılar’ demek ek bilgidir. B: Sık atıf ve nedenlerin açık kalması korunur. C: Daha büyük dergi nedeni ekler, tartışmayı siler. D: Paylaşmayanların az atıf aldığını kaynak söylemez. E: ‘Often’ı ‘all’ yapar; eğilim evrensel olur.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Researchers who share their raw data early are cited more often, and scholars agree on why this happens.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Early sharing of raw data tends to bring researchers more citations, though the causes of this link remain under discussion.",
        "correct": true
      },
      {
        "text": "Researchers who share raw data early are cited more often mainly because they publish in larger journals.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Researchers who do not share their raw data early rarely receive citations, although the reasons are unclear.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "All researchers who share their raw data early receive more citations, and the reasons for this are still debated.",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 403,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Although the university expanded its library hours during exams, many students still reported that they could not find a quiet place to study.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Neden ekler ve sonucu ters çevirir: çoğu kişi sessiz yer bulmuş gibi. B: Ödün ve ‘birçok öğrenci sessiz yer bulamadı’ korunur. C: ‘Her öğrenci buldu’ der; kaynak bunun tersini söyler. D: Uzatılan saati, yer bulmanın nedeni yapar. E: ‘Hiç kimse bulamadı’ der; kaynak ‘birçoğu’ der.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Because the university extended library hours during exams, most students reported finding a quiet place to study easily.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Many students said they struggled to find a quiet study space, even though the library had extended its hours during exams.",
        "correct": true
      },
      {
        "text": "The university extended library hours during exams, so every student who needed a quiet place to study found one.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Students reported that the library's extended hours during exams were the main reason they could find quiet study places.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Despite longer library hours during exams, no students reported that they had found a quiet place to study.",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 404,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Because the lab lost its funding in March, several graduate students had to pause their experiments until the following autumn.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Mart’taki fon kaybı ve sonbahara kadar ara korunur. B: Zamanı ters çevirir: fon kaybı önceki sonbahar, ara Mart. C: Birkaç öğrenciyi tüm bölüme, geçici arayı kalıcı duruşa çıkarır. D: Fon kaybını ve kesintiyi yok sayar. E: Fon kaybını siler, laboratuvarın dış fona hiç bağlı olmadığını ekler.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Several graduate students paused their experiments until autumn because the lab lost its funding in March.",
        "correct": true
      },
      {
        "text": "Several graduate students paused their experiments in March because the lab had lost its funding the previous autumn.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Once the lab lost its funding in March, all graduate students in the department stopped their experiments permanently.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "The lab did not lose its funding in March, so the graduate students were able to continue their experiments without interruption.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Several graduate students paused their experiments until autumn, although the lab had never depended on external funding.",
        "distractor": "CONTEXT_MISMATCH"
      }
    ]
  },
  {
    "slot": 405,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Although the university expanded its library hours during exams, many students still preferred to study in their dormitories because they found them quieter.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Kütüphane genişlemesini yurt seçiminin nedeni yapar; ödünü düşürür. B: Saat uzamasını neden yapar ve yurdu gürültülü gösterir. C: Ödün, ‘birçoğu’, yurdun daha sessiz olması korunur. D: ‘Hiçbir öğrenci’ kaynakta ‘birçok öğrenci’yi yalanlar. E: ‘Birçoğu’nu ‘hepsi’ yapar ve nerede çalıştıklarını kaydırır.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Because the university expanded its library hours during exams, many students chose to study in their dormitories since they found them quieter.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Many students studied in their dormitories during exams because the library hours had been expanded, although they found the dormitories noisy.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Even though the university extended library hours during exams, many students still preferred studying in their dormitories, which they considered quieter.",
        "correct": true
      },
      {
        "text": "The university expanded its library hours during exams, so no student chose to study in the dormitories any longer.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Students in the university's dormitories found the library hours expanded during exams, and all of them studied there instead.",
        "distractor": "LOGICAL_ERROR"
      }
    ]
  },
  {
    "slot": 406,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Researchers found that the lake's fish population declined after the factory began releasing untreated waste into the river upstream.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Atık boşaltımı başladıktan sonra gölün düşmesi korunur. B: ‘Sonra’yı ‘çünkü’ yapar ve ‘yıllarca’ ekler. C: Tek gölü fabrikaya yakın her göle genişletir. D: Düşüşü yoksayar; kaynak düşüşü söyler. E: Arıtılmamış atığı arıtılmış diye değiştirir.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Researchers discovered that the lake's fish numbers fell once the factory started discharging untreated waste into the upstream river.",
        "correct": true
      },
      {
        "text": "Researchers found that the lake's fish population declined because the factory had been discharging untreated waste into the river for years.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Researchers found that fish populations declined in every lake near the factory after it began releasing untreated waste.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Researchers found that the lake's fish population did not decline after the factory began releasing untreated waste into the river.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Researchers found that the lake's fish population declined after the factory began releasing treated waste into the river upstream.",
        "distractor": "CONTEXT_MISMATCH"
      }
    ]
  },
  {
    "slot": 407,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Although the university expanded its library hours, many students still reported that they could not find quiet study space during exam weeks.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Neden ekler ve sonucu ters çevirir: yer kolay bulunmuş gibi. B: Sınav haftası, birçok öğrenci, sessiz yer zorluğu ve saat uzaması korunur. C: ‘Hiçbir öğrenci’ kaynakta ‘birçok öğrenci’yi yalanlar. D: ‘Birçok’u ‘bütün öğrenciler’ yapar. E: Sonucu ters çevirir ve gece yarısı gibi metinde olmayan ayrıntı ekler.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Because the university expanded its library hours, many students could easily find quiet study space during exam weeks.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Many students reported difficulty finding quiet study space during exam weeks, even though the library hours had been extended.",
        "correct": true
      },
      {
        "text": "No students reported difficulty finding quiet study space during exam weeks after the library hours were extended.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "All students at the university reported that quiet study space was hard to find during exam weeks, despite longer library hours.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Many students found quiet study space during exam weeks only because the university expanded its library hours to midnight.",
        "distractor": "CONTEXT_MISMATCH"
      }
    ]
  },
  {
    "slot": 408,
    "section": "restatement",
    "layout": "restatement",
    "stem": "Although the university expanded its library hours, many students still reported that they could not find quiet study space during exam weeks.",
    "explanation": "En yakın anlam kaynak cümleyi daraltmadan, genişletmeden ve neden eklemeden kurar. A: Neden ekler ve sonucu ters çevirir. B: Ödün, birçok öğrenci, sınav haftası ve yer bulamama korunur. C: ‘Birçok’u ‘hiçbir öğrenci’ yapar ve nedensellik ekler. D: Birçoğu herkese, sınav haftasını yılın her zamanına çıkarır. E: Kütüphanenin zorluğun nedeni olduğunu ekler; kaynak bunu söylemez.",
    "difficulty": 3,
    "skills": [
      "restatement-shift"
    ],
    "choices": [
      {
        "text": "Because the university expanded its library hours, many students reported that they could find quiet study space during exam weeks.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the university expanded its library hours, many students still reported difficulty finding quiet study space during exam weeks.",
        "correct": true
      },
      {
        "text": "The university expanded its library hours, so no students reported any difficulty finding quiet study space during exam weeks.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "Although the university expanded its library hours, all students reported that they could not find quiet study space at any time of year.",
        "distractor": "LOGICAL_ERROR"
      },
      {
        "text": "After the university expanded its library hours, many students still reported difficulty finding quiet study space, which the library had caused.",
        "distractor": "CONTEXT_MISMATCH"
      }
    ]
  }
];
