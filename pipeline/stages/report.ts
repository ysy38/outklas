import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { difficultyDimensions, type DifficultyDimension } from "@/modules/analysis/contract";
import { mineDna, type Count, type Matrix } from "@/modules/analysis/dna";
import { readDnaQuestions } from "@/db/analysis-import";
import { parseRef, ref, type NodeRef } from "@/modules/knowledge/graph";
import { knowledgeNodes } from "@/modules/knowledge/seed";
import { readJson, readManifest, runStage } from "../lib/artifacts";
import { openLocalDatabase } from "../lib/db";
import type { AnalysisRecord } from "./analyze";
import type { StageContext } from "./context";

const names = new Map(knowledgeNodes.map((node) => [ref(node), node.nameTr ?? node.name]));
const label = (key: string) => (names.has(key as NodeRef) ? `\`${key}\` ${names.get(key as NodeRef)}` : `\`${key}\``);
const short = (key: string) => (key.includes(":") ? parseRef(key as NodeRef).slug : key);

const dimensionTr: Record<DifficultyDimension, string> = {
  overall: "genel",
  lexical: "sözcüksel",
  syntactic: "sözdizimsel",
  semantic: "anlamsal",
  inference: "çıkarım yükü",
  distractor_similarity: "çeldirici benzerliği",
  context_dependency: "bağlam bağımlılığı",
};

function table(headers: string[], rows: (string | number)[][]): string {
  if (!rows.length) return "_Veri yok._";
  return [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

const counts = (entries: Count[], total: number, limit = 25) =>
  table(
    ["Düğüm", "Soru sayısı", "Pay"],
    entries.slice(0, limit).map((entry) => [label(entry.key), entry.count, `%${Math.round((entry.count / Math.max(1, total)) * 100)}`]),
  );

function matrix(value: Matrix, rowLimit = 20): string {
  const rows = value.rows.slice(0, rowLimit);
  return table(["", ...value.columns.map(short)], rows.map((row) => [label(row), ...value.columns.map((column) => value.cells[row]?.[column] ?? "·")]));
}

/** Deterministic pattern-mining report: the same database rows always render the same Markdown. */
export async function report(context: StageContext) {
  const slug = context.document.slug;
  const analyzed = readManifest(slug, "analyze");
  const imported = readManifest(slug, "import");
  if (!analyzed || !imported) throw new Error("Run the import stage first.");
  return runStage(
    { document: slug, stage: "report", version: "1", inputs: { import: imported.outputHash, analyze: analyzed.outputHash }, code: ["pipeline/stages/report.ts", "src/modules/analysis/dna.ts"], force: true },
    async () => {
      const db = await openLocalDatabase();
      const questions = await readDnaQuestions(db.query, slug).finally(() => db.close());
      const dna = mineDna(questions);
      const records = Object.keys(analyzed.files)
        .filter((name) => /^q-\d+\.json$/.test(name))
        .map((name) => readJson<AnalysisRecord>(slug, "analyze", name))
        .sort((a, b) => a.number - b.number);
      const accepted = records.filter((record) => record.status === "accepted");
      const vocabulary = accepted.flatMap((record) => record.analysis?.knowledge.vocabulary ?? []);
      const total = dna.questions;
      const exam = context.document.exam!;

      const lines: string[] = [
        `# YDS DNA — ${context.document.title}`,
        "",
        `Bu dosya \`npm run analysis -- report --doc ${slug}\` ile üretilir; elle düzenlemeyin. Kaynak: yerel \`analysis\` şeması (canlıdaki ile aynı satırlar). Soru metni içermez; yalnızca knowledge graph referansları, sayılar ve hash'ler.`,
        "",
        `- Sınav: ${exam.code.toUpperCase()} ${exam.session}, ${exam.questionCount} soru`,
        `- Veritabanındaki (kabul edilmiş) analiz: **${total} / ${records.length}**. İnceleme kuyruğunda: ${records.filter((record) => record.status === "needs_review").length}, başarısız: ${records.filter((record) => record.status === "failed").length}.`,
        `- Analiz çalıştırması: girdi hash'i \`${analyzed.inputHash.slice(0, 12)}\`, modeller ${JSON.stringify(analyzed.params)}`,
        "- Uyarı: tek kitapçık. Oranlar bu kitapçığın kabul edilen soruları içindir; kabul edilmeyen sorular dağılımı kaydırabilir (bkz. §15–16).",
        "",
        "## 1. Kavram sıklığı (birincil kavramlar)",
        counts(dna.concepts, total),
        "",
        "## 2. Soru tipi dağılımı",
        counts(dna.questionTypes, total),
        "",
        "## 3. Dil bilgisi örüntüleri",
        counts(dna.grammar, total),
        "",
        "## 4. Kelime örüntüleri",
        "Graph'ta eşleşen sözcüksel düğümler (bağlaçlar):",
        "",
        counts(dna.vocabulary, total),
        "",
        "Kabul edilen analizlerde kelime rolleri ve sözcük türleri (yerel artefakttan sayım, kelimelerin kendisi yazılmaz):",
        "",
        table(
          ["Rol", "Adet"],
          Object.entries(vocabulary.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.role]: (acc[item.role] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]),
        ),
        "",
        table(
          ["Sözcük türü (tested/answer)", "Adet"],
          Object.entries(
            vocabulary.filter((item) => item.role === "tested" || item.role === "answer").reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.pos]: (acc[item.pos] ?? 0) + 1 }), {}),
          ).sort((a, b) => b[1] - a[1]),
        ),
        "",
        `Graph'ta karşılığı olmayan test edilen kelimeler \`vocabulary\` önerisi olarak kuyruğa girdi: ${questions.reduce((sum, question) => sum + question.proposals.filter((proposal) => proposal.type === "vocabulary").length, 0)} öneri bağlantısı.`,
        "",
        "## 5. Söylem ilişkileri",
        counts(dna.discourse, total),
        "",
        "Doğru şıkkın ifade ettiği ilişki / bağlaç / yapı:",
        "",
        counts(dna.answerExpresses, total),
        "",
        "## 6. Beceri dağılımı",
        "Birincil beceri:",
        "",
        counts(dna.skills, total),
        "",
        "İkincil beceriler:",
        "",
        counts(dna.secondarySkills, total),
        "",
        "## 7. Bilişsel beceri dağılımı",
        counts(dna.cognitive, total),
        "",
        table(
          ["Bilişsel talep (Bloom)", "Soru"],
          dna.cognitiveDemand.map((entry) => [entry.key, entry.count]),
        ),
        "",
        table(
          ["Transfer gereksinimi", "Soru"],
          dna.transfer.map((entry) => [entry.key, entry.count]),
        ),
        "",
        "## 8. Çeldirici taksonomisi",
        counts(dna.distractorTypes, total * 4),
        "",
        "Çeldirici türü × soru tipi (çeldirici sayısı):",
        "",
        matrix(dna.distractorTypesByQuestionType),
        "",
        "## 9. Kavram yanılgıları",
        counts(dna.misconceptions, total),
        "",
        "## 10. Zorluk dağılımları",
        "Model tahmini, 0–1. Kutular: 0–0,2 / 0,2–0,4 / 0,4–0,6 / 0,6–0,8 / 0,8–1.",
        "",
        table(
          ["Boyut", "Ort.", "Medyan", "Min", "Maks", "Kutular"],
          difficultyDimensions.map((dimension) => {
            const value = dna.difficulty[dimension];
            return [dimensionTr[dimension], value.mean, value.median, value.min, value.max, value.bins.join(" / ")];
          }),
        ),
        "",
        "Soru tipine göre ortalama:",
        "",
        table(
          ["Soru tipi", ...difficultyDimensions.map((dimension) => dimensionTr[dimension])],
          Object.entries(dna.difficultyByQuestionType).map(([type, values]) => [label(type), ...difficultyDimensions.map((dimension) => values[dimension])]),
        ),
        "",
        "Yüzey ölçüleri (deterministik, metinden sayım):",
        "",
        table(
          ["Soru tipi", "Pasaj kelime", "Kök kelime", "Şık kelime ort.", "Cümle uzunluğu ort."],
          Object.entries(dna.surface).map(([type, value]) => [label(type), value.stimulusWords, value.stemWords, value.optionWords, value.sentenceLength]),
        ),
        "",
        "## 11. Kavram × soru tipi",
        matrix(dna.conceptByQuestionType),
        "",
        "## 12. Kavram × zorluk bandı",
        "Bant: genel zorluk < 0,4 kolay, < 0,7 orta, üstü zor.",
        "",
        matrix(dna.conceptByDifficulty),
        "",
        "## 13. Beceri × soru tipi",
        matrix(dna.skillByQuestionType),
        "",
        "## 14. Yinelenen soru aileleri",
        "Aile = aynı birincil kavram. Birden fazla yüzeyde (soru tipinde) görünen aileler transfer ölçümünün temelidir.",
        "",
        table(
          ["Aile", "Soru", "Yüzeyler (soru tipi: adet)", "Çeldirici türleri", "Yanılgılar"],
          dna.families
            .filter((family) => family.members.length > 1)
            .map((family) => [
              label(family.primary),
              family.members.map((member) => member.number).join(", "),
              family.questionTypes.map((entry) => `${short(entry.key)}: ${entry.count}`).join(", "),
              family.distractorTypes.slice(0, 4).map((entry) => `${short(entry.key)} ${entry.count}`).join(", "),
              family.misconceptions.map((entry) => `${short(entry.key)} ${entry.count}`).join(", ") || "·",
            ]),
        ),
        "",
        "## 15. Çözülmemiş belirsizlikler",
        "Modelin belirsizlik notu düştüğü veya kör çözümün anahtarla uyuşmadığı sorular (notların metni yerel inceleme dosyasında).",
        "",
        table(
          ["Soru", "Durum", "Belirsizlik notu", "İşaretler"],
          records
            .filter((record) => (record.draft?.ambiguities.length ?? 0) > 0 || record.flags.some((flag) => flag.code === "blind_solve_mismatch"))
            .map((record) => [record.number, record.status, record.draft?.ambiguities.length ?? 0, [...new Set(record.flags.map((flag) => flag.code))].join(", ")]),
        ),
        "",
        "## 16. Düşük güvenli ve incelemeye kalan analizler",
        table(
          ["Soru", "Durum", "Güven", "Engelleyen işaretler"],
          records
            .filter((record) => record.status !== "accepted")
            .map((record) => [
              record.number,
              record.status,
              record.draft?.confidence ?? "·",
              [...new Set(record.flags.filter((flag) => flag.severity === "block").map((flag) => flag.code))].join(", "),
            ]),
        ),
        "",
        "## Cevap konumu dağılımı",
        table(
          ["Şık", "Adet"],
          dna.answers.map((entry) => [entry.key, entry.count]),
        ),
        "",
      ];
      const markdown = `${lines.join("\n")}\n`;
      const target = path.join(process.cwd(), "docs/analysis", `${slug}-dna.md`);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, markdown);
      return { files: { "dna.md": markdown, "dna.json": `${JSON.stringify(dna, null, 1)}\n` }, stats: { questions: total, families: dna.families.length } };
    },
  );
}
