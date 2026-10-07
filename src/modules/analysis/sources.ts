import type { ExamCode } from "@/modules/exam/blueprint";

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
    exam: { code: "yds", year: 2024, session: "2024-11", blueprint: "yds-en", questionCount: 80, questionPages: [2, 17], answerKeyPage: 18 },
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
    slug: "yds-2018-2",
    source: "unknown_publisher",
    file: "2013-2021-YDS-CIKMIŞ-SORULAR.pdf",
    sha256: "5e9d8a32ae879a6ef92fe03e41f83e719423add2cfd4f1a89c3bb14cc267d0ef",
    parentSlug: "yds-2013-2021",
    extractSha256: "5e9d8a32ae879a6ef92fe03e41f83e719423add2cfd4f1a89c3bb14cc267d0ef",
    documentType: "exam_booklet",
    title: "YDS 2018 Sonbahar, English booklet (text layer, from compilation)",
    authors: ["ÖSYM"],
    publicationYear: 2018,
    language: "en",
    pageCount: 25,
    license: osymLicense,
    exam: { code: "yds", year: 2018, session: "2018-fall", blueprint: "yds-en", questionCount: 80, questionPages: [287, 310], answerKeyPage: 311 },
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
