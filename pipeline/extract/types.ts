export type Box = [number, number, number, number];

export type OcrWord = { text: string; confidence: number; bbox: Box };

export type OcrLine = { text: string; confidence: number; bbox: Box; words: OcrWord[] };

export type ColumnId = "left" | "right" | "full";

export type OcrColumn = {
  page: number;
  column: ColumnId;
  width: number;
  height: number;
  offsetX: number;
  engine: string;
  psm: string;
  confidence: number;
  text: string;
  lines: OcrLine[];
};

export type Transcription = {
  page: number;
  column: ColumnId;
  provider: string;
  model: string;
  promptVersion: string;
  /** "declined": the provider refused (e.g. RECITATION); "invalid": no valid JSON after a repair; "incomplete": far shorter or longer than the Tesseract reading; "error": the provider kept failing after every retry. */
  status: "ok" | "declined" | "invalid" | "incomplete" | "error";
  finishReason?: string;
  requestHash: string | null;
  lines: string[];
  uncertain: string[];
};

export type Reading = "ocr" | "verified" | "text";

export type StreamLine = {
  page: number;
  column: ColumnId;
  index: number;
  text: string;
  /** A visible vertical gap (or a column break) precedes this line. */
  gap: boolean;
  /** In the verified stream: which reading the line came from (columns the model did not transcribe fall back to Tesseract). */
  source?: Reading;
  words?: number;
  confidenceSum?: number;
  lowConfidenceWords?: number;
};
