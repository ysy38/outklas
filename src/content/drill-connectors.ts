export type Relation =
  | "contrast"
  | "concession"
  | "cause"
  | "result"
  | "addition"
  | "similarity"
  | "condition"
  | "purpose"
  | "example"
  | "time";

/** conj: joins two clauses; prep: takes a noun or -ing; adv: starts a sentence with a comma; inf: takes a bare verb. */
export type ConnectorKind = "conj" | "prep" | "adv" | "inf";

export type Connector = { id: string; text: string; relation: Relation; kind: ConnectorKind };

export type ConnectorSentence = {
  id: string;
  text: string;
  answer: string;
  /** Same meaning, wrong grammar: the classic YDS trap (although / despite). */
  trap?: string;
};

export const relationLabel: Record<Relation, string> = {
  contrast: "zıtlık",
  concession: "beklenmedik sonuç (-e rağmen)",
  cause: "sebep",
  result: "sonuç",
  addition: "ekleme",
  similarity: "benzerlik",
  condition: "koşul",
  purpose: "amaç",
  example: "örnek",
  time: "zaman",
};

export const relationHint: Record<Relation, string> = {
  contrast: "iki bilgi birbirine ters düşüyor",
  concession: "beklenenin tersi bir sonuç var",
  cause: "cümlede bir şeyin sebebi veriliyor",
  result: "ikinci kısım, birincinin sonucunu anlatıyor",
  addition: "aynı yönde yeni bir bilgi ekleniyor",
  similarity: "iki durum birbirine benziyor",
  condition: "bir şey başka bir şeyin şartına bağlanıyor",
  purpose: "bir işin hangi amaçla yapıldığı anlatılıyor",
  example: "önceki genel bilgiye örnek veriliyor",
  time: "olaylar arasında zaman sırası var",
};

export const kindRule: Record<ConnectorKind, string> = {
  conj: "iki cümleyi bağlar; arkasından özne ve fiil gelir",
  prep: "arkasından cümle değil, isim ya da -ing gelir",
  adv: "cümle başında virgülle kullanılır; iki cümleyi tek başına bağlamaz",
  inf: "arkasından fiilin yalın hâli gelir",
};

export const connectors: Connector[] = [
  { id: "however", text: "however", relation: "contrast", kind: "adv" },
  { id: "on-the-other-hand", text: "on the other hand", relation: "contrast", kind: "adv" },
  { id: "in-contrast", text: "in contrast", relation: "contrast", kind: "adv" },
  { id: "whereas", text: "whereas", relation: "contrast", kind: "conj" },
  { id: "but", text: "but", relation: "contrast", kind: "conj" },
  { id: "although", text: "although", relation: "concession", kind: "conj" },
  { id: "even-though", text: "even though", relation: "concession", kind: "conj" },
  { id: "despite", text: "despite", relation: "concession", kind: "prep" },
  { id: "in-spite-of", text: "in spite of", relation: "concession", kind: "prep" },
  { id: "nevertheless", text: "nevertheless", relation: "concession", kind: "adv" },
  { id: "nonetheless", text: "nonetheless", relation: "concession", kind: "adv" },
  { id: "because", text: "because", relation: "cause", kind: "conj" },
  { id: "because-of", text: "because of", relation: "cause", kind: "prep" },
  { id: "due-to", text: "due to", relation: "cause", kind: "prep" },
  { id: "owing-to", text: "owing to", relation: "cause", kind: "prep" },
  { id: "therefore", text: "therefore", relation: "result", kind: "adv" },
  { id: "thus", text: "thus", relation: "result", kind: "adv" },
  { id: "consequently", text: "consequently", relation: "result", kind: "adv" },
  { id: "as-a-result", text: "as a result", relation: "result", kind: "adv" },
  { id: "hence", text: "hence", relation: "result", kind: "adv" },
  { id: "moreover", text: "moreover", relation: "addition", kind: "adv" },
  { id: "furthermore", text: "furthermore", relation: "addition", kind: "adv" },
  { id: "in-addition", text: "in addition", relation: "addition", kind: "adv" },
  { id: "in-addition-to", text: "in addition to", relation: "addition", kind: "prep" },
  { id: "as-well-as", text: "as well as", relation: "addition", kind: "prep" },
  { id: "likewise", text: "likewise", relation: "similarity", kind: "adv" },
  { id: "similarly", text: "similarly", relation: "similarity", kind: "adv" },
  { id: "unless", text: "unless", relation: "condition", kind: "conj" },
  { id: "if", text: "if", relation: "condition", kind: "conj" },
  { id: "provided-that", text: "provided that", relation: "condition", kind: "conj" },
  { id: "as-long-as", text: "as long as", relation: "condition", kind: "conj" },
  { id: "in-case", text: "in case", relation: "condition", kind: "conj" },
  { id: "otherwise", text: "otherwise", relation: "condition", kind: "adv" },
  { id: "so-that", text: "so that", relation: "purpose", kind: "conj" },
  { id: "in-order-that", text: "in order that", relation: "purpose", kind: "conj" },
  { id: "in-order-to", text: "in order to", relation: "purpose", kind: "inf" },
  { id: "so-as-to", text: "so as to", relation: "purpose", kind: "inf" },
  { id: "for-example", text: "for example", relation: "example", kind: "adv" },
  { id: "for-instance", text: "for instance", relation: "example", kind: "adv" },
  { id: "such-as", text: "such as", relation: "example", kind: "prep" },
  { id: "until", text: "until", relation: "time", kind: "conj" },
  { id: "as-soon-as", text: "as soon as", relation: "time", kind: "conj" },
  { id: "by-the-time", text: "by the time", relation: "time", kind: "conj" },
  { id: "before", text: "before", relation: "time", kind: "conj" },
  { id: "after", text: "after", relation: "time", kind: "conj" },
];

export const connectorSentences: ConnectorSentence[] = [
  { id: "s01", text: "---- the results were promising, the board refused to fund a second trial.", answer: "although", trap: "despite" },
  { id: "s02", text: "---- he had lived in Paris for ten years, he never learned to speak French well.", answer: "although", trap: "in-spite-of" },
  { id: "s03", text: "The village still has no clinic, ---- its population has doubled since 2010.", answer: "even-though", trap: "despite" },
  { id: "s04", text: "---- the heavy rain, thousands of people joined the march.", answer: "despite", trap: "although" },
  { id: "s05", text: "---- its small size, the museum attracts visitors from all over the world.", answer: "in-spite-of", trap: "even-though" },
  { id: "s06", text: "The project went ahead ---- strong objections from local residents.", answer: "despite", trap: "even-though" },
  { id: "s07", text: "The new drug has serious side effects. ----, many doctors still prescribe it.", answer: "nevertheless" },
  { id: "s08", text: "The team lost its best player in March. ----, it went on to win the league.", answer: "nonetheless" },
  { id: "s09", text: "Northern regions receive plenty of rain. ----, the south suffers from long droughts.", answer: "in-contrast" },
  { id: "s10", text: "Online courses are cheap and flexible. ----, they demand a lot of self-discipline.", answer: "however" },
  { id: "s11", text: "Some experts welcome the reform. ----, others fear it will raise costs.", answer: "on-the-other-hand" },
  { id: "s12", text: "Older workers prefer printed reports, ---- younger staff read almost everything on screen.", answer: "whereas" },
  { id: "s13", text: "Lions hunt in groups, ---- leopards usually hunt alone.", answer: "whereas" },
  { id: "s14", text: "Many flights were cancelled ---- the airport was covered in fog.", answer: "because", trap: "because-of" },
  { id: "s15", text: "---- the builders used cheap materials, the bridge cracked within a year.", answer: "because", trap: "due-to" },
  { id: "s16", text: "The library closed early ---- the heating system had broken down.", answer: "because", trap: "owing-to" },
  { id: "s17", text: "The match was postponed ---- bad weather.", answer: "because-of", trap: "because" },
  { id: "s18", text: "---- rising costs, many small shops have closed.", answer: "due-to", trap: "because" },
  { id: "s19", text: "Crop yields fell sharply ---- a long dry summer.", answer: "owing-to", trap: "because" },
  { id: "s20", text: "---- his poor health, he had to retire early.", answer: "because-of", trap: "because" },
  { id: "s21", text: "The roads were covered in ice. ----, all schools in the region were closed.", answer: "as-a-result" },
  { id: "s22", text: "The company lost its biggest client. ----, it had to cut 200 jobs.", answer: "consequently" },
  { id: "s23", text: "The bridge was found to be unsafe. ----, it was closed to traffic.", answer: "thus" },
  { id: "s24", text: "Sales fell for the third year in a row. ----, the shop closed in May.", answer: "therefore" },
  { id: "s25", text: "The vaccine was tested on only fifty people. ----, its long-term effects are still unknown.", answer: "hence" },
  { id: "s26", text: "The new tram line is faster than the bus. ----, it produces almost no local pollution.", answer: "moreover" },
  { id: "s27", text: "The course teaches basic coding. ----, students learn how to work in teams.", answer: "in-addition" },
  { id: "s28", text: "Walking is free and easy. ----, it lowers the risk of heart disease.", answer: "furthermore" },
  { id: "s29", text: "---- teaching at the university, she writes a weekly newspaper column.", answer: "in-addition-to", trap: "moreover" },
  { id: "s30", text: "The museum displays paintings ---- old maps and letters.", answer: "as-well-as", trap: "in-addition" },
  { id: "s31", text: "Smoking damages the lungs. ----, long exposure to traffic fumes harms the airways.", answer: "similarly" },
  { id: "s32", text: "Germany cut its coal use last year. ----, Spain closed most of its coal mines.", answer: "likewise" },
  { id: "s33", text: "Customers can return a product within 30 days ---- they keep the receipt.", answer: "provided-that" },
  { id: "s34", text: "---- it rains tomorrow, the concert will move indoors.", answer: "if" },
  { id: "s35", text: "The plan can work ---- every member state agrees to pay its share.", answer: "provided-that" },
  { id: "s36", text: "You can borrow my car ---- you bring it back by six.", answer: "as-long-as" },
  { id: "s37", text: "Take an umbrella ---- it rains later.", answer: "in-case" },
  { id: "s38", text: "Patients must take the full course of antibiotics. ----, the infection may return.", answer: "otherwise" },
  { id: "s39", text: "The museum will close next year ---- it finds new funding.", answer: "unless" },
  { id: "s40", text: "Many students work part-time ---- pay their rent.", answer: "in-order-to", trap: "so-that" },
  { id: "s41", text: "The city built more bike lanes ---- people would drive less.", answer: "so-that", trap: "in-order-to" },
  { id: "s42", text: "Write down new words every day ---- remember them better.", answer: "so-as-to", trap: "so-that" },
  { id: "s43", text: "The text was simplified ---- younger readers could follow it.", answer: "so-that", trap: "so-as-to" },
  { id: "s44", text: "Some metals, ---- gold and silver, do not rust.", answer: "such-as" },
  { id: "s45", text: "Many cities are fighting air pollution. Paris, ----, has banned old diesel cars.", answer: "for-example" },
  { id: "s46", text: "Small habits matter. ----, drinking enough water can improve concentration.", answer: "for-instance" },
  { id: "s47", text: "Do not open the oven ---- the cake has risen.", answer: "until" },
  { id: "s48", text: "Call me ---- you arrive at the station.", answer: "as-soon-as" },
  { id: "s49", text: "---- the firefighters arrived, the building had already collapsed.", answer: "by-the-time" },
  { id: "s50", text: "Read the instructions carefully ---- you start the test.", answer: "before" },
  { id: "s51", text: "She found a job two months ---- she had finished her degree.", answer: "after" },
  { id: "s52", text: "The town is crowded with tourists in summer. ----, it is almost empty in winter.", answer: "however" },
  { id: "s53", text: "---- the law was passed in 2015, few companies have followed it.", answer: "although", trap: "despite" },
  { id: "s54", text: "Prices kept rising ---- the government’s efforts to control them.", answer: "despite", trap: "although" },
  { id: "s55", text: "---- the long journey, the children were full of energy.", answer: "in-spite-of", trap: "although" },
  { id: "s56", text: "The experiment failed twice. ----, the team learned a great deal from it.", answer: "nevertheless" },
  { id: "s57", text: "The main road was closed for repairs. ----, drivers had to take a long detour.", answer: "as-a-result" },
  { id: "s58", text: "Housing costs have doubled in a decade, ---- wages have barely changed.", answer: "whereas" },
  { id: "s59", text: "---- the storm, the ferry service was suspended for two days.", answer: "because-of", trap: "because" },
  { id: "s60", text: "Keep a copy of your passport ---- the original is lost.", answer: "in-case" },
];
