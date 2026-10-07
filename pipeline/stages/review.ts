import { optionLabels } from "@/modules/analysis/contract";
import { readJson, readManifest, runStage } from "../lib/artifacts";
import type { Rebuilt } from "../extract/reconstruct";
import type { AnalysisRecord } from "./analyze";
import type { StageContext } from "./context";
import type { ValidationReport } from "./extraction";

const list = (values: string[] | undefined) => (values?.length ? values.join(", ") : "—");

/** Local, text-bearing review sheet for every question. It lives in .data/ only and is never committed. */
export async function review(context: StageContext) {
  const slug = context.document.slug;
  const analyzed = readManifest(slug, "analyze");
  const validated = readManifest(slug, "validate");
  const rebuilt = readManifest(slug, "reconstruct");
  if (!analyzed || !validated || !rebuilt) throw new Error("Run the analyze stage first.");
  return runStage(
    { document: slug, stage: "review", version: "1", inputs: { analyze: analyzed.outputHash, validate: validated.outputHash, reconstruct: rebuilt.outputHash }, code: ["pipeline/stages/review.ts"], force: context.force },
    async () => {
      const report = readJson<ValidationReport>(slug, "validate", "report.json");
      const questions = readJson<Rebuilt[]>(slug, "reconstruct", `questions-${report.primary}.json`);
      const lines = [
        `# İnceleme — ${context.document.title}`,
        "",
        `YEREL DOSYA, COMMIT EDİLMEZ (ÖSYM metni içerir). Birincil okuma: ${report.primary}. Her soru için \`Karar:\` satırını doldurun (onay / düzelt / reddet).`,
        "",
      ];
      for (const { question, pages } of questions) {
        const record = readJson<AnalysisRecord>(slug, "analyze", `q-${String(question.number).padStart(2, "0")}.json`);
        const check = report.questions.find((entry) => entry.number === question.number)!;
        const analysis = record.analysis ?? record.draft;
        lines.push(`## Soru ${question.number} — ${record.status} (sayfa ${pages.join(", ")})`, "");
        lines.push(`- Çıkarım: ${check.status}; CER ${check.disagreement ?? "—"}; Tesseract güveni ${check.meanConfidence ?? "—"}; işaretler: ${list(check.flags)}`);
        lines.push(`- Anahtar: ${record.answerKey ?? "?"}; kör çözüm: ${record.blind ? `${record.blind.answer} (${record.blind.confidence})` : "—"}; beklenen tip: ${record.expectedType ?? "—"}`);
        lines.push(`- Analiz işaretleri: ${list(record.flags.map((flag) => `${flag.code}${flag.severity === "block" ? "!" : ""}${flag.detail ? ` (${flag.detail})` : ""}`))}`);
        if (record.error) lines.push(`- Hata: ${record.error}`);
        lines.push("");
        if (question.stimulus) lines.push("> " + question.stimulus.replace(/\n/g, "\n> "), "");
        lines.push(question.stem || "_(kök yok)_", "");
        for (const label of optionLabels) lines.push(`${label}) ${question.options[label]}${label === record.answerKey ? "  ✓" : ""}`);
        lines.push("");
        if (analysis) {
          lines.push(
            `- Tip: ${analysis.question_type}; doğru şık ${analysis.correct_option}; güven ${analysis.confidence}`,
            `- Birincil kavramlar: ${list(analysis.knowledge.primary_concepts)}; ikincil: ${list(analysis.knowledge.secondary_concepts)}`,
            `- Dil bilgisi: ${list(analysis.knowledge.grammar)}; söylem: ${list(analysis.knowledge.discourse_relations)}`,
            `- Kelime: ${list(analysis.knowledge.vocabulary.map((item) => `${item.lemma}/${item.pos}/${item.role}${item.ref ? `→${item.ref}` : ""}`))}`,
            `- Beceri: ${analysis.skills.primary ?? "—"}; ikincil ${list(analysis.skills.secondary)}; bilişsel ${list(analysis.skills.cognitive)}`,
            `- Doğru şık ifade eder: ${list(analysis.answer_expresses)}`,
            `- Çeldiriciler: ${list(analysis.distractors.map((entry) => `${entry.label}=${entry.type}${entry.misconception ? `/${entry.misconception}` : ""} (çekici: ${entry.why_plausible}; yanlış: ${entry.why_wrong})`))}`,
            `- Yanılgılar: ${list(analysis.misconceptions)}; önkoşullar: ${list(analysis.prerequisites)}`,
            `- Zorluk: ${Object.entries(analysis.difficulty).map(([key, value]) => `${key} ${value}`).join(", ")}; talep ${analysis.pedagogy.cognitive_demand}; transfer ${analysis.pedagogy.transfer_requirement}`,
            `- Öğrenme hedefi: ${analysis.learning_objective}`,
            `- Öneriler: ${list(analysis.proposals.map((proposal) => `${proposal.type}:${proposal.slug}`))}`,
            `- Belirsizlikler: ${list(analysis.ambiguities)}`,
          );
        }
        lines.push("", "Karar: ", "", "---", "");
      }
      return { files: { "review.md": `${lines.join("\n")}\n` }, stats: { questions: questions.length } };
    },
  );
}
