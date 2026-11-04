import { describe, expect, it } from "vitest";
import { updatedAt } from "@/content/editorial";
import { guides } from "@/content/guides";
import { paperBands, targetSplit, targets } from "@/content/target-scores";
import { topicLinks } from "@/content/topics";
import { correctsForScore } from "@/modules/exam/yds-points";
import { ydsBlueprint } from "@/modules/exam/blueprint";
import { articles } from "./index";
import { sourceAnchor, sources } from "./sources";
import { linksIn } from "./types";

const sections = new Set<string>(ydsBlueprint.bands.map((band) => band.section));

const publicPaths = new Set([
  "/",
  "/teshis",
  "/deneme",
  "/fiyat",
  "/giris",
  "/rehber",
  "/yontem",
  "/yds-puan-hesaplama",
  ...[...sections].map((section) => `/rehber/${section}`),
  ...guides.map((guide) => `/${guide.slug}`),
  ...articles.map((article) => article.path),
]);

const sectionIds = new Map(articles.map((article) => [article.path, new Set(article.sections.map((section) => section.id))]));

function textsOf(article: (typeof articles)[number]): string[] {
  const texts = [article.lead, ...article.faqs.map((faq) => faq.answer)];
  for (const section of article.sections) {
    for (const block of section.blocks) {
      if (block.kind === "p") texts.push(block.text);
      if (block.kind === "list") texts.push(...block.items);
      if (block.kind === "steps") texts.push(...block.items.map((item) => item.body));
      if (block.kind === "table") texts.push(...block.rows.flat(), block.caption ?? "");
      if (block.kind === "example") texts.push(...block.lines.map((line) => line.text));
    }
  }
  return texts;
}

describe("articles", () => {
  it("only link to pages and anchors that exist", () => {
    for (const article of articles) {
      const anchors = new Set(article.sources.map(sourceAnchor));
      const links = [...textsOf(article).flatMap(linksIn), ...article.related.map((item) => item.href)];
      for (const href of links) {
        const [path, hash] = href.split("#");
        if (!path) {
          expect(anchors.has(hash!), `${article.path} → ${href}`).toBe(true);
          continue;
        }
        expect(publicPaths.has(path), `${article.path} → ${href}`).toBe(true);
        if (hash && sectionIds.has(path)) expect(sectionIds.get(path)!.has(hash), `${article.path} → ${href}`).toBe(true);
      }
    }
  });

  it("cite every listed source and list every cited one", () => {
    for (const article of articles) {
      const cited = new Set(
        textsOf(article)
          .flatMap(linksIn)
          .filter((href) => href.startsWith("#kaynak-"))
          .map((href) => href.slice("#kaynak-".length)),
      );
      for (const id of article.sources) {
        expect(sources[id], `${article.path} unknown source ${id}`).toBeTruthy();
        expect(cited.has(id), `${article.path} lists ${id} without citing it`).toBe(true);
      }
      expect([...cited].sort()).toEqual([...article.sources].sort());
    }
  });

  it("carry an update date and unique section ids", () => {
    for (const article of articles) {
      expect(updatedAt[article.path], article.path).toBeTruthy();
      const ids = article.sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("are all reachable from the topic hub", () => {
    const hub = new Set(topicLinks.map((link) => link.href));
    for (const article of articles) expect(hub.has(article.path), article.path).toBe(true);
    for (const link of topicLinks) expect(publicPaths.has(link.href), link.href).toBe(true);
  });

  it("guides point at real rehber sections", () => {
    for (const guide of guides) for (const section of guide.sections) expect(sections.has(section), `${guide.slug} → ${section}`).toBe(true);
  });
});

describe("target splits", () => {
  it.each(["yds", "yokdil"] as const)("%s columns reach 70 / 80 / 90 within each section", (paper) => {
    const split = targetSplit[paper] as Record<string, readonly number[]>;
    const bands = paperBands(paper);
    expect(Object.keys(split).sort()).toEqual(bands.map((band) => band.id).sort());
    targets.forEach((score, index) => {
      const total = bands.reduce((sum, band) => sum + split[band.id]![index]!, 0);
      expect(total).toBe(correctsForScore(score));
      for (const band of bands) expect(split[band.id]![index]!).toBeLessThanOrEqual(band.count);
    });
  });
});
