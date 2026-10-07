import { connectorSentences, connectors, type ConnectorKind, type Relation } from "@/content/drill-connectors";
import { skillName } from "@/content/labels";
import { sections, type SectionId } from "@/modules/exam/blueprint";
import { ref, symmetricEdges, type EdgeType, type KnowledgeEdge, type KnowledgeNode, type LegacyMapping, type MatchKind, type NodeRef, type NodeType } from "./graph";

export const knowledgeVersion = {
  version: "1.0",
  notes: "Initial taxonomy: question types, skills, grammar, discourse relations, connectors, misconceptions and distractor types, mapped from the legacy skill tree.",
};

const node = (type: NodeType, slug: string, name: string, nameTr?: string, extra: Partial<KnowledgeNode> = {}): KnowledgeNode => ({
  type,
  slug,
  name,
  nameTr,
  ...extra,
});

export const connectorSlug = (id: string) => id.replaceAll("-", "_");

const relationSlug: Record<Relation, string> = {
  contrast: "contrast",
  concession: "concession",
  cause: "cause",
  result: "result",
  addition: "addition",
  similarity: "comparison",
  condition: "condition",
  purpose: "purpose",
  example: "example",
  time: "sequence",
};

const patternSlug: Record<ConnectorKind, string> = {
  conj: "clause_connector",
  prep: "prepositional_connector",
  adv: "sentence_adverbial",
  inf: "infinitive_connector",
};

export const sectionSlug: Record<SectionId, string> = {
  vocabulary: "vocabulary",
  grammar: "grammar",
  cloze: "cloze",
  sentence: "sentence_completion",
  translation: "translation",
  reading: "reading_comprehension",
  dialogue: "dialogue_completion",
  restatement: "closest_meaning",
  situation: "situation_appropriate",
  paragraph: "paragraph_completion",
  irrelevant: "irrelevant_sentence",
};

const domains = [
  node("domain", "vocabulary", "Vocabulary", "Kelime"),
  node("domain", "grammar", "Grammar", "Dil bilgisi"),
  node("domain", "reading", "Reading", "Okuma"),
  node("domain", "discourse", "Discourse", "Anlam ilişkileri"),
  node("domain", "cognitive", "Cognitive skills", "Düşünme becerileri"),
];

const questionTypes = [
  node("question_type", "vocabulary", "Vocabulary", skillName("vocabulary")),
  node("question_type", "grammar", "Grammar", skillName("grammar")),
  node("question_type", "cloze", "Cloze passage", skillName("cloze")),
  node("question_type", "sentence_completion", "Sentence completion", skillName("sentence")),
  node("question_type", "translation", "Translation", skillName("translation")),
  node("question_type", "translation_en_tr", "Translation, English to Turkish", skillName("translation-en-tr")),
  node("question_type", "translation_tr_en", "Translation, Turkish to English", skillName("translation-tr-en")),
  node("question_type", "reading_comprehension", "Reading comprehension", skillName("reading")),
  node("question_type", "dialogue_completion", "Dialogue completion", skillName("dialogue")),
  node("question_type", "closest_meaning", "Closest meaning", skillName("restatement")),
  node("question_type", "situation_appropriate", "Situational response", skillName("situation")),
  node("question_type", "paragraph_completion", "Paragraph completion", skillName("paragraph")),
  node("question_type", "irrelevant_sentence", "Irrelevant sentence", skillName("irrelevant")),
];

const vocabularySkills = [
  node("skill", "word_meaning", "Word meaning", "Kelime anlamı"),
  node("skill", "contextual_meaning", "Meaning in context", "Bağlamdaki anlam"),
  node("skill", "synonym", "Synonyms", "Eş anlam"),
  node("skill", "antonym", "Antonyms", "Zıt anlam"),
  node("skill", "collocation", "Collocation", skillName("collocation")),
  node("skill", "phrasal_verb", "Phrasal verbs", "Öbek fiiller"),
  node("skill", "word_formation", "Word formation", "Sözcük türetme"),
  node("skill", "register", "Register", "Üslup"),
  node("skill", "polysemy", "Polysemy", "Çok anlamlılık"),
  node("skill", "lexical_distinction", "Telling close words apart", "Yakın kelimeleri ayırma"),
];

const readingSkills = [
  node("skill", "main_idea", "Main idea", skillName("main-idea")),
  node("skill", "detail", "Detail", skillName("detail")),
  node("skill", "inference", "Inference", skillName("inference")),
  node("skill", "reference", "Reference", skillName("reference")),
  node("skill", "purpose", "Author's purpose", skillName("purpose")),
  node("skill", "tone", "Tone", "Anlatım tonu"),
  node("skill", "attitude", "Attitude", "Tutum"),
  node("skill", "paraphrase", "Paraphrase", "Başka sözlerle anlatım"),
  node("skill", "cause_effect", "Cause and effect", "Sebep ve sonuç"),
  node("skill", "argument_structure", "Argument structure", "Savın kuruluşu"),
  node("skill", "author_position", "Author's position", "Yazarın görüşü"),
  node("skill", "speaker_intent", "Speaker intent", skillName("dialogue-intent")),
];

const discourseSkills = [
  node("skill", "pragmatic_appropriateness", "Saying the right thing for the situation", skillName("situation-line")),
  node("skill", "coherence", "Coherence", "Anlam bütünlüğü"),
];

const grammar = [
  node("grammar", "tense", "Tense", skillName("tenses")),
  node("grammar", "aspect", "Aspect", "Süreklilik ve tamamlanmışlık"),
  node("grammar", "modal", "Modal verbs", "Modal fiiller"),
  node("grammar", "passive", "Passive voice", skillName("passive")),
  node("grammar", "conditional", "Conditionals", skillName("conditionals")),
  node("grammar", "relative_clause", "Relative clauses", skillName("relative")),
  node("grammar", "noun_clause", "Noun clauses", "İsim cümleciği"),
  node("grammar", "adverbial_clause", "Adverbial clauses", "Zarf cümleciği"),
  node("grammar", "participle", "Participles", "Sıfat-fiil"),
  node("grammar", "gerund", "Gerunds", "İsim-fiil (-ing)"),
  node("grammar", "infinitive", "Infinitives", "Mastar (to + fiil)"),
  node("grammar", "preposition", "Prepositions", skillName("prepositions")),
  node("grammar", "conjunction", "Conjunctions", skillName("connectors")),
  node("grammar", "subject_verb_agreement", "Subject–verb agreement", "Özne-fiil uyumu"),
  node("grammar", "article", "Articles", "Tanımlıklar (a, an, the)"),
  node("grammar", "determiner", "Determiners", "Belirleyiciler"),
  node("grammar", "pronoun", "Pronouns", "Zamirler"),
  node("grammar", "inversion", "Inversion", "Devrik yapı"),
  node("grammar", "parallelism", "Parallel structure", "Paralel yapı"),
  node("grammar", "comparison", "Comparatives and superlatives", "Karşılaştırma"),
];

const discourse = [
  node("discourse_relation", "cause", "Cause", "Sebep", { description: "One fact explains why another happens." }),
  node("discourse_relation", "result", "Result", "Sonuç", { description: "One fact follows from another." }),
  node("discourse_relation", "contrast", "Contrast", "Zıtlık", { description: "Two facts are set against each other." }),
  node("discourse_relation", "concession", "Concession", "Beklenmedik sonuç (-e rağmen)", {
    description: "A fact is accepted, but the outcome goes against what it would lead us to expect.",
  }),
  node("discourse_relation", "condition", "Condition", "Koşul", { description: "One thing happens only if another does." }),
  node("discourse_relation", "purpose", "Purpose", "Amaç", { description: "An action is done to reach a goal." }),
  node("discourse_relation", "addition", "Addition", "Ekleme", { description: "New information pointing the same way is added." }),
  node("discourse_relation", "sequence", "Sequence in time", "Zaman sırası", { description: "Events are placed in order in time." }),
  node("discourse_relation", "comparison", "Similarity and comparison", "Benzerlik ve karşılaştırma", {
    description: "Two things are shown to be alike or are weighed against each other.",
  }),
  node("discourse_relation", "example", "Example", "Örnek", { description: "A general point is illustrated with a specific case." }),
  node("discourse_relation", "qualification", "Qualification", "Sınırlama", { description: "A claim is narrowed or made less absolute." }),
  node("discourse_relation", "emphasis", "Emphasis", "Vurgu", { description: "A point is stressed or made stronger." }),
];

const cognitive = [
  node("cognitive_skill", "literal_comprehension", "Literal comprehension", "Metni olduğu gibi anlama"),
  node("cognitive_skill", "inference", "Inference", "Çıkarım yapma"),
  node("cognitive_skill", "semantic_discrimination", "Semantic discrimination", "Yakın anlamları ayırt etme"),
  node("cognitive_skill", "paraphrase_recognition", "Paraphrase recognition", "Aynı anlamı farklı sözlerde tanıma"),
  node("cognitive_skill", "context_integration", "Using context", "Bağlamı kullanma"),
  node("cognitive_skill", "logical_relationship", "Logical relationship", "Mantıksal bağlantıyı kurma"),
  node("cognitive_skill", "elimination", "Elimination", "Eleme"),
  node("cognitive_skill", "prediction", "Prediction", "Devamını kestirme"),
  node("cognitive_skill", "evidence_identification", "Finding evidence", "Kanıtı bulma"),
  node("cognitive_skill", "distractor_detection", "Spotting distractors", "Çeldiriciyi fark etme"),
];

const patterns = [
  node("grammar_pattern", "clause_connector", "Connector + clause", "Cümle bağlayan bağlaç", {
    description: "Followed by a subject and a finite verb.",
    metadata: { pattern: "connector + finite_clause", requires: ["finite_clause"], cannot_directly_take: ["noun_phrase", "gerund_phrase"] },
  }),
  node("grammar_pattern", "prepositional_connector", "Connector + noun or -ing", "İsim ya da -ing alan bağlaç", {
    description: "Followed by a noun phrase or an -ing form, never by a subject and verb.",
    metadata: { pattern: "connector + noun_or_gerund", requires: ["noun_phrase", "gerund_phrase"], cannot_directly_take: ["finite_clause"] },
  }),
  node("grammar_pattern", "sentence_adverbial", "Sentence-initial connector", "Cümle başında virgülle gelen bağlaç", {
    description: "Opens a new sentence, usually followed by a comma; cannot join two clauses on its own.",
    metadata: { pattern: "sentence. connector, independent_clause", requires: ["independent_clause"], cannot_directly_take: ["subordinate_clause"] },
  }),
  node("grammar_pattern", "infinitive_connector", "Connector + base verb", "Yalın fiil alan bağlaç", {
    description: "Followed by the base form of a verb.",
    metadata: { pattern: "connector + bare_infinitive", requires: ["bare_infinitive"], cannot_directly_take: ["finite_clause", "noun_phrase"] },
  }),
];

const connectorNodes = connectors.map((connector) => node("connector", connectorSlug(connector.id), connector.text));

const misconceptions = [
  node("misconception", "despite_with_finite_clause", "Despite before a clause", "despite'ı although gibi kullanmak", {
    description: "Treats despite or in spite of like although and follows it with a subject and verb instead of a noun or -ing form.",
    metadata: { severity: "high" },
  }),
  node("misconception", "concession_vs_contrast", "Mixing up concession and contrast", "Zıtlık ile beklenmedik sonucu karıştırmak", {
    description: "Reads every opposing idea as plain contrast and misses that concession sets up an expectation that is then broken.",
    metadata: { severity: "high" },
  }),
  node("misconception", "however_as_subordinator", "However joining two clauses", "however ile iki cümleyi tek cümlede bağlamak", {
    description: "Uses however like but or although inside one sentence, instead of opening a new sentence with it.",
    metadata: { severity: "medium" },
  }),
  node("misconception", "cause_vs_result_direction", "Reversing cause and result", "Sebep ile sonucu ters kurmak", {
    description: "Picks a cause connector where the clause gives a result, or the reverse, because both describe the same link.",
    metadata: { severity: "high" },
  }),
  node("misconception", "false_synonym_in_context", "Near synonyms as interchangeable", "Yakın anlamlı kelimeyi her yerde eş saymak", {
    description: "Assumes two words with close dictionary meanings fit the same sentence equally well.",
    metadata: { severity: "medium" },
  }),
  node("misconception", "collocation_by_meaning_only", "Choosing words by meaning alone", "Kelimeyi kalıbına bakmadan seçmek", {
    description: "Picks a word whose meaning fits but ignores which verbs, nouns or prepositions it normally goes with.",
    metadata: { severity: "medium" },
  }),
  node("misconception", "tense_sequence_in_past_reference", "Losing the time frame", "Geçmişten söz ederken zaman uyumunu bozmak", {
    description: "Keeps a present form in a clause that refers back to a past time already set in the sentence.",
    metadata: { severity: "medium" },
  }),
  node("misconception", "pronoun_reference_nearest_noun", "Pronoun means the nearest noun", "Zamiri en yakın isme bağlamak", {
    description: "Assumes a pronoun points to the closest noun instead of checking number, meaning and the flow of the text.",
    metadata: { severity: "medium" },
  }),
];

const distractorTypes = [
  node("distractor_type", "semantic_mismatch", "Meaning does not fit", "Bağlama uymayan anlam", {
    description: "Grammatical, but its meaning does not fit the context.",
  }),
  node("distractor_type", "wrong_discourse_relation", "Wrong logical relation", "Yanlış ilişki kuran bağlaç", {
    description: "Signals a different logical relation from the one the sentence needs.",
  }),
  node("distractor_type", "grammatical_mismatch", "Grammar trap", "Dil bilgisi tuzağı", {
    description: "Has the right meaning but breaks a grammar rule in this position.",
  }),
  node("distractor_type", "syntactic_mismatch", "Wrong structure", "Cümle yapısına uymayan seçenek", {
    description: "Needs a different sentence structure from the one around the blank.",
  }),
  node("distractor_type", "near_synonym", "Near synonym", "Yakın anlamlı ama yanlış kelime", {
    description: "Close in meaning to the answer but wrong for this context.",
  }),
  node("distractor_type", "collocation_failure", "Wrong word partner", "Kalıba uymayan kelime", {
    description: "Does not combine naturally with the words around it.",
  }),
  node("distractor_type", "scope_mismatch", "Too broad or too narrow", "Kapsamı fazla geniş ya da dar", {
    description: "Says more or less than the text supports.",
  }),
  node("distractor_type", "tense_mismatch", "Tense mismatch", "Zaman uyumsuzluğu", {
    description: "The verb form does not match the time frame of the sentence.",
  }),
  node("distractor_type", "reference_mismatch", "Wrong reference", "Yanlış şeyi gösteren zamir", {
    description: "The pronoun or reference word points to the wrong element.",
  }),
  node("distractor_type", "logical_incompatibility", "Illogical", "Mantıksız anlam", {
    description: "The completed sentence contradicts itself or common sense.",
  }),
  node("distractor_type", "part_of_speech_mismatch", "Wrong word class", "Yanlış sözcük türü", {
    description: "The word class does not fit the slot, such as an adjective where a noun is needed.",
  }),
  node("distractor_type", "register_mismatch", "Wrong register", "Üsluba uymayan ifade", {
    description: "Too formal or too casual for the situation.",
  }),
  node("distractor_type", "partial_truth", "Partly true", "Kısmen doğru seçenek", {
    description: "Only part of it is supported by the text.",
  }),
  node("distractor_type", "meaning_shift", "Meaning shift", "Anlamı kaydıran seçenek", {
    description: "A translation or restatement that changes emphasis, scope or meaning.",
  }),
];

export const knowledgeNodes: KnowledgeNode[] = [
  ...domains,
  ...questionTypes,
  ...vocabularySkills,
  ...readingSkills,
  ...discourseSkills,
  ...grammar,
  ...discourse,
  ...cognitive,
  ...patterns,
  ...connectorNodes,
  ...misconceptions,
  ...distractorTypes,
];

const refs = (list: KnowledgeNode[]) => list.map(ref);

const edge = (type: EdgeType, from: NodeRef, to: NodeRef): KnowledgeEdge =>
  symmetricEdges.has(type) && to < from ? { type, from: to, to: from } : { type, from, to };

const fan = (type: EdgeType, from: NodeRef, to: NodeRef[]) => to.map((target) => edge(type, from, target));

const pairs = (type: EdgeType, list: [NodeRef, NodeRef][]) => list.map(([from, to]) => edge(type, from, to));

const confusedConnectors = [
  ...new Map(
    connectorSentences
      .filter((sentence) => sentence.trap)
      .map((sentence) => [connectorSlug(sentence.answer), connectorSlug(sentence.trap as string)].sort())
      .map(([a, b]) => [`${a}|${b}`, edge("often_confused_with", `connector:${a}`, `connector:${b}`)] as const),
  ).values(),
];

export const knowledgeEdges: KnowledgeEdge[] = [
  ...fan("parent_of", "domain:vocabulary", refs(vocabularySkills)),
  ...fan("parent_of", "domain:reading", refs(readingSkills)),
  ...fan("parent_of", "domain:grammar", refs(grammar)),
  ...fan("parent_of", "domain:discourse", [...refs(discourse), ...refs(discourseSkills)]),
  ...fan("parent_of", "domain:cognitive", refs(cognitive)),
  ...fan("parent_of", "question_type:translation", ["question_type:translation_en_tr", "question_type:translation_tr_en"]),

  ...connectors.map((connector) => edge("expressed_by", `discourse_relation:${relationSlug[connector.relation]}`, `connector:${connectorSlug(connector.id)}`)),
  ...connectors.map((connector) => edge("has_pattern", `connector:${connectorSlug(connector.id)}`, `grammar_pattern:${patternSlug[connector.kind]}`)),
  ...fan("has_pattern", "grammar:conjunction", ["grammar_pattern:clause_connector", "grammar_pattern:sentence_adverbial"]),
  ...fan("has_pattern", "grammar:preposition", ["grammar_pattern:prepositional_connector"]),
  ...fan("has_pattern", "grammar:infinitive", ["grammar_pattern:infinitive_connector"]),

  ...fan("measures", "question_type:vocabulary", ["skill:word_meaning", "skill:contextual_meaning", "skill:collocation", "skill:phrasal_verb", "skill:lexical_distinction"]),
  ...fan("measures", "question_type:grammar", [
    "grammar:tense",
    "grammar:modal",
    "grammar:passive",
    "grammar:conditional",
    "grammar:relative_clause",
    "grammar:preposition",
    "grammar:conjunction",
  ]),
  ...fan("measures", "question_type:cloze", ["cognitive_skill:context_integration", "skill:contextual_meaning", "grammar:conjunction", "grammar:tense"]),
  ...fan("measures", "question_type:sentence_completion", ["cognitive_skill:logical_relationship", "grammar:conjunction", "grammar:adverbial_clause", "grammar:tense"]),
  ...fan("measures", "question_type:translation_en_tr", ["cognitive_skill:paraphrase_recognition", "cognitive_skill:semantic_discrimination"]),
  ...fan("measures", "question_type:translation_tr_en", ["cognitive_skill:paraphrase_recognition", "cognitive_skill:semantic_discrimination"]),
  ...fan("measures", "question_type:reading_comprehension", [
    "skill:main_idea",
    "skill:detail",
    "skill:inference",
    "skill:reference",
    "skill:purpose",
    "skill:tone",
    "skill:author_position",
    "cognitive_skill:evidence_identification",
  ]),
  ...fan("measures", "question_type:dialogue_completion", ["skill:speaker_intent", "skill:pragmatic_appropriateness", "skill:coherence"]),
  ...fan("measures", "question_type:closest_meaning", ["skill:paraphrase", "cognitive_skill:paraphrase_recognition", "cognitive_skill:semantic_discrimination"]),
  ...fan("measures", "question_type:situation_appropriate", ["skill:pragmatic_appropriateness", "skill:register"]),
  ...fan("measures", "question_type:paragraph_completion", ["skill:coherence", "cognitive_skill:logical_relationship", "cognitive_skill:prediction"]),
  ...fan("measures", "question_type:irrelevant_sentence", ["skill:coherence", "skill:main_idea", "cognitive_skill:logical_relationship"]),

  ...fan("exploits", "distractor_type:wrong_discourse_relation", ["misconception:concession_vs_contrast", "misconception:cause_vs_result_direction"]),
  ...fan("exploits", "distractor_type:grammatical_mismatch", ["misconception:despite_with_finite_clause", "misconception:however_as_subordinator"]),
  ...fan("exploits", "distractor_type:syntactic_mismatch", ["misconception:despite_with_finite_clause", "misconception:however_as_subordinator"]),
  ...fan("exploits", "distractor_type:near_synonym", ["misconception:false_synonym_in_context"]),
  ...fan("exploits", "distractor_type:semantic_mismatch", ["misconception:false_synonym_in_context"]),
  ...fan("exploits", "distractor_type:collocation_failure", ["misconception:collocation_by_meaning_only"]),
  ...fan("exploits", "distractor_type:tense_mismatch", ["misconception:tense_sequence_in_past_reference"]),
  ...fan("exploits", "distractor_type:reference_mismatch", ["misconception:pronoun_reference_nearest_noun"]),

  ...pairs("related_to", [
    ["misconception:despite_with_finite_clause", "connector:despite"],
    ["misconception:despite_with_finite_clause", "connector:in_spite_of"],
    ["misconception:despite_with_finite_clause", "grammar_pattern:prepositional_connector"],
    ["misconception:concession_vs_contrast", "discourse_relation:concession"],
    ["misconception:concession_vs_contrast", "discourse_relation:contrast"],
    ["misconception:however_as_subordinator", "connector:however"],
    ["misconception:however_as_subordinator", "grammar_pattern:sentence_adverbial"],
    ["misconception:cause_vs_result_direction", "discourse_relation:cause"],
    ["misconception:cause_vs_result_direction", "discourse_relation:result"],
    ["misconception:false_synonym_in_context", "skill:lexical_distinction"],
    ["misconception:false_synonym_in_context", "skill:synonym"],
    ["misconception:collocation_by_meaning_only", "skill:collocation"],
    ["misconception:tense_sequence_in_past_reference", "grammar:tense"],
    ["misconception:tense_sequence_in_past_reference", "grammar:aspect"],
    ["misconception:pronoun_reference_nearest_noun", "skill:reference"],
    ["misconception:pronoun_reference_nearest_noun", "grammar:pronoun"],
    ["discourse_relation:concession", "discourse_relation:contrast"],
    ["discourse_relation:cause", "discourse_relation:result"],
    ["discourse_relation:purpose", "discourse_relation:cause"],
    ["discourse_relation:example", "discourse_relation:addition"],
    ["discourse_relation:qualification", "discourse_relation:concession"],
    ["discourse_relation:emphasis", "discourse_relation:addition"],
    ["discourse_relation:sequence", "discourse_relation:cause"],
    ["cognitive_skill:inference", "skill:inference"],
    ["cognitive_skill:paraphrase_recognition", "skill:paraphrase"],
    ["cognitive_skill:distractor_detection", "cognitive_skill:elimination"],
    ["cognitive_skill:evidence_identification", "skill:detail"],
    ["cognitive_skill:literal_comprehension", "skill:detail"],
    ["skill:cause_effect", "discourse_relation:cause"],
    ["skill:cause_effect", "discourse_relation:result"],
    ["skill:polysemy", "skill:contextual_meaning"],
    ["skill:lexical_distinction", "skill:synonym"],
    ["skill:lexical_distinction", "cognitive_skill:semantic_discrimination"],
  ]),
  ...pairs("often_confused_with", [
    ["discourse_relation:concession", "discourse_relation:contrast"],
    ["discourse_relation:cause", "discourse_relation:result"],
    ["discourse_relation:purpose", "discourse_relation:result"],
  ]),
  ...confusedConnectors,
  ...pairs("contrasts_with", [
    ["discourse_relation:addition", "discourse_relation:contrast"],
    ["discourse_relation:comparison", "discourse_relation:contrast"],
  ]),
  ...pairs("prerequisite", [
    ["grammar:aspect", "grammar:tense"],
    ["grammar:conditional", "grammar:tense"],
    ["grammar:passive", "grammar:tense"],
    ["grammar:inversion", "grammar:conditional"],
    ["grammar:participle", "grammar:relative_clause"],
    ["grammar:relative_clause", "grammar:pronoun"],
    ["grammar_pattern:prepositional_connector", "grammar:gerund"],
    ["grammar_pattern:infinitive_connector", "grammar:infinitive"],
    ["discourse_relation:concession", "discourse_relation:contrast"],
    ["skill:inference", "skill:detail"],
    ["skill:author_position", "skill:main_idea"],
    ["cognitive_skill:paraphrase_recognition", "cognitive_skill:semantic_discrimination"],
  ]),
];

const map = (kind: LegacyMapping["kind"], id: string, target: NodeRef, match: MatchKind = "exact"): LegacyMapping => ({ kind, id, node: target, match });

export const legacyMap: LegacyMapping[] = [
  ...sections.map((section) => map("section", section, `question_type:${sectionSlug[section]}`)),
  ...sections.map((section) => map("skill", section, `question_type:${sectionSlug[section]}`)),
  map("skill", "vocabulary", "domain:vocabulary", "related"),
  map("skill", "grammar", "domain:grammar", "related"),
  map("skill", "reading", "domain:reading", "related"),
  map("skill", "academic-vocabulary", "skill:contextual_meaning", "broader"),
  map("skill", "collocation", "skill:collocation"),
  map("skill", "tenses", "grammar:tense"),
  map("skill", "conditionals", "grammar:conditional"),
  map("skill", "relative", "grammar:relative_clause"),
  map("skill", "passive", "grammar:passive"),
  map("skill", "prepositions", "grammar:preposition"),
  map("skill", "connectors", "grammar:conjunction"),
  map("skill", "connectors", "domain:discourse", "related"),
  map("skill", "cloze-context", "cognitive_skill:context_integration", "broader"),
  map("skill", "sentence-link", "cognitive_skill:logical_relationship", "broader"),
  map("skill", "translation-en-tr", "question_type:translation_en_tr"),
  map("skill", "translation-tr-en", "question_type:translation_tr_en"),
  map("skill", "detail", "skill:detail"),
  map("skill", "inference", "skill:inference"),
  map("skill", "reference", "skill:reference"),
  map("skill", "main-idea", "skill:main_idea"),
  map("skill", "purpose", "skill:purpose"),
  map("skill", "dialogue-intent", "skill:speaker_intent"),
  map("skill", "situation-line", "skill:pragmatic_appropriateness"),
  map("skill", "restatement-shift", "cognitive_skill:paraphrase_recognition", "broader"),
  map("skill", "paragraph-flow", "skill:coherence", "broader"),
  map("skill", "irrelevant-break", "skill:coherence", "broader"),
  map("distractor", "CONTEXT_MISMATCH", "distractor_type:semantic_mismatch"),
  map("distractor", "COLLOCATION_ERROR", "distractor_type:collocation_failure"),
  map("distractor", "VOCAB_SIMILAR_MEANING", "distractor_type:near_synonym"),
  map("distractor", "LOGICAL_ERROR", "distractor_type:logical_incompatibility"),
  map("distractor", "CONNECTOR_ERROR", "distractor_type:wrong_discourse_relation"),
  map("distractor", "GRAMMAR_TRAP", "distractor_type:grammatical_mismatch"),
  map("distractor", "GRAMMAR_TRAP", "distractor_type:syntactic_mismatch", "related"),
  map("distractor", "TENSE_ERROR", "distractor_type:tense_mismatch"),
  map("distractor", "REFERENCE_ERROR", "distractor_type:reference_mismatch"),
  map("distractor", "TRANSLATION_SHIFT", "distractor_type:meaning_shift"),
  ...(Object.keys(relationSlug) as Relation[]).map((relation) =>
    map("relation", relation, `discourse_relation:${relationSlug[relation]}`, relation === "similarity" ? "broader" : "exact"),
  ),
  ...connectors.map((connector) => map("connector", connector.id, `connector:${connectorSlug(connector.id)}`)),
];
