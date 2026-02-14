"use server";

import { PDFParse } from "pdf-parse";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function extractTextFromPdf(
  formData: FormData
): Promise<{ text: string }> {
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    throw new Error("No file provided.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are supported.");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("File is too large. Maximum size is 5MB.");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data });
  const result = await parser.getText();

  const text = result.pages.map((p) => p.text).join("\n").trim();
  if (!text) {
    throw new Error(
      "Could not extract text from this PDF. It may contain only images."
    );
  }

  return { text };
}
