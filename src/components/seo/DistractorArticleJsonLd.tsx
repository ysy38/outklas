import React from "react";

export function DistractorArticleJsonLd() {
  const siteUrl = "https://outklas.com";
  const articleUrl = `${siteUrl}/blog/yds-yokdil-celdirici-nasil-tespit-edilir`;
  const firstArticleUrl = `${siteUrl}/blog/yds-yokdil-100-saatlik-video-devri-neden-kapandi`;

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
          url: `${siteUrl}/logo.png`,
        },
        description:
          "YDS ve YÖKDİL hazırlığını adaptif öğrenme, unutma eğrisi takibi ve dilbilgisel, sözdizimsel ve anlamsal çeldirici tespiti ile kişiselleştiren sınav hazırlık platformu.",
        sameAs: [
          "https://www.linkedin.com/company/outklas",
          "https://medium.com/@info_97122",
        ],
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
          url: `${siteUrl}/og/yds-yokdil-celdirici-tespiti.png`,
        },
        datePublished: "2026-11-19T15:00:00+03:00",
        dateModified: "2026-11-19T15:00:00+03:00",
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
          "ÖSYM YDS ve YÖKDİL Sorularında Dilbilgisel, Sözdizimsel ve Anlamsal Çeldirici Analizi Rehberi",
        description:
          "ÖSYM YDS ve YÖKDİL sorularında adayları iki şık arasında bırakan dilbilgisel, sözdizimsel ve anlamsal çeldirici türlerinin uygulamalı cümle tamamlama sorusu üzerinden analizi.",
        image: `${siteUrl}/og/yds-yokdil-celdirici-tespiti.png`,
        datePublished: "2026-11-19T15:00:00+03:00",
        dateModified: "2026-11-19T15:00:00+03:00",
        author: {
          "@id": `${siteUrl}/#organization`,
        },
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        mainEntityOfPage: {
          "@id": `${articleUrl}/#webpage`,
        },
        relatedLink: [
          firstArticleUrl,
          "https://medium.com/@info_97122/yds-ve-y%C3%B6kdi%CC%87le-100-saat-video-i%CC%87zleyerek-haz%C4%B1rlanma-devri-bitti-c69ba56c27cf",
          `${siteUrl}/rehber/grammar`,
          `${siteUrl}/rehber/vocabulary`,
        ],
        inLanguage: "tr-TR",
        keywords: [
          "YDS çeldirici analizi",
          "YÖKDİL şık eleme yöntemleri",
          "YDS cümle tamamlama taktikleri",
          "YDS iki şık arasında kalmak",
          "anlamsal çeldirici",
          "sözdizimsel çeldirici",
          "dilbilgisel çeldirici",
        ],
        about: [
          {
            "@type": "DefinedTerm",
            name: "Çeldirici (Distractor)",
            description:
              "Çoktan seçmeli bir sınavda konuya yüzeysel hakim olan adayı doğru cevaptan uzaklaştırmak için dilbilgisel, sözdizimsel veya anlamsal tuzaklarla kurgulanmış yanlış seçenek.",
          },
          {
            "@type": "DefinedTerm",
            name: "Dilbilgisel Çeldirici",
            description:
              "Cümle anlamı tutarlı görünmesine rağmen çift bağlaç kullanımı, yanlış edat yapısı veya hatalı kısaltma gibi gramer kuralı ihlali barındıran yanlış seçenek.",
          },
          {
            "@type": "DefinedTerm",
            name: "Sözdizimsel Çeldirici",
            description:
              "Tek başına gramatik olarak doğru olan ancak soru köküyle zaman uyumu (tense agreement) veya özne-zamir referansı (pronoun reference) açısından çelişen yanlış seçenek.",
          },
          {
            "@type": "DefinedTerm",
            name: "Anlamsal Çeldirici",
            description:
              "Gramer ve sözdizimi kurallarına uyan fakat bağlaç yönünü ters çeviren, aşırı genelleme yapan veya konu kayması yaratan yanlış seçenek.",
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
