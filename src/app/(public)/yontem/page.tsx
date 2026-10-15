import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/brand";
import { EditorialNote } from "@/components/editorial-note";
import { articleJsonLd, authors, editor } from "@/content/editorial";

export const dynamic = "force-static";

const title = `Yöntem: ${brand.name} neye çalışacağını nasıl belirler?`;
const description =
  "Seviye testi, puan tahmini, bölüm bazında puan kaybı, soru seçimi ve tekrar aralıkları: STARC’nin hangi veriye bakıp nasıl karar verdiği.";

export const metadata: Metadata = {
  title: "Yöntem",
  description,
  alternates: { canonical: "/yontem" },
};

const blocks = [
  {
    id: "seviye-testi",
    title: "Seviye testi",
    body: [
      `Test ${brand.diagnosticQuestions} soru ve yaklaşık ${brand.diagnosticMinutes} dakika sürer; üye olmadan çözersin. Sorular gerçek sınavdaki bölüm ağırlıklarına göre seçilir, bu yüzden okuma sorusu burada da çoktur.`,
      "Okuma soruları her zaman bir metinle gelir: uzun metin 4, kısa metin 2 soruyla. Böylece okuma becerin tek tük sorularla değil, sınavdaki gibi ölçülür.",
    ],
  },
  {
    id: "puan-tahmini",
    title: "Puan tahmini",
    body: [
      "Seviye testindeki doğru oranın 100 puanlık ölçeğe taşınır. Tek bir sayı yerine yaklaşık ±8 puanlık bir aralık gösteririz; 40 soruluk bir test 80 soruluk sınavı ancak yaklaşık olarak gösterebilir.",
      "Puanlama ÖSYM’nin kuralıyla aynıdır: doğru sayısı × 1,25. Yanlışlar doğruları götürmez; boş bırakmak da yanlış yapmak da puanı düşürmez.",
    ],
  },
  {
    id: "puan-kaybi",
    title: "Hangi bölümde puan kaybettiğin",
    body: [
      "Her bölüm için o bölümdeki yanlış oranın, bölümün gerçek sınavdaki soru sayısıyla çarpılır. Örneğin okuduğunu anlama 20 soru, yani 25 puandır; burada %60 doğru yapıyorsan sınavda bu bölümden yaklaşık 10 puan kaybedersin.",
      "Rapor bölümleri bu kayba göre sıralar. Aynı oranda hata, soru sayısı fazla olan bölümde daha çok puan kaybettirir; önceliğin buradan gelir.",
    ],
  },
  {
    id: "soru-secimi",
    title: "Sıradaki soru nasıl seçilir",
    body: [
      "Soruları yapay zekâ seçmez; belli kurallar seçer: o bölümdeki doğru oranın, daha önce görmediğin sorular ve bölümün sınavdaki ağırlığı. Zaten iyi olduğun bölüme o gün vakit ayırmazsın.",
    ],
  },
  {
    id: "tekrar",
    title: "Yanlışların nasıl geri gelir",
    body: [
      "Yanlış yaptığın soru, kelime ya da bağlaç ilk seferde 10 dakika sonra, yine yanlış yaparsan ertesi gün karşına çıkar. Doğru yaptıkça aralık uzar: 3, 7, 21 ve 45 gün. Bildiğin şey giderek seyrekleşir, takıldığın şey öne çıkar.",
    ],
  },
  {
    id: "sinirlar",
    title: "Neyi iddia etmiyoruz",
    body: [
      "Seviye testinin sonucu resmi puan değildir; ÖSYM sonucunun yerini tutmaz. Deneme ekranı e-YDS’ye benzer ama ÖSYM arayüzünün birebir kopyası değildir. STARC’nin ÖSYM ile bir bağlantısı yoktur.",
    ],
  },
];

export default function MethodPage() {
  const jsonLd = { "@context": "https://schema.org", ...articleJsonLd({ path: "/yontem", title, description }) };
  return (
    <article className="landing mx-auto w-full max-w-3xl px-4 py-12 sm:px-5 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.18em] text-gold">Nasıl çalışıyor?</p>
      <h1 className="display-xl mt-4 font-serif">
        Neye çalışacağını <span className="grad">nasıl belirliyoruz?</span>
      </h1>
      <EditorialNote path="/yontem" className="mt-4" />
      <p className="mt-5 text-lg leading-8 text-muted">
        Hangi veriye baktığımızı, puanı nasıl hesapladığımızı ve neyi bilemeyeceğimizi burada açıkça yazıyoruz.
      </p>

      <nav aria-label="Bu sayfada" className="mt-8 flex flex-wrap gap-2">
        {blocks.map((block) => (
          <a key={block.id} href={`#${block.id}`} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-pine hover:text-ink">
            {block.title}
          </a>
        ))}
      </nav>

      {blocks.map((block) => (
        <section key={block.id} id={block.id} className="mt-10 scroll-mt-24">
          <h2 className="text-2xl">{block.title}</h2>
          {block.body.map((paragraph) => (
            <p key={paragraph} className="mt-3 leading-7">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <section id="editor" className="glass mt-12 scroll-mt-24 rounded-[28px] border border-line p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Hazırlayanlar</p>
        <h2 className="mt-2 text-2xl">Bu içerikleri kim hazırlıyor?</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {authors.map((author) => (
            <li key={author.profile} className="rounded-2xl border border-line bg-card p-4">
              <p className="font-semibold text-ink">{author.name}</p>
              {author.role ? <p className="mt-0.5 text-sm text-muted">{author.role}</p> : null}
              <a href={author.profile} rel="author noopener" target="_blank" className="link-underline mt-2 inline-block text-sm font-medium text-pine">
                LinkedIn profili →
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 leading-7 text-muted">{editor.about}</p>
        <p className="mt-3 leading-7 text-muted">Bir bilgi değiştiğinde sayfayı düzeltir ve güncelleme tarihini yenileriz.</p>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/teshis" className="rounded-full bg-pine px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5">
          Ücretsiz seviyemi ölç →
        </Link>
        <Link href="/yds-hazirlik" className="rounded-full border border-line bg-card px-6 py-3.5 text-center text-sm font-semibold text-ink transition hover:border-pine">
          YDS hazırlık rehberi
        </Link>
      </div>
    </article>
  );
}
