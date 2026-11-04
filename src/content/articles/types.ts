/** Copy may contain inline links as `[label](/path)`. */
export type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "steps"; items: { title: string; body: string }[] }
  | { kind: "table"; head: string[]; rows: string[][]; caption?: string }
  | { kind: "example"; sentence: string; lines: { label: string; text: string }[] }
  | { kind: "examTable" }
  | { kind: "sectionTips" }
  | { kind: "cta"; text: string; href: string; label: string };

export type ArticleSection = { id: string; title: string; blocks: Block[] };

export type Faq = { question: string; answer: string };

export type Article = {
  path: string;
  eyebrow: string;
  title: string;
  accent: string;
  metaTitle: string;
  description: string;
  lead: string;
  sections: ArticleSection[];
  faqs: Faq[];
  /** Ids from `sources.ts`; cite inline as `[Yazar, yıl](#kaynak-id)`. */
  sources: string[];
  related: { label: string; href: string }[];
};

const link = /\[([^\]]+)\]\(([^)]+)\)/g;

export function plainText(text: string) {
  return text.replace(link, "$1");
}

export function linksIn(text: string): string[] {
  return [...text.matchAll(link)].map((match) => match[2]!);
}
