import { readFileSync } from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { sha256 } from "./artifacts";
import type { SourceDocument } from "@/modules/analysis/sources";

export const sourcesDir = () => process.env.SOURCES_DIR ?? path.join(process.cwd(), "sources");

/** Reads the original PDF read-only and refuses to continue if it no longer matches the registered hash. */
export function readSourcePdf(document: SourceDocument): Uint8Array {
  const bytes = readFileSync(path.join(sourcesDir(), document.file));
  const hash = sha256(bytes);
  if (hash !== document.sha256) throw new Error(`${document.file} changed: expected ${document.sha256}, got ${hash}`);
  return new Uint8Array(bytes);
}

export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  return getDocument({ data: bytes.slice(), verbosity: 0, isEvalSupported: false }).promise;
}

export async function renderPage(pdf: PDFDocumentProxy, pageNumber: number, dpi: number): Promise<Buffer> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: dpi / 72 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D, viewport }).promise;
  page.cleanup();
  return canvas.toBuffer("image/png");
}

export async function pageText(pdf: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const lines: string[] = [];
  let current = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    current += item.str;
    if (item.hasEOL) {
      lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);
  page.cleanup();
  return lines.join("\n");
}
