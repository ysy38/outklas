import { z } from "zod";
import { nodeRef } from "@/modules/analysis/contract";
import { parseRef, type NodeRef } from "@/modules/knowledge/graph";
import { knowledgeNodes } from "@/modules/knowledge/seed";
import type { DistractorSpec, FailureMode } from "./distractor-spec";

export const distractorDiagnosisVersion = "distractor-diagnosis.v1";

/** The legacy coarse distractor codes (`legacyMap` kind "distractor"). Every label rolls up to exactly one. */
export const errorCategories = [
  "CONNECTOR_ERROR",
  "LOGICAL_ERROR",
  "CONTEXT_MISMATCH",
  "VOCAB_SIMILAR_MEANING",
  "COLLOCATION_ERROR",
  "GRAMMAR_TRAP",
  "TENSE_ERROR",
  "REFERENCE_ERROR",
  "TRANSLATION_SHIFT",
] as const;
export type ErrorCategory = (typeof errorCategories)[number];

export const diagnosisCategoryCodes = ["relation", "logic", "form", "lexis", "reference", "fidelity"] as const;
export type DiagnosisCategoryCode = (typeof diagnosisCategoryCodes)[number];

/** Level 1. Membership is decided by what makes the option wrong; `definition` is the test a human or judge applies. */
export const diagnosisCategories: Record<DiagnosisCategoryCode, { nameTr: string; nameEn: string; definition: string }> = {
  relation: {
    nameTr: "Bağlaç ilişkisi",
    nameEn: "Discourse relation",
    definition: "Decisive: the connector. It signals a discourse relation the sentence does not support.",
  },
  logic: {
    nameTr: "Cümle mantığı",
    nameEn: "Sentence logic",
    definition: "Decisive: the content. Read with its connector in the normal meaning, the completed sentence is false or illogical.",
  },
  form: { nameTr: "Dil bilgisi", nameEn: "Grammar and form", definition: "Decisive: the form. The option breaks a grammar or structure rule in the blank." },
  lexis: {
    nameTr: "Kelime seçimi",
    nameEn: "Vocabulary and collocation",
    definition: "Decisive: one word. Its meaning, closeness to another word or collocation does not fit the context.",
  },
  reference: { nameTr: "Gönderim", nameEn: "Reference", definition: "Decisive: a pronoun or reference word that points to the wrong element." },
  fidelity: {
    nameTr: "Anlam kayması",
    nameEn: "Meaning fidelity",
    definition: "Decisive: faithfulness to a source text. A restatement or translation shifts meaning, scope or emphasis, or is only partly supported.",
  },
};

/**
 * Level 1 by distractor type, for options whose connector is not the decisive element. Covers every distractor_type
 * node in the graph. An option whose connector signals another relation is always `relation` (see diagnoseSlot).
 */
export const distractorTypeCategory: Record<string, DiagnosisCategoryCode> = {
  wrong_discourse_relation: "relation",
  logical_incompatibility: "logic",
  grammatical_mismatch: "form",
  syntactic_mismatch: "form",
  part_of_speech_mismatch: "form",
  tense_mismatch: "form",
  semantic_mismatch: "lexis",
  near_synonym: "lexis",
  collocation_failure: "lexis",
  register_mismatch: "lexis",
  reference_mismatch: "reference",
  meaning_shift: "fidelity",
  partial_truth: "fidelity",
  scope_mismatch: "fidelity",
};

export const diagnosisLabel = z.object({
  category: z.enum(diagnosisCategoryCodes),
  misconception: nodeRef.nullable(),
  /** The tracked skill this label diagnoses (skill, grammar or cognitive_skill node). */
  skill: nodeRef.nullable(),
  errorCategory: z.enum(errorCategories),
  /** Distractor types whose options can carry this label, as primary or secondary. */
  distractorTypes: z.array(nodeRef).min(1),
  /** Question types diagnoseSlot can emit this label for; empty while the label is reserved. */
  questionTypes: z.array(nodeRef),
  titleTr: z.string().min(1).max(80),
  /** Valid for any item with this label: no item content, at most two sentences. */
  feedbackTr: z.string().min(1).max(360),
  /** Item-level sentence with {needed}, {chosen} and {connector} placeholders, rendered by renderFeedback. */
  detailTr: z.string().nullable(),
  /** What the factory already guarantees for an option carrying this label. */
  deterministic: z.array(z.string()),
  /** English yes/no question the distractor judge answers to confirm the label; null when fully deterministic. */
  judgeCheck: z.string().nullable(),
});
export type DiagnosisLabel = z.infer<typeof diagnosisLabel>;

const sentenceCompletion: NodeRef[] = ["question_type:sentence_completion"];
const opensWith = (relation: string) => `The option opens with a graph connector of the ${relation} relation (validator: connector_unrecognised, distractor_connector_mismatch).`;
const relationGuarantees = [
  "The option opens with a graph connector of the expressed relation (validator: connector_unrecognised, distractor_connector_mismatch).",
  "Its connector does not express the correct relation and it carries no marker of it (validator: distractor_has_target_relation, forbidden_marker_in_distractor).",
  "The (correct, expressed) relation pair falls in this label's class (diagnoseSlot).",
];
const relationDetail = "Bu cümle {needed} ilişkisi istiyor, seçtiğin {connector} ise {chosen} bildiriyor.";

const relationLabel = (titleTr: string, feedbackTr: string, misconception: NodeRef | null = null): DiagnosisLabel => ({
  category: "relation",
  misconception,
  skill: "grammar:conjunction",
  errorCategory: "CONNECTOR_ERROR",
  distractorTypes: ["distractor_type:wrong_discourse_relation", "distractor_type:logical_incompatibility"],
  questionTypes: sentenceCompletion,
  titleTr,
  feedbackTr,
  detailTr: relationDetail,
  deterministic: relationGuarantees,
  judgeCheck: null,
});

const logicLabel = (relation: string | null, titleTr: string, feedbackTr: string, judgeCheck: string): DiagnosisLabel => ({
  category: "logic",
  misconception: null,
  skill: "cognitive_skill:logical_relationship",
  errorCategory: "LOGICAL_ERROR",
  distractorTypes: relation ? ["distractor_type:logical_incompatibility", "distractor_type:wrong_discourse_relation"] : ["distractor_type:logical_incompatibility"],
  questionTypes: sentenceCompletion,
  titleTr,
  feedbackTr,
  detailTr: null,
  deterministic: relation ? [opensWith(relation)] : [],
  judgeCheck,
});

const reservedLabel = (
  category: DiagnosisCategoryCode,
  errorCategory: ErrorCategory,
  distractorTypes: NodeRef[],
  skill: NodeRef,
  misconception: NodeRef | null,
  titleTr: string,
  feedbackTr: string,
  judgeCheck: string,
): DiagnosisLabel => ({ category, misconception, skill, errorCategory, distractorTypes, questionTypes: [], titleTr, feedbackTr, detailTr: null, deterministic: [], judgeCheck });

/** Level 2. Codes are `category.slug` and never change meaning; a new meaning gets a new code and a version bump. */
export const diagnosisLabels = {
  "relation.concession_vs_contrast": relationLabel(
    "Zıtlık ile beklenmedik sonucu karıştırma",
    "Zıtlık ile beklenmedik sonucu (-e rağmen) karıştırıyorsun: zıtlıkta iki durum yan yana karşılaştırılır, beklenmedik sonuçta ise ilk kısım bir beklenti kurar ve ikinci kısım bu beklentiyi bozar. Bağlacı seçmeden önce ilk kısmın bir beklenti doğurup doğurmadığına bak.",
    "misconception:concession_vs_contrast",
  ),
  "relation.cause_vs_result": relationLabel(
    "Sebep ile sonucu ters kurma",
    "Sebep ile sonucun yönünü ters kuruyorsun: sebep bağlacı gerekçeyi, sonuç bağlacı ise bu gerekçeden doğan durumu getirir. Hangi olayın ötekine yol açtığını bul ve bağlacı ona göre seç.",
    "misconception:cause_vs_result_direction",
  ),
  "relation.purpose_vs_cause": relationLabel(
    "Amacı sebep ya da sonuçla karıştırma",
    "Amacı sebep ya da sonuçla karıştırıyorsun: amaç bağlacı bir eylemin hangi hedef için yapıldığını söyler, sebep ve sonuç bağlaçları ise iki olay arasındaki bağı anlatır. İkinci kısmın bir hedef mi, yoksa bir gerekçe ya da sonuç mu olduğuna bak.",
  ),
  "relation.addition_example_similarity": relationLabel(
    "Ekleme, örnek ve benzerliği karıştırma",
    "Ekleme, örnek ve benzerlik bağlaçlarını birbirine karıştırıyorsun: örnek genel bir fikri somutlaştırır, benzerlik iki şeyi yan yana koyar, ekleme ise aynı yönde yeni bilgi verir. İkinci kısmın ilk kısımla tam olarak nasıl bir bağ kurduğunu kontrol et.",
  ),
  "relation.polarity_reversed": relationLabel(
    "Bağlacın yönünü ters okuma",
    "Bağlacın yönünü karıştırıyorsun: birbirine ters düşen iki kısmı aynı yönde ilerliyormuş gibi (ya da tersini) okuyorsun. Bağlaca bakmadan önce ikinci kısmın ilk kısmı desteklediğine mi yoksa beklentiyi bozduğuna mı karar ver.",
  ),
  "relation.explanation_vs_addition": relationLabel(
    "Gerekçe ile ek bilgiyi karıştırma",
    "Gerekçe ile ek bilgiyi karıştırıyorsun: sebep, sonuç ve amaç bağlaçları iki olayı birbirine bağlar, ekleme, örnek ve benzerlik bağlaçları ise yalnızca aynı yönde bilgi ekler. İkinci kısmın ilk kısmı açıklayıp açıklamadığını ya da ondan doğup doğmadığını kontrol et.",
  ),
  "relation.condition_misapplied": relationLabel(
    "Koşul bağlacını yanlış yerde kullanma",
    "Koşul gerektirmeyen bir bağlantıda koşul bağlacını kabul ediyorsun: koşul bağlacı, ana cümledeki durumun ancak ikinci kısım gerçekleşirse olacağını söyler. Ana cümlenin gerçekten bu şarta bağlı olup olamayacağını kontrol et.",
  ),
  "relation.time_for_logic": relationLabel(
    "Zaman bağlacını mantıksal bağ sanma",
    "Zaman bağlacını, cümlenin istediği mantıksal bağın yerine kabul ediyorsun: zaman bağlacı olayları yalnızca sıraya koyar, aralarındaki sebep, koşul ya da beklenti ilişkisini kurmaz. Cümlenin bir zaman sırası mı yoksa mantıksal bir bağ mı istediğine bak.",
  ),
  "relation.frame_missed": relationLabel(
    "Koşul ya da zaman çerçevesini gözden kaçırma",
    "Cümlenin bir koşul ya da zaman çerçevesi istediğini gözden kaçırıyorsun: ana cümledeki durum, ikinci kısmın hangi şartla ya da ne zaman gerçekleştiğine bağlı. Mantıksal bir bağlaç seçmeden önce ikinci kısmın bir şart ya da zaman bildirip bildirmediğine bak.",
  ),
  "logic.no_broken_expectation": logicLabel(
    "concession",
    "Beklentiyi bozmayan kısmı engel sanma",
    "Beklenmedik sonuç (-e rağmen) bağlacını gördüğün için seçeneği doğru sanıyorsun, ama bu kısım ana cümledeki sonuca engel olmuyor, hatta onu destekliyor. Bağlaç doğru olsa bile ikinci kısmın gerçekten ters yönde bir beklenti kurup kurmadığını kontrol et.",
    "Read with its concession connector, does the option's clause fail to set up an expectation that the main clause breaks (it supports or is neutral to the outcome)?",
  ),
  "logic.no_real_opposition": logicLabel(
    "contrast",
    "Olmayan zıtlığı kabul etme",
    "İki kısım arasında gerçek bir zıtlık yokken zıtlık bağlacını kabul ediyorsun. Zıtlık bağlacı gördüğünde iki kısmın gerçekten birbirine ters düşüp düşmediğini kontrol et.",
    "Read with its contrast connector, does the option point the same way as the main clause or stay fully compatible with it, so that nothing is actually contrasted?",
  ),
  "logic.similarity_fails": logicLabel(
    "comparison",
    "Tutmayan benzerliği kabul etme",
    "Benzerlik bağlacının kurduğu karşılaştırmayı kontrol etmeden kabul ediyorsun. İki kısmın gerçekten birbirine benzeyip benzemediğine bak.",
    "Read with its similarity connector, is the option's point unlike the main clause or in conflict with it?",
  ),
  "logic.reason_supports_opposite": logicLabel(
    "cause",
    "Tersini savunan gerekçeyi kabul etme",
    "Ana cümleyi açıklamayan, hatta tersini savunan bir gerekçeyi kabul ediyorsun. Sebep bağlacından sonra gelen kısmın ana cümleyi gerçekten açıklayıp açıklamadığını kendine sor.",
    "Read with its cause connector, is the option's clause a reason that would make the main clause less likely instead of explaining it?",
  ),
  "logic.consequence_fails": logicLabel(
    "result",
    "Çıkmayan sonucu kabul etme",
    "Ana cümleden çıkmayan, hatta onunla çelişen bir sonucu kabul ediyorsun. Sonuç bağlacından sonra gelen kısmın ilk kısımdan gerçekten doğup doğmadığını kontrol et.",
    "Read with its result connector, does the option state a consequence that does not follow from the main clause or contradicts it?",
  ),
  "logic.condition_cannot_restrict": logicLabel(
    "condition",
    "Sonucu sınırlayamayan koşulu kabul etme",
    "Ana cümledeki sonucu mümkün kılmayan, hatta zorlaştıran bir koşulu kabul ediyorsun. Koşulu cümleye yerleştir ve sonucun gerçekten bu şarta bağlı olabileceğini kontrol et.",
    "Read with its condition connector, does the option state a condition that would make the main clause's outcome less likely, so the outcome cannot depend on it?",
  ),
  "logic.time_order": logicLabel(
    "sequence",
    "Olayların zaman sırasını kontrol etmeme",
    "Zaman bağlacının kurduğu sırayı kontrol etmeden kabul ediyorsun: olaylar bu sırayla anlatılınca cümle mantıksız oluyor. İki olayı zaman çizgisine yerleştir ve birinin ötekinden önce ya da sonra olmasının anlamlı olup olmadığına bak.",
    "Read with its time connector, does the order of events the option sets up make the completed sentence illogical (for example a setback placed right before the outcome as if it had triggered it)?",
  ),
  "logic.purpose_fails": logicLabel(
    "purpose",
    "Uymayan amacı kabul etme",
    "Ana cümledeki eylemin hizmet edemeyeceği bir amacı kabul ediyorsun. Eylemin gerçekten bu hedefe ulaşmak için yapılıp yapılamayacağını kontrol et.",
    "Read with its purpose connector, is the stated purpose one the action in the main clause could not serve?",
  ),
  "logic.addition_contradicts": logicLabel(
    "addition",
    "Çelişen bilgiyi ek bilgi sanma",
    "Ana cümleyle çelişen bir bilgiyi ek bilgi gibi kabul ediyorsun. Ekleme bağlacından sonra gelen kısmın ilk kısımla aynı yönde olup olmadığına bak.",
    "Read with its addition connector, does the added point contradict the main clause instead of supporting it?",
  ),
  "logic.example_fails": logicLabel(
    "example",
    "Örneklemeyen durumu örnek sanma",
    "Ana fikri örneklemeyen bir durumu örnek gibi kabul ediyorsun. Örnek bağlacından sonra gelen kısmın ana cümledeki genel fikrin somut bir hâli olup olmadığını kontrol et.",
    "Read with its example connector, does the option give a case that does not illustrate the main clause?",
  ),
  "logic.self_contradiction": logicLabel(
    null,
    "Kendisiyle çelişen cümleyi kabul etme",
    "Tamamlandığında kendisiyle ya da genel bilgiyle çelişen bir cümleyi kabul ediyorsun. Seçeneği cümleye yerleştirip baştan oku ve anlamın mantıklı olup olmadığını kontrol et.",
    "Does the completed sentence contradict itself or common knowledge while every word stays on topic?",
  ),
  "lexis.meaning_in_context": reservedLabel(
    "lexis",
    "CONTEXT_MISMATCH",
    ["distractor_type:semantic_mismatch"],
    "skill:contextual_meaning",
    null,
    "Bağlama uymayan anlamı seçme",
    "Kelimenin anlamını tek başına değerlendirip cümlenin bağlamını gözden kaçırıyorsun. Seçeneği boşluğa koyup cümlenin tamamını oku ve anlamın bütünle uyuşup uyuşmadığına bak.",
    "Is the option grammatical in the blank while its meaning clashes with the context?",
  ),
  "lexis.near_synonym": reservedLabel(
    "lexis",
    "VOCAB_SIMILAR_MEANING",
    ["distractor_type:near_synonym"],
    "skill:lexical_distinction",
    "misconception:false_synonym_in_context",
    "Yakın anlamlı kelimeyi eş sayma",
    "Anlamı yakın iki kelimeyi her bağlamda eş sayıyorsun. Kelimenin bu cümledeki tonuna ve birlikte kullanıldığı kelimelere bak; en yakın anlam her zaman doğru cevap değildir.",
    "Is the option close in meaning to the answer but wrong in this context because of tone, scope or usage?",
  ),
  "lexis.collocation": reservedLabel(
    "lexis",
    "COLLOCATION_ERROR",
    ["distractor_type:collocation_failure"],
    "skill:collocation",
    "misconception:collocation_by_meaning_only",
    "Kelimeyi kalıbına bakmadan seçme",
    "Kelimeyi yalnızca anlamına bakarak seçiyorsun, hangi kelimelerle birlikte kullanıldığını gözden kaçırıyorsun. Boşluğun çevresindeki fiil, isim ve edatla kalıp oluşturup oluşturmadığını kontrol et.",
    "Does the option's meaning fit while it fails to combine naturally with the surrounding words?",
  ),
  "form.prepositional_before_clause": reservedLabel(
    "form",
    "GRAMMAR_TRAP",
    ["distractor_type:grammatical_mismatch", "distractor_type:syntactic_mismatch"],
    "grammar:preposition",
    "misconception:despite_with_finite_clause",
    "despite'ı although gibi kullanma",
    "despite ve in spite of gibi bağlaçları although gibi özne ve fiil alan bir cümlenin önünde kullanıyorsun. Bu bağlaçlardan sonra isim ya da -ing biçimi gelmesi gerektiğini kontrol et.",
    "Is a prepositional connector such as despite or in spite of followed by a subject and a finite verb?",
  ),
  "form.adverbial_joining_clauses": reservedLabel(
    "form",
    "GRAMMAR_TRAP",
    ["distractor_type:grammatical_mismatch", "distractor_type:syntactic_mismatch"],
    "grammar:conjunction",
    "misconception:however_as_subordinator",
    "however ile iki cümleyi bağlama",
    "however gibi cümle başında gelen bağlaçları but ya da although gibi iki cümleyi tek cümlede birleştirmek için kullanıyorsun. Bu bağlaçların yeni bir cümle açtığını ve genellikle virgülle ayrıldığını hatırla.",
    "Does a sentence adverbial such as however or nevertheless join two clauses inside one sentence like a conjunction?",
  ),
  "form.tense_frame": reservedLabel(
    "form",
    "TENSE_ERROR",
    ["distractor_type:tense_mismatch"],
    "grammar:tense",
    "misconception:tense_sequence_in_past_reference",
    "Zaman uyumunu bozma",
    "Cümlede kurulmuş zaman çerçevesine uymayan bir fiil biçimi seçiyorsun. Cümlenin geçmişten mi şimdiden mi söz ettiğini belirle ve fiil zamanını buna göre kontrol et.",
    "Does the verb form break the time frame already set in the sentence?",
  ),
  "reference.nearest_noun": reservedLabel(
    "reference",
    "REFERENCE_ERROR",
    ["distractor_type:reference_mismatch"],
    "skill:reference",
    "misconception:pronoun_reference_nearest_noun",
    "Zamiri en yakın isme bağlama",
    "Zamiri ya da gösterme sözcüğünü en yakın isme bağlıyorsun. Zamirin tekil mi çoğul mu olduğuna ve anlamca hangi isme uyduğuna bakarak gösterdiği şeyi bul.",
    "Would the pronoun or reference word have to point to the nearest noun, which does not fit in number or meaning?",
  ),
  "fidelity.meaning_shift": reservedLabel(
    "fidelity",
    "TRANSLATION_SHIFT",
    ["distractor_type:meaning_shift"],
    "skill:paraphrase",
    null,
    "Anlamı kaydıran seçeneği kabul etme",
    "Zaman, olumsuzluk, miktar ya da vurgudaki küçük bir kaymayı gözden kaçırıyorsun. Seçenekteki her öğeyi kaynak cümledeki karşılığıyla tek tek karşılaştır.",
    "Does the restatement change the tense, negation, quantity, scope or emphasis of the source?",
  ),
} satisfies Record<string, DiagnosisLabel>;

export type DiagnosisLabelCode = keyof typeof diagnosisLabels;
export const diagnosisLabelCodes = Object.keys(diagnosisLabels) as [DiagnosisLabelCode, ...DiagnosisLabelCode[]];
export const diagnosisLabelCode = z.enum(diagnosisLabelCodes);

export const distractorDiagnosis = z
  .object({
    version: z.literal(distractorDiagnosisVersion),
    primary: diagnosisLabelCode,
    secondary: diagnosisLabelCode.nullable(),
  })
  .refine((value) => value.primary !== value.secondary, "secondary must differ from primary");
export type DistractorDiagnosis = z.infer<typeof distractorDiagnosis>;

/** Question type → distractor types whose failure the factory constrains. Anything else has no diagnosis yet. */
export const diagnosisCoverage: Partial<Record<NodeRef, NodeRef[]>> = {
  "question_type:sentence_completion": ["distractor_type:wrong_discourse_relation", "distractor_type:logical_incompatibility"],
};

/**
 * Content failure → label. `relation` is the relation whose connector the failure needs; null means the failure does
 * not depend on a connector. A null label is a failure mode with no diagnosis yet.
 */
const failureLabels: Record<FailureMode, { label: DiagnosisLabelCode | null; relation: string | null }> = {
  no_broken_expectation: { label: "logic.no_broken_expectation", relation: "concession" },
  no_real_opposition: { label: "logic.no_real_opposition", relation: "contrast" },
  similarity_does_not_hold: { label: "logic.similarity_fails", relation: "comparison" },
  reason_supports_opposite: { label: "logic.reason_supports_opposite", relation: "cause" },
  consequence_does_not_follow: { label: "logic.consequence_fails", relation: "result" },
  condition_cannot_restrict: { label: "logic.condition_cannot_restrict", relation: "condition" },
  impossible_time_order: { label: "logic.time_order", relation: "sequence" },
  purpose_does_not_fit: { label: "logic.purpose_fails", relation: "purpose" },
  addition_contradicts: { label: "logic.addition_contradicts", relation: "addition" },
  example_does_not_illustrate: { label: "logic.example_fails", relation: "example" },
  logically_incompatible: { label: "logic.self_contradiction", relation: null },
  meaning_does_not_fit: { label: "lexis.meaning_in_context", relation: null },
  collocation_breaks: { label: "lexis.collocation", relation: null },
  grammatical_form_breaks: { label: null, relation: null },
};

type RelationGroup = "opposing" | "causal" | "additive" | "condition" | "time";

/** Every discourse relation the factory can emit or ask for. qualification and emphasis have no group yet. */
export const relationGroups: Record<string, RelationGroup> = {
  contrast: "opposing",
  concession: "opposing",
  cause: "causal",
  result: "causal",
  purpose: "causal",
  addition: "additive",
  example: "additive",
  comparison: "additive",
  condition: "condition",
  sequence: "time",
};

const nodes = new Map(knowledgeNodes.map((node) => [`${node.type}:${node.slug}`, node] as const));

function slugOf(value: NodeRef, type: string): string {
  const parsed = parseRef(value);
  if (parsed.type !== type || !nodes.has(value)) throw new Error(`Expected a ${type} node, got ${value}`);
  return parsed.slug;
}

function groupOf(relation: string): RelationGroup {
  const group = relationGroups[relation];
  if (!group) throw new Error(`discourse_relation:${relation} has no diagnosis group yet`);
  return group;
}

/** Level 2 of `relation`: a total, exclusive partition of (correct, expressed) pairs with correct ≠ expressed. */
export function relationConfusion(correct: string, expressed: string): DiagnosisLabelCode {
  if (correct === expressed) throw new Error(`A wrong option cannot express the correct relation (${correct})`);
  const needed = groupOf(correct);
  const chosen = groupOf(expressed);
  if (chosen === "condition") return "relation.condition_misapplied";
  if (chosen === "time") return "relation.time_for_logic";
  if (needed === "condition" || needed === "time") return "relation.frame_missed";
  if (needed !== chosen) return needed === "opposing" || chosen === "opposing" ? "relation.polarity_reversed" : "relation.explanation_vs_addition";
  if (needed === "opposing") return "relation.concession_vs_contrast";
  if (needed === "additive") return "relation.addition_example_similarity";
  return correct === "purpose" || expressed === "purpose" ? "relation.purpose_vs_cause" : "relation.cause_vs_result";
}

function contentLabel(failureMode: FailureMode, expressed: string | null): DiagnosisLabelCode {
  const entry = failureLabels[failureMode];
  if (!entry) throw new Error(`Unknown failure mode ${failureMode}`);
  if (!entry.label) throw new Error(`Failure mode ${failureMode} has no diagnosis yet`);
  const tied = expressed ? (Object.keys(failureLabels) as FailureMode[]).find((mode) => failureLabels[mode].relation === expressed) : undefined;
  if (entry.relation ? entry.relation !== expressed : tied) {
    throw new Error(`Failure mode ${failureMode} does not belong to a slot expressing ${expressed ?? "nothing"}`);
  }
  return entry.label;
}

export type DiagnosisInput = {
  questionType: NodeRef;
  correctRelation: NodeRef | null;
  expresses: NodeRef | null;
  distractorType: NodeRef;
  failureMode: FailureMode;
  misconception: NodeRef | null;
};

export function diagnosisInputFromSpec(dspec: DistractorSpec, questionType: NodeRef): DiagnosisInput {
  return {
    questionType,
    correctRelation: dspec.relationConstraint.correctRelation,
    expresses: dspec.relationConstraint.targetRelation,
    distractorType: dspec.distractorType,
    failureMode: dspec.semanticConstraint.failureMode,
    misconception: dspec.targetMisconception,
  };
}

/**
 * Labels one wrong option by construction, from what a learner who picks it has misread:
 * - its connector signals a relation other than the one the item needs → primary is that relation confusion (the
 *   connector alone rules the option out once the needed relation is known); the content failure is secondary;
 * - its connector is the needed relation's, or it has none → primary is the content failure; no secondary.
 * Throws on any input the catalog does not map, never falls back.
 */
export function diagnoseSlot(input: DiagnosisInput): DistractorDiagnosis {
  const coverage = diagnosisCoverage[input.questionType];
  if (!coverage) throw new Error(`No distractor diagnosis for ${input.questionType} yet`);
  slugOf(input.distractorType, "distractor_type");
  if (!coverage.includes(input.distractorType)) throw new Error(`${input.distractorType} has no diagnosis in ${input.questionType}: the factory does not constrain its failure`);
  const expressed = input.expresses ? slugOf(input.expresses, "discourse_relation") : null;
  const correct = input.correctRelation ? slugOf(input.correctRelation, "discourse_relation") : null;
  const content = contentLabel(input.failureMode, expressed);
  if (expressed && !correct) throw new Error(`${input.questionType} slot expresses ${expressed} but the item has no correct relation`);
  const relation = expressed && correct && expressed !== correct ? relationConfusion(correct, expressed) : null;
  if (input.distractorType === "distractor_type:wrong_discourse_relation" && !relation) throw new Error(`${input.distractorType} must express a relation other than the item's`);
  const primary = relation ?? content;
  const secondary = relation ? content : null;

  if (input.misconception) {
    slugOf(input.misconception, "misconception");
    const linked = [diagnosisLabels[primary].misconception, secondary ? diagnosisLabels[secondary].misconception : null];
    if (!linked.includes(input.misconception)) throw new Error(`${input.misconception} is not what ${primary}${secondary ? ` or ${secondary}` : ""} diagnoses`);
  }
  return distractorDiagnosis.parse({ version: distractorDiagnosisVersion, primary, secondary });
}

export type LabelChecks = { code: DiagnosisLabelCode; deterministic: string[]; judgeCheck: string | null };

export function labelChecks(code: DiagnosisLabelCode): LabelChecks {
  const label: DiagnosisLabel = diagnosisLabels[code];
  return { code, deterministic: label.deterministic, judgeCheck: label.judgeCheck };
}

/** What a judge must confirm for an option to instantiate its diagnosis ("labelInstantiated"). */
export function diagnosisChecks(diagnosis: DistractorDiagnosis): LabelChecks[] {
  return [diagnosis.primary, ...(diagnosis.secondary ? [diagnosis.secondary] : [])].map(labelChecks);
}

/**
 * Readings that compete with the content labels: the option fails, but not through its relation, so no relation-level
 * misconception explains a learner picking it. They have no learner feedback and always dispute the label.
 */
export const nonDiagnosticFailures = ["contradicts_stem", "unrelated_content", "implausible_content"] as const;

/**
 * What an independent reviewer, blind to the assigned label, may say makes a wrong option fail: one content label, a
 * non-diagnostic failure, "sentence_works" (the completed sentence is acceptable, i.e. a second answer) or "other".
 */
export const observedContentFailures = [
  ...(diagnosisLabelCodes.filter((code) => diagnosisLabels[code].category === "logic") as DiagnosisLabelCode[]),
  ...nonDiagnosticFailures,
  "sentence_works",
  "other",
] as const;
export type ObservedContentFailure = DiagnosisLabelCode | (typeof nonDiagnosticFailures)[number] | "sentence_works" | "other";

export const labelStatuses = ["confirmed", "disputed", "second_answer", "unsure"] as const;
export type LabelStatus = (typeof labelStatuses)[number];

/** The content label the factory built the option to carry: the primary for a logic option, else the secondary. */
export const constructedContentLabel = (diagnosis: DistractorDiagnosis): DiagnosisLabelCode | null =>
  diagnosisLabels[diagnosis.primary].category === "logic" ? diagnosis.primary : diagnosis.secondary && diagnosisLabels[diagnosis.secondary].category === "logic" ? diagnosis.secondary : null;

/**
 * Compares the constructed content label with the blind reviewer's reading. The relation label needs no reviewer:
 * validateDistractor already guarantees the connector, so only the content failure can be disputed.
 */
export function labelStatus(diagnosis: DistractorDiagnosis, observed: { failure: ObservedContentFailure; confidence: number }, minConfidence = 0.5): LabelStatus {
  if (observed.failure === "sentence_works") return "second_answer";
  if (observed.confidence < minConfidence) return "unsure";
  return observed.failure === constructedContentLabel(diagnosis) ? "confirmed" : "disputed";
}

/**
 * The labels a learner may be told about. A relation label stands on the deterministic connector check; a content
 * label stands only when confirmed. Null: no specific label, the learner gets the plain explanation only.
 */
export function effectiveDiagnosis(diagnosis: DistractorDiagnosis, status: LabelStatus): DistractorDiagnosis | null {
  if (status === "second_answer") return null;
  const relationPrimary = diagnosisLabels[diagnosis.primary].category === "relation";
  if (status === "confirmed") return diagnosis;
  return relationPrimary ? { ...diagnosis, secondary: null } : null;
}

export type FeedbackContext = { correctRelation: NodeRef; expresses: NodeRef; connector?: NodeRef | null };

const nameTr = (value: NodeRef) => {
  const node = nodes.get(value);
  if (!node?.nameTr) throw new Error(`No Turkish name for ${value}`);
  return node.nameTr.toLocaleLowerCase("tr-TR");
};

/** The label's feedback; with a context, prefixed by the item-level sentence. Deterministic, no item text. */
export function renderFeedback(code: DiagnosisLabelCode, context?: FeedbackContext): string {
  const label: DiagnosisLabel = diagnosisLabels[code];
  if (!context || !label.detailTr) return label.feedbackTr;
  slugOf(context.correctRelation, "discourse_relation");
  slugOf(context.expresses, "discourse_relation");
  const connector = context.connector ? (slugOf(context.connector, "connector"), nodes.get(context.connector)!.name) : "bağlaç";
  const values: Record<string, string> = { needed: nameTr(context.correctRelation), chosen: nameTr(context.expresses), connector };
  const detail = label.detailTr.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`Unknown placeholder {${key}} in ${code}`);
    return values[key];
  });
  return `${detail} ${label.feedbackTr}`;
}

const isoTime = z.iso.datetime({ offset: true });

/** One wrong option a learner picked. `laterCorrect`: the same item was answered correctly afterwards. */
export const diagnosisSelection = z.object({
  itemId: z.string().min(1),
  at: isoTime,
  diagnosis: distractorDiagnosis,
  laterCorrect: z.boolean().default(false),
});
export type DiagnosisSelection = z.input<typeof diagnosisSelection>;

export const diagnosisAggregation = z.object({
  /** Reference time; defaults to the latest selection so the result never depends on the clock. */
  now: isoTime.optional(),
  windowDays: z.number().positive(),
  /** Weight of a selection halves every halfLifeDays. */
  halfLifeDays: z.number().positive(),
  secondaryWeight: z.number().min(0).max(1),
  laterCorrectWeight: z.number().min(0).max(1),
  minSelections: z.number().int().min(1),
  minItems: z.number().int().min(1),
  minScore: z.number().min(0),
});
export type DiagnosisAggregation = z.infer<typeof diagnosisAggregation>;

/** A pattern needs the same trap in three different items, roughly two fresh primary selections' worth of weight. */
export const defaultDiagnosisAggregation: Omit<DiagnosisAggregation, "now"> = {
  windowDays: 56,
  halfLifeDays: 14,
  secondaryWeight: 0.5,
  laterCorrectWeight: 0.5,
  minSelections: 3,
  minItems: 3,
  minScore: 1.5,
};

type Evidence = { selections: number; primarySelections: number; items: number; laterCorrect: number; score: number; lastAt: string };
export type LabelWeakness = Evidence & {
  code: DiagnosisLabelCode;
  category: DiagnosisCategoryCode;
  skill: NodeRef | null;
  misconception: NodeRef | null;
  errorCategory: ErrorCategory;
  titleTr: string;
  summaryTr: string;
};
export type CategoryWeakness = Evidence & { category: DiagnosisCategoryCode; labels: DiagnosisLabelCode[]; titleTr: string; summaryTr: string };
export type SkillWeakness = Evidence & { skill: NodeRef; labels: DiagnosisLabelCode[]; titleTr: string; summaryTr: string };
export type DiagnosisReport = { version: typeof distractorDiagnosisVersion; now: string | null; labels: LabelWeakness[]; categories: CategoryWeakness[]; skills: SkillWeakness[] };

type Accumulator = { selections: number; primary: number; items: Set<string>; laterCorrect: number; score: number; lastAt: number; labels: Map<DiagnosisLabelCode, number> };
type Attribution = { code: DiagnosisLabelCode; weight: number; primary: boolean };

const day = 86_400_000;
const round = (value: number) => Math.round(value * 1000) / 1000;

function add(map: Map<string, Accumulator>, key: string, itemId: string, at: number, laterCorrect: boolean, attributions: Attribution[]) {
  const acc = map.get(key) ?? { selections: 0, primary: 0, items: new Set<string>(), laterCorrect: 0, score: 0, lastAt: 0, labels: new Map() };
  acc.selections += 1;
  if (attributions.some((entry) => entry.primary)) acc.primary += 1;
  acc.items.add(itemId);
  if (laterCorrect) acc.laterCorrect += 1;
  acc.score += Math.max(...attributions.map((entry) => entry.weight));
  acc.lastAt = Math.max(acc.lastAt, at);
  for (const entry of attributions) acc.labels.set(entry.code, (acc.labels.get(entry.code) ?? 0) + entry.weight);
  map.set(key, acc);
}

function patterns(map: Map<string, Accumulator>, options: DiagnosisAggregation) {
  return [...map.entries()]
    .map(([key, acc]) => ({
      key,
      acc,
      evidence: {
        selections: acc.selections,
        primarySelections: acc.primary,
        items: acc.items.size,
        laterCorrect: acc.laterCorrect,
        score: round(acc.score),
        lastAt: new Date(acc.lastAt).toISOString(),
      } satisfies Evidence,
    }))
    .filter(({ evidence }) => evidence.selections >= options.minSelections && evidence.items >= options.minItems && evidence.score >= options.minScore)
    .sort(
      (a, b) =>
        b.evidence.score - a.evidence.score ||
        b.evidence.items - a.evidence.items ||
        b.evidence.selections - a.evidence.selections ||
        b.acc.lastAt - a.acc.lastAt ||
        (a.key < b.key ? -1 : 1),
    );
}

const rankedLabels = (acc: Accumulator) =>
  [...acc.labels.entries()].sort((a, b) => round(b[1]) - round(a[1]) || (a[0] < b[0] ? -1 : 1)).map(([code]) => code);

const lower = (text: string) => text.charAt(0).toLocaleLowerCase("tr-TR") + text.slice(1);

/**
 * Turns wrong-option selections into ranked weaknesses per label, per level-1 category and per linked skill.
 * Pure: the same selections and options always give the same report, whatever their order.
 */
export function aggregateDiagnoses(selections: DiagnosisSelection[], options: Partial<DiagnosisAggregation> = {}): DiagnosisReport {
  const settings = diagnosisAggregation.parse({ ...defaultDiagnosisAggregation, ...options });
  const rows = selections
    .map((selection) => diagnosisSelection.parse(selection))
    .map((row) => ({ ...row, time: Date.parse(row.at) }))
    .sort((a, b) => a.time - b.time || (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0) || (a.diagnosis.primary < b.diagnosis.primary ? -1 : a.diagnosis.primary > b.diagnosis.primary ? 1 : 0));
  const now = settings.now ? Date.parse(settings.now) : rows.length ? rows[rows.length - 1].time : null;
  const report: DiagnosisReport = { version: distractorDiagnosisVersion, now: now === null ? null : new Date(now).toISOString(), labels: [], categories: [], skills: [] };
  if (now === null) return report;

  const byLabel = new Map<string, Accumulator>();
  const byCategory = new Map<string, Accumulator>();
  const bySkill = new Map<string, Accumulator>();
  for (const row of rows) {
    const age = (now - row.time) / day;
    if (age < 0) throw new Error(`Selection for ${row.itemId} at ${row.at} is after ${report.now}`);
    if (age > settings.windowDays) continue;
    const base = 0.5 ** (age / settings.halfLifeDays) * (row.laterCorrect ? settings.laterCorrectWeight : 1);
    const attributions: Attribution[] = [
      { code: row.diagnosis.primary, weight: base, primary: true },
      ...(row.diagnosis.secondary ? [{ code: row.diagnosis.secondary, weight: base * settings.secondaryWeight, primary: false }] : []),
    ];
    for (const entry of attributions) add(byLabel, entry.code, row.itemId, row.time, row.laterCorrect, [entry]);
    const group = (key: (code: DiagnosisLabelCode) => string | null, map: Map<string, Accumulator>) => {
      const keys = [...new Set(attributions.map((entry) => key(entry.code)).filter((value): value is string => value !== null))];
      for (const value of keys) add(map, value, row.itemId, row.time, row.laterCorrect, attributions.filter((entry) => key(entry.code) === value));
    };
    group((code) => diagnosisLabels[code].category, byCategory);
    group((code) => (diagnosisLabels[code] as DiagnosisLabel).skill, bySkill);
  }

  const days = Math.round(settings.windowDays);
  const later = (acc: Accumulator) => (acc.laterCorrect > 0 ? " Bu sorulardan bazılarını sonradan doğru çözdün, yine de aynı hata tekrar ediyor." : "");
  report.labels = patterns(byLabel, settings).map(({ key, acc, evidence }) => {
    const code = key as DiagnosisLabelCode;
    const label: DiagnosisLabel = diagnosisLabels[code];
    return {
      ...evidence,
      code,
      category: label.category,
      skill: label.skill,
      misconception: label.misconception,
      errorCategory: label.errorCategory,
      titleTr: label.titleTr,
      summaryTr: `Son ${days} günde ${evidence.items} farklı soruda aynı tuzağa düştün.${later(acc)} ${label.feedbackTr}`,
    };
  });
  const top = (acc: Accumulator) => lower(diagnosisLabels[rankedLabels(acc)[0]].titleTr);
  report.categories = patterns(byCategory, settings).map(({ key, acc, evidence }) => {
    const category = key as DiagnosisCategoryCode;
    const name = diagnosisCategories[category].nameTr;
    return {
      ...evidence,
      category,
      labels: rankedLabels(acc),
      titleTr: name,
      summaryTr: `Son ${days} günde ${evidence.items} farklı soruda ${lower(name)} tuzaklarına düştün.${later(acc)} En sık düştüğün: ${top(acc)}.`,
    };
  });
  report.skills = patterns(bySkill, settings).map(({ key, acc, evidence }) => {
    const skill = key as NodeRef;
    const name = nodes.get(skill)?.nameTr ?? parseRef(skill).slug;
    return {
      ...evidence,
      skill,
      labels: rankedLabels(acc),
      titleTr: name,
      summaryTr: `Son ${days} günde ${evidence.items} farklı soruda “${name}” becerisini zorlayan tuzaklara düştün.${later(acc)} En sık düştüğün: ${top(acc)}.`,
    };
  });
  return report;
}
