import type { DraftItem, DraftStimulus } from "./exam-draft";

const c = (text: string, distractor: string) => ({ text, distractor });
const ok = (text: string) => ({ text, correct: true as const });

function cloze(slot: number, stem: string, explanation: string, difficulty: number, choices: DraftItem["choices"], key: string): DraftItem {
  return {
    slot,
    section: "cloze",
    layout: "stimulus",
    stem,
    explanation,
    difficulty,
    skills: ["cloze-context"],
    stimulusKey: key,
    choices,
  };
}

function reading(
  slot: number,
  stem: string,
  explanation: string,
  difficulty: number,
  skill: string,
  choices: DraftItem["choices"],
  key: string,
): DraftItem {
  return {
    slot,
    section: "reading",
    layout: "stimulus",
    stem,
    explanation,
    difficulty,
    skills: [skill],
    stimulusKey: key,
    choices,
  };
}

export const packStimuli: DraftStimulus[] = [
  {
    key: "pack-cloze-court",
    kind: "cloze",
    body: "Court interpreters are often treated as a clear pipe between a witness and the bench. A review of sixty hearings suggests they are not. Even when the manual told them to keep a hedge, interpreters (1) ---- softened “I think” into a flat statement once the question turned hostile. The change was small, (2) ---- it altered how sure the witness seemed. Judges who were later shown the pattern did not (3) ---- the interpreters. They asked for the hedge to be restored whenever an answer arrived without it. The authors’ point is that fidelity is (4) ---- a habit of translating word for word. It is a choice about which part of the utterance carries the legal weight. Miss that choice, and a careful witness can be made to sound (5) ---- than the recording supports.",
  },
  {
    key: "pack-cloze-peat",
    kind: "cloze",
    body: "Peatlands store carbon only while the water table stays high enough to slow decay. Drainage for pasture looks, at first, like a local gain in grass. The carbon ledger (6) ---- the other way. Once the peat dries, microbes resume work that flooding had (7) ----, and the field begins to emit what it used to hold. Rewetting does not (8) ---- the lost stock in a single season. It stops the leak and lets a slower accumulation start again. Managers who count only the extra hay (9) ---- the emission that follows the ditch. A national inventory that ignores that emission will (10) ---- the pasture as a sink when the soil is already a source.",
  },
  {
    key: "pack-read-archive",
    kind: "passage",
    body: "A national archive stopped describing its digitisation programme by the number of pages scanned. The count had risen every year, yet historians still requested the paper files. The reason was not nostalgia. Scans were made from microfilm, and the film itself had been shot from bound volumes that were never opened flat. Margins, stamps and the pencilled notes of earlier clerks fell outside the frame. The new protocol requires a sample of each batch to be checked against the paper, and the public catalogue now lists two figures: pages scanned, and pages in which a mark visible on the paper is missing from the image. In the first year the second figure was large enough that the ministry stopped quoting the first figure alone. Completeness, the archivists wrote, is a property of the copy, not of the machine’s speed.",
  },
  {
    key: "pack-read-clinic",
    kind: "passage",
    body: "An outpatient network tried to reduce antibiotic prescriptions for uncomplicated coughs by adding one line to the electronic note: “What would change if we waited until Friday?” The line was not a ban, and it did not hide the prescription button. Doctors could still issue the drug. What changed was the moment of the decision. The prompt appeared after the diagnosis and before the signature, and the answer was stored beside the prescription. Over four months, prescriptions for those coughs fell, while return visits within a week did not rise. Doctors who ignored the line prescribed at the old rate. The authors refuse the reading that software had taught medicine. They say the line worked because it belonged to the clinician’s own sentence, and because a colleague could later see that sentence. A poster in the corridor had asked for the same pause and had not produced it.",
  },
  {
    key: "pack-read-soil",
    kind: "passage",
    body: "Satellite maps of soil moisture are now fine enough to show a single field, and several insurers have begun to price drought cover from those maps. A comparison with probes in the ground found that the maps were reliable on bare, flat plots and unreliable where a standing crop shaded the soil or where irrigation ran in strips. The error was not random. Shaded fields were read as wetter than the probes, so a farmer who had already lost the crop could be told the soil was fine. The insurers who stayed with the product stopped using the map as a verdict. They use it to decide where to send a person with a probe. The map, in that design, is a way of spending scarce visits, not a substitute for them.",
  },
];

export const packItems: DraftItem[] = [
  cloze(201, "(1)", "Kılavuz korumayı söylese de düşmanca soruda hedge yine yumuşatılıyor. still, yasağın uygulanmadığını taşır.", 4, [ok("still"), c("never", "LOGICAL_ERROR"), c("only", "CONTEXT_MISMATCH"), c("instead", "CONNECTOR_ERROR"), c("already", "LOGICAL_ERROR")], "pack-cloze-court"),
  cloze(202, "(2)", "Küçük bir kayma ile tanığın daha emin görünmesi karşıtlık ister. yet burada buna yarar.", 4, [ok("yet"), c("because", "CONNECTOR_ERROR"), c("unless", "CONNECTOR_ERROR"), c("so that", "CONNECTOR_ERROR"), c("just as", "LOGICAL_ERROR")], "pack-cloze-court"),
  cloze(203, "(3)", "Hâkimler yorumcuyu suçlamıyor; hedge’i geri istiyor. blame bu cümleye uymaz.", 3, [ok("blame"), c("train", "CONTEXT_MISMATCH"), c("replace", "LOGICAL_ERROR"), c("pay", "CONTEXT_MISMATCH"), c("record", "CONTEXT_MISMATCH")], "pack-cloze-court"),
  cloze(204, "(4)", "Sadakat kelimesi kelimesine alışkanlıktan ibaret değil. not merely o indirgemeyi reddeder.", 4, [ok("not merely"), c("nothing but", "LOGICAL_ERROR"), c("already", "CONTEXT_MISMATCH"), c("less than", "LOGICAL_ERROR"), c("prior to", "COLLOCATION_ERROR")], "pack-cloze-court"),
  cloze(205, "(5)", "Dikkatli tanık, kaydın desteklediğinden daha emin gösterilebilir. more certain o yönü tutar.", 4, [ok("more certain"), c("less willing", "LOGICAL_ERROR"), c("harder to hear", "CONTEXT_MISMATCH"), c("younger", "CONTEXT_MISMATCH"), c("more hostile", "LOGICAL_ERROR")], "pack-cloze-court"),

  cloze(206, "(6)", "Ot kazancı ile karbon hesabı ters yöndedir. the other way bunu ister.", 3, [ok("runs"), c("ignores", "LOGICAL_ERROR"), c("repeats", "CONTEXT_MISMATCH"), c("hides", "VOCAB_SIMILAR_MEANING"), c("matches", "LOGICAL_ERROR")], "pack-cloze-peat"),
  cloze(207, "(7)", "Su basması çürümeyi durdurmuştu; kuruyunca mikroplar kaldığı işe dönüyor. held back o durdurmayı taşır.", 4, [ok("held back"), c("sped up", "LOGICAL_ERROR"), c("paid for", "CONTEXT_MISMATCH"), c("written down", "CONTEXT_MISMATCH"), c("looked after", "COLLOCATION_ERROR")], "pack-cloze-peat"),
  cloze(208, "(8)", "Yeniden sulama kayıp stoğu bir mevsimde yerine koymaz. replace too strong; stop the leak is the next sentence.", 4, [ok("replace"), c("measure", "CONTEXT_MISMATCH"), c("notice", "VOCAB_SIMILAR_MEANING"), c("drain", "LOGICAL_ERROR"), c("sell", "CONTEXT_MISMATCH")], "pack-cloze-peat"),
  cloze(209, "(9)", "Yalnızca ek otu sayan, hendeğin ardından gelen salımı kaçırır. miss burada budur.", 3, [ok("miss"), c("publish", "CONTEXT_MISMATCH"), c("double", "LOGICAL_ERROR"), c("tax", "CONTEXT_MISMATCH"), c("welcome", "LOGICAL_ERROR")], "pack-cloze-peat"),
  cloze(210, "(10)", "Envanter merayı yutak sayar, oysa toprak kaynak olmuştur. treat as a sink o yanlış sayımı adlandırır.", 4, [ok("treat"), c("protect", "LOGICAL_ERROR"), c("abandon", "CONTEXT_MISMATCH"), c("fence", "CONTEXT_MISMATCH"), c("flood", "LOGICAL_ERROR")], "pack-cloze-peat"),

  reading(211, "Why did historians keep asking for the paper files?", "Neden nostalji değil. Mikrofilm, düz açılmamış ciltten çekildiği için kenar ve notlar kadraj dışında kalıyor.", 4, "detail", [ok("Marks on the paper were often missing from the image."), c("The ministry had banned digital copies.", "LOGICAL_ERROR"), c("Historians refused to read any scan.", "CONTEXT_MISMATCH"), c("The scanners had become slower each year.", "LOGICAL_ERROR"), c("The catalogue listed only paper files.", "CONTEXT_MISMATCH")], "pack-read-archive"),
  reading(212, "The phrase “fell outside the frame” refers to marks that ----.", "Frame, mikrofilm karesi. Düşen şey sayfanın kenarındaki izler.", 4, "reference", [ok("the camera never captured"), c("the historians refused to request", "REFERENCE_ERROR"), c("the ministry deleted after scanning", "LOGICAL_ERROR"), c("were added to the paper after filming", "CONTEXT_MISMATCH"), c("proved the machine was too fast", "REFERENCE_ERROR")], "pack-read-archive"),
  reading(213, "What changed in the public catalogue?", "İki sayı yan yana duruyor: taranan sayfa ve kâğıtta olup görüntüde olmayan iz.", 3, "detail", [ok("It reports missing marks as well as pages scanned."), c("It stopped listing any scanned pages.", "LOGICAL_ERROR"), c("It replaced the paper files with microfilm.", "CONTEXT_MISMATCH"), c("It publishes only the speed of the machines.", "LOGICAL_ERROR"), c("It hides the sample checks from readers.", "LOGICAL_ERROR")], "pack-read-archive"),
  reading(214, "The archivists’ main claim is that ----.", "Tamlık, makinenin hızı değil kopyanın özelliğidir.", 4, "main-idea", [ok("a copy is complete only if it keeps what the paper shows"), c("page counts are the only honest public number", "LOGICAL_ERROR"), c("microfilm is always clearer than a flatbed scan", "CONTEXT_MISMATCH"), c("historians should stop using archives", "LOGICAL_ERROR"), c("speed matters more than the margin of a page", "LOGICAL_ERROR")], "pack-read-archive"),

  reading(215, "When did the new line appear?", "Tanıdan sonra, imzadan önce. Buton gizlenmiyor.", 3, "detail", [ok("After the diagnosis and before the doctor signed."), c("Only after a colleague refused the drug.", "CONTEXT_MISMATCH"), c("In place of the prescription button.", "LOGICAL_ERROR"), c("On a poster in the corridor.", "CONTEXT_MISMATCH"), c("Once the patient had already left.", "LOGICAL_ERROR")], "pack-read-clinic"),
  reading(216, "It can be inferred that doctors who skipped the line ----.", "Satırı yok sayanlar eski oranda yazmaya devam ediyor. Yazılım tek başına öğretmemiş.", 4, "inference", [ok("kept prescribing as they had before"), c("were blocked from issuing any drug", "LOGICAL_ERROR"), c("saw return visits rise within a week", "LOGICAL_ERROR"), c("removed the line from the note", "CONTEXT_MISMATCH"), c("stopped seeing coughs altogether", "CONTEXT_MISMATCH")], "pack-read-clinic"),
  reading(217, "The authors mention the corridor poster in order to ----.", "Aynı duraklamayı isteyen afiş işe yaramamış. Satır, hekimin kendi cümlesi olduğu için işlemiş.", 5, "purpose", [ok("show that the same request had failed in another form"), c("prove that posters reduce return visits", "LOGICAL_ERROR"), c("recommend removing all software prompts", "LOGICAL_ERROR"), c("compare two hospitals’ infection rates", "CONTEXT_MISMATCH"), c("announce that antibiotics were banned", "LOGICAL_ERROR")], "pack-read-clinic"),
  reading(218, "Which reading do the authors reject?", "Yazılımın tıbbı öğrettiği yorumunu reddediyorlar.", 4, "main-idea", [ok("That the software itself had taught the doctors."), c("That prescriptions for those coughs fell.", "LOGICAL_ERROR"), c("That return visits stayed level.", "LOGICAL_ERROR"), c("That a colleague could later read the sentence.", "CONTEXT_MISMATCH"), c("That the line was stored beside the prescription.", "CONTEXT_MISMATCH")], "pack-read-clinic"),

  reading(219, "On which plots did the satellite maps agree with the probes?", "Çıplak ve düz tarlalarda tutuyor. Gölge ve şerit sulamada tutmuyor.", 3, "detail", [ok("Bare, flat plots."), c("Fields shaded by a standing crop.", "LOGICAL_ERROR"), c("Fields irrigated in strips.", "LOGICAL_ERROR"), c("Every field an insurer priced.", "LOGICAL_ERROR"), c("Only fields that had already lost the crop.", "CONTEXT_MISMATCH")], "pack-read-soil"),
  reading(220, "Why could a farmer with a failed crop be told the soil was fine?", "Gölgeli tarla haritada gerçekten olduğundan ıslak okunuyor. Hata rastgele değil.", 4, "inference", [ok("Shade made the map read the field as wetter than it was."), c("The probes were removed before the satellite passed.", "CONTEXT_MISMATCH"), c("Insurers refused to price any drought cover.", "LOGICAL_ERROR"), c("Irrigation strips were left out of the comparison.", "CONTEXT_MISMATCH"), c("The maps could not yet show a single field.", "LOGICAL_ERROR")], "pack-read-soil"),
  reading(221, "Insurers who kept the product now use the map to ----.", "Harita hüküm değil. Seyrek ziyaretin nereye gideceğine karar veriyor.", 4, "detail", [ok("choose where a person should check the soil"), c("replace every ground probe", "LOGICAL_ERROR"), c("refuse cover on bare plots", "CONTEXT_MISMATCH"), c("prove that shaded fields are wetter", "LOGICAL_ERROR"), c("set a single price for all farms", "CONTEXT_MISMATCH")], "pack-read-soil"),
  reading(222, "The comparison shows that the map’s error was ----.", "Hata rastgele değil; gölgede sistematik ıslak okuma.", 4, "main-idea", [ok("systematic, not a scatter of small mistakes"), c("limited to flat, bare soil", "LOGICAL_ERROR"), c("too small to affect a drought price", "LOGICAL_ERROR"), c("caused by broken probes", "CONTEXT_MISMATCH"), c("a reason to stop sending people into fields", "LOGICAL_ERROR")], "pack-read-soil"),
];
