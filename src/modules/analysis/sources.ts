import type { SourceClass, TopicSliceKey } from "@/modules/analysis/acceptance";
import type { ExamCode, SectionId } from "@/modules/exam/blueprint";

export type SourceKind = "exam_authority" | "academic_aggregator" | "academic_repository" | "publisher" | "third_party_upload" | "internal";
export type SourceType = "owned" | "licensed" | "open" | "reference_only";
export type LicenseStatus = "unknown" | "pending_review" | "verified" | "analysis_only" | "rejected";
export type DocumentType = "exam_booklet" | "exam_compilation" | "question_bank" | "wordlist" | "article" | "book" | "dataset" | "other";

export type SourceProvider = { slug: string; name: string; kind: SourceKind; url?: string; termsUrl?: string };

export type License = {
  sourceType: SourceType;
  status: LicenseStatus;
  name?: string;
  url?: string;
  commercialUse: boolean;
  derivativeUse: boolean;
  redistributionAllowed: boolean;
  textMiningAllowed: boolean;
  attributionRequired: boolean;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
};

export type AnalysisExam = {
  code: ExamCode | "e_yds" | "yokdil";
  year: number;
  session: string;
  blueprint: string;
  questionCount: number;
  questionPages: [number, number];
  answerKeyPage?: number;
  sourceClass: SourceClass;
  topic?: TopicSliceKey;
  topicSection?: SectionId;
};

export type SourceDocument = {
  slug: string;
  source: string;
  file: string;
  sha256: string;
  documentType: DocumentType;
  title: string;
  authors: string[];
  publicationYear?: number;
  language: string;
  pageCount: number;
  license: License;
  exam?: AnalysisExam;
  /** Child booklet sliced from a compilation PDF; PDF bytes and hash live on the parent. */
  parentSlug?: string;
  extractSha256?: string;
};

export const sourceProviders: SourceProvider[] = [
  { slug: "osym", name: "ÖSYM", kind: "exam_authority", url: "https://www.osym.gov.tr" },
  { slug: "pdfcoffee", name: "pdfcoffee.com uploads", kind: "third_party_upload", url: "https://pdfcoffee.com" },
  { slug: "unknown_publisher", name: "Unidentified commercial publisher", kind: "publisher" },
  { slug: "core", name: "CORE", kind: "academic_aggregator", url: "https://core.ac.uk", termsUrl: "https://core.ac.uk/terms" },
  { slug: "semantic_scholar", name: "Semantic Scholar", kind: "academic_aggregator", url: "https://www.semanticscholar.org", termsUrl: "https://www.semanticscholar.org/product/api/license" },
  { slug: "doaj", name: "Directory of Open Access Journals", kind: "academic_aggregator", url: "https://doaj.org", termsUrl: "https://doaj.org/terms" },
];

/** ÖSYM exams are FSEK-protected: analysis only, no redistribution, no derivative reuse. */
export const osymLicense: License = {
  sourceType: "reference_only",
  status: "analysis_only",
  name: "FSEK, all rights reserved (ÖSYM)",
  commercialUse: false,
  derivativeUse: false,
  redistributionAllowed: false,
  textMiningAllowed: false,
  attributionRequired: true,
  verified: false,
};

const unknownLicense: License = { ...osymLicense, status: "unknown", name: undefined };

const publisherLicense: License = { ...osymLicense, name: "All rights reserved (publisher)" };

export const sourceDocuments: SourceDocument[] = [
  {
    slug: "yds-2024-11",
    source: "osym",
    file: "2024 Kasım YDS_241103_143623_260927_165230.pdf",
    sha256: "11411d8d47882489c9ae4ea2e82225881c34c42958493f7b605adc4249ab1e06",
    documentType: "exam_booklet",
    title: "YDS 2024 Kasım, English booklet (scanned)",
    authors: ["ÖSYM"],
    publicationYear: 2024,
    language: "en",
    pageCount: 18,
    license: osymLicense,
    exam: { code: "yds", year: 2024, session: "2024-11", blueprint: "yds-en", questionCount: 80, questionPages: [2, 17], answerKeyPage: 18, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2024-03",
    source: "pdfcoffee",
    file: "pdfcoffeecom_2024-mart-yds-sorulari-pdf-free_260927_165508.pdf",
    sha256: "da92c4ee952bde53d320a10b9dbb7005a60e0b19951d87bafadb8a22bdfbd1d0",
    documentType: "exam_booklet",
    title: "YDS 2024 Mart, third-party retypeset upload (scanned)",
    authors: ["ÖSYM"],
    publicationYear: 2024,
    language: "en",
    pageCount: 46,
    license: unknownLicense,
    exam: { code: "yds", year: 2024, session: "2024-03", blueprint: "yds-en", questionCount: 80, questionPages: [2, 45], answerKeyPage: 46, sourceClass: "partial_exam" },
  },
  {
    slug: "yds-2023-10",
    source: "pdfcoffee",
    file: "pdfcoffeecom_22-ekim-2023-yds-a-a-kma-a-sorular-p_260927_165917.pdf",
    sha256: "a8941cbc24e68de1826f2301ea4f07c06d2e22de61bdfd22d91d11a61dd59662",
    documentType: "exam_booklet",
    title: "YDS 2023 Ekim, third-party upload (text layer)",
    authors: ["ÖSYM"],
    publicationYear: 2023,
    language: "en",
    pageCount: 22,
    license: unknownLicense,
    exam: { code: "yds", year: 2023, session: "2023-10", blueprint: "yds-en", questionCount: 80, questionPages: [1, 20], answerKeyPage: 21, sourceClass: "partial_exam" },
  },
  {
    slug: "yds-2025-03",
    source: "osym",
    file: "ing_yd1d09032025_260927_120257.pdf",
    sha256: "58672bdce906de43ac292d5fa27819bf34d014a92d48c122ae853d5a92238870",
    documentType: "exam_booklet",
    title: "YDS 2025 Mart, English booklet",
    authors: ["ÖSYM"],
    publicationYear: 2025,
    language: "en",
    pageCount: 30,
    license: osymLicense,
  },
  {
    slug: "yds-2013-2021",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "6370263d2a9d1eb34cdbef219a29ebf83a7d7bb7937205cad33a08806ed755f0",
    documentType: "exam_compilation",
    title: "YDS past questions 2013–2021, compilation",
    authors: [],
    language: "en",
    pageCount: 455,
    license: osymLicense,
  },
  {
    slug: "e-yds-compilation",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "7e036d25380f579c42e46d461a137c33bd86b9ba624c134997a53215cd875fcc",
    documentType: "exam_compilation",
    title: "e-YDS past questions, compilation",
    authors: [],
    language: "en",
    pageCount: 101,
    license: osymLicense,
  },
  {
    slug: "yds-2013-spring",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "de6876ba57ba5d743673f4ff229abf98924f3512025764bd7e74b8a9dc993961",
    parentSlug: "yds-2013-2021",
    extractSha256: "de6876ba57ba5d743673f4ff229abf98924f3512025764bd7e74b8a9dc993961",
    documentType: "exam_booklet",
    title: "YDS 2013 İlkbahar (7 Nisan 2013), from compilation",
    authors: ["ÖSYM"],
    publicationYear: 2013,
    language: "en",
    pageCount: 26,
    license: osymLicense,
    exam: { code: "yds", year: 2013, session: "2013-04-07", blueprint: "yds-en", questionCount: 80, questionPages: [2, 26], answerKeyPage: 27, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2013-fall",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "d35190e35631cb034328fe1740410ac5f29d128bbdb9153f37ffde8411963d15",
    parentSlug: "yds-2013-2021",
    extractSha256: "d35190e35631cb034328fe1740410ac5f29d128bbdb9153f37ffde8411963d15",
    documentType: "exam_booklet",
    title: "YDS 2013 Sonbahar (1 Eylül 2013), from compilation",
    authors: ["ÖSYM"],
    publicationYear: 2013,
    language: "en",
    pageCount: 23,
    license: osymLicense,
    exam: { code: "yds", year: 2013, session: "2013-09-01", blueprint: "yds-en", questionCount: 80, questionPages: [28, 49], answerKeyPage: 50, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2014-spring",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "d565b0bf4db0a6d39465156133783900a911854050e25f27bb357c82935daa3c",
    parentSlug: "yds-2013-2021",
    extractSha256: "d565b0bf4db0a6d39465156133783900a911854050e25f27bb357c82935daa3c",
    documentType: "exam_booklet",
    title: "YDS 2014 İlkbahar (6 Nisan 2014), from compilation",
    authors: ["ÖSYM"],
    publicationYear: 2014,
    language: "en",
    pageCount: 24,
    license: osymLicense,
    exam: { code: "yds", year: 2014, session: "2014-04-06", blueprint: "yds-en", questionCount: 80, questionPages: [51, 73], answerKeyPage: 74, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2014-fall",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "cdfcf2f7b827a26b9f3625d880a20be58c2d26606bf525a31a24b18cd60b3e71",
    parentSlug: "yds-2013-2021",
    extractSha256: "cdfcf2f7b827a26b9f3625d880a20be58c2d26606bf525a31a24b18cd60b3e71",
    documentType: "exam_booklet",
    title: "YDS 2014 Sonbahar (7 Eylül 2014), from compilation",
    authors: ["ÖSYM"],
    publicationYear: 2014,
    language: "en",
    pageCount: 24,
    license: osymLicense,
    exam: { code: "yds", year: 2014, session: "2014-09-07", blueprint: "yds-en", questionCount: 80, questionPages: [75, 97], answerKeyPage: 98, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2015-spring",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "5f80389463feb5a9321e8fcb29ec77cf7c016082b9aafd955b67f9adf1e56d8f",
    parentSlug: "yds-2013-2021",
    extractSha256: "5f80389463feb5a9321e8fcb29ec77cf7c016082b9aafd955b67f9adf1e56d8f",
    documentType: "exam_booklet",
    title: "YDS 2015 İlkbahar (5 Nisan 2015), from compilation",
    authors: ["ÖSYM"],
    publicationYear: 2015,
    language: "en",
    pageCount: 24,
    license: osymLicense,
    exam: { code: "yds", year: 2015, session: "2015-04-05", blueprint: "yds-en", questionCount: 80, questionPages: [99, 121], answerKeyPage: 122, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2015-fall",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "e7d72664c85be0bb7f79d27a7835b2420bb1391ea0dcb22d6367c512f1fc2f26",
    parentSlug: "yds-2013-2021",
    extractSha256: "e7d72664c85be0bb7f79d27a7835b2420bb1391ea0dcb22d6367c512f1fc2f26",
    documentType: "exam_booklet",
    title: "YDS 2015 Sonbahar (13 Eylül 2015), from compilation",
    authors: ["ÖSYM"],
    publicationYear: 2015,
    language: "en",
    pageCount: 25,
    license: osymLicense,
    exam: { code: "yds", year: 2015, session: "2015-09-13", blueprint: "yds-en", questionCount: 80, questionPages: [123, 146], answerKeyPage: 147, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2016-spring",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "ec6e08ad1e7171a9f550efd384cfb12c6417cc9a9d08c318794f48babb7cac0d",
    parentSlug: "yds-2013-2021",
    extractSha256: "ec6e08ad1e7171a9f550efd384cfb12c6417cc9a9d08c318794f48babb7cac0d",
    documentType: "exam_booklet",
    title: "YDS 2016 İlkbahar (27 Mart 2016), from compilation",
    authors: ["ÖSYM"],
    publicationYear: 2016,
    language: "en",
    pageCount: 24,
    license: osymLicense,
    exam: { code: "yds", year: 2016, session: "2016-03-27", blueprint: "yds-en", questionCount: 80, questionPages: [148, 170], answerKeyPage: 171, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2018",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "1fc6af00b3235e5bc5789949aa38f2ad13df4e72481bdbf94f0006e385dd1855",
    parentSlug: "yds-2013-2021",
    extractSha256: "1fc6af00b3235e5bc5789949aa38f2ad13df4e72481bdbf94f0006e385dd1855",
    documentType: "exam_booklet",
    title: "YDS 2018 İlkbahar, English booklet (text layer, from compilation)",
    authors: ["ÖSYM"],
    publicationYear: 2018,
    language: "en",
    pageCount: 28,
    license: osymLicense,
    exam: { code: "yds", year: 2018, session: "2018-spring", blueprint: "yds-en", questionCount: 80, questionPages: [259, 282], answerKeyPage: 283, sourceClass: "complete_exam" },
  },
  {
    slug: "yds-2018-2",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "f3b15335ff7aba8f6f3d30eff185a7751c845f8908a257935c82469af2b84847",
    parentSlug: "yds-2013-2021",
    extractSha256: "f3b15335ff7aba8f6f3d30eff185a7751c845f8908a257935c82469af2b84847",
    documentType: "exam_booklet",
    title: "YDS 2018 Sonbahar, English booklet (text layer, from compilation)",
    authors: ["ÖSYM"],
    publicationYear: 2018,
    language: "en",
    pageCount: 25,
    license: osymLicense,
    exam: { code: "yds", year: 2018, session: "2018-fall", blueprint: "yds-en", questionCount: 80, questionPages: [287, 310], answerKeyPage: 311, sourceClass: "complete_exam" },
  },
  {
    slug: "e-yds-topic-vocab",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "24349f9a86fdc86ec4e62f98435643cf966278689c068b31ea8db815a42532fb",
    parentSlug: "e-yds-compilation",
    extractSha256: "24349f9a86fdc86ec4e62f98435643cf966278689c068b31ea8db815a42532fb",
    documentType: "question_bank",
    title: "e-YDS topic slice: vocabulary (pattern_only; not exam distribution)",
    authors: [],
    language: "en",
    pageCount: 6,
    license: osymLicense,
    exam: { code: "e_yds", year: 0, session: "topic-vocab", blueprint: "yds-topic", questionCount: 21, questionPages: [1, 5], answerKeyPage: 6, sourceClass: "topic_slice", topic: "vocab", topicSection: "vocabulary" },
  },
  {
    slug: "e-yds-topic-tense",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "29d2b8367151481565be9f25776b97e9791b76314802f21998e1278dbfefbbf2",
    parentSlug: "e-yds-compilation",
    extractSha256: "29d2b8367151481565be9f25776b97e9791b76314802f21998e1278dbfefbbf2",
    documentType: "question_bank",
    title: "e-YDS topic slice: tense (pattern_only; not exam distribution)",
    authors: [],
    language: "en",
    pageCount: 4,
    license: osymLicense,
    exam: { code: "e_yds", year: 0, session: "topic-tense", blueprint: "yds-topic", questionCount: 8, questionPages: [7, 9], answerKeyPage: 10, sourceClass: "topic_slice", topic: "tense", topicSection: "grammar" },
  },
  {
    slug: "e-yds-topic-conj",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "9dd12502afe4af5c291e6af416861fcbfb0df28a4a298939be1700f19469279c",
    parentSlug: "e-yds-compilation",
    extractSha256: "9dd12502afe4af5c291e6af416861fcbfb0df28a4a298939be1700f19469279c",
    documentType: "question_bank",
    title: "e-YDS topic slice: conjunctions (pattern_only; not exam distribution)",
    authors: [],
    language: "en",
    pageCount: 3,
    license: osymLicense,
    exam: { code: "e_yds", year: 0, session: "topic-conj", blueprint: "yds-topic", questionCount: 10, questionPages: [11, 12], answerKeyPage: 13, sourceClass: "topic_slice", topic: "conj", topicSection: "grammar" },
  },
  {
    slug: "e-yds-topic-prep",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "67c22c0a37383456c16d98b7aa0845e13ccba1883b508150a37a63595503afd4",
    parentSlug: "e-yds-compilation",
    extractSha256: "67c22c0a37383456c16d98b7aa0845e13ccba1883b508150a37a63595503afd4",
    documentType: "question_bank",
    title: "e-YDS topic slice: preposition (pattern_only; not exam distribution)",
    authors: [],
    language: "en",
    pageCount: 3,
    license: osymLicense,
    exam: { code: "e_yds", year: 0, session: "topic-prep", blueprint: "yds-topic", questionCount: 8, questionPages: [14, 16], sourceClass: "topic_slice", topic: "prep", topicSection: "grammar" },
  },
  {
    slug: "e-yds-topic-sent",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "6d2bffe093aec707649cd0b986f198c1611f9ab1e2fc7a71aacbafe043d44512",
    parentSlug: "e-yds-compilation",
    extractSha256: "6d2bffe093aec707649cd0b986f198c1611f9ab1e2fc7a71aacbafe043d44512",
    documentType: "question_bank",
    title: "e-YDS topic slice: sentence completion (pattern_only; not exam distribution)",
    authors: [],
    language: "en",
    pageCount: 10,
    license: osymLicense,
    exam: { code: "e_yds", year: 0, session: "topic-sent", blueprint: "yds-topic", questionCount: 21, questionPages: [17, 25], answerKeyPage: 26, sourceClass: "topic_slice", topic: "sent", topicSection: "sentence" },
  },
  {
    slug: "e-yds-topic-trans",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "2d1ee574cbd6874823069f27072461823b45f65d000209b4d9230c6d03b26a05",
    parentSlug: "e-yds-compilation",
    extractSha256: "2d1ee574cbd6874823069f27072461823b45f65d000209b4d9230c6d03b26a05",
    documentType: "question_bank",
    title: "e-YDS topic slice: translation (pattern_only; not exam distribution)",
    authors: [],
    language: "en",
    pageCount: 17,
    license: osymLicense,
    exam: { code: "e_yds", year: 0, session: "topic-trans", blueprint: "yds-topic", questionCount: 15, questionPages: [27, 42], answerKeyPage: 43, sourceClass: "topic_slice", topic: "trans", topicSection: "translation" },
  },
  {
    slug: "e-yds-topic-dlg",
    source: "unknown_publisher",
    file: "EYDS-Gecmiş-Yıl-Butun-Sorular.pdf",
    sha256: "b1b0c979eedf8393ac229a1f15593ac3bc80f4a088903884659c91de8bf899b2",
    parentSlug: "e-yds-compilation",
    extractSha256: "b1b0c979eedf8393ac229a1f15593ac3bc80f4a088903884659c91de8bf899b2",
    documentType: "question_bank",
    title: "e-YDS topic slice: dialogue (pattern_only; not exam distribution)",
    authors: [],
    language: "en",
    pageCount: 58,
    license: osymLicense,
    exam: { code: "e_yds", year: 0, session: "topic-dlg", blueprint: "yds-topic", questionCount: 30, questionPages: [44, 100], answerKeyPage: 101, sourceClass: "topic_slice", topic: "dlg", topicSection: "dialogue" },
  },

  {
    slug: "yds-question-bank",
    source: "unknown_publisher",
    file: "YDS-COZUMLU-MODULER-SORU-BANKASI.pdf",
    sha256: "095ebbcc0b0b337b88a3b7534a79b99b0ceea39f74a0dde81a8f67784ef76c8c",
    documentType: "question_bank",
    title: "YDS modular question bank with solutions",
    authors: [],
    language: "en",
    pageCount: 409,
    license: publisherLicense,
  },
  {
    slug: "yds-4000-words",
    source: "unknown_publisher",
    file: "YDS-4000-kelime.pdf",
    sha256: "809f68886f11ea507d55f9d73723102bf9e6a304050fe6b65af4cf7e8606ddfc",
    documentType: "wordlist",
    title: "YDS 4000 words list",
    authors: [],
    language: "en",
    pageCount: 88,
    license: publisherLicense,
  },
];

/** Rules the database also enforces; kept here so the registry fails fast in tests. */
export function licenseProblems(license: License): string[] {
  const problems: string[] = [];
  if (license.sourceType === "reference_only" && (license.commercialUse || license.derivativeUse || license.redistributionAllowed)) {
    problems.push("reference_only sources cannot allow commercial use, derivatives or redistribution");
  }
  if (license.verified && !license.verifiedAt) problems.push("verified licenses need verifiedAt");
  if (license.status === "verified" && !license.verified) problems.push("license_status verified needs verified = true");
  return problems;
}

/** A document may feed an AI stage that produces product content only with a verified license that allows text mining. */
export function usableForGrounding(license: License): boolean {
  return license.status === "verified" && license.verified && license.textMiningAllowed && license.sourceType !== "reference_only";
}

export function documentBySlug(slug: string): SourceDocument {
  const document = sourceDocuments.find((entry) => entry.slug === slug);
  if (!document) throw new Error(`Unknown source document ${slug}`);
  return document;
}
