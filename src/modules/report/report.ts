import { distractorText, skillName } from "@/content/labels";
import type { Band, ExamCode, SectionId } from "@/modules/exam/blueprint";
import { estimateFromAccuracy, estimateNet } from "@/modules/exam/score";

export type ReportItem = {
  section: SectionId;
  skills: string[];
  correct: boolean | null;
  timeMs: number;
  distractor: string | null;
};

export type Area = {
  section: SectionId;
  title: string;
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  accuracy: number;
  examQuestions: number;
  /** Points (YDS) or nets (YDT) this accuracy would cost in the full 80-question exam. */
  loss: number;
  level: "İyi" | "Orta" | "Geliştirilmeli";
};

export type Finding = { id: string; teaser: string; title: string; detail: string };

export type Report = {
  exam: ExamCode;
  unit: "puan" | "net";
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  estimate: { low: number; high: number; point: number };
  firstTarget: number;
  areas: Area[];
  scenario: { sections: SectionId[]; titles: string[]; low: number; high: number } | null;
  weightNote: string | null;
  findings: Finding[];
};

const trapTips: Record<string, string> = {
  CONTEXT_MISMATCH: "Şıkları sadece boşluğun çevresine bakarak değil, cümlenin tamamını okuyarak dene.",
  COLLOCATION_ERROR: "Kelimeleri tek başına değil, birlikte kullanıldıkları kelimelerle öğren.",
  VOCAB_SIMILAR_MEANING: "Anlamı yakın kelimelerde cümlenin tonuna ve kalıbına bak; en yakın anlam her zaman doğru cevap değildir.",
  LOGICAL_ERROR: "Seçtiğin şıkla cümleyi baştan kur ve anlamın mantıklı olup olmadığını kontrol et.",
  CONNECTOR_ERROR: "Önce iki kısım arasındaki ilişkiyi bul (zıtlık, sebep, sonuç), bağlacı sonra seç.",
  GRAMMAR_TRAP: "Boşluktan sonra tam bir cümle mi, yoksa isim mi geldiğine bak; şıkkı buna göre ele.",
  REFERENCE_ERROR: "Zamirin gösterdiği ismi bir önceki cümlede bul, sonra şıkka dön.",
  TRANSLATION_SHIFT: "Çeviride zaman, olumsuzluk ve miktar gibi küçük farkları tek tek kontrol et.",
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatNumber(value: number) {
  return round1(value).toLocaleString("tr-TR");
}

function level(accuracy: number): Area["level"] {
  if (accuracy >= 0.7) return "İyi";
  if (accuracy >= 0.45) return "Orta";
  return "Geliştirilmeli";
}

function mostCommon(values: string[]): [string, number] | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0] ?? null;
}

export function buildReport(input: { exam: ExamCode; bands: Band[]; items: ReportItem[]; targetScore: number | null }): Report {
  const { exam, bands, items } = input;
  const unit = exam === "ydt" ? "net" : "puan";
  const perQuestion = exam === "ydt" ? 1 : 1.25;
  const correct = items.filter((item) => item.correct === true).length;
  const wrong = items.filter((item) => item.correct === false).length;
  const total = items.length;
  const blank = total - correct - wrong;
  const estimate = exam === "ydt" ? estimateNet(correct, wrong, total) : estimateFromAccuracy(correct, total);
  const ceiling = exam === "ydt" ? 80 : 100;
  const title = (section: SectionId) => bands.find((band) => band.section === section)?.title ?? section;

  const areas: Area[] = bands
    .map((band) => {
      const rows = items.filter((item) => item.section === band.section);
      const sectionCorrect = rows.filter((item) => item.correct === true).length;
      const sectionWrong = rows.filter((item) => item.correct === false).length;
      const accuracy = rows.length ? sectionCorrect / rows.length : 0;
      const examQuestions = band.to - band.from + 1;
      return {
        section: band.section,
        title: band.title,
        correct: sectionCorrect,
        wrong: sectionWrong,
        blank: rows.length - sectionCorrect - sectionWrong,
        total: rows.length,
        accuracy,
        examQuestions,
        loss: round1((1 - accuracy) * examQuestions * perQuestion),
        level: level(accuracy),
      };
    })
    .filter((area) => area.total > 0)
    .sort((a, b) => b.loss - a.loss);

  const nextTarget = Math.min(ceiling, Math.ceil((estimate.point + 5) / 5) * 5);
  const firstTarget = input.targetScore != null && input.targetScore > estimate.point ? Math.min(input.targetScore, nextTarget) : nextTarget;

  const top = areas.filter((area) => area.loss > 0).slice(0, 2);
  const gain = top.reduce((sum, area) => sum + area.loss, 0);
  const scenario =
    top.length > 0 && gain >= 2
      ? {
          sections: top.map((area) => area.section),
          titles: top.map((area) => area.title),
          low: Math.min(ceiling, Math.round(estimate.point + gain * 0.5)),
          high: Math.min(ceiling, Math.round(estimate.point + gain * 0.75)),
        }
      : null;

  let weightNote: string | null = null;
  const heavy = areas[0];
  const light = [...areas].sort((a, b) => a.examQuestions - b.examQuestions)[0];
  if (heavy && light && heavy.section !== light.section && heavy.examQuestions > light.examQuestions) {
    weightNote = `${heavy.title} sınavda ${heavy.examQuestions} soru, yani ${formatNumber(heavy.examQuestions * perQuestion)} ${unit}. ${light.title} ise ${light.examQuestions} soru, ${formatNumber(light.examQuestions * perQuestion)} ${unit}. Bu yüzden aynı oranda hata, ${heavy.title.toLocaleLowerCase("tr-TR")} bölümünde çok daha fazla ${unit} kaybettirir.`;
  }

  const findings: Finding[] = [];
  if (heavy && heavy.loss > 0) {
    findings.push({
      id: "biggest-loss",
      teaser: "En çok puanı hangi bölümde kaybediyorsun",
      title: `En çok ${unit === "net" ? "neti" : "puanı"} ${heavy.title} bölümünde kaybediyorsun`,
      detail: `Bu testteki performansınla gerçek sınavda bu bölümden yaklaşık ${formatNumber(heavy.loss)} ${unit} kaybedersin. Bölüm sınavda ${heavy.examQuestions} soru, yani ${formatNumber(heavy.examQuestions * perQuestion)} ${unit} taşıyor.`,
    });
  }

  const vocabMisses = items.filter((item) => item.section === "vocabulary" && item.correct !== true);
  if (vocabMisses.length > 0) {
    const kind = mostCommon(vocabMisses.flatMap((item) => item.skills).filter((skill) => skill !== "vocabulary"));
    findings.push({
      id: "vocabulary",
      teaser: "Kelime bilgisinde hangi tür kelimelerde zorlanıyorsun",
      title: kind?.[0] === "collocation" ? "Kelimede zorlandığın tür: kelime kalıpları" : "Kelimede zorlandığın tür: akademik kelimeler",
      detail:
        kind?.[0] === "collocation"
          ? "Kelimenin anlamını biliyorsun ama hangi kelimeyle birlikte kullanıldığını kaçırıyorsun. Kelimeleri tek başına değil, kalıplarıyla çalışmalısın."
          : "Akademik metinlerde sık geçen kelimelerde zorlanıyorsun. Bu kelimeler okuma ve boşluk doldurma sorularında da karşına çıkıyor; her gün 10 kelime çalışmak üç bölümde birden puan kazandırır.",
    });
  }

  const connectorMisses = items.filter(
    (item) => item.correct !== true && (item.skills.includes("connectors") || item.skills.includes("sentence-link") || item.distractor === "CONNECTOR_ERROR"),
  );
  if (connectorMisses.length > 0) {
    findings.push({
      id: "connectors",
      teaser: "Bağlaçlarda hangi ilişkileri karıştırıyorsun",
      title: `Bağlaç ve cümle bağlantısı sorularında ${connectorMisses.length} soru kaçırdın`,
      detail:
        "Bu sorularda cümlenin iki kısmı arasındaki ilişkiyi (zıtlık, sebep, sonuç, koşul) doğru okumak gerekiyor. Bağlaç bilgisi cümle tamamlama, boşluk doldurma ve çeviri sorularının hepsinde puan getirir.",
    });
  }

  const timed = areas
    .map((area) => {
      const rows = items.filter((item) => item.section === area.section && item.correct !== null && item.timeMs > 0);
      return { area, count: rows.length, avg: rows.length ? rows.reduce((sum, item) => sum + item.timeMs, 0) / rows.length : 0 };
    })
    .filter((row) => row.count >= 2);
  const answeredTimes = items.filter((item) => item.correct !== null && item.timeMs > 0);
  const overall = answeredTimes.length ? answeredTimes.reduce((sum, item) => sum + item.timeMs, 0) / answeredTimes.length : 0;
  const slow = [...timed].sort((a, b) => b.avg - a.avg)[0];
  if (slow && overall > 0 && slow.avg >= overall * 1.4) {
    findings.push({
      id: "time",
      teaser: "Hangi soru tipleri sana gereğinden fazla zaman kaybettiriyor",
      title: `${slow.area.title} soruları seni yavaşlatıyor`,
      detail: `Bu bölümde soru başına ortalama ${Math.round(slow.avg / 1000)} saniye harcadın; genel ortalaman ${Math.round(overall / 1000)} saniye. Gerçek sınavda soru başına ortalama 2 dakika 15 saniyen var; bu bölümde hızlanmak diğer sorulara vakit bırakır.`,
    });
  }

  const traps = mostCommon(items.filter((item) => item.correct === false && item.distractor).map((item) => item.distractor as string));
  if (traps && traps[1] >= 2) {
    findings.push({
      id: "trap",
      teaser: "En sık düştüğün tuzak hangisi",
      title: `En sık düştüğün tuzak: ${distractorText(traps[0])}`,
      detail: `Yanlışlarının ${traps[1]} tanesinde aynı tür şıkkı seçtin. ${trapTips[traps[0]] ?? "Bu tuzağı tanıdığında aynı hatayı tekrar etmezsin."}`,
    });
  }

  if (blank >= 3) {
    const most = [...areas].sort((a, b) => b.blank - a.blank)[0];
    findings.push({
      id: "blanks",
      teaser: "Boş bıraktığın sorular sana kaç puana mal oluyor",
      title: `${blank} soruyu boş bıraktın`,
      detail:
        exam === "ydt"
          ? `En çok ${most.title} bölümünde boş bıraktın. YDT’de 4 yanlış 1 doğruyu götürür; yine de iki şıkkı eleyebildiğin soruda işaretlemek ortalamada net kazandırır.`
          : `En çok ${most.title} bölümünde boş bıraktın. YDS’de yanlış doğruyu götürmez: boş bırakmak yerine emin olmadığın şıkları eleyip birini işaretlemek, ortalamada puanını artırır.`,
    });
  }

  const readingMisses = items.filter((item) => item.section === "reading" && item.correct !== true);
  const readingSkill = mostCommon(readingMisses.flatMap((item) => item.skills).filter((skill) => skill !== "reading"));
  if (readingSkill && readingMisses.length >= 2) {
    findings.push({
      id: "reading",
      teaser: "Okumada hangi soru tipinde hata yapıyorsun",
      title: `Okumada en çok “${skillName(readingSkill[0]).toLocaleLowerCase("tr-TR")}” sorularında puan kaybettin`,
      detail:
        readingSkill[0] === "inference"
          ? "Metinde açıkça yazmayanı çıkarman gereken sorularda zorlanıyorsun. Bu sorularda şıkkı metindeki bir cümleye dayandıramıyorsan ele."
          : readingSkill[0] === "main-idea"
            ? "Ana fikir sorularında ayrıntıya takılıyorsun. Paragrafın ilk ve son cümlesine bakıp metnin neden yazıldığını kendine sor."
            : "Metindeki bilgiyle şıktaki bilgi arasındaki küçük farkları kaçırıyorsun. Şıktaki her kelimeyi metindeki karşılığıyla karşılaştır.",
    });
  }

  const best = areas.filter((area) => area.total >= 3 && area.accuracy >= 0.7).sort((a, b) => b.accuracy - a.accuracy)[0];
  if (best) {
    findings.push({
      id: "strength",
      teaser: "Güçlü yanın hangisi, ona ne kadar vakit ayırmalısın",
      title: `Güçlü yanın: ${best.title}`,
      detail: `Bu bölümde ${best.correct}/${best.total} doğru yaptın. Çalışma vaktini şimdilik puan kaybettiğin bölümlere ayırabilirsin; bu bölümü haftada bir tekrar etmen yeterli.`,
    });
  }

  return { exam, unit, correct, wrong, blank, total, estimate, firstTarget, areas, scenario, weightNote, findings };
}

/** How many findings a free reader sees in full; the rest show only their question. */
export const freeFindings = 3;
