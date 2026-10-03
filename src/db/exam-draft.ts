import type { Layout, SectionId } from "@/modules/exam/blueprint";

export type DraftChoice = { text: string; correct?: boolean; distractor?: string };

export type DraftItem = {
  slot: number;
  section: SectionId;
  layout: Layout;
  stem: string;
  explanation: string;
  difficulty: number;
  skills: string[];
  direction?: "en-tr" | "tr-en";
  stimulusKey?: string;
  vocab?: string[];
  choices: DraftChoice[];
};

export type DraftStimulus = { key: string; kind: "passage" | "cloze" | "dialogue" | "numbered"; body: string };

export const skillTree: { id: string; parentId: string | null; name: string }[] = [
  { id: "vocabulary", parentId: null, name: "Vocabulary" },
  { id: "academic-vocabulary", parentId: "vocabulary", name: "Academic vocabulary" },
  { id: "collocation", parentId: "vocabulary", name: "Collocation" },
  { id: "grammar", parentId: null, name: "Grammar" },
  { id: "tenses", parentId: "grammar", name: "Tenses" },
  { id: "connectors", parentId: "grammar", name: "Connectors" },
  { id: "conditionals", parentId: "grammar", name: "Conditionals" },
  { id: "relative", parentId: "grammar", name: "Relative clauses" },
  { id: "passive", parentId: "grammar", name: "Passive" },
  { id: "prepositions", parentId: "grammar", name: "Prepositions" },
  { id: "cloze", parentId: null, name: "Cloze" },
  { id: "cloze-context", parentId: "cloze", name: "Cloze context" },
  { id: "sentence", parentId: null, name: "Sentence completion" },
  { id: "sentence-link", parentId: "sentence", name: "Logical link" },
  { id: "translation", parentId: null, name: "Translation" },
  { id: "translation-en-tr", parentId: "translation", name: "English to Turkish" },
  { id: "translation-tr-en", parentId: "translation", name: "Turkish to English" },
  { id: "reading", parentId: null, name: "Reading" },
  { id: "detail", parentId: "reading", name: "Detail" },
  { id: "inference", parentId: "reading", name: "Inference" },
  { id: "reference", parentId: "reading", name: "Reference" },
  { id: "main-idea", parentId: "reading", name: "Main idea" },
  { id: "purpose", parentId: "reading", name: "Purpose" },
  { id: "dialogue", parentId: null, name: "Dialogue" },
  { id: "dialogue-intent", parentId: "dialogue", name: "Speaker intent" },
  { id: "restatement", parentId: null, name: "Restatement" },
  { id: "restatement-shift", parentId: "restatement", name: "Meaning shift" },
  { id: "paragraph", parentId: null, name: "Paragraph completion" },
  { id: "paragraph-flow", parentId: "paragraph", name: "Paragraph flow" },
  { id: "irrelevant", parentId: null, name: "Irrelevant sentence" },
  { id: "irrelevant-break", parentId: "irrelevant", name: "Coherence break" },
];

export const vocabDrafts: {
  id: string;
  word: string;
  meaningTr: string;
  partOfSpeech: string;
  example: string;
}[] = [
  { id: "substantial", word: "substantial", meaningTr: "önemli, hatırı sayılır", partOfSpeech: "adjective", example: "The audit found substantial evidence of delay." },
  { id: "significant", word: "significant", meaningTr: "anlamlı, önemli", partOfSpeech: "adjective", example: "There was a significant drop in complaints." },
  { id: "mitigate", word: "mitigate", meaningTr: "hafifletmek", partOfSpeech: "verb", example: "Shade trees mitigate heat on narrow streets." },
  { id: "alleviate", word: "alleviate", meaningTr: "dindirmek, hafifletmek", partOfSpeech: "verb", example: "The grant helped alleviate the funding gap." },
  { id: "scarce", word: "scarce", meaningTr: "kıt, az bulunur", partOfSpeech: "adjective", example: "Clean water became scarce after the drought." },
  { id: "inherent", word: "inherent", meaningTr: "doğasında olan", partOfSpeech: "adjective", example: "Risk is inherent in long field studies." },
  { id: "compel", word: "compel", meaningTr: "zorlamak", partOfSpeech: "verb", example: "The data compel a revision of the schedule." },
  { id: "coherent", word: "coherent", meaningTr: "tutarlı", partOfSpeech: "adjective", example: "The chapters form a coherent argument." },
  { id: "prevalent", word: "prevalent", meaningTr: "yaygın", partOfSpeech: "adjective", example: "Short contracts are prevalent in the sector." },
  { id: "undermine", word: "undermine", meaningTr: "zayıflatmak, baltalamak", partOfSpeech: "verb", example: "Rumours can undermine trust in a clinic." },
  { id: "allocate", word: "allocate", meaningTr: "ayırmak, tahsis etmek", partOfSpeech: "verb", example: "The board will allocate funds next month." },
  { id: "contingent", word: "contingent", meaningTr: "bağlı, koşullu", partOfSpeech: "adjective", example: "Approval is contingent on a second review." },
];

export const vocabLinkDrafts: { id: string; fromId: string; toId: string; kind: string }[] = [
  { id: "link-1", fromId: "substantial", toId: "significant", kind: "synonym" },
  { id: "link-2", fromId: "mitigate", toId: "alleviate", kind: "synonym" },
  { id: "link-3", fromId: "substantial", toId: "scarce", kind: "antonym" },
  { id: "link-4", fromId: "undermine", toId: "coherent", kind: "collocation" },
];

const c = (text: string, distractor: string): DraftChoice => ({ text, distractor });
const ok = (text: string): DraftChoice => ({ text, correct: true });

function item(
  slot: number,
  section: SectionId,
  layout: Layout,
  stem: string,
  explanation: string,
  difficulty: number,
  skills: string[],
  choices: DraftChoice[],
  extra: Partial<Pick<DraftItem, "direction" | "stimulusKey" | "vocab">> = {},
): DraftItem {
  return { slot, section, layout, stem, explanation, difficulty, skills, choices, ...extra };
}

export const stimuli: DraftStimulus[] = [
  {
    key: "cloze-a",
    kind: "cloze",
    body: "A coastal town stopped charging daily late fees at its library. It (17) ---- sent a single monthly notice. Borrowing rose, (18) ---- so did the number of books that never returned. Staff then limited new cards for readers (19) ---- three overdue items. The change was unpopular for a month. (20) ----, returns stabilised and the shelves for new novels filled again. The librarians concluded that a mild penalty works (21) ---- it is predictable and tied to a clear limit, not when it feels like a surprise fine.",
  },
  {
    key: "cloze-b",
    kind: "cloze",
    body: "Farmers who plant the same crop every season often notice that yields slip (22) ---- rainfall is steady. The reason is (23) ---- the seed. Soil communities that once recycled nutrients become (24) ---- varied, and the field depends on fertiliser. A rotation that includes a legume year restores (25) ---- of that variety. It does not replace careful watering, (26) ---- it reduces the amount of chemical support the next cash crop requires.",
  },
  {
    key: "read-0",
    kind: "passage",
    body: "Cities that replace asphalt with permeable pavements often report fewer flash floods, yet the gain is uneven. Where maintenance budgets are thin, pores clog within a few seasons and the surface behaves like ordinary concrete. A study of twelve municipal districts found that permeability stayed high only where streets were vacuumed at least twice a year. The authors argue that material choice matters less than the dull work of upkeep. Districts that bought the newer surface and then cut cleaning contracts saw flood complaints return to their old level.",
  },
  {
    key: "read-1",
    kind: "passage",
    body: "A history museum shortened its object labels from 180 words to about 60 and moved the longer account to a card visitors could pick up. Dwell time in front of the cases increased, while the cards were taken by fewer than one visitor in five. The evaluation team warned against reading this as proof that people want less information. Families stayed longer because they could finish a label together. Specialists still used the cards. The useful change was a split between a shared glance and an optional deep note, not a general dislike of detail.",
  },
  {
    key: "read-2",
    kind: "passage",
    body: "When a regional rail operator restored overnight trains, the early marketing stressed the romance of sleeping between cities. Ticket data told a plainer story. Most seats were bought by nurses, technicians and students who needed to arrive before a morning shift and could not pay for a hotel. The quiet car outperformed the dining offer. The operator kept the night service but dropped the leisure photographs from its campaign. Occupancy rose once the timetable was printed beside hospital and campus clocks rather than beside pictures of sunsets.",
  },
  {
    key: "read-3",
    kind: "passage",
    body: "Seed banks are often described as insurance against crop failure, yet a vault is not a farm. Samples remain useful only if they are tested and grown out before viability collapses. One national bank discovered that a third of its wheat accessions had not been germinated in twenty years. The oldest packets still looked intact. Germination tests showed otherwise. The curators now treat regeneration as part of storage, and they publish the failure rate instead of only the number of jars on the shelves.",
  },
  {
    key: "read-4",
    kind: "passage",
    body: "A teaching hospital cut antibiotic prescriptions for mild sinus cases by asking doctors to record a reason in a single extra field. The field was not a lecture. It simply made the choice visible to the prescriber a moment later. Prescriptions fell, and the rate of return visits did not rise. Pharmacists supported the change because fewer patients arrived expecting a drug the guideline did not favour. The result suggests that a small pause, written in the clinician's own words, can shift a habit that posters in the corridor had not changed.",
  },
  {
    key: "dlg-63",
    kind: "dialogue",
    body: "Advisor: You asked to move your oral exam to Friday.\nStudent: ----\nAdvisor: Then Friday at 10:00 is free. Bring the form to the department office today.",
  },
  {
    key: "dlg-64",
    kind: "dialogue",
    body: "Editor: The chart on page four still uses last year's figures.\nAuthor: ----\nEditor: Send the file tonight and I will swap it before the proof goes out.",
  },
  {
    key: "dlg-65",
    kind: "dialogue",
    body: "Nurse: The afternoon clinic is full. We can offer Monday at 08:30.\nPatient: ----\nNurse: I will book that and text you the floor number.",
  },
  {
    key: "dlg-66",
    kind: "dialogue",
    body: "Guide: This gallery case is about repairs, not about the age of the bowl.\nVisitor: ----\nGuide: Look at the gold lines. They mark the places where it cracked.",
  },
  {
    key: "dlg-67",
    kind: "dialogue",
    body: "Manager: The supplier can deliver on Thursday, but only if we confirm the colour today.\nClerk: ----\nManager: Good. Reply to them before noon and copy me.",
  },
  {
    key: "para-72",
    kind: "passage",
    body: "The town closed one lane of the bridge for six weeks to replace rusted bolts. Drivers expected long queues. ---- Buses were given the open lane at peak hours, and freight trucks were asked to cross after 21:00. The queues stayed shorter than the model had predicted.",
  },
  {
    key: "para-73",
    kind: "passage",
    body: "Laboratory notebooks used to stay in a locked cupboard. The group now scans each page on the day it is written. ---- A student who leaves the project can still be asked about a result, because the page is no longer trapped in one drawer. The scan is not a substitute for careful writing.",
  },
  {
    key: "para-74",
    kind: "passage",
    body: "The choir rehearses in a school hall that echoes. For the recording they moved to a smaller room with curtains. ---- Listeners could hear the consonants that the hall had smeared. The conductor kept the new room for the album and returned to the hall for public concerts.",
  },
  {
    key: "para-75",
    kind: "passage",
    body: "A clinic started opening ten minutes before the posted time so that the first patients were not seen late. ---- Staff used those minutes to prepare files rather than to chat. By the third week the noon appointments were finishing on time as well. The gain came from the start of the list, not from shorter visits.",
  },
  {
    key: "irr-76",
    kind: "numbered",
    body: "(I) The archive humidity is checked every morning. (II) A reading above 60 percent triggers a dehumidifier. (III) The cafeteria on the ground floor serves soup on Fridays. (IV) Staff record the reading in a log that auditors can request. (V) The log is what shows whether a spike was corrected the same day.",
  },
  {
    key: "irr-77",
    kind: "numbered",
    body: "(I) The grant pays for field travel, not for new furniture. (II) Recipients file a one-page expense note after each trip. (III) Notes without a date are returned. (IV) The university football team won its opening match. (V) The returned notes must be corrected within ten days.",
  },
  {
    key: "irr-78",
    kind: "numbered",
    body: "(I) Volunteers map nests along the same path each April. (II) They do not move eggs or handle chicks. (III) A count that changes the birds' behaviour would spoil the record. (IV) The path is closed to dogs in that month. (V) The bakery at the trailhead sells excellent rye bread.",
  },
  {
    key: "irr-79",
    kind: "numbered",
    body: "(I) The revised syllabus lists readings by week. (II) Quizzes cover only the pages named for that week. (III) Students asked for this limit after last term's open-ended tests. (IV) The library fountain was repaired in June. (V) The department agreed and published the page numbers before registration.",
  },
  {
    key: "irr-80",
    kind: "numbered",
    body: "(I) The kiln is heated slowly so the pots do not crack. (II) A fast climb in temperature leaves stress in the clay. (III) Potters check the cones, not only the dial. (IV) The studio cat sleeps on the warm bricks afterwards. (V) The cones tell them when the heat has actually reached the clay.",
  },
];

const roman = (correct: "I" | "II" | "III" | "IV" | "V"): DraftChoice[] =>
  (["I", "II", "III", "IV", "V"] as const).map((label) =>
    label === correct ? ok(label) : c(label, label === "I" || label === "V" ? "LOGICAL_ERROR" : "CONTEXT_MISMATCH"),
  );

export const examDraft: DraftItem[] = [
  item(1, "vocabulary", "blank", "The review uncovered ---- evidence that the delay was planned, not accidental.", "Substantial matches a large, serious body of evidence. Scarce would deny that evidence exists.", 2, ["academic-vocabulary"], [ok("substantial"), c("scarce", "CONTEXT_MISMATCH"), c("oral", "COLLOCATION_ERROR"), c("prior", "VOCAB_SIMILAR_MEANING"), c("humble", "CONTEXT_MISMATCH")], { vocab: ["substantial"] }),
  item(2, "vocabulary", "blank", "Evening shade can ---- the heat that builds on a narrow shopping street.", "Mitigate means to make a problem less severe. Compel would force the heat, which is the wrong direction.", 3, ["academic-vocabulary"], [ok("mitigate"), c("compel", "CONTEXT_MISMATCH"), c("allocate", "COLLOCATION_ERROR"), c("undermine", "VOCAB_SIMILAR_MEANING"), c("inherit", "VOCAB_SIMILAR_MEANING")], { vocab: ["mitigate"] }),
  item(3, "vocabulary", "blank", "Clean spare parts became ---- after the only local workshop closed.", "Scarce means hard to obtain. Prevalent would mean the parts were everywhere.", 2, ["academic-vocabulary"], [ok("scarce"), c("prevalent", "CONTEXT_MISMATCH"), c("coherent", "COLLOCATION_ERROR"), c("substantial", "VOCAB_SIMILAR_MEANING"), c("contingent", "CONTEXT_MISMATCH")], { vocab: ["scarce"] }),
  item(4, "vocabulary", "blank", "Some risk is ---- in a ten-year field study; it cannot be signed away.", "Inherent describes a quality that belongs to the thing itself. Contingent would make the risk depend on a later event.", 3, ["academic-vocabulary"], [ok("inherent"), c("contingent", "CONTEXT_MISMATCH"), c("scarce", "COLLOCATION_ERROR"), c("coherent", "VOCAB_SIMILAR_MEANING"), c("oral", "CONTEXT_MISMATCH")], { vocab: ["inherent"] }),
  item(5, "vocabulary", "blank", "Repeated leaks will ---- public trust in the water company.", "Undermine means to weaken gradually. Allocate means to set money or time aside.", 3, ["collocation"], [ok("undermine"), c("allocate", "COLLOCATION_ERROR"), c("mitigate", "CONTEXT_MISMATCH"), c("compel", "VOCAB_SIMILAR_MEANING"), c("alleviate", "CONTEXT_MISMATCH")], { vocab: ["undermine"] }),
  item(6, "vocabulary", "blank", "Further funding is ---- on a second independent safety review.", "Contingent on is the collocation for a condition that must be met. Inherent on is not an English pattern.", 4, ["collocation"], [ok("contingent"), c("inherent", "COLLOCATION_ERROR"), c("prevalent", "CONTEXT_MISMATCH"), c("coherent", "VOCAB_SIMILAR_MEANING"), c("scarce", "CONTEXT_MISMATCH")], { vocab: ["contingent"] }),

  item(7, "grammar", "blank", "By the time the auditor arrived, the team ---- the missing invoices.", "The earlier action was complete before a past point, so past perfect is required.", 3, ["tenses"], [ok("had already filed"), c("already files", "TENSE_ERROR"), c("has already filed", "TENSE_ERROR"), c("is already filing", "TENSE_ERROR"), c("will already file", "TENSE_ERROR")]),
  item(8, "grammar", "blank", "The samples ---- in a cool room until the second test is booked.", "The samples receive the action, and the arrangement is current, so a present passive fits.", 3, ["passive"], [ok("are kept"), c("keep", "GRAMMAR_TRAP"), c("are keeping", "GRAMMAR_TRAP"), c("have been keeping", "TENSE_ERROR"), c("kept", "TENSE_ERROR")]),
  item(9, "grammar", "blank", "Residents ---- the night buses if the morning shift did not start so early.", "This is a present counterfactual: would + base verb in the result clause, past in the if clause.", 4, ["conditionals"], [ok("would not need"), c("will not need", "TENSE_ERROR"), c("did not need", "GRAMMAR_TRAP"), c("would not have needed", "TENSE_ERROR"), c("are not needing", "GRAMMAR_TRAP")]),
  item(10, "grammar", "blank", "The archivist ---- the diary belongs is on leave until Thursday.", "The relative clause identifies the person to whom the diary belongs: to whom, not which.", 4, ["relative"], [ok("to whom"), c("which", "GRAMMAR_TRAP"), c("where", "GRAMMAR_TRAP"), c("what", "GRAMMAR_TRAP"), c("whose", "GRAMMAR_TRAP")]),
  item(11, "grammar", "blank", "---- the bolt was cheap, replacing it required closing a traffic lane.", "Although marks contrast between low cost and high disruption. Because would invent a cause.", 2, ["connectors"], [ok("Although"), c("Because", "CONNECTOR_ERROR"), c("So that", "CONNECTOR_ERROR"), c("Unless", "CONNECTOR_ERROR"), c("Therefore", "CONNECTOR_ERROR")]),
  item(12, "grammar", "blank", "---- the delay, the panel ---- the grant for one more month.", "Despite is followed by a noun, and renewed is the verb that matches the second gap. One option fills both gaps.", 4, ["connectors", "tenses"], [ok("Despite / renewed"), c("Although / renewal", "GRAMMAR_TRAP"), c("Because / renews", "CONNECTOR_ERROR"), c("Despite / renewing", "GRAMMAR_TRAP"), c("Although / renewed", "CONNECTOR_ERROR")]),
  item(13, "grammar", "blank", "The notes were left ---- the cabinet, not inside it, which is why they warped.", "On top of the cabinet matches the contrast with inside. Into would need a verb of motion.", 2, ["prepositions"], [ok("on"), c("into", "COLLOCATION_ERROR"), c("among", "CONTEXT_MISMATCH"), c("during", "COLLOCATION_ERROR"), c("without", "CONTEXT_MISMATCH")]),
  item(14, "grammar", "blank", "She asked that the raw file ---- to the editor before noon.", "Ask that is followed by a base-form subjunctive in this formal pattern, not a past tense.", 5, ["tenses"], [ok("be sent"), c("was sent", "GRAMMAR_TRAP"), c("is sending", "GRAMMAR_TRAP"), c("sent", "TENSE_ERROR"), c("has sent", "GRAMMAR_TRAP")]),
  item(15, "grammar", "blank", "The path ---- dogs are banned in April is the one used for the nest count.", "Where introduces the place. Which would need a preposition or a different structure.", 3, ["relative"], [ok("where"), c("which", "GRAMMAR_TRAP"), c("what", "GRAMMAR_TRAP"), c("whom", "GRAMMAR_TRAP"), c("whose", "GRAMMAR_TRAP")]),
  item(16, "grammar", "blank", "You ---- confirm the colour today; otherwise the Thursday delivery is cancelled.", "Must expresses the obligation stated in the result. Might leaves the requirement optional.", 2, ["conditionals"], [ok("must"), c("might", "GRAMMAR_TRAP"), c("would", "TENSE_ERROR"), c("used to", "TENSE_ERROR"), c("ought", "GRAMMAR_TRAP")]),

  item(17, "cloze", "stimulus", "(17)", "Instead marks the change from daily fines to one monthly notice.", 3, ["cloze-context"], [ok("instead"), c("likewise", "CONNECTOR_ERROR"), c("therefore", "CONNECTOR_ERROR"), c("meanwhile", "LOGICAL_ERROR"), c("for example", "LOGICAL_ERROR")], { stimulusKey: "cloze-a" }),
  item(18, "cloze", "stimulus", "(18)", "But contrasts the rise in borrowing with the rise in lost books.", 3, ["cloze-context", "connectors"], [ok("but"), c("because", "CONNECTOR_ERROR"), c("unless", "CONNECTOR_ERROR"), c("so that", "CONNECTOR_ERROR"), c("just as", "LOGICAL_ERROR")], { stimulusKey: "cloze-a" }),
  item(19, "cloze", "stimulus", "(19)", "The limit applies to readers who already have three overdue items.", 2, ["cloze-context"], [ok("with"), c("without", "CONTEXT_MISMATCH"), c("despite", "CONNECTOR_ERROR"), c("during", "COLLOCATION_ERROR"), c("toward", "COLLOCATION_ERROR")], { stimulusKey: "cloze-a" }),
  item(20, "cloze", "stimulus", "(20)", "After that points to the month of unpopularity ending before returns settled.", 3, ["cloze-context"], [ok("After that"), c("Even so", "CONNECTOR_ERROR"), c("In contrast", "LOGICAL_ERROR"), c("As if", "CONNECTOR_ERROR"), c("Rather than", "LOGICAL_ERROR")], { stimulusKey: "cloze-a" }),
  item(21, "cloze", "stimulus", "(21)", "Only when ties the mild penalty to predictability. The passage rejects surprise fines.", 4, ["cloze-context", "connectors"], [ok("only when"), c("even though", "CONNECTOR_ERROR"), c("so that", "LOGICAL_ERROR"), c("as long as not", "GRAMMAR_TRAP"), c("wherever", "CONTEXT_MISMATCH")], { stimulusKey: "cloze-a" }),
  item(22, "cloze", "stimulus", "(22)", "Even when rainfall is steady, yields still slip. Even when keeps the weather from being the cause.", 3, ["cloze-context"], [ok("even when"), c("because", "CONNECTOR_ERROR"), c("unless", "CONNECTOR_ERROR"), c("so", "LOGICAL_ERROR"), c("as soon as", "CONTEXT_MISMATCH")], { stimulusKey: "cloze-b" }),
  item(23, "cloze", "stimulus", "(23)", "Not always rejects the easy explanation that the seed is at fault.", 3, ["cloze-context"], [ok("not always"), c("precisely", "CONTEXT_MISMATCH"), c("therefore", "CONNECTOR_ERROR"), c("for instance", "LOGICAL_ERROR"), c("as well", "LOGICAL_ERROR")], { stimulusKey: "cloze-b" }),
  item(24, "cloze", "stimulus", "(24)", "Less varied soil communities are the stated mechanism.", 2, ["cloze-context"], [ok("less"), c("more", "CONTEXT_MISMATCH"), c("too", "GRAMMAR_TRAP"), c("such", "GRAMMAR_TRAP"), c("very", "COLLOCATION_ERROR")], { stimulusKey: "cloze-b" }),
  item(25, "cloze", "stimulus", "(25)", "Some of that variety is restored, not all of it. The next sentence limits the claim.", 4, ["cloze-context"], [ok("some"), c("none", "CONTEXT_MISMATCH"), c("each", "REFERENCE_ERROR"), c("either", "GRAMMAR_TRAP"), c("whose", "GRAMMAR_TRAP")], { stimulusKey: "cloze-b" }),
  item(26, "cloze", "stimulus", "(26)", "But contrasts what rotation does with what it does not replace.", 3, ["connectors", "cloze-context"], [ok("but"), c("because", "CONNECTOR_ERROR"), c("unless", "CONNECTOR_ERROR"), c("until", "LOGICAL_ERROR"), c("since", "CONNECTOR_ERROR")], { stimulusKey: "cloze-b" }),

  item(27, "sentence", "blank", "The bridge stayed open to buses at peak hours, ----.", "The concession is that cars still queued. Although would clash with the comma structure already chosen.", 3, ["sentence-link"], [ok("though private cars still queued in the side streets"), c("because the bolts had been cheap to buy", "CONNECTOR_ERROR"), c("so that the river could be closed to freight", "LOGICAL_ERROR"), c("unless the morning shift started earlier", "CONNECTOR_ERROR"), c("as if the model had promised no delay at all", "LOGICAL_ERROR")]),
  item(28, "sentence", "blank", "Germination tests mattered more than the look of the packets, ----.", "The packets looked intact while the tests showed failure. The clause must keep that contrast.", 3, ["sentence-link"], [ok("since several intact wheat samples no longer sprouted"), c("so the jars were counted and the report ended there", "LOGICAL_ERROR"), c("because a vault is itself a working farm", "CONTEXT_MISMATCH"), c("although every sample had been grown the previous spring", "LOGICAL_ERROR"), c("while the curators refused to publish any number", "CONTEXT_MISMATCH")]),
  item(29, "sentence", "blank", "Families stayed longer at the cases ----.", "The passage credits the short shared label, not a ban on detail.", 2, ["sentence-link"], [ok("once a label could be finished aloud by a parent and a child"), c("although the long cards were removed from the building", "LOGICAL_ERROR"), c("because specialists were asked to skip the gallery", "CONTEXT_MISMATCH"), c("so that dwell time would fall back to the old level", "LOGICAL_ERROR"), c("unless the objects were moved into storage", "CONNECTOR_ERROR")]),
  item(30, "sentence", "blank", "Doctors wrote a reason in one extra field, ----.", "The field created a pause. It was not a ban and not a lecture.", 3, ["sentence-link"], [ok("which made the prescription visible to them a moment later"), c("which replaced the need for any clinical guideline", "LOGICAL_ERROR"), c("so return visits increased the same week", "CONTEXT_MISMATCH"), c("because posters in the corridor had already worked", "LOGICAL_ERROR"), c("unless the pharmacist cancelled the order", "CONNECTOR_ERROR")]),
  item(31, "sentence", "blank", "Night-train seats sold to shift workers, ----.", "The marketing romance is contrasted with the actual buyers.", 3, ["sentence-link"], [ok("whereas the campaign had promised a leisurely sleep between cities"), c("because hotels were included in every ticket", "CONTEXT_MISMATCH"), c("so the dining car became the main reason for travel", "LOGICAL_ERROR"), c("unless students were banned from the quiet car", "CONNECTOR_ERROR"), c("as if nurses preferred sunset photographs to timetables", "LOGICAL_ERROR")]),
  item(32, "sentence", "blank", "Permeability stayed high only in districts ----.", "The study's condition is twice-yearly vacuuming, not the purchase alone.", 4, ["sentence-link"], [ok("that vacuumed the new surface at least twice a year"), c("that cut cleaning contracts after installation", "LOGICAL_ERROR"), c("which treated concrete and pores as the same material", "CONTEXT_MISMATCH"), c("where flood complaints were ignored by design", "LOGICAL_ERROR"), c("that published no maintenance record at all", "CONTEXT_MISMATCH")]),
  item(33, "sentence", "blank", "A legume year helps the next crop ----.", "Rotation reduces fertiliser need. It does not replace watering.", 3, ["sentence-link"], [ok("by restoring some of the variety that continuous planting removes"), c("by making rainfall unnecessary in the following season", "LOGICAL_ERROR"), c("unless the soil communities were already diverse", "CONNECTOR_ERROR"), c("so that chemical support can be doubled", "LOGICAL_ERROR"), c("although fertiliser use is certain to rise", "CONNECTOR_ERROR")]),
  item(34, "sentence", "blank", "The choir kept the curtained room for the album ----.", "The smaller room served the recording; concerts returned to the hall.", 2, ["sentence-link"], [ok("but went back to the echoing hall for public concerts"), c("because listeners preferred smeared consonants", "LOGICAL_ERROR"), c("unless the curtains were sold after the session", "CONNECTOR_ERROR"), c("so the school hall was demolished that week", "CONTEXT_MISMATCH"), c("as if echo were required on a studio recording", "LOGICAL_ERROR")]),
  item(35, "sentence", "blank", "The clinic opened ten minutes early ----.", "Those minutes were for files, and the benefit showed up later in the list.", 3, ["sentence-link"], [ok("so that the first files were ready before patients sat down"), c("although staff used the time only to chat", "LOGICAL_ERROR"), c("because visits themselves became much shorter", "CONTEXT_MISMATCH"), c("unless noon appointments were cancelled", "CONNECTOR_ERROR"), c("while the posted time was moved to the afternoon", "CONTEXT_MISMATCH")]),
  item(36, "sentence", "blank", "Scanned notebook pages still require careful sentences, ----.", "The scan preserves the page; it does not improve a vague entry.", 4, ["sentence-link"], [ok("because a clear image of a vague note remains vague"), c("so the locked cupboard was a better long-term store", "LOGICAL_ERROR"), c("unless the student has already left the project", "CONNECTOR_ERROR"), c("although nobody can be asked about a result later", "LOGICAL_ERROR"), c("whereas paper cannot be read on the day it is written", "CONTEXT_MISMATCH")]),

  item(37, "translation", "restatement", "The gain came from the start of the list, not from shorter visits.", "The Turkish sentence must keep both the source of the gain and the rejected alternative.", 3, ["translation-en-tr"], [ok("Kazanç, ziyaretlerin kısalmasından değil, listenin başından geldi."), c("Kazanç, listenin başını kısaltan ziyaretlerden geldi.", "TRANSLATION_SHIFT"), c("Kısa ziyaretler listenin başını gereksiz kıldı.", "LOGICAL_ERROR"), c("Kazanç, ancak ziyaretler kısalırsa listenin başında görülür.", "TRANSLATION_SHIFT"), c("Listenin sonu, kısa ziyaretler sayesinde düzeldi.", "LOGICAL_ERROR")], { direction: "en-tr" }),
  item(38, "translation", "restatement", "Material choice matters less than the dull work of upkeep.", "Less than must survive. A translation that praises the material reverses the claim.", 3, ["translation-en-tr"], [ok("Malzeme seçimi, sıkıcı bakım işinden daha az önemlidir."), c("Sıkıcı bakım, malzeme seçiminden daha az önemlidir.", "TRANSLATION_SHIFT"), c("Malzeme seçimi bakımı gereksiz kılar.", "LOGICAL_ERROR"), c("Bakım sıkıcı olduğu için malzeme seçilmez.", "LOGICAL_ERROR"), c("Malzeme ve bakım aynı derecede belirleyicidir.", "TRANSLATION_SHIFT")], { direction: "en-tr" }),
  item(39, "translation", "restatement", "A vault is not a farm, so stored seed still has to be grown out.", "Both the contrast and the obligation to regenerate must remain.", 4, ["translation-en-tr"], [ok("Kasa bir tarla değildir; bu yüzden saklanan tohumun yine de ekilip yetiştirilmesi gerekir."), c("Kasa bir tarla olduğu için tohumu yeniden ekmeye gerek yoktur.", "LOGICAL_ERROR"), c("Saklanan tohum tarlanın yerini tutar.", "TRANSLATION_SHIFT"), c("Tohum ancak kasa boşalırsa ekilir.", "LOGICAL_ERROR"), c("Yeniden ekim kasayı bir tarlaya çevirir.", "TRANSLATION_SHIFT")], { direction: "en-tr" }),
  item(40, "translation", "restatement", "Onay, ikinci bir bağımsız incelemenin yapılmasına bağlıdır.", "Contingent on keeps a condition. Already approved would cancel that condition.", 3, ["translation-tr-en"], [ok("Approval is contingent on a second independent review."), c("Approval has already survived a second independent review.", "TRANSLATION_SHIFT"), c("A second review is optional once approval is printed.", "LOGICAL_ERROR"), c("The independent review replaces the need for approval.", "LOGICAL_ERROR"), c("Approval makes a further review unnecessary.", "TRANSLATION_SHIFT")], { direction: "tr-en" }),
  item(41, "translation", "restatement", "Gece seferindeki yolcuların çoğu, sabah mesaisinden önce varmak zorundaydı.", "The obligation is arrival before a morning shift, not a wish for a scenic trip.", 3, ["translation-tr-en"], [ok("Most passengers on the night service had to arrive before a morning shift."), c("Most passengers chose the night service for the view at dawn.", "LOGICAL_ERROR"), c("The morning shift was cancelled for night-train passengers.", "CONTEXT_MISMATCH"), c("Few passengers needed to arrive before work.", "TRANSLATION_SHIFT"), c("Night services exist so that hotels stay full.", "LOGICAL_ERROR")], { direction: "tr-en" }),
  item(42, "translation", "restatement", "Kısa etiket, ayrıntıyı yasaklamak için değil, birlikte okunabilsin diye kısaltıldı.", "The purpose is shared reading. A ban on detail is the trap.", 4, ["translation-tr-en"], [ok("The label was shortened so it could be read together, not to ban detail."), c("The label was shortened in order to ban detail.", "LOGICAL_ERROR"), c("Detail was removed because families read too slowly.", "TRANSLATION_SHIFT"), c("Long labels were kept so that nobody would need a card.", "LOGICAL_ERROR"), c("The short label proved that visitors dislike information.", "CONTEXT_MISMATCH")], { direction: "tr-en" }),

  item(43, "reading", "stimulus", "In which districts did permeability stay high?", "The passage limits the good result to places vacuumed at least twice a year.", 2, ["detail"], [ok("Those whose streets were vacuumed at least twice a year."), c("Those that stopped cleaning after buying the new surface.", "LOGICAL_ERROR"), c("Those that never recorded flood complaints.", "CONTEXT_MISMATCH"), c("Every district that replaced asphalt.", "LOGICAL_ERROR"), c("Districts that used ordinary concrete and vacuumed it.", "CONTEXT_MISMATCH")], { stimulusKey: "read-0" }),
  item(44, "reading", "stimulus", "What happened where cleaning contracts were cut?", "Flood complaints returned. The new material alone did not hold the gain.", 3, ["detail"], [ok("Flood complaints went back to their previous level."), c("Pores stayed open without further work.", "LOGICAL_ERROR"), c("The study excluded those districts.", "CONTEXT_MISMATCH"), c("Maintenance budgets increased on their own.", "LOGICAL_ERROR"), c("Asphalt was reinstalled within one season.", "CONTEXT_MISMATCH")], { stimulusKey: "read-0" }),
  item(45, "reading", "stimulus", "The word 'gain' in the first sentence refers to ----.", "Gain points back to fewer flash floods, not to the purchase of material.", 3, ["reference"], [ok("fewer flash floods"), c("thinner maintenance budgets", "REFERENCE_ERROR"), c("the decision to buy a new surface", "REFERENCE_ERROR"), c("clogged pores", "REFERENCE_ERROR"), c("ordinary concrete", "REFERENCE_ERROR")], { stimulusKey: "read-0" }),
  item(46, "reading", "stimulus", "The authors' main claim is that ----.", "Upkeep, not the catalogue choice, decides whether the surface works.", 3, ["main-idea"], [ok("upkeep decides whether permeable pavement keeps working"), c("new materials make cleaning contracts unnecessary", "LOGICAL_ERROR"), c("floods increase wherever streets are vacuumed", "LOGICAL_ERROR"), c("twelve districts should return to asphalt", "CONTEXT_MISMATCH"), c("budgets are unrelated to pore clogging", "LOGICAL_ERROR")], { stimulusKey: "read-0" }),

  item(47, "reading", "stimulus", "Why did families stay longer?", "They could finish the short label together. The cards were not the reason most people stayed.", 2, ["detail"], [ok("A parent and child could finish the short label together."), c("Almost every visitor picked up a long card.", "LOGICAL_ERROR"), c("Specialists were asked to leave the gallery.", "CONTEXT_MISMATCH"), c("Labels grew from 60 words to 180.", "LOGICAL_ERROR"), c("The cases were moved into a smaller room.", "CONTEXT_MISMATCH")], { stimulusKey: "read-1" }),
  item(48, "reading", "stimulus", "What did fewer than one visitor in five do?", "They took the optional long card. That figure must not be read as the dwell-time result.", 3, ["detail"], [ok("They took the longer card."), c("They skipped the gallery.", "CONTEXT_MISMATCH"), c("They asked for longer wall labels.", "LOGICAL_ERROR"), c("They stayed for the whole evaluation.", "CONTEXT_MISMATCH"), c("They objected to any text at all.", "LOGICAL_ERROR")], { stimulusKey: "read-1" }),
  item(49, "reading", "stimulus", "It can be inferred that specialists ----.", "The passage says specialists still used the cards, so detail remained available.", 4, ["inference"], [ok("could still reach the longer account"), c("were banned from reading cards", "LOGICAL_ERROR"), c("caused dwell time to fall", "LOGICAL_ERROR"), c("preferred empty cases", "CONTEXT_MISMATCH"), c("wrote the 180-word labels during the visit", "CONTEXT_MISMATCH")], { stimulusKey: "read-1" }),
  item(50, "reading", "stimulus", "The purpose of the last sentence is to ----.", "It corrects a bad reading of the data: the split of glance and deep note, not a hatred of detail.", 4, ["purpose"], [ok("reject the idea that visitors simply wanted less information"), c("announce that all long texts were destroyed", "LOGICAL_ERROR"), c("compare this museum with a library fine", "CONTEXT_MISMATCH"), c("prove that dwell time is an unreliable measure", "LOGICAL_ERROR"), c("recommend removing labels entirely", "LOGICAL_ERROR")], { stimulusKey: "read-1" }),

  item(51, "reading", "stimulus", "Who bought most of the night-train seats?", "Nurses, technicians and students who had to arrive before a shift.", 2, ["detail"], [ok("People who needed to be in the city before a morning shift."), c("Travellers paying extra for the dining car.", "LOGICAL_ERROR"), c("Tourists collected by the sunset campaign.", "LOGICAL_ERROR"), c("Hotel guests moving between resorts.", "CONTEXT_MISMATCH"), c("Only rail employees on holiday.", "CONTEXT_MISMATCH")], { stimulusKey: "read-2" }),
  item(52, "reading", "stimulus", "Which offer performed better?", "The quiet car beat the dining offer.", 2, ["detail"], [ok("The quiet car."), c("The dining car.", "LOGICAL_ERROR"), c("The sunset photographs.", "CONTEXT_MISMATCH"), c("Hotel packages included in the fare.", "CONTEXT_MISMATCH"), c("Morning leisure tickets.", "LOGICAL_ERROR")], { stimulusKey: "read-2" }),
  item(53, "reading", "stimulus", "Why did occupancy rise later?", "The timetable was placed next to hospital and campus clocks, matching the real buyers.", 3, ["inference"], [ok("The advertising finally matched why people were travelling."), c("The night service was cancelled.", "LOGICAL_ERROR"), c("Dining became cheaper than a hotel.", "CONTEXT_MISMATCH"), c("Romance replaced the timetable.", "LOGICAL_ERROR"), c("Students were moved out of the quiet car.", "CONTEXT_MISMATCH")], { stimulusKey: "read-2" }),
  item(54, "reading", "stimulus", "The word 'plainer' suggests that the ticket data were ----.", "Plainer is set against romance: the data were more ordinary and direct.", 4, ["reference"], [ok("more direct than the romantic marketing"), c("harder to believe than the posters", "REFERENCE_ERROR"), c("limited to leisure passengers", "LOGICAL_ERROR"), c("destroyed after the first month", "CONTEXT_MISMATCH"), c("focused on dining revenue only", "REFERENCE_ERROR")], { stimulusKey: "read-2" }),

  item(55, "reading", "stimulus", "What share of the wheat accessions had not been germinated in twenty years?", "The passage says a third.", 1, ["detail"], [ok("A third."), c("All of them.", "LOGICAL_ERROR"), c("None of the oldest packets.", "LOGICAL_ERROR"), c("Only the samples that looked damaged.", "CONTEXT_MISMATCH"), c("Half of the jars on the shelves.", "CONTEXT_MISMATCH")], { stimulusKey: "read-3" }),
  item(56, "reading", "stimulus", "Why is a vault not a farm?", "Storage without grow-out does not keep the seed useful. Looking intact is not enough.", 3, ["inference"], [ok("Seed loses its value if it is never grown out and tested."), c("Farms cannot store anything for twenty years.", "CONTEXT_MISMATCH"), c("Jars replace the need to plant.", "LOGICAL_ERROR"), c("Wheat does not germinate under any test.", "LOGICAL_ERROR"), c("Curators refuse to count jars.", "CONTEXT_MISMATCH")], { stimulusKey: "read-3" }),
  item(57, "reading", "stimulus", "What do the curators publish now?", "They publish the failure rate, not only the jar count.", 3, ["detail"], [ok("The failure rate as well as the size of the collection."), c("Only the number of jars.", "LOGICAL_ERROR"), c("The names of farms that no longer exist.", "CONTEXT_MISMATCH"), c("Nothing, because the packets look intact.", "LOGICAL_ERROR"), c("A ban on germination tests.", "CONTEXT_MISMATCH")], { stimulusKey: "read-3" }),
  item(58, "reading", "stimulus", "The main idea of the passage is that ----.", "Regeneration is part of storage. A full vault can still be a weak vault.", 3, ["main-idea"], [ok("keeping seed means testing it, not only shelving it"), c("intact packets prove that wheat is safe", "LOGICAL_ERROR"), c("national banks should stop grow-outs", "LOGICAL_ERROR"), c("twenty years is too short for a germination test", "CONTEXT_MISMATCH"), c("jar counts are the only honest public number", "LOGICAL_ERROR")], { stimulusKey: "read-3" }),

  item(59, "reading", "stimulus", "What were doctors asked to add?", "A single field in which they wrote a reason.", 2, ["detail"], [ok("A short written reason in one extra field."), c("A lecture before each mild sinus case.", "LOGICAL_ERROR"), c("A poster in the corridor.", "CONTEXT_MISMATCH"), c("A ban on all antibiotics.", "LOGICAL_ERROR"), c("A second visit the same day.", "CONTEXT_MISMATCH")], { stimulusKey: "read-4" }),
  item(60, "reading", "stimulus", "What did not rise after prescriptions fell?", "Return visits stayed flat. That blocks the idea that patients were simply undertreated.", 3, ["detail"], [ok("The rate of return visits."), c("The number of pharmacists on duty.", "CONTEXT_MISMATCH"), c("The length of every consultation.", "CONTEXT_MISMATCH"), c("The use of corridor posters.", "LOGICAL_ERROR"), c("Mild sinus cases themselves.", "LOGICAL_ERROR")], { stimulusKey: "read-4" }),
  item(61, "reading", "stimulus", "Why did pharmacists support the change?", "Fewer patients arrived already expecting a drug the guideline did not favour.", 3, ["inference"], [ok("Patients were less likely to expect an unneeded drug."), c("Pharmacists were allowed to delete the new field.", "CONTEXT_MISMATCH"), c("Prescriptions rose, which increased their workload.", "LOGICAL_ERROR"), c("Return visits became their responsibility.", "CONTEXT_MISMATCH"), c("Posters had already solved the habit.", "LOGICAL_ERROR")], { stimulusKey: "read-4" }),
  item(62, "reading", "stimulus", "The passage implies that posters had ----.", "The last sentence says posters had not changed the habit that the pause changed.", 4, ["purpose"], [ok("failed to change the prescribing habit"), c("replaced the need for the extra field", "LOGICAL_ERROR"), c("increased return visits on their own", "CONTEXT_MISMATCH"), c("been written by the patients", "CONTEXT_MISMATCH"), c("banned mild sinus treatment", "LOGICAL_ERROR")], { stimulusKey: "read-4" }),

  item(63, "dialogue", "dialogue", "Which utterance fills the gap?", "The advisor's next line offers Friday at 10:00, so the student must have said that morning works.", 2, ["dialogue-intent"], [ok("Friday morning would be much easier for me than Thursday."), c("I have already taken the exam this morning.", "LOGICAL_ERROR"), c("Please cancel my registration entirely.", "CONTEXT_MISMATCH"), c("I do not know what an oral exam is.", "CONTEXT_MISMATCH"), c("The office is closed, so keep Thursday.", "LOGICAL_ERROR")], { stimulusKey: "dlg-63" }),
  item(64, "dialogue", "dialogue", "Which utterance fills the gap?", "The editor asks for the file tonight, so the author must be offering an updated chart.", 2, ["dialogue-intent"], [ok("I will replace them with this year's numbers tonight."), c("The figures are meant to stay out of date.", "LOGICAL_ERROR"), c("Page four has no chart.", "CONTEXT_MISMATCH"), c("Please print last year's table again.", "LOGICAL_ERROR"), c("I have left the project.", "CONTEXT_MISMATCH")], { stimulusKey: "dlg-64" }),
  item(65, "dialogue", "dialogue", "Which utterance fills the gap?", "The nurse books the offered Monday slot, so the patient is accepting it.", 2, ["dialogue-intent"], [ok("Monday at 08:30 is fine."), c("I need to be seen this afternoon.", "LOGICAL_ERROR"), c("Please remove me from the clinic list.", "CONTEXT_MISMATCH"), c("Is the afternoon clinic empty?", "LOGICAL_ERROR"), c("I already saw the doctor today.", "CONTEXT_MISMATCH")], { stimulusKey: "dlg-65" }),
  item(66, "dialogue", "dialogue", "Which utterance fills the gap?", "The guide answers by pointing at gold lines, so the visitor asked what those lines mean.", 3, ["dialogue-intent"], [ok("Then what am I supposed to notice on the surface?"), c("How old is the bowl supposed to be?", "LOGICAL_ERROR"), c("Can I buy the bowl in the shop?", "CONTEXT_MISMATCH"), c("Why is this case about dates?", "LOGICAL_ERROR"), c("Is the gold a modern price tag?", "CONTEXT_MISMATCH")], { stimulusKey: "dlg-66" }),
  item(67, "dialogue", "dialogue", "Which utterance fills the gap?", "The manager says to reply before noon, so the clerk has agreed to confirm the colour.", 3, ["dialogue-intent"], [ok("I can confirm the blue they already sampled."), c("Tell them we will choose a colour next month.", "LOGICAL_ERROR"), c("Thursday is impossible, whatever the colour.", "LOGICAL_ERROR"), c("I have not seen the order.", "CONTEXT_MISMATCH"), c("Cancel the supplier rather than reply.", "CONTEXT_MISMATCH")], { stimulusKey: "dlg-67" }),

  item(68, "restatement", "restatement", "A mild penalty works only when people can see it coming.", "Only when must stay. A version that praises surprise fines reverses the claim.", 3, ["restatement-shift"], [ok("Unless the penalty is predictable, a mild one does not work."), c("Surprise fines are the only penalties that work.", "LOGICAL_ERROR"), c("Mild penalties work whether or not anyone expects them.", "TRANSLATION_SHIFT"), c("Predictable penalties are too mild to change returns.", "LOGICAL_ERROR"), c("People return books only when there is no penalty.", "CONTEXT_MISMATCH")]),
  item(69, "restatement", "restatement", "The scan keeps a page available; it does not make a vague note precise.", "Availability and precision are different. The trap treats the scan as an editor.", 4, ["restatement-shift"], [ok("A scanned note can still be consulted, but scanning does not clarify it."), c("Scanning turns a vague note into a precise one.", "LOGICAL_ERROR"), c("Once a page is scanned, nobody needs to read it.", "LOGICAL_ERROR"), c("Vague notes should not be scanned at all.", "CONTEXT_MISMATCH"), c("A locked cupboard makes notes more precise than a scan.", "LOGICAL_ERROR")]),
  item(70, "restatement", "restatement", "Occupancy improved after the timetable, not after the romantic pictures.", "The cause of the rise is the timetable placed beside real clocks.", 3, ["restatement-shift"], [ok("Ridership rose when the schedule was shown beside the clocks people actually use."), c("Sunset photographs caused the rise in occupancy.", "LOGICAL_ERROR"), c("The night train filled as soon as the dining car expanded.", "CONTEXT_MISMATCH"), c("Timetables reduced occupancy by removing the romance.", "TRANSLATION_SHIFT"), c("Hotels asked the operator to hide the clocks.", "CONTEXT_MISMATCH")]),
  item(71, "restatement", "restatement", "Looking intact did not mean the wheat would still sprout.", "Appearance and germination come apart. The trap keeps them together.", 3, ["restatement-shift"], [ok("A sound-looking packet can still fail a germination test."), c("Packets that look intact are sure to sprout.", "LOGICAL_ERROR"), c("Germination tests were cancelled because the packets looked whole.", "LOGICAL_ERROR"), c("Only damaged packets were twenty years old.", "CONTEXT_MISMATCH"), c("Wheat sprouts whether or not it is tested.", "LOGICAL_ERROR")]),

  item(72, "paragraph", "stimulus", "Which sentence fills the gap?", "The next sentence names the measures. The gap should admit that a plan existed before those measures.", 3, ["paragraph-flow"], [ok("A simple timing plan was published before the first morning of the works."), c("The river was closed to every vehicle including buses.", "LOGICAL_ERROR"), c("Drivers were told that queues would be ignored.", "LOGICAL_ERROR"), c("Bolts were left rusty on purpose.", "CONTEXT_MISMATCH"), c("The bridge reopened six weeks before it closed.", "LOGICAL_ERROR")], { stimulusKey: "para-72" }),
  item(73, "paragraph", "stimulus", "Which sentence fills the gap?", "The following sentence depends on the page being readable after someone leaves.", 3, ["paragraph-flow"], [ok("Anyone with permission can open the page without holding the original book."), c("The cupboard was locked again and the scans were deleted.", "LOGICAL_ERROR"), c("Students are forbidden to read their own notes.", "LOGICAL_ERROR"), c("Scanning is done only after a project ends.", "CONTEXT_MISMATCH"), c("Paper notes were judged illegal.", "CONTEXT_MISMATCH")], { stimulusKey: "para-73" }),
  item(74, "paragraph", "stimulus", "Which sentence fills the gap?", "The next sentence says listeners heard consonants. The gap should say the dry room made that possible.", 2, ["paragraph-flow"], [ok("The drier room kept the voices from blooming into echo."), c("The curtains made the echo louder than the hall.", "LOGICAL_ERROR"), c("They recorded in the hall in order to smear consonants.", "LOGICAL_ERROR"), c("Public concerts were cancelled after the album.", "CONTEXT_MISMATCH"), c("The choir stopped rehearsing altogether.", "CONTEXT_MISMATCH")], { stimulusKey: "para-74" }),
  item(75, "paragraph", "stimulus", "Which sentence fills the gap?", "The next sentence says staff prepared files. The gap should introduce that use of the ten minutes.", 3, ["paragraph-flow"], [ok("The extra minutes were assigned to getting the first files into order."), c("The clinic started opening an hour after the posted time.", "LOGICAL_ERROR"), c("Patients were asked to arrive late on purpose.", "LOGICAL_ERROR"), c("Noon appointments were removed from the list.", "CONTEXT_MISMATCH"), c("Visits were cut to two minutes each.", "CONTEXT_MISMATCH")], { stimulusKey: "para-75" }),

  item(76, "irrelevant", "numbered", "Which sentence breaks the paragraph?", "Sentence III is about the cafeteria. The rest is one humidity procedure.", 2, ["irrelevant-break"], roman("III"), { stimulusKey: "irr-76" }),
  item(77, "irrelevant", "numbered", "Which sentence breaks the paragraph?", "Sentence IV brings in a football result. The paragraph is about expense notes.", 2, ["irrelevant-break"], roman("IV"), { stimulusKey: "irr-77" }),
  item(78, "irrelevant", "numbered", "Which sentence breaks the paragraph?", "Sentence V is a bakery review. The paragraph is about not disturbing nests.", 2, ["irrelevant-break"], roman("V"), { stimulusKey: "irr-78" }),
  item(79, "irrelevant", "numbered", "Which sentence breaks the paragraph?", "Sentence IV is a fountain repair. The paragraph is about a quiz limit.", 3, ["irrelevant-break"], roman("IV"), { stimulusKey: "irr-79" }),
  item(80, "irrelevant", "numbered", "Which sentence breaks the paragraph?", "Sentence IV is about the cat. The paragraph is about reading heat in the clay.", 2, ["irrelevant-break"], roman("IV"), { stimulusKey: "irr-80" }),
];
