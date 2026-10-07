import type { SourceClass, TopicSliceKey } from "@/modules/analysis/acceptance";
import type { SectionId } from "@/modules/exam/blueprint";

/** User-verified 2013–2016 complete booklets in `2013-2021-YDS-CIKMIŞ-SORULAR.pdf` (1-based PDF pages). */
export type KnownBooklet = {
  parentSlug: string;
  slug: string;
  year: number;
  session: string;
  sessionLabel: string;
  pageStart: number;
  pageEnd: number;
  declared: SourceClass;
  kind: "yds" | "e_yds";
  topic?: TopicSliceKey;
  section?: SectionId;
};

export const knownYds2013_2021Booklets: KnownBooklet[] = [
  { parentSlug: "yds-2013-2021", slug: "yds-2013-spring", year: 2013, session: "2013-04-07", sessionLabel: "2013 İlkbahar", pageStart: 2, pageEnd: 27, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2013-fall", year: 2013, session: "2013-09-01", sessionLabel: "2013 Sonbahar", pageStart: 28, pageEnd: 50, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2014-spring", year: 2014, session: "2014-04-06", sessionLabel: "2014 İlkbahar", pageStart: 51, pageEnd: 74, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2014-fall", year: 2014, session: "2014-09-07", sessionLabel: "2014 Sonbahar", pageStart: 75, pageEnd: 98, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2015-spring", year: 2015, session: "2015-04-05", sessionLabel: "2015 İlkbahar", pageStart: 99, pageEnd: 122, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2015-fall", year: 2015, session: "2015-09-13", sessionLabel: "2015 Sonbahar", pageStart: 123, pageEnd: 147, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2016-spring", year: 2016, session: "2016-03-27", sessionLabel: "2016 İlkbahar", pageStart: 148, pageEnd: 171, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2018", year: 2018, session: "2018-spring", sessionLabel: "2018 İlkbahar", pageStart: 259, pageEnd: 286, declared: "complete_exam", kind: "yds" },
  { parentSlug: "yds-2013-2021", slug: "yds-2018-2", year: 2018, session: "2018-fall", sessionLabel: "2018 Sonbahar", pageStart: 287, pageEnd: 311, declared: "complete_exam", kind: "yds" },
];

export const knownEydsTopicSlices: KnownBooklet[] = [
  { parentSlug: "e-yds-compilation", slug: "e-yds-topic-vocab", year: 0, session: "topic-vocab", sessionLabel: "kelime", pageStart: 1, pageEnd: 6, declared: "topic_slice", kind: "e_yds", topic: "vocab", section: "vocabulary" },
  { parentSlug: "e-yds-compilation", slug: "e-yds-topic-tense", year: 0, session: "topic-tense", sessionLabel: "tense", pageStart: 7, pageEnd: 10, declared: "topic_slice", kind: "e_yds", topic: "tense", section: "grammar" },
  { parentSlug: "e-yds-compilation", slug: "e-yds-topic-conj", year: 0, session: "topic-conj", sessionLabel: "bağlaç", pageStart: 11, pageEnd: 13, declared: "topic_slice", kind: "e_yds", topic: "conj", section: "grammar" },
  { parentSlug: "e-yds-compilation", slug: "e-yds-topic-prep", year: 0, session: "topic-prep", sessionLabel: "preposition", pageStart: 14, pageEnd: 16, declared: "topic_slice", kind: "e_yds", topic: "prep", section: "grammar" },
  { parentSlug: "e-yds-compilation", slug: "e-yds-topic-sent", year: 0, session: "topic-sent", sessionLabel: "cümle tamamlama", pageStart: 17, pageEnd: 26, declared: "topic_slice", kind: "e_yds", topic: "sent", section: "sentence" },
  { parentSlug: "e-yds-compilation", slug: "e-yds-topic-trans", year: 0, session: "topic-trans", sessionLabel: "çeviri", pageStart: 27, pageEnd: 43, declared: "topic_slice", kind: "e_yds", topic: "trans", section: "translation" },
  { parentSlug: "e-yds-compilation", slug: "e-yds-topic-dlg", year: 0, session: "topic-dlg", sessionLabel: "diyalog", pageStart: 44, pageEnd: 101, declared: "topic_slice", kind: "e_yds", topic: "dlg", section: "dialogue" },
];

export const knownBooklets: KnownBooklet[] = [...knownYds2013_2021Booklets, ...knownEydsTopicSlices];

export const knownBookletsFor = (parentSlug: string) => knownBooklets.filter((entry) => entry.parentSlug === parentSlug);

export const knownBookletBySlug = (slug: string) => knownBooklets.find((entry) => entry.slug === slug);
