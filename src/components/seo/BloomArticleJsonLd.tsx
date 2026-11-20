import React from "react";

export function BloomArticleJsonLd() {
  const siteUrl = "https://outklas.com";
  const articleUrl = `${siteUrl}/blog/yds-yokdil-100-saatlik-video-devri-neden-kapandi`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Outklas",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/brand/outklas-mark-512.png`,
        },
        description:
          "YDS ve YÖKDİL hazırlığını adaptif öğrenme, unutma eğrisi takibi ve anlamsal, sözdizimsel ve dilbilgisel çeldirici tespiti ile kişiselleştiren sınav hazırlık platformu.",
        sameAs: [
          "https://www.linkedin.com/company/outklas",
          "https://medium.com/@info_97122",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${articleUrl}/#webpage`,
        url: articleUrl,
        name: "YDS ve YÖKDİL’e 100 Saatlik Video İzleyerek Hazırlanma Devri Neden Kapandı? | Outklas",
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/og/bloom-2-sigma-yds-yokdil.png`,
        },
        datePublished: "2026-11-19T09:00:00+03:00",
        dateModified: "2026-11-19T09:00:00+03:00",
        inLanguage: "tr-TR",
      },
      {
        "@type": "Article",
        "@id": `${articleUrl}/#article`,
        isPartOf: {
          "@id": `${articleUrl}/#webpage`,
        },
        headline:
          "YDS ve YÖKDİL’e 100 Saatlik Video İzleyerek Hazırlanma Devri Neden Kapandı?",
        alternativeHeadline:
          "Bloom 2 Sigma Problemi ve Çeldirici Analizi ile Adaptif YDS/YÖKDİL Hazırlık Rehberi",
        description:
          "Klasik video kursları, birebir özel ders ve adaptif yapay zeka destekli YDS/YÖKDİL hazırlık modellerinin öğrenme hızı, çeldirici tespiti ve maliyet karşılaştırması.",
        image: `${siteUrl}/og/bloom-2-sigma-yds-yokdil.png`,
        datePublished: "2026-11-19T09:00:00+03:00",
        dateModified: "2026-11-19T09:00:00+03:00",
        author: {
          "@id": `${siteUrl}/#organization`,
        },
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        mainEntityOfPage: {
          "@id": `${articleUrl}/#webpage`,
        },
        sameAs:
          "https://medium.com/@info_97122/yds-ve-y%C3%B6kdi%CC%87le-100-saat-video-i%CC%87zleyerek-haz%C4%B1rlanma-devri-bitti-c69ba56c27cf",
        relatedLink: [
          "https://medium.com/@info_97122/yds-ve-y%C3%B6kdi%CC%87le-100-saat-video-i%CC%87zleyerek-haz%C4%B1rlanma-devri-bitti-c69ba56c27cf",
          `${siteUrl}/blog/yds-yokdil-celdirici-nasil-tespit-edilir`,
          `${siteUrl}/rehber/grammar`,
          `${siteUrl}/rehber/vocabulary`,
        ],
        inLanguage: "tr-TR",
        keywords: [
          "YDS online hazırlık",
          "YÖKDİL çalışma programı",
          "Bloom 2 Sigma Problemi",
          "YDS çeldirici analizi",
          "adaptif dil öğrenme",
          "YDS özel ders mi kurs mu",
        ],
        about: [
          {
            "@type": "DefinedTerm",
            name: "Bloom 2 Sigma Problemi",
            description:
              "Öğrenciye kendi hızına ve hata örüntülerine göre uyarlanan birebir eğitimin, standart grup eğitimine kıyasla yüzde 98 daha yüksek başarı sağlaması bulgusu.",
          },
          {
            "@type": "DefinedTerm",
            name: "Çeldirici Tespiti",
            description:
              "ÖSYM YDS ve YÖKDİL sorularında yanlış şıkka yönlendiren anlamsal, sözdizimsel ve dilbilgisel tuzakların sınıflandırılması.",
          },
        ],
        mentions: [
          {
            "@type": "Thing",
            name: "YDS (Yabancı Dil Bilgisi Seviye Tespit Sınavı)",
          },
          {
            "@type": "Thing",
            name: "YÖKDİL (Yükseköğretim Kurumları Yabancı Dil Sınavı)",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${articleUrl}/#faq`,
        isPartOf: {
          "@id": `${articleUrl}/#webpage`,
        },
        mainEntity: [
          {
            "@type": "Question",
            name: "YDS ve YÖKDİL’e hiç video ders izlemeden hazırlanmak mümkün mü?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Evet. Temel dilbilgisi yapısına aşina olan adaylar için pasif video izlemek yerine aktif soru çözümü, bağlam içinde okuma-çeviri pratiği ve yanlış yapılan çeldiricilerin analizi çok daha hızlı puan artışı sağlar. Outklas’taki etkileşimli okuma ve gramer rehberleri, uzun ders anlatımları yerine doğrudan soru üzerindeki mantığı kavratmaya odaklanır.",
            },
          },
          {
            "@type": "Question",
            name: "Çeldirici tespiti nedir ve sınav puanını nasıl artırır?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Çeldirici tespiti, yanlış işaretlediğiniz şıkkın sizi neden yanılttığını (anlam kayması, zaman uyumsuzluğu veya hatalı bağlaç kurgusu gibi) sınıflandıran analiz yöntemidir. Hangi tuzaklara düştüğünüzü fark ettiğinizde, ÖSYM sorularında iki şık arasında kalma oranınız belirgin biçimde düşer.",
            },
          },
          {
            "@type": "Question",
            name: "Günde ne kadar süre ayırarak düzenli ilerleme sağlanabilir?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Dağınık şekilde haftada bir gün 4 saat çalışmak yerine, her gün 25-30 dakika boyunca unutma eğrinize ve zayıf çeldirici tiplerinize göre uyarlanmış hedefli sorular çözmek kalıcı öğrenme için çok daha etkilidir.",
            },
          },
          {
            "@type": "Question",
            name: "Outklas hem YDS hem de YÖKDİL (Fen, Sağlık, Sosyal) adayları için uygun mu?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Evet. Her iki sınavın da soru kökleri, bağlaç mantığı, cümle tamamlama ve paragraf kurguları ortak akademik İngilizce temeline dayanır. Sistemdeki kelime ve okuma pratikleri akademik metin yapısına göre kalibre edildiği için hem YDS/e-YDS hem de tüm YÖKDİL alanlarında doğrudan kullanılabilir.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
