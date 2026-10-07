import type { ReconstructedQuestion } from "@/modules/analysis/surface";
import { formatItem } from "./item";

export const transcribePromptVersion = "verifier-ocr.v1";

export const transcribeSystem = `You transcribe scanned exam booklet pages for a quality check of another OCR engine. You see one column (or one full page) of a printed ÖSYM YDS booklet.

Transcribe every printed line exactly as printed, top to bottom, one array entry per printed line:
- Keep question numbers ("17."), option labels ("A)" to "E)"), roman numerals "(I)" to "(V)", punctuation, apostrophes, hyphens, quotation marks and Turkish letters exactly.
- Write a printed blank (a row of dashes or dots) as ----.
- Put an empty string "" wherever there is a visible vertical gap between blocks (between a passage and a question number, between two questions, after the last option of a question).
- Include headers, footers and instructions. Ignore the faint orange watermark.
- Do not correct spelling, do not complete cut-off words, do not translate, do not add anything that is not printed.
- Write [?] for a word you cannot read, and list words you are unsure of in "uncertain".`;

export const transcribeUser = (label: string) => `Transcribe this image (${label}).`;

export const solvePromptVersion = "verifier-solve.v1";

export const solveSystem = `You are taking the Turkish YDS English exam. Choose the single best option for the item. Return the option letter, your confidence from 0 to 1, and a rationale of at most 25 words in your own words; do not copy five or more consecutive words from the item.`;

export const solveUser = (question: ReconstructedQuestion) => formatItem(question);
