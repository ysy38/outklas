import React from "react";

export function CeldiriciArticleJsonLd() {
  const siteUrl = "https://outklas.com";
  const articleUrl = `${siteUrl}/blog/yds-yokdil-celdirici-nasil-tespit-edilir`;

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
        sameAs: ["https://www.linkedin.com/company/outklas"],
      },
      {
        "@type": "WebPage",
        "@id": `${articleUrl}/#webpage`,
        url: articleUrl,
        name: "YDS ve YÖKDİL’de İki Şık Arasında Kalma Sorunu: Çeldirici Nasıl Tespit Edilir? | Outklas",
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/og/bloom-2-sigma-yds-yokdil.png`,
        },
        datePublished: "2026-11-19T10:00:00+03:00",
        dateModified: "2026-11-19T10:00:00+03:00",
        inLanguage: "tr-TR",
      },
      {
        "@type": "Article",
        "@id": `${articleUrl}/#article`,
        isPartOf: {
          "@id": `${articleUrl}/#webpage`,
        },
        headline:
          "YDS ve YÖKDİL’de İki Şık Arasında Kalma Sorunu: Çeldirici Nasıl Tespit Edilir?",
        alternativeHeadline:
          "ÖSYM’nin 3 Katmanlı Çeldirici Mühendisliği ve Cümle Tamamlama Soru Analizi",
        description:
          "YDS ve YÖKDİL'de iki şık arasında kalma sorununu çözmek için dilbilgisel, sözdizimsel ve anlamsal çeldirici tespit yöntemleri ve örnek soru otopsisi.",
        image: `${siteUrl}/og/bloom-2-sigma-yds-yokdil.png`,
        datePublished: "2026-11-19T10:00:00+03:00",
        dateModified: "2026-11-19T10:00:00+03:00",
        author: {
          "@id": `${siteUrl}/#organization`,
        },
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        mainEntityOfPage: {
          "@id": `${articleUrl}/#webpage`,
        },
        inLanguage: "tr-TR",
        keywords: [
          "YDS iki şık arasında kalmak",
          "YDS cümle tamamlama taktikleri",
          "YÖKDİL şık eleme yöntemleri",
          "çeldirici tespiti",
          "çeldirici analizi",
          "ÖSYM çeldirici türleri",
          "YDS soru çözümü",
        ],
        about: [
          {
            "@type": "DefinedTerm",
            name: "Çeldirici (Distractor)",
            description:
              "Çoktan seçmeli sınavlarda adayı doğru cevaptan uzaklaştırmak için dilbilgisel, sözdizimsel veya anlamsal olarak kasıtlı kurgulanmış yanlış seçenek.",
          },
          {
            "@type": "DefinedTerm",
            name: "Çeldirici Tespiti",
            description:
              "ÖSYM sorularında yanlış şıkkın dilbilgisel, sözdizimsel ve anlamsal katmanlarını sınıflandırarak iki şık arasında kalma sorununu çözen analiz yöntemi.",
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
          {
            "@type": "Thing",
            name: "Cümle Tamamlama (Sentence Completion)",
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
            name: "YDS ve YÖKDİL’de iki şık arasında kalmamak için ilk neye bakılmalıdır?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Önce anlam çevirisine dalmak yerine cümlenin yapısal iskeletini (bağlaç yönü, zaman uyumu ve özne-zamir eşleşmesini) kontrol etmek gerekir. Şıkların büyük bölümü daha anlam analizine geçmeden dilbilgisel ve sözdizimsel çeldirici elemeleriyle devreden çıkar.",
            },
          },
          {
            "@type": "Question",
            name: "ÖSYM sorularında en sık kullanılan anlamsal çeldirici hangisidir?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "En yaygın anlamsal tuzak, soru kökünde sınırlı bir çerçevede verilen bilgiyi şıkta all, never, only, completely gibi kesinlik bildiren ifadelerle aşırı genellemek veya zıtlık bağlacı kurulmasına rağmen paralel anlamlı bir yargı sunmaktır.",
            },
          },
          {
            "@type": "Question",
            name: "Çeldirici analizi yaparak çalışmak netleri ne kadar sürede etkiler?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Körlemesine yüzlerce soru çözmek yerine günde 25-30 dakika boyunca yanlış yapılan soruların çeldirici türünü (dilbilgisel, sözdizimsel veya anlamsal) sınıflandırarak ilerlemek, genellikle 2 ila 3 hafta içinde iki şık arasında kalma oranını belirgin biçimde düşürür.",
            },
          },
          {
            "@type": "Question",
            name: "Outklas’taki çeldirici tespiti sistemi hangi soru tiplerinde çalışır?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Çeldirici analizi mantığı özellikle cümle tamamlama, bağlaç soruları, çeviri, paragraf tamamlama ve okuduğunu anlama sorularında adayın hangi tuzak katmanına takıldığını tespit ederek kişiselleştirilmiş soru akışı üretir.",
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
