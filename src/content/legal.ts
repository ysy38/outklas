import { brand } from "@/brand";
import { authors, contactEmail } from "@/content/editorial";
import { offers, tl } from "@/content/offers";

export type LegalSection = { id: string; title: string; paragraphs: string[] };

export type LegalDoc = {
  path: string;
  title: string;
  description: string;
  updated: string;
  lead: string;
  sections: LegalSection[];
};

const updated = "2026-11-04";
const founders = authors.map((author) => author.name).join(" ve ");

const seller =
  `Satıcı, ${brand.domain} adresindeki hizmeti işleten ${founders}’dır. Yazışma adresi ${contactEmail}. ` +
  "Ticari unvan, açık adres ve vergi kimliği, fatura kesilmeye başlandığında bu sayfada ve faturada yer alır. " +
  "Şu anda ücretli ödeme kapalıdır; bu metinler ödeme açıldığında uygulanacak kuralları anlatır ve bugün senden bir ücret alınmaz.";

export const legalDocs: LegalDoc[] = [
  {
    path: "/kullanim-kosullari",
    title: "Kullanım koşulları ve üyelik",
    description: "outklas hesabının nasıl açıldığı, ücretsiz ve ücretli kullanımın sınırı, içerik hakları ve hesabın kapatılması.",
    updated,
    lead: "outklas’ı kullanarak veya hesap açarak bu koşulları kabul etmiş olursun. Ücretli bir plan alırsan ayrıca mesafeli satış sözleşmesi ve iade koşulları geçerlidir.",
    sections: [
      {
        id: "kapsam",
        title: "Hizmet neyi kapsar?",
        paragraphs: [
          "outklas, YDS, e-YDS, YÖKDİL ve e-YÖKDİL hazırlığı için seviye testi, soru çözümü, kelime ve bağlaç çalışması, deneme ve kişisel çalışma planı sunar. ÖSYM’nin veya başka bir kamu kurumunun resmi uygulaması değildir; sınav sonucu yerine geçmez.",
          seller,
        ],
      },
      {
        id: "uyelik",
        title: "Hesap ve üyelik",
        paragraphs: [
          "Seviye testini hesap açmadan çözebilirsin. Hesap, e-posta ve şifreyle açılır; ücretsizdir ve bir abonelik başlatmaz. Hesap kişiye özeldir, başkasıyla paylaşılamaz.",
          `Ücretsiz hesapta her gün ${brand.freeDailyWords} kelime, ${brand.freeDailyConnectors} bağlaç ve ${brand.freeSimulators} tam deneme vardır. Ücretli planlar bu sınırları kaldırır veya genişletir; hangisinin ne sunduğu fiyat sayfasında yazar.`,
          "Hesabındaki bilgilerin doğru olması senin sorumluluğundadır. Şifreni başkasına vermemen gerekir.",
        ],
      },
      {
        id: "ucret",
        title: "Ücretsiz ve ücretli kullanım",
        paragraphs: [
          `Sprint ${tl(offers.gelisim.price)} TL ve ${offers.gelisim.days} gün, Kamp ${tl(offers.kamp.price)} TL ve ${offers.kamp.days} gündür. Fiyatlar KDV dahildir. Ödeme tek seferdir; karttan düzenli çekim yapan bir abonelik yoktur. Süre bitince hesap ücretsiz sınıra döner, kendiliğinden yenilenmez.`,
          "Ücretli ödeme açıldığında bedel, süre ve kapsam ödeme adımında ayrıca gösterilir. Oradaki bilgi ile bu sayfa çelişirse ödeme adımındaki bilgi o işlem için geçerlidir.",
        ],
      },
      {
        id: "icerik",
        title: "İçerik ve fikri haklar",
        paragraphs: [
          "Soru, açıklama, arayüz ve marka outklas’a aittir ya da kullanım hakkı outklas’tadır. İçeriği kopyalayamaz, satamaz, herkese açık biçimde paylaşamazsın. Kişisel çalışman için ekranda çözmen serbesttir.",
          "Metinler ÖSYM’nin çıkmış sorularının kopyası olarak sunulmaz. Bir sayfada kaynak gösterilen akademik çalışma, o sayfadaki cümlenin dayanağıdır; outklas’ın puan vaadi değildir.",
        ],
      },
      {
        id: "puan",
        title: "Puan ve sonuç",
        paragraphs: [
          "Seviye testinin verdiği aralık bir tahmindir, resmi puan değildir. Deneme puanı, o denemedeki doğru sayısından hesaplanır. Hedefine ulaşacağını ya da bir programın barajını geçeceğini taahhüt etmiyoruz.",
        ],
      },
      {
        id: "kapatma",
        title: "Hesabın kapatılması",
        paragraphs: [
          `${contactEmail} adresine yazarak hesabının silinmesini isteyebilirsin. Silme, yasal olarak saklamak zorunda olduğumuz kayıtlar dışında hesap verini kaldırmayı kapsar. Ücretli süren bitmeden hesabını kapatman, kullanılmayan günler için kendiliğinden iade doğurmaz; iade koşulları ayrı sayfadadır.`,
          "Koşullara aykırı kullanımda, özellikle içeriğin toplu kopyalanması veya hesabın paylaşılması halinde erişimi durdurabiliriz. Böyle bir durumda varsa kalan ücret için seninle yazışırız.",
        ],
      },
      {
        id: "degisiklik",
        title: "Değişiklik",
        paragraphs: [
          "Koşulları güncellediğimizde bu sayfanın tarihini değiştiririz. Yürürlükteki metin sitede yayımlandığı andan itibaren geçerlidir. Ücretli bir işlemin koşulları, o işlemin yapıldığı gündeki metne göre değerlendirilir.",
        ],
      },
    ],
  },
  {
    path: "/gizlilik",
    title: "Gizlilik ve kişisel veriler",
    description: "outklas’ın hangi kişisel veriyi neden işlediği, çerezler, aktarılan hizmetler ve KVKK kapsamındaki hakların.",
    updated,
    lead: "Hesap, sınav tarihi ve çözdüğün sorular hizmeti kurmak için işlenir. Verini satmayız. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki aydınlatma yükümlülüğünü karşılamak için yazıldı.",
    sections: [
      {
        id: "sorumlu",
        title: "Veri sorumlusu",
        paragraphs: [seller, `Başvuru ve silme istekleri için ${contactEmail}.`],
      },
      {
        id: "veriler",
        title: "Hangi veriler işlenir?",
        paragraphs: [
          "Hesap açarsan e-posta adresin ve şifrenin güvenli karşılığı. Profilde girersen adın, hedef puanın ve sınav tarihin.",
          "Çözdüğün sorular, doğru ve yanlışların, sürelerin ve bunlardan üretilen bölüm bazında puan kaybı. Bu kayıtlar çalışma planını kurmak için gerekir.",
          "Hesapsız seviye testinde tarayıcıya konan bir konuk kimliği, testi yarıda bırakıp dönebilmen için kullanılır.",
          "Ödeme açıldığında ödeme kuruluşu kart bilgini kendi tarafında işler. Kart numaran outklas sunucularında saklanmaz. İşlem sonucu, planın ve süre bitişin bizde tutulur.",
        ],
      },
      {
        id: "amac",
        title: "Neden işlenir?",
        paragraphs: [
          "Hesabını açmak, seviye testini ve çalışma planını sunmak, ücretli erişimi tanımak ve destek yazışmanı yanıtlamak için. Hukuki sebep, sözleşmenin kurulması ve ifası ile senin açık talebindir.",
          "Siteyi ayakta tutmak ve kötüye kullanımı fark etmek için sınırlı teknik kayıtlar (istek zamanı, hata kaydı) tutulabilir. Google Analytics, sayfaların ne kadar görüntülendiğini ölçer; bu ölçüm çerez kullanır ve reklam profili oluşturmak için kullanılmaz.",
        ],
      },
      {
        id: "aktarim",
        title: "Kimlerle paylaşılır?",
        paragraphs: [
          "Veri, hizmeti çalıştıran altyapı sağlayıcılarıyla paylaşılır: barındırma için Vercel, hesap ve veritabanı için Supabase, ölçüm için Google. Ücretli ödeme açıldığında tahsilat için iyzico.",
          "Bu sağlayıcılar veriyi kendi hizmetlerini sunmak için işler. Veriyi üçüncü bir kişiye satmayız, reklam ağlarına çalışma sonucunu vermeyiz.",
          "Sağlayıcıların sunucuları Türkiye dışında olabilir. Bu durumda aktarım, hizmetin çalışması için zorunlu olan teknik aktarımdır.",
        ],
      },
      {
        id: "cerez",
        title: "Çerezler",
        paragraphs: [
          "Oturum çerezi, giriş yaptıktan sonra seni tanımak için gerekir. Konuk testi için ayrı bir kimlik çerezi yazılır. Tema tercihin çerezde değil, tarayıcının yerel deposunda durur.",
          "Google Analytics çerezi, sayfa görüntülemelerini saymak için kullanılır. Tarayıcından çerezleri silersen oturumun kapanır; çalışma kaydın hesabındaysa yeniden girişle geri gelir.",
        ],
      },
      {
        id: "sure",
        title: "Ne kadar saklanır?",
        paragraphs: [
          "Hesap verisi, hesabın durduğu sürece saklanır. Silme isteğinden sonra, fatura ve yasal saklama yükümlülüğü doğuran kayıtlar varsa onlar yasal süresi boyunca, geri kalanı silinir. Hesapsız test kaydı, yeni bir test başlatılmadıkça tarayıcıdaki kimlikle sınırlıdır.",
        ],
      },
      {
        id: "haklar",
        title: "Hakların",
        paragraphs: [
          "Verine erişmeyi, düzeltilmesini, silinmesini, işlenmesine itiraz etmeyi ve varsa zararın giderilmesini isteyebilirsin. İsteklerini kimliğini doğrulayabileceğimiz bir e-postayla " +
            contactEmail +
            " adresine yaz. Başvuruyu en geç 30 gün içinde yanıtlarız.",
          "Yanıtı yetersiz bulursan Kişisel Verileri Koruma Kurulu’na şikayette bulunabilirsin.",
        ],
      },
    ],
  },
  {
    path: "/iade",
    title: "İptal ve iade",
    description: "outklas ücretli planlarında cayma hakkı, dijital hizmete başlayınca doğan istisna ve iadenin nasıl istendiği.",
    updated,
    lead: "Ücretli planlar tek ödemedir, abonelik değildir. Cayma hakkı, hizmete başlamadan önce 14 gündür. Hizmet senin onayınla hemen başlarsa bu hak, kanundaki dijital içerik istisnasına göre sona erer.",
    sections: [
      {
        id: "bugun",
        title: "Şu anda ücret alınmıyor",
        paragraphs: [
          "Ücretli ödeme henüz açık değil. Bu sayfa, ödeme açıldığında geçerli olacak kuralı baştan yazıyor. Bugün bir tahsilat olmadığı için iade edilecek bir bedel de yoktur.",
        ],
      },
      {
        id: "plan",
        title: "Planlar",
        paragraphs: [
          `Sprint ${tl(offers.gelisim.price)} TL, ${offers.gelisim.days} gün. Kamp ${tl(offers.kamp.price)} TL, ${offers.kamp.days} gün. Tutarlar KDV dahildir. Süre bitince karttan yeniden çekim yapılmaz.`,
          `Sprint’ten Kamp’a geçersen daha önce ödediğin ${tl(offers.gelisim.price)} TL, Kamp bedelinden düşülür. Düşülen tutar o yükseltme işleminin parçasıdır, ayrıca iade edilmez.`,
        ],
      },
      {
        id: "cayma",
        title: "14 günlük cayma hakkı",
        paragraphs: [
          "Mesafeli sözleşmelerde cayma hakkı 14 gündür. Süre, sözleşmenin kurulduğu gün başlar. Bu süre dolmadan ve ücretli özellikleri kullanmadan vazgeçersen bedelin tamamı iade edilir.",
          "Plan, ödeme tamamlanır tamamlanmaz hesabına açılır: tam rapor, günlük plan ve ek denemeler o anda kullanılabilir hale gelir. Ödeme adımında, hizmetin hemen başlamasını istediğini ve buna bağlı olarak cayma hakkını kaybedeceğini ayrıca onaylaman istenir.",
          "Bu onayı verip ücretli özelliği kullanmaya başladıysan cayma hakkı sona erer. Dayanak, Mesafeli Sözleşmeler Yönetmeliği’nin elektronik ortamda anında ifa edilen hizmetlere ilişkin istisnasıdır. Onayın alınmadan ücretli erişim açılmaz.",
        ],
      },
      {
        id: "ayarip",
        title: "Hizmet sunulamazsa",
        paragraphs: [
          "Ödemen alınmasına rağmen plan hesabına hiç açılmazsa ya da teknik bir arıza yüzünden satın aldığın süre boyunca hizmeti hiç kullanamazsan bedelin tamamını iade ederiz. Bu durumda cayma süresi aranmaz.",
        ],
      },
      {
        id: "talep",
        title: "Nasıl istenir?",
        paragraphs: [
          `${contactEmail} adresine, hesap e-postan ve işlem tarihiyle yaz. Uygun bir iade, onaydan sonra ödemenin yapıldığı aracın süresi içinde aynı yönteme geri gönderilir. Bankanın veya ödeme kuruluşunun kendi süresi bu sürenin üstüne eklenebilir.`,
        ],
      },
    ],
  },
  {
    path: "/mesafeli-satis",
    title: "Mesafeli satış sözleşmesi",
    description: "outklas Sprint ve Kamp planları için satıcı, konu, bedel, ifa ve cayma bilgilerini içeren ön bilgilendirme.",
    updated,
    lead: "Bu metin, ücretli plan satın alındığında kurulan mesafeli satış sözleşmesinin ön bilgilendirmesidir. Ödeme adımında bedel ve süre yeniden gösterilir.",
    sections: [
      {
        id: "taraflar",
        title: "Taraflar",
        paragraphs: [
          seller,
          "Alıcı, ödeme adımında hesap e-postasıyla tanımlanan kişidir. Sözleşme, ödemenin onaylanmasıyla kurulur.",
        ],
      },
      {
        id: "konu",
        title: "Konu",
        paragraphs: [
          "Sözleşmenin konusu, outklas üzerindeki dijital hazırlık hizmetidir. Sprint; tam teşhis raporu, günlük çalışma planı, " +
            `${offers.gelisim.days} gün erişim ve ${brand.sprintSimulators} tam deneme içerir. Kamp; Sprint’tekilere ek olarak ${offers.kamp.days} gün erişim ve sınırsız tam deneme içerir.`,
          "Hizmet fiziksel bir ürün değildir, kargolanmaz. ÖSYM sınav kaydı veya resmi sonuç belgesi satılmaz.",
        ],
      },
      {
        id: "bedel",
        title: "Bedel",
        paragraphs: [
          `Sprint ${tl(offers.gelisim.price)} TL, Kamp ${tl(offers.kamp.price)} TL. Tutarlar KDV dahildir ve tek ödemedir. Taksit gösterimi bir örnektir; tahsilat tek çekimdir. Ödeme kuruluşu iyzico’dur ve ödeme açıldığında bu adımda yer alır.`,
        ],
      },
      {
        id: "ifa",
        title: "İfa",
        paragraphs: [
          "Bedel tahsil edilir edilmez seçtiğin plan hesabına tanımlanır ve kullanıma açılır. Erişim, satın alınan gün sayısı boyunca sürer. Süre, takvim günü olarak ödeme anından itibaren işler.",
        ],
      },
      {
        id: "cayma",
        title: "Cayma",
        paragraphs: [
          "Cayma hakkının kapsamı, istisnası ve başvuru yolu iade sayfasında yazılır. Ödeme adımında, hizmetin hemen başlamasına ve bu durumda cayma hakkının sona ereceğine dair açık onayın alınır.",
        ],
      },
      {
        id: "uyusmazlik",
        title: "Uyuşmazlık",
        paragraphs: [
          "Uyuşmazlıkta, işlemin yapıldığı tarihteki parasal sınıra göre tüketici hakem heyetleri ve tüketici mahkemeleri yetkilidir. Başvurmadan önce " +
            contactEmail +
            " adresinden bize yazman, çoğu sorunu daha hızlı çözer.",
        ],
      },
    ],
  },
];

export function legalByPath(path: string) {
  return legalDocs.find((doc) => doc.path === path);
}
