import { connectorSentences, connectors, relationHint, relationLabel, type ConnectorKind, type Relation } from "@/content/drill-connectors";
import { drillWords, type DrillWord } from "@/content/drill-words";
import { connectorQuestion, type DrillQuestion } from "@/modules/drill/drill";

export type StudySet =
  | { id: string; kind: "words"; title: string; summary: string; words: DrillWord[] }
  | { id: string; kind: "connector-table"; title: string; summary: string; groups: ConnectorGroup[] }
  | { id: string; kind: "connector-quiz"; title: string; summary: string; questions: DrillQuestion[] };

export type ConnectorGroup = { relation: Relation; label: string; hint: string; items: { text: string; kind: ConnectorKind }[] };

export const kindLabel: Record<ConnectorKind, string> = {
  conj: "bağlaç · arkasından cümle",
  prep: "edat · arkasından isim ya da -ing",
  adv: "zarf · cümle başında, virgülle",
  inf: "arkasından yalın fiil",
};

const chunkSize = 20;

function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < list.length; index += chunkSize) out.push(list.slice(index, index + chunkSize));
  return out;
}

const relationOrder: Relation[] = ["contrast", "concession", "cause", "result", "addition", "similarity", "condition", "purpose", "example", "time"];

export const studySets: StudySet[] = [
  ...chunks(drillWords.map((_, index, all) => all[(index * 7) % all.length])).map((words, index): StudySet => ({
    id: `kelime-${index + 1}`,
    kind: "words",
    title: `Kelime seti ${index + 1}`,
    summary: `${words.length} kelime: anlamı, türü ve örnek cümlesiyle. Arkasında kendini sınaman için boş bir sayfa var.`,
    words,
  })),
  {
    id: "baglac-tablosu",
    kind: "connector-table",
    title: "Bağlaç tablosu",
    summary: `${connectors.length} bağlaç, anlam ilişkisine göre gruplanmış. Hangisinden sonra cümle, hangisinden sonra isim geldiği yanında yazıyor.`,
    groups: relationOrder
      .map((relation) => ({
        relation,
        label: relationLabel[relation],
        hint: relationHint[relation],
        items: connectors.filter((item) => item.relation === relation).map(({ text, kind }) => ({ text, kind })),
      }))
      .filter((group) => group.items.length > 0),
  },
  ...chunks(connectorSentences.map((_, index, all) => all[(index * 7) % all.length])).map((sentences, index): StudySet => {
    const questions = sentences.map((sentence) => connectorQuestion(sentence.id)).filter((question) => question !== null);
    return {
      id: `baglac-${index + 1}`,
      kind: "connector-quiz",
      title: `Bağlaç alıştırması ${index + 1}`,
      summary: `${questions.length} cümle, beşer şıklı. Cevap anahtarı son sayfada.`,
      questions,
    };
  }),
];

export function studySet(id: string): StudySet | undefined {
  return studySets.find((set) => set.id === id);
}

export const letters = ["A", "B", "C", "D", "E"];
