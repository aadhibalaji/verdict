import "./pdf-polyfills";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { parseStatement, type Exhibit } from "./csv";

export type ExtractedFile =
  | { kind: "csv"; text: string }
  | { kind: "pdf"; text: string }
  | { kind: "docx"; text: string };

const MAX_TEXT_CHARS = 200_000;

export function detectFileKind(name: string, mime: string): ExtractedFile["kind"] | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv") || mime.includes("csv") || mime === "application/vnd.ms-excel") {
    return "csv";
  }
  if (lower.endsWith(".pdf") || mime === "application/pdf") {
    return "pdf";
  }
  if (
    lower.endsWith(".docx") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return null;
}

export async function extractFile(file: File): Promise<ExtractedFile> {
  const kind = detectFileKind(file.name, file.type);
  if (!kind) {
    throw new Error(
      "Unsupported file type. The court accepts PDF, DOCX, or CSV files only.",
    );
  }

  if (kind === "csv") {
    return { kind: "csv", text: await file.text() };
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
          "Could not read any text from that PDF. If it is scanned or image-based, please paste the contents into the question box instead.",
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

export function buildExhibit(args: {
  question: string | null;
  file: ExtractedFile | null;
  fileName: string | null;
}): Exhibit {
  const { question, file, fileName } = args;

  if (file?.kind === "csv") {
    const parsed = parseStatement(file.text);
    if (parsed.transactions.length === 0) {
      throw new Error(
        "No transactions found in that CSV. The court needs a header row with date, description, and amount columns.",
      );
    }
    return {
      kind: "summary",
      summary: parsed.summary,
      question: question?.trim() || null,
      fileName: fileName ?? "statement.csv",
    };
  }

  if (file) {
    return {
      kind: "text",
      text: file.text,
      source: file.kind,
      question: question?.trim() || null,
      fileName,
    };
  }

  if (question && question.trim()) {
    return {
      kind: "text",
      text: question.trim(),
      source: "text",
      question: question.trim(),
      fileName: null,
    };
  }

  throw new Error(
    "Nothing to deliberate. Describe a decision or upload a document — both are welcome.",
  );
}
