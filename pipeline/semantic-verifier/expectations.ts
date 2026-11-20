/**
 * Human labels for the offline pilot. These are not model outputs.
 * Option sentences are loaded from the saved records, except the door
 * until/only-after line, which is the existing mechanism example and is not a new item.
 */

export const humanClasses = ["unsupported_event", "plausible_misreading", "equivalent_paraphrase"] as const;
export type HumanClass = (typeof humanClasses)[number];

export type HumanExpectation = {
  id: string;
  humanClass: HumanClass;
  relation: "equivalent" | "non_equivalent";
  unsupportedAddition: "yes" | "no";
  plausibleStudentMisreading: boolean;
  note: string;
};

export const pilotExpectations: readonly HumanExpectation[] = [
  {
    id: "editors-b",
    humanClass: "unsupported_event",
    relation: "non_equivalent",
    unsupportedAddition: "yes",
    plausibleStudentMisreading: true,
    note: "The server withholding the citation check is an event the source does not state.",
  },
  {
    id: "tr-en-e",
    humanClass: "unsupported_event",
    relation: "non_equivalent",
    unsupportedAddition: "yes",
    plausibleStudentMisreading: true,
    note: "Rather than the archive adds a recipient contrast the source does not state.",
  },
  {
    id: "ferry-b",
    humanClass: "unsupported_event",
    relation: "non_equivalent",
    unsupportedAddition: "yes",
    plausibleStudentMisreading: true,
    note: "Other recipients getting serum by default is a second event the source does not state.",
  },
  {
    id: "registry-a",
    humanClass: "plausible_misreading",
    relation: "non_equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: true,
    note: "Although becomes because. The filing claim stays the one in the source.",
  },
  {
    id: "registry-b",
    humanClass: "plausible_misreading",
    relation: "non_equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: true,
    note: "Every laboratory log becomes only some. No second event is added.",
  },
  {
    id: "registry-d",
    humanClass: "plausible_misreading",
    relation: "non_equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: true,
    note: "No trace becomes an established absence. The filing proposition is the same one, reversed.",
  },
  {
    id: "registry-e",
    humanClass: "plausible_misreading",
    relation: "non_equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: true,
    note: "No trace becomes a trace that the samples were not filed. The proposition is reversed, not replaced by a new event.",
  },
  {
    id: "door-until-only-after",
    humanClass: "plausible_misreading",
    relation: "non_equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: true,
    note: "A lock that lasts until the signatures is read as a locking act that starts only after them.",
  },
  {
    id: "clinic-completed-opening",
    humanClass: "plausible_misreading",
    relation: "non_equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: true,
    note: "Could have opened is read as a completed opening. The repair request and the purpose stay.",
  },
  {
    id: "door-equivalent-key",
    humanClass: "equivalent_paraphrase",
    relation: "equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: false,
    note: "Having room restates unused capacity. Despite keeps the concession and the lock still lasts until the same signatures.",
  },
  {
    id: "clinic-equivalent-key",
    humanClass: "equivalent_paraphrase",
    relation: "equivalent",
    unsupportedAddition: "no",
    plausibleStudentMisreading: false,
    note: "Açabilirdi with ama keeps past possibility. The repair-first request and the negative purpose stay.",
  },
];

/** Existing mechanism example. The source sentence is still read from the door gold record. */
export const doorUntilOption = "The night clerk locked the side door only after the two late drivers had signed the log, even though the yard could hold every truck.";
