import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export const chatSession = genAI
  .getGenerativeModel({ model: "gemini-1.5-flash" })
  .startChat({
    generationConfig: {
      maxOutputTokens: 8192,
    },
  });

export function cleanJsonResponse(text: string): string {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}
