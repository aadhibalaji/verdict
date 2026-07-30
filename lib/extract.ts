import "./pdf-polyfills";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type ExtractedFile =
  | { kind: "pdf"; text: string }
  | { kind: "docx"; text: string }
  | { kind: "txt"; text: string };

const MAX_TEXT_CHARS = 200_000;

export function detectFileKind(name: string, mime: string): ExtractedFile["kind"] | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || mime === "application/pdf") {
    return "pdf";
  }
  if (
    lower.endsWith(".docx") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (lower.endsWith(".txt") || mime.startsWith("text/plain")) {
    return "txt";
  }
  return null;
}

export async function extractFile(file: File): Promise<ExtractedFile> {
  const kind = detectFileKind(file.name, file.type);
  if (!kind) {
    throw new Error("Unsupported file type. The court accepts PDF, DOCX, or TXT files only.");
  }

  if (kind === "txt") {
    const text = (await file.text()).trim();
    if (!text) throw new Error("Could not read any text from that file.");
    return { kind: "txt", text: text.slice(0, MAX_TEXT_CHARS) };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (kind === "pdf") {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = (result?.text ?? "").trim();
      if (!text) {
        throw new Error(
          "Could not read any text from that PDF. If it is scanned or image-based, please paste the text directly instead.",
        );
      }
      return { kind: "pdf", text: text.slice(0, MAX_TEXT_CHARS) };
    } finally {
      try {
        await parser?.destroy();
      } catch {}
    }
  }

  const result = await mammoth.extractRawText({ buffer });
  const text = (result?.value ?? "").trim();
  if (!text) {
    throw new Error("Could not read any text from that DOCX file.");
  }
  return { kind: "docx", text: text.slice(0, MAX_TEXT_CHARS) };
}
