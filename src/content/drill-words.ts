export type WordPos = "verb" | "noun" | "adjective" | "adverb";

export type DrillWord = {
  id: string;
  word: string;
  pos: WordPos;
  meaning: string;
  example: string;
  /** Words that share a sense never appear as each other's wrong choices. */
  sense?: string;
};

export const posLabel: Record<WordPos, string> = {
  verb: "fiil",
  noun: "isim",
  adjective: "sıfat",
  adverb: "zarf",
};

export const drillWords: DrillWord[] = [
  { id: "acquire", word: "acquire", pos: "verb", meaning: "edinmek, kazanmak", example: "Children acquire a second language faster than adults.", sense: "obtain" },
  { id: "alter", word: "alter", pos: "verb", meaning: "değiştirmek", example: "The new policy did not alter the outcome." },
  { id: "assess", word: "assess", pos: "verb", meaning: "değerlendirmek", example: "Teachers assess each student at the end of the term." },
  { id: "attribute", word: "attribute", pos: "verb", meaning: "(bir şeyin sebebini) bir şeye bağlamak", example: "Researchers attribute the decline to warmer winters." },
  { id: "cease", word: "cease", pos: "verb", meaning: "sona ermek, durmak", example: "The factory ceased production in 2019." },
  { id: "comprise", word: "comprise", pos: "verb", meaning: "-den oluşmak", example: "The committee comprises nine members." },
  { id: "deny", word: "deny", pos: "verb", meaning: "inkâr etmek, reddetmek", example: "The minister denied any link to the company." },
  { id: "diminish", word: "diminish", pos: "verb", meaning: "azalmak, azaltmak", example: "The pain diminished after a few days." },
  { id: "enhance", word: "enhance", pos: "verb", meaning: "geliştirmek, artırmak", example: "Regular exercise can enhance memory." },
  { id: "ensure", word: "ensure", pos: "verb", meaning: "sağlamak, garanti altına almak", example: "The law ensures equal access to schools." },
  { id: "exceed", word: "exceed", pos: "verb", meaning: "aşmak, geçmek", example: "Costs exceeded the original budget." },
  { id: "exploit", word: "exploit", pos: "verb", meaning: "sömürmek, istismar etmek", example: "Some firms exploit cheap labour abroad." },
  { id: "hinder", word: "hinder", pos: "verb", meaning: "engellemek, güçleştirmek", example: "Heavy rain hindered the rescue work." },
  { id: "impose", word: "impose", pos: "verb", meaning: "dayatmak, (vergi, yasak) koymak", example: "The city imposed a ban on plastic bags." },
  { id: "indicate", word: "indicate", pos: "verb", meaning: "göstermek, işaret etmek", example: "The results indicate a clear trend." },
  { id: "maintain", word: "maintain", pos: "verb", meaning: "sürdürmek, korumak", example: "It is hard to maintain focus for hours." },
  { id: "neglect", word: "neglect", pos: "verb", meaning: "ihmal etmek", example: "Old buildings were neglected for decades." },
  { id: "obtain", word: "obtain", pos: "verb", meaning: "elde etmek", example: "You must obtain a permit before building.", sense: "obtain" },
  { id: "pursue", word: "pursue", pos: "verb", meaning: "peşinden gitmek, sürdürmek", example: "She decided to pursue a career in law." },
  { id: "reveal", word: "reveal", pos: "verb", meaning: "ortaya çıkarmak, açığa vurmak", example: "The survey revealed deep differences between regions." },
  { id: "undergo", word: "undergo", pos: "verb", meaning: "geçirmek, (bir sürece) maruz kalmak", example: "The patient will undergo surgery next week." },
  { id: "yield", word: "yield", pos: "verb", meaning: "(sonuç, ürün) vermek", example: "The experiment yielded surprising results." },
  { id: "abandon", word: "abandon", pos: "verb", meaning: "terk etmek, vazgeçmek", example: "The villagers abandoned their homes after the flood." },
  { id: "confirm", word: "confirm", pos: "verb", meaning: "doğrulamak, teyit etmek", example: "Later studies confirmed the first findings." },
  { id: "contribute", word: "contribute", pos: "verb", meaning: "katkıda bulunmak", example: "Many factors contribute to obesity." },
  { id: "decline-v", word: "decline", pos: "verb", meaning: "azalmak; kibarca reddetmek", example: "Birth rates have declined across Europe." },

  { id: "evidence", word: "evidence", pos: "noun", meaning: "kanıt", example: "There is little evidence that the drug works." },
  { id: "outcome", word: "outcome", pos: "noun", meaning: "sonuç", example: "Nobody could predict the outcome of the vote." },
  { id: "threat", word: "threat", pos: "noun", meaning: "tehdit", example: "Rising sea levels are a threat to coastal cities.", sense: "danger" },
  { id: "hazard", word: "hazard", pos: "noun", meaning: "tehlike, risk", example: "Loose wires are a fire hazard.", sense: "danger" },
  { id: "shortage", word: "shortage", pos: "noun", meaning: "kıtlık, eksiklik", example: "The hospital faces a shortage of nurses." },
  { id: "approach", word: "approach", pos: "noun", meaning: "yaklaşım", example: "The school tried a new approach to reading." },
  { id: "burden", word: "burden", pos: "noun", meaning: "yük, külfet", example: "Rising rents are a heavy burden on young families." },
  { id: "feature", word: "feature", pos: "noun", meaning: "özellik", example: "The most striking feature of the town is its harbour." },
  { id: "framework", word: "framework", pos: "noun", meaning: "çerçeve, yapı", example: "The treaty provides a framework for future talks." },
  { id: "insight", word: "insight", pos: "noun", meaning: "kavrayış, derin anlayış", example: "The diary gives us insight into daily life in 1900." },
  { id: "obstacle", word: "obstacle", pos: "noun", meaning: "engel", example: "Cost remains the main obstacle to treatment." },
  { id: "priority", word: "priority", pos: "noun", meaning: "öncelik", example: "Safety is our first priority." },
  { id: "requirement", word: "requirement", pos: "noun", meaning: "gereklilik, şart", example: "A degree is a requirement for the job." },
  { id: "survey", word: "survey", pos: "noun", meaning: "anket, araştırma", example: "A recent survey asked 2,000 drivers about their habits." },
  { id: "welfare", word: "welfare", pos: "noun", meaning: "refah, iyilik hâli", example: "The charity works for the welfare of street animals." },
  { id: "consent", word: "consent", pos: "noun", meaning: "onay, rıza", example: "Patients must give written consent before the test." },
  { id: "scope", word: "scope", pos: "noun", meaning: "kapsam", example: "The question is beyond the scope of this study." },
  { id: "drawback", word: "drawback", pos: "noun", meaning: "sakınca, dezavantaj", example: "The main drawback of the plan is its cost." },
  { id: "assumption", word: "assumption", pos: "noun", meaning: "varsayım", example: "The model rests on a false assumption." },
  { id: "fluctuation", word: "fluctuation", pos: "noun", meaning: "dalgalanma", example: "Farmers worry about fluctuations in grain prices." },
  { id: "decline-n", word: "decline", pos: "noun", meaning: "düşüş, gerileme", example: "The report shows a sharp decline in sales." },
  { id: "trend", word: "trend", pos: "noun", meaning: "eğilim", example: "The trend towards remote work began before 2020." },

  { id: "substantial", word: "substantial", pos: "adjective", meaning: "hatırı sayılır, büyük", example: "The audit found substantial evidence of delay." },
  { id: "crucial", word: "crucial", pos: "adjective", meaning: "hayati, çok önemli", example: "Sleep is crucial for learning." },
  { id: "adequate", word: "adequate", pos: "adjective", meaning: "yeterli", example: "Many schools lack adequate heating." },
  { id: "scarce", word: "scarce", pos: "adjective", meaning: "kıt, az bulunan", example: "Water becomes scarce in late summer." },
  { id: "abundant", word: "abundant", pos: "adjective", meaning: "bol", example: "Fish were abundant in the lake a century ago." },
  { id: "feasible", word: "feasible", pos: "adjective", meaning: "uygulanabilir, yapılabilir", example: "Engineers say the bridge is technically feasible." },
  { id: "vulnerable", word: "vulnerable", pos: "adjective", meaning: "savunmasız, kırılgan", example: "Older people are more vulnerable to heat." },
  { id: "reluctant", word: "reluctant", pos: "adjective", meaning: "isteksiz", example: "Many patients are reluctant to talk about pain." },
  { id: "inevitable", word: "inevitable", pos: "adjective", meaning: "kaçınılmaz", example: "Some delay was inevitable after the storm." },
  { id: "ambiguous", word: "ambiguous", pos: "adjective", meaning: "belirsiz, birden çok anlama gelebilen", example: "The wording of the contract was ambiguous." },
  { id: "accurate", word: "accurate", pos: "adjective", meaning: "doğru, kesin", example: "The new scale gives more accurate readings." },
  { id: "reliable", word: "reliable", pos: "adjective", meaning: "güvenilir", example: "The bus service is cheap but not very reliable." },
  { id: "prevalent", word: "prevalent", pos: "adjective", meaning: "yaygın", example: "The disease is more prevalent in rural areas." },
  { id: "subsequent", word: "subsequent", pos: "adjective", meaning: "sonraki, ardından gelen", example: "Subsequent tests showed no sign of the virus." },
  { id: "obvious", word: "obvious", pos: "adjective", meaning: "apaçık, belli", example: "The answer seemed obvious at first." },
  { id: "hostile", word: "hostile", pos: "adjective", meaning: "düşmanca, saldırgan", example: "The crowd grew hostile as the speech went on." },
  { id: "rigid", word: "rigid", pos: "adjective", meaning: "katı, esnek olmayan", example: "The school has rigid rules about uniforms." },
  { id: "temporary", word: "temporary", pos: "adjective", meaning: "geçici", example: "The workers live in temporary housing." },

  { id: "merely", word: "merely", pos: "adverb", meaning: "sadece, yalnızca", example: "The error was merely a typing mistake." },
  { id: "barely", word: "barely", pos: "adverb", meaning: "zar zor, ancak", example: "We could barely hear the speaker." },
  { id: "nearly", word: "nearly", pos: "adverb", meaning: "neredeyse", example: "The project took nearly ten years.", sense: "almost" },
  { id: "approximately", word: "approximately", pos: "adverb", meaning: "yaklaşık olarak", example: "Approximately 40 percent of the land is forest.", sense: "almost" },
  { id: "gradually", word: "gradually", pos: "adverb", meaning: "yavaş yavaş, aşamalı olarak", example: "The town gradually recovered after the war.", sense: "growing" },
  { id: "increasingly", word: "increasingly", pos: "adverb", meaning: "giderek daha fazla", example: "Doctors are increasingly worried about antibiotic use.", sense: "growing" },
  { id: "deliberately", word: "deliberately", pos: "adverb", meaning: "kasıtlı olarak", example: "The fire was started deliberately." },
  { id: "predominantly", word: "predominantly", pos: "adverb", meaning: "ağırlıklı olarak, çoğunlukla", example: "The workforce is predominantly female." },
  { id: "simultaneously", word: "simultaneously", pos: "adverb", meaning: "aynı anda", example: "The two reports were published simultaneously." },
  { id: "eventually", word: "eventually", pos: "adverb", meaning: "sonunda, en sonunda", example: "After months of talks, they eventually agreed." },
  { id: "relatively", word: "relatively", pos: "adverb", meaning: "görece, nispeten", example: "The test is relatively easy." },
  { id: "seldom", word: "seldom", pos: "adverb", meaning: "nadiren", example: "Such storms seldom reach the north." },
  { id: "thoroughly", word: "thoroughly", pos: "adverb", meaning: "iyice, baştan sona", example: "Wash the vegetables thoroughly before cooking." },
  { id: "readily", word: "readily", pos: "adverb", meaning: "kolayca; seve seve", example: "The data are readily available online." },
];
