import type { SourceDocument } from "@/modules/analysis/sources";

export type StageContext = {
  document: SourceDocument;
  force: boolean;
  log: (message: string) => void;
};
