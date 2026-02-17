import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set. Check your .env.local file.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000,
});

export async function generateFromPrompt(prompt: string, temperature: number = 0.8): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature,
  });
  return response.choices[0].message.content || "";
}

export async function generateWithRetry(
  prompt: string,
  temperature?: number,
  maxRetries = 1
): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await generateFromPrompt(prompt, temperature);
      if (result) return result;
      lastError = new Error("Empty response from AI");
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

